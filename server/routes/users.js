const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (Admin only)
router.get("/", authenticateToken, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        nationalId: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedComplaints: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "خطأ في جلب المستخدمين" });
  }
});

// Create new user (Admin only)
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  [
    body("email").isEmail().withMessage("البريد الإلكتروني غير صالح"),
    body("phone").isMobilePhone("ar-EG").withMessage("رقم هاتف غير صالح"),
    body("nationalId")
      .isLength({ min: 14, max: 14 })
      .withMessage("الرقم القومي يجب أن يكون 14 رقم"),
    body("fullName").isLength({ min: 2 }).withMessage("الاسم مطلوب"),
    body("role").isIn(["EMPLOYEE", "ADMIN"]).withMessage("دور غير صالح"),
    body("password").isLength({ min: 6 }).withMessage("كلمة المرور قصيرة جداً"),
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

      const { email, phone, nationalId, fullName, role, password } = req.body;

      // Check for existing user
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }, { nationalId }],
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: "المستخدم موجود بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          phone,
          nationalId,
          fullName,
          role,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          nationalId: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        user,
        message: "تم إنشاء المستخدم بنجاح",
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "خطأ في إنشاء المستخدم" });
    }
  }
);

// Update user (Admin only)
router.patch(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  [
    body("email")
      .optional()
      .isEmail()
      .withMessage("البريد الإلكتروني غير صالح"),
    body("phone")
      .optional()
      .isMobilePhone("ar-EG")
      .withMessage("رقم هاتف غير صالح"),
    body("fullName").optional().isLength({ min: 2 }).withMessage("الاسم مطلوب"),
    body("role")
      .optional()
      .isIn(["EMPLOYEE", "ADMIN"])
      .withMessage("دور غير صالح"),
    body("isActive").optional().isBoolean(),
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

      const userId = req.params.id;
      const updateData = { ...req.body };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          nationalId: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        user,
        message: "تم تحديث المستخدم بنجاح",
      });
    } catch (error) {
      console.error("Update user error:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      res.status(500).json({ error: "خطأ في تحديث المستخدم" });
    }
  }
);

// Delete user (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if user has assigned complaints
      const assignedComplaints = await prisma.complaint.count({
        where: { assignedToId: userId },
      });

      if (assignedComplaints > 0) {
        return res.status(400).json({
          error: "لا يمكن حذف المستخدم لوجود شكاوى مخصصة له",
        });
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        success: true,
        message: "تم حذف المستخدم بنجاح",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      res.status(500).json({ error: "خطأ في حذف المستخدم" });
    }
  }
);

// Get employees only (for assignment)
router.get(
  "/employees",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const employees = await prisma.user.findMany({
        where: {
          role: "EMPLOYEE",
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          _count: {
            select: {
              assignedComplaints: true,
            },
          },
        },
        orderBy: { fullName: "asc" },
      });

      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ error: "خطأ في جلب الموظفين" });
    }
  }
);

module.exports = router;
