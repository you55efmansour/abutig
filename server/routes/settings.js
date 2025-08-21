// NEW FUNCTIONALITY: إدارة الإعدادات - تم إضافته في الإصدار 2.0.0
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, requireRole } = require("../middleware/auth");
const nodemailer = require("nodemailer");

const router = express.Router();
const prisma = new PrismaClient();

// Get system settings (Admin only) - NEW FUNCTIONALITY
router.get("/", authenticateToken, requireRole(["ADMIN"]), async (req, res) => {
  try {
    // For now, we'll return environment-based settings
    // In a production system, these would be stored in database
    const settings = {
      email: {
        host: process.env.EMAIL_HOST || "",
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === "true",
        user: process.env.EMAIL_USER || "",
        // Don't return password for security
        isConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      },
      system: {
        siteName: "نظام الشكاوى البلدية - مجلس مدينة أبوتيج",
        maxFileSize: "10MB",
        maxFilesPerComplaint: 5,
        allowedFileTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "application/pdf",
          "text/plain",
        ],
        autoAssignment: false,
        emailNotifications: true,
      },
      adminEmails: ["emanhassanmahmoud1@gmail.com", "karemelolary8@gmail.com"],
    };

    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "خطأ في جلب الإعدادات" });
  }
});

// Update email settings (Admin only) - NEW FUNCTIONALITY
router.patch(
  "/email",
  authenticateToken,
  requireRole(["ADMIN"]),
  [
    body("host").optional().isString().withMessage("خادم البريد غير صالح"),
    body("port")
      .optional()
      .isInt({ min: 1, max: 65535 })
      .withMessage("منفذ البريد غير صالح"),
    body("secure").optional().isBoolean(),
    body("user").optional().isEmail().withMessage("بريد المرسل غير صالح"),
    body("password")
      .optional()
      .isString()
      .withMessage("كلمة مرور البريد مطلوبة"),
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

      const { host, port, secure, user, password } = req.body;

      // Test email configuration if provided
      if (host && port && user && password) {
        try {
          const testTransporter = nodemailer.createTransporter({
            host,
            port: parseInt(port),
            secure: secure || false,
            auth: {
              user,
              pass: password,
            },
          });

          // Verify connection
          await testTransporter.verify();

          // Send test email
          await testTransporter.sendMail({
            from: user,
            to: user,
            subject: "اختبار إعدادات البريد الإلكتروني",
            html: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>تم تكوين البريد الإلكتروني بنجاح</h2>
              <p>تم اختبار إعدادات البريد الإلكتروني وهي تعمل بشكل صحيح.</p>
              <p>تاريخ الاختبار: ${new Date().toLocaleString("ar-EG")}</p>
            </div>
          `,
          });

          console.log("✅ تم اختبار إعدادات البريد الإلكتروني بنجاح");
        } catch (emailError) {
          console.error("❌ خطأ في اختبار البريد الإلكتروني:", emailError);
          return res.status(400).json({
            error: "فشل في اختبار إعدادات البريد الإلكتروني",
            details: emailError.message,
          });
        }
      }

      // In a production system, you would save these to database
      // For now, we'll just return success (settings are managed via environment variables)
      res.json({
        success: true,
        message: "تم تحديث إعدادات البريد الإلكتروني بنجاح",
        note: "يرجى تحديث متغيرات البيئة وإعادة تشغيل الخادم لتفعيل الإعدادات الجديدة",
      });
    } catch (error) {
      console.error("Update email settings error:", error);
      res.status(500).json({ error: "خطأ في تحديث إعدادات البريد الإلكتروني" });
    }
  }
);

// Test email configuration (Admin only) - NEW FUNCTIONALITY
router.post(
  "/email/test",
  authenticateToken,
  requireRole(["ADMIN"]),
  [
    body("testEmail")
      .isEmail()
      .withMessage("البريد الإلكتروني للاختبار غير صالح"),
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

      const { testEmail } = req.body;

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(400).json({
          error: "إعدادات البريد الإلكتروني غير مكتملة",
        });
      }

      const transporter = nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: testEmail,
        subject: "اختبار نظام البريد الإلكتروني - مجلس مدينة أبوتيج",
        html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            اختبار نظام البريد الإلكتروني
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>مرحباً،</p>
            <p>هذه رسالة اختبار من نظام إدارة الشكاوى البلدية لمجلس مدينة أبوتيج.</p>
            <p>إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح.</p>
          </div>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>تاريخ الاختبار:</strong> ${new Date().toLocaleString(
              "ar-EG"
            )}</p>
            <p><strong>المرسل:</strong> نظام إدارة الشكاوى البلدية</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px;">
              مجلس مدينة أبوتيج - خدمة المواطنين أولوية
            </p>
          </div>
        </div>
      `,
      });

      res.json({
        success: true,
        message: "تم إرسال رسالة الاختبار بنجاح",
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({
        error: "فشل في إرسال رسالة الاختبار",
        details: error.message,
      });
    }
  }
);

// Get system statistics for admin dashboard (Admin only) - NEW FUNCTIONALITY
router.get(
  "/system-info",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const [
        totalUsers,
        activeUsers,
        totalComplaintTypes,
        activeComplaintTypes,
        totalComplaints,
        complaintsThisMonth,
        systemUptime,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.complaintType.count(),
        prisma.complaintType.count({ where: { isActive: true } }),
        prisma.complaint.count(),
        prisma.complaint.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        process.uptime(),
      ]);

      const systemInfo = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        complaintTypes: {
          total: totalComplaintTypes,
          active: activeComplaintTypes,
          inactive: totalComplaintTypes - activeComplaintTypes,
        },
        complaints: {
          total: totalComplaints,
          thisMonth: complaintsThisMonth,
        },
        system: {
          uptime: Math.floor(systemUptime),
          uptimeFormatted: formatUptime(systemUptime),
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      res.json(systemInfo);
    } catch (error) {
      console.error("Get system info error:", error);
      res.status(500).json({ error: "خطأ في جلب معلومات النظام" });
    }
  }
);

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} يوم، ${hours} ساعة، ${minutes} دقيقة`;
  } else if (hours > 0) {
    return `${hours} ساعة، ${minutes} دقيقة`;
  } else {
    return `${minutes} دقيقة`;
  }
}

module.exports = router;
