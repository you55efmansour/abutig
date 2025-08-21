// NEW FUNCTIONALITY: نظام الإشعارات - تم إضافته في الإصدار 2.0.0
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get notifications for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    let notifications = [];

    if (req.user.role === "CITIZEN") {
      // For citizens, get notifications related to their complaints
      const complaints = await prisma.complaint.findMany({
        where: { complainantId: req.user.id },
        select: { id: true },
      });

      const complaintIds = complaints.map((c) => c.id);

      notifications = await prisma.complaintLog.findMany({
        where: {
          complaintId: { in: complaintIds },
          userId: { not: req.user.id }, // Exclude logs created by the citizen
        },
        include: {
          complaint: {
            select: {
              title: true,
            },
          },
          user: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Limit to last 50 notifications
      });

      // Transform logs to notification format
      notifications = notifications.map((log) => ({
        id: log.id,
        type: getNotificationType(log.action),
        title: getNotificationTitle(log.action),
        message: getNotificationMessage(
          log.action,
          log.oldStatus,
          log.newStatus,
          log.notes
        ),
        complaintId: log.complaintId,
        complaintTitle: log.complaint.title,
        createdAt: log.createdAt,
        read: false, // For now, all notifications are considered unread
      }));
    } else {
      // For employees and admins, get notifications about new complaints and updates
      const recentComplaints = await prisma.complaint.findMany({
        where: {
          OR: [{ status: "NEW" }, { assignedToId: req.user.id }],
        },
        include: {
          type: true,
          complainant: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      notifications = recentComplaints.map((complaint) => ({
        id: `complaint-${complaint.id}`,
        type: complaint.status === "NEW" ? "new_complaint" : "status_update",
        title: complaint.status === "NEW" ? "شكوى جديدة" : "تحديث حالة الشكوى",
        message:
          complaint.status === "NEW"
            ? `تم تقديم شكوى جديدة من ${complaint.complainant.fullName}`
            : `تم تحديث حالة الشكوى إلى ${getStatusName(complaint.status)}`,
        complaintId: complaint.id,
        complaintTitle: complaint.title,
        createdAt: complaint.createdAt,
        read: false,
      }));
    }

    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "خطأ في جلب الإشعارات" });
  }
});

// Mark notification as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    // For now, we'll just return success since we're not storing read status
    // In a real implementation, you'd update a notifications table
    res.json({ success: true, message: "تم تحديد الإشعار كمقروء" });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ error: "خطأ في تحديث الإشعار" });
  }
});

// Mark all notifications as read
router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    // For now, we'll just return success since we're not storing read status
    // In a real implementation, you'd update all notifications for the user
    res.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ error: "خطأ في تحديث الإشعارات" });
  }
});

// Helper functions
function getNotificationType(action) {
  switch (action) {
    case "STATUS_UPDATE":
      return "status_update";
    case "ASSIGNED":
      return "assigned";
    case "RESOLVED":
      return "resolved";
    case "COMMENT_ADDED":
      return "new_message";
    default:
      return "general";
  }
}

function getNotificationTitle(action) {
  switch (action) {
    case "STATUS_UPDATE":
      return "تحديث حالة الشكوى";
    case "ASSIGNED":
      return "تم تخصيص الشكوى";
    case "RESOLVED":
      return "تم حل الشكوى";
    case "COMMENT_ADDED":
      return "تم إضافة تعليق جديد";
    default:
      return "إشعار جديد";
  }
}

function getNotificationMessage(action, oldStatus, newStatus, notes) {
  switch (action) {
    case "STATUS_UPDATE":
      return `تم تغيير حالة الشكوى من ${getStatusName(
        oldStatus
      )} إلى ${getStatusName(newStatus)}${notes ? ` - ${notes}` : ""}`;
    case "ASSIGNED":
      return "تم تخصيص الشكوى لموظف للمراجعة";
    case "RESOLVED":
      return "تم حل الشكوى بنجاح";
    case "COMMENT_ADDED":
      return `تم إضافة تعليق: ${notes || ""}`;
    default:
      return "تم تحديث الشكوى";
  }
}

function getStatusName(status) {
  const statusNames = {
    UNRESOLVED: "غير محلولة",
    IN_PROGRESS: "قيد التنفيذ",
    BEING_RESOLVED: "يتم حلها الآن",
    OVERDUE: "متأخرة",
    RESOLVED: "تم الحل",
  };
  return statusNames[status] || status;
}

module.exports = router;
