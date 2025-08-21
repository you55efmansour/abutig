const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, validationResult, query } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireOwnerOrAdmin,
  complaintSubmissionRateLimiter,
  adminActionRateLimiter,
} = require("../middleware/auth");
const {
  complaintValidation,
  validateFileUpload,
  auditLog,
  sanitizePrismaQuery
} = require("../middleware/security");
const {
  sendComplaintNotification,
  sendStatusUpdateNotification,
} = require("../utils/email");
const { FILE_UPLOAD_CONFIG } = require("../config/security");
const XLSX = require("xlsx");

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = FILE_UPLOAD_CONFIG.uploadPath;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use secure filename generation
    const randomFilename = FILE_UPLOAD_CONFIG.generateRandomFilename(file.originalname);
    cb(null, randomFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: FILE_UPLOAD_CONFIG.maxFileSize,
    files: 5, // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Enhanced file type validation
    if (!FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("نوع الملف غير مدعوم"));
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!FILE_UPLOAD_CONFIG.allowedExtensions.includes(fileExtension)) {
      return cb(new Error("امتداد الملف غير مدعوم"));
    }

    cb(null, true);
  },
});

// Submit new complaint with rate limiting and security
router.post(
  "/submit",
  complaintSubmissionRateLimiter,
  upload.array("files", 5),
  validateFileUpload,
  complaintValidation,
  auditLog('complaint.create'),
  async (req, res) => {
    try {
      const {
        fullName,
        phone,
        nationalId,
        typeId,
        title,
        description,
        location,
        email,
      } = req.body;

      // Sanitize inputs
      const sanitizedData = {
        fullName: sanitizePrismaQuery(fullName),
        phone: sanitizePrismaQuery(phone),
        nationalId: sanitizePrismaQuery(nationalId),
        typeId: sanitizePrismaQuery(typeId),
        title: sanitizePrismaQuery(title),
        description: sanitizePrismaQuery(description),
        location: location ? sanitizePrismaQuery(location) : null,
        email: email ? sanitizePrismaQuery(email) : null,
      };

      // Validate complaint type exists
      const complaintType = await prisma.complaintType.findUnique({
        where: { id: sanitizedData.typeId, isActive: true },
      });

      if (!complaintType) {
        return res.status(400).json({ error: "نوع الشكوى غير صالح" });
      }

      // Check if complainant exists, create if not
      let complainant = await prisma.complainant.findFirst({
        where: {
          OR: [{ phone: sanitizedData.phone }, { nationalId: sanitizedData.nationalId }],
        },
      });

      if (!complainant) {
        complainant = await prisma.complainant.create({
          data: {
            fullName: sanitizedData.fullName,
            phone: sanitizedData.phone,
            nationalId: sanitizedData.nationalId,
            email: sanitizedData.email,
          },
        });
      }

      // Create complaint with audit fields
      const complaint = await prisma.complaint.create({
        data: {
          complainantId: complainant.id,
          typeId: sanitizedData.typeId,
          title: sanitizedData.title,
          description: sanitizedData.description,
          location: sanitizedData.location,
          status: "UNRESOLVED",
          createdByUserId: req.user?.id || null,
        },
        include: {
          type: true,
          complainant: true,
        },
      });

      // Handle file uploads with validation
      if (req.files && req.files.length > 0) {
        const filePromises = req.files.map((file) =>
          prisma.complaintFile.create({
            data: {
              complaintId: complaint.id,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
            },
          })
        );
        await Promise.all(filePromises);
      }

      // Log the creation - only if we have a valid user
      if (req.user?.id) {
        await prisma.complaintLog.create({
          data: {
            complaintId: complaint.id,
            userId: req.user.id,
            action: "CREATED",
            newStatus: "UNRESOLVED",
            notes: "تم إنشاء الشكوى",
          },
        });
      }

      // Send email notification to admins
      try {
        await sendComplaintNotification(complaint, complainant);
      } catch (emailError) {
        console.error("خطأ في إرسال إشعار البريد الإلكتروني:", emailError);
        // لا نوقف العملية إذا فشل إرسال البريد الإلكتروني
      }

      res.status(201).json({
        success: true,
        complaint: {
          id: complaint.id,
          title: complaint.title,
          status: complaint.status,
          createdAt: complaint.createdAt,
        },
        message: "تم تقديم الشكوى بنجاح",
      });
    } catch (error) {
      console.error("Submit complaint error:", error);
      res.status(500).json({ error: "خطأ في تقديم الشكوى" });
    }
  }
);

// Get complaints (with enhanced role-based filtering and security)
router.get(
  "/",
  authenticateToken,
  auditLog('complaint.list'),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isIn([
        "UNRESOLVED",
        "IN_PROGRESS",
        "BEING_RESOLVED",
        "OVERDUE",
        "RESOLVED",
      ]),
    query("typeId").optional().isString(),
    query("search").optional().isString().isLength({ max: 100 }),
    query("complainant").optional().isString().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "معاملات غير صالحة",
          details: errors.array(),
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const filters = {};

      if (req.query.status) filters.status = req.query.status;
      if (req.query.typeId) filters.typeId = sanitizePrismaQuery(req.query.typeId);

      // Enhanced role-based filtering with security
      if (req.user.role === "EMPLOYEE") {
        // Employee sees only assigned complaints
        filters.assignedToId = req.user.id;
      } else if (req.user.role === "CITIZEN" || req.user.complainantId) {
        // Citizen sees only their own complaints
        filters.complainantId = req.user.complainantId;
      }
      // ADMIN can see all complaints (no additional filter)

      // Search functionality with sanitization
      if (req.query.search) {
        const searchTerm = sanitizePrismaQuery(req.query.search.trim());
        if (searchTerm.length > 0) {
          filters.OR = [
            { title: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { complainant: { fullName: { contains: searchTerm } } },
          ];
        }
      }

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where: filters,
          include: {
            type: true,
            complainant: {
              select: {
                fullName: true,
                phone: true,
                // Only include sensitive data for admins
                ...(req.user.role === "ADMIN" && {
                  nationalId: true,
                  email: true,
                }),
              },
            },
            assignedTo: {
              select: {
                fullName: true,
              },
            },
            _count: {
              select: {
                files: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.complaint.count({ where: filters }),
      ]);

      res.json({
        complaints,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get complaints error:", error);
      res.status(500).json({ error: "خطأ في جلب الشكاوى" });
    }
  }
);

// Get all complaints for admin dashboard (Admin only)
router.get(
  "/admin",
  authenticateToken,
  requireRole(["ADMIN"]),
  [
    query("status")
      .optional()
      .isIn([
        "UNRESOLVED",
        "IN_PROGRESS",
        "BEING_RESOLVED",
        "OVERDUE",
        "RESOLVED",
      ]),
    query("type").optional().isString(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
    query("search").optional().isString().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "معاملات غير صالحة",
          details: errors.array(),
        });
      }

      const filters = {};

      // Apply filters
      if (req.query.status) filters.status = req.query.status;
      if (req.query.type) filters.typeId = req.query.type;
      if (req.query.dateFrom || req.query.dateTo) {
        filters.createdAt = {};
        if (req.query.dateFrom)
          filters.createdAt.gte = new Date(req.query.dateFrom);
        if (req.query.dateTo)
          filters.createdAt.lte = new Date(req.query.dateTo);
      }

      // Search functionality
      if (req.query.search) {
        const searchTerm = req.query.search.trim();
        if (searchTerm.length > 0) {
          filters.OR = [
            { title: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { complainant: { fullName: { contains: searchTerm } } },
            { complainant: { phone: { contains: searchTerm } } },
          ];
        }
      }

      const complaints = await prisma.complaint.findMany({
        where: filters,
        include: {
          type: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          complainant: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
            },
          },
          files: {
            select: {
              id: true,
              filename: true,
              originalName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Transform files to match expected format
      const transformedComplaints = complaints.map((complaint) => ({
        ...complaint,
        attachments: complaint.files.map((file) => ({
          id: file.id,
          filename: file.originalName || file.filename,
          url: `/uploads/${file.filename}`,
        })),
        files: undefined, // Remove the original files array
      }));

      res.json({
        complaints: transformedComplaints,
      });
    } catch (error) {
      console.error("Get admin complaints error:", error);
      res.status(500).json({ error: "خطأ في جلب الشكاوى" });
    }
  }
);

// Get single complaint (with enhanced ownership checks)
router.get(
  "/:id",
  authenticateToken,
  requireOwnerOrAdmin("complaint"),
  async (req, res) => {
    try {
      const complaint = await prisma.complaint.findUnique({
        where: { id: req.params.id },
        include: {
          type: true,
          complainant: {
            select: {
              fullName: true,
              phone: true,
              // Include sensitive data only for admins
              ...(req.user.role === "ADMIN" && {
                nationalId: true,
                email: true,
              }),
            },
          },
          assignedTo: {
            select: {
              fullName: true,
              email: true,
            },
          },
          files: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              uploadedAt: true,
            },
          },
          logs: {
            include: {
              user: {
                select: {
                  fullName: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          statusChanges: {
            include: {
              user: {
                select: {
                  fullName: true,
                  role: true,
                },
              },
            },
            orderBy: { changedAt: "desc" },
          },
        },
      });

      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      res.json(complaint);
    } catch (error) {
      console.error("Get complaint error:", error);
      res.status(500).json({ error: "خطأ في جلب الشكوى" });
    }
  }
);

// Update complaint status (Employee/Admin only) with enhanced workflow
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["EMPLOYEE", "ADMIN"]),
  adminActionRateLimiter,
  [
    body("status").isIn([
      "UNRESOLVED",
      "IN_PROGRESS",
      "BEING_RESOLVED",
      "OVERDUE",
      "RESOLVED",
    ]),
    body("notes").optional().isString().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "بيانات غير صالحة",
          details: errors.array(),
        });
      }

      const { status, notes } = req.body;
      const complaintId = req.params.id;

      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: {
          complainant: true,
          type: true,
        },
      });

      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      // Enhanced role-based access control
      if (
        req.user.role === "EMPLOYEE" &&
        complaint.assignedToId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ error: "غير مسموح لك بتحديث هذه الشكوى" });
      }

      const oldStatus = complaint.status;

      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update complaint status
        const updatedComplaint = await tx.complaint.update({
          where: { id: complaintId },
          data: {
            status,
            lastStatusChangedBy: req.user.id,
            lastStatusChangedAtUtc: new Date(),
            ...(status === "RESOLVED" && { resolvedAt: new Date() }),
            ...(req.user.role === "EMPLOYEE" &&
              !complaint.assignedToId && { assignedToId: req.user.id }),
          },
        });

        // Log the status change
        await tx.complaintLog.create({
          data: {
            complaintId,
            userId: req.user.id,
            action: "STATUS_CHANGED",
            oldStatus,
            newStatus: status,
            notes: notes || `تم تغيير الحالة من ${oldStatus} إلى ${status}`,
          },
        });

        // Create status change audit record
        await tx.complaintStatusChange.create({
          data: {
            complaintId,
            userId: req.user.id,
            oldStatus,
            newStatus: status,
            notes: notes || `تم تغيير الحالة من ${oldStatus} إلى ${status}`,
          },
        });

        return updatedComplaint;
      });

      // Send email notification to complainant if they have email
      if (complaint.complainant.email) {
        try {
          await sendStatusUpdateNotification(
            complaint,
            complaint.complainant,
            oldStatus,
            status,
            notes
          );
        } catch (emailError) {
          console.error("خطأ في إرسال إشعار تحديث الحالة:", emailError);
          // لا نوقف العملية إذا فشل إرسال البريد الإلكتروني
        }
      }

      res.json({
        success: true,
        complaint: result,
        message: "تم تحديث حالة الشكوى بنجاح",
      });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "خطأ في تحديث الحالة" });
    }
  }
);

// Assign complaint (Admin only)
router.patch(
  "/:id/assign",
  authenticateToken,
  requireAdmin,
  adminActionRateLimiter,
  [body("assignedToId").notEmpty().withMessage("الموظف المخصص مطلوب")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "بيانات غير صالحة",
          details: errors.array(),
        });
      }

      const { assignedToId } = req.body;
      const complaintId = req.params.id;

      const employee = await prisma.user.findUnique({
        where: { id: assignedToId, role: "EMPLOYEE" },
      });

      if (!employee) {
        return res.status(404).json({ error: "الموظف غير موجود" });
      }

      const updatedComplaint = await prisma.complaint.update({
        where: { id: complaintId },
        data: { assignedToId },
      });

      // Log the assignment
      await prisma.complaintLog.create({
        data: {
          complaintId,
          userId: req.user.id,
          action: "ASSIGNED",
          notes: `تم تخصيص الشكوى للموظف: ${employee.fullName}`,
        },
      });

      res.json({
        success: true,
        complaint: updatedComplaint,
        message: "تم تخصيص الشكوى بنجاح",
      });
    } catch (error) {
      console.error("Assign complaint error:", error);
      res.status(500).json({ error: "خطأ في تخصيص الشكوى" });
    }
  }
);

// Export complaints (Admin/Employee only) with enhanced security
router.get(
  "/export/excel",
  authenticateToken,
  requireRole(["ADMIN", "EMPLOYEE"]),
  [
    query("status").optional().isIn(["UNRESOLVED", "IN_PROGRESS", "RESOLVED"]),
    query("typeId").optional().isString(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
    query("assignedToId").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "معاملات غير صالحة",
          details: errors.array(),
        });
      }

      // Build filters
      const filters = {};

      // Role-based filtering
      if (req.user.role === "EMPLOYEE") {
        filters.assignedToId = req.user.id;
      }

      if (req.query.status) filters.status = req.query.status;
      if (req.query.typeId) filters.typeId = req.query.typeId;
      if (req.query.assignedToId && req.user.role === "ADMIN") {
        filters.assignedToId = req.query.assignedToId;
      }

      // Date filtering
      if (req.query.dateFrom || req.query.dateTo) {
        filters.createdAt = {};
        if (req.query.dateFrom) {
          filters.createdAt.gte = new Date(req.query.dateFrom);
        }
        if (req.query.dateTo) {
          const dateTo = new Date(req.query.dateTo);
          dateTo.setHours(23, 59, 59, 999); // End of day
          filters.createdAt.lte = dateTo;
        }
      }

      const complaints = await prisma.complaint.findMany({
        where: filters,
        include: {
          type: true,
          complainant: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Status translation
      const statusNames = {
        UNRESOLVED: "غير محلولة",
        IN_PROGRESS: "قيد التنفيذ",
        BEING_RESOLVED: "يتم حلها الآن",
        OVERDUE: "متأخرة",
        RESOLVED: "تم الحل",
      };

      const data = complaints.map((complaint) => ({
        "رقم الشكوى": complaint.id,
        "اسم المشتكي": complaint.complainant.fullName,
        "رقم الهاتف": complaint.complainant.phone,
        "الرقم القومي": complaint.complainant.nationalId,
        "البريد الإلكتروني": complaint.complainant.email || "غير محدد",
        "نوع الشكوى": complaint.type.name,
        العنوان: complaint.title,
        الوصف: complaint.description,
        الموقع: complaint.location || "غير محدد",
        الحالة: statusNames[complaint.status] || complaint.status,
        الأولوية:
          complaint.priority === "HIGH"
            ? "عالية"
            : complaint.priority === "MEDIUM"
            ? "متوسطة"
            : "منخفضة",
        "الموظف المخصص": complaint.assignedTo?.fullName || "غير محدد",
        "تاريخ التقديم": complaint.createdAt.toLocaleDateString("ar-EG"),
        "وقت التقديم": complaint.createdAt.toLocaleTimeString("ar-EG"),
        "تاريخ الحل":
          complaint.resolvedAt?.toLocaleDateString("ar-EG") || "لم يتم الحل",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الشكاوى");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const filename = `complaints_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error("Export Excel error:", error);
      res.status(500).json({ error: "خطأ في تصدير Excel" });
    }
  }
);

// Export CSV with enhanced security
router.get(
  "/export/csv",
  authenticateToken,
  requireRole(["ADMIN", "EMPLOYEE"]),
  [
    query("status")
      .optional()
      .isIn([
        "UNRESOLVED",
        "IN_PROGRESS",
        "BEING_RESOLVED",
        "OVERDUE",
        "RESOLVED",
      ]),
    query("typeId").optional().isString(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
    query("assignedToId").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "معاملات غير صالحة",
          details: errors.array(),
        });
      }

      // Build filters (same as Excel export)
      const filters = {};

      if (req.user.role === "EMPLOYEE") {
        filters.assignedToId = req.user.id;
      }

      if (req.query.status) filters.status = req.query.status;
      if (req.query.typeId) filters.typeId = req.query.typeId;
      if (req.query.assignedToId && req.user.role === "ADMIN") {
        filters.assignedToId = req.query.assignedToId;
      }

      if (req.query.dateFrom || req.query.dateTo) {
        filters.createdAt = {};
        if (req.query.dateFrom) {
          filters.createdAt.gte = new Date(req.query.dateFrom);
        }
        if (req.query.dateTo) {
          const dateTo = new Date(req.query.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          filters.createdAt.lte = dateTo;
        }
      }

      const complaints = await prisma.complaint.findMany({
        where: filters,
        include: {
          type: true,
          complainant: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Status translation
      const statusNames = {
        UNRESOLVED: "غير محلولة",
        IN_PROGRESS: "قيد التنفيذ",
        BEING_RESOLVED: "يتم حلها الآن",
        OVERDUE: "متأخرة",
        RESOLVED: "تم الحل",
      };

      // Create CSV content
      const headers = [
        "رقم الشكوى",
        "اسم المشتكي",
        "رقم الهاتف",
        "الرقم القومي",
        "البريد الإلكتروني",
        "نوع الشكوى",
        "العنوان",
        "الوصف",
        "الموقع",
        "الحالة",
        "الأولوية",
        "الموظف المخصص",
        "تاريخ التقديم",
        "وقت التقديم",
        "تاريخ الحل",
      ];

      const csvRows = [
        headers.join(","),
        ...complaints.map((complaint) =>
          [
            `"${complaint.id}"`,
            `"${complaint.complainant.fullName}"`,
            `"${complaint.complainant.phone}"`,
            `"${complaint.complainant.nationalId}"`,
            `"${complaint.complainant.email || "غير محدد"}"`,
            `"${complaint.type.name}"`,
            `"${complaint.title.replace(/"/g, '""')}"`,
            `"${complaint.description.replace(/"/g, '""')}"`,
            `"${complaint.location || "غير محدد"}"`,
            `"${statusNames[complaint.status] || complaint.status}"`,
            `"${
              complaint.priority === "HIGH"
                ? "عالية"
                : complaint.priority === "MEDIUM"
                ? "متوسطة"
                : "منخفضة"
            }"`,
            `"${complaint.assignedTo?.fullName || "غير محدد"}"`,
            `"${complaint.createdAt.toLocaleDateString("ar-EG")}"`,
            `"${complaint.createdAt.toLocaleTimeString("ar-EG")}"`,
            `"${
              complaint.resolvedAt?.toLocaleDateString("ar-EG") || "لم يتم الحل"
            }"`,
          ].join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");
      const filename = `complaints_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // Add BOM for proper Arabic display in Excel
      res.write("\ufeff");
      res.end(csvContent);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({ error: "خطأ في تصدير CSV" });
    }
  }
);

// Add internal note to complaint (Employee/Admin only) with enhanced security
router.post(
  "/:id/internal-note",
  authenticateToken,
  requireRole(["EMPLOYEE", "ADMIN"]),
  adminActionRateLimiter,
  [
    body("note")
      .isLength({ min: 1, max: 1000 })
      .withMessage("الملاحظة مطلوبة (1-1000 حرف)"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "بيانات غير صالحة",
          details: errors.array(),
        });
      }

      const complaintId = req.params.id;
      const { note } = req.body;

      // Check if complaint exists and user has access
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: { assignedTo: true },
      });

      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      // Enhanced role-based access control
      if (
        req.user.role === "EMPLOYEE" &&
        complaint.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error: "غير مسموح لك بإضافة ملاحظات لهذه الشكوى",
        });
      }

      // Add internal note as a log entry
      await prisma.complaintLog.create({
        data: {
          complaintId,
          userId: req.user.id,
          action: "INTERNAL_NOTE",
          notes: note,
        },
      });

      res.json({
        success: true,
        message: "تم إضافة الملاحظة الداخلية بنجاح",
      });
    } catch (error) {
      console.error("Add internal note error:", error);
      res.status(500).json({ error: "خطأ في إضافة الملاحظة الداخلية" });
    }
  }
);

// Get complaint internal notes (Employee/Admin only) with enhanced security
router.get(
  "/:id/internal-notes",
  authenticateToken,
  requireRole(["EMPLOYEE", "ADMIN"]),
  async (req, res) => {
    try {
      const complaintId = req.params.id;

      // Check if complaint exists and user has access
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        select: { id: true, assignedToId: true },
      });

      if (!complaint) {
        return res.status(404).json({ error: "الشكوى غير موجودة" });
      }

      // Enhanced role-based access control
      if (
        req.user.role === "EMPLOYEE" &&
        complaint.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error: "غير مسموح لك بعرض ملاحظات هذه الشكوى",
        });
      }

      // Get internal notes
      const internalNotes = await prisma.complaintLog.findMany({
        where: {
          complaintId,
          action: "INTERNAL_NOTE",
        },
        include: {
          user: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        notes: internalNotes.map((note) => ({
          id: note.id,
          content: note.notes,
          createdAt: note.createdAt,
          createdBy: note.user.fullName,
          createdByRole: note.user.role,
        })),
      });
    } catch (error) {
      console.error("Get internal notes error:", error);
      res.status(500).json({ error: "خطأ في جلب الملاحظات الداخلية" });
    }
  }
);

module.exports = router;
