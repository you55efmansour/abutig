const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard statistics
router.get(
  "/dashboard",
  authenticateToken,
  requireRole(["ADMIN", "EMPLOYEE"]),
  async (req, res) => {
    try {
      let filters = {};

      // Role-based filtering
      if (req.user.role === "EMPLOYEE") {
        filters.assignedToId = req.user.id;
      }
      // ADMIN can see all complaints (no additional filter)

      const [
        totalComplaints,
        newComplaints,
        inProgressComplaints,
        resolvedComplaints,
        complaintsThisMonth,
        complaintsLastMonth,
        complaintsByType,
        complaintsByStatus,
        recentComplaints,
      ] = await Promise.all([
        // Total complaints
        prisma.complaint.count({ where: filters }),

        // New complaints (unresolved)
        prisma.complaint.count({
          where: {
            ...filters,
            status: "UNRESOLVED",
          },
        }),

        // In progress complaints
        prisma.complaint.count({
          where: {
            ...filters,
            status: { in: ["IN_PROGRESS", "BEING_RESOLVED"] },
          },
        }),

        // Resolved complaints
        prisma.complaint.count({
          where: {
            ...filters,
            status: "RESOLVED",
          },
        }),

        // This month complaints
        prisma.complaint.count({
          where: {
            ...filters,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Last month complaints
        prisma.complaint.count({
          where: {
            ...filters,
            createdAt: {
              gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                1
              ),
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Complaints by type
        prisma.complaint.groupBy({
          by: ["typeId"],
          where: filters,
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
        }),

        // Complaints by status
        prisma.complaint.groupBy({
          by: ["status"],
          where: filters,
          _count: {
            id: true,
          },
        }),

        // Recent complaints
        prisma.complaint.findMany({
          where: filters,
          take: 5,
          include: {
            type: true,
            complainant: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      // Get type names for complaints by type
      const typeIds = complaintsByType.map((item) => item.typeId);
      const types = await prisma.complaintType.findMany({
        where: { id: { in: typeIds } },
        select: { id: true, name: true },
      });

      const typeMap = types.reduce((acc, type) => {
        acc[type.id] = type.name;
        return acc;
      }, {});

      const complaintsByTypeWithNames = complaintsByType.map((item) => ({
        type: typeMap[item.typeId] || "غير محدد",
        count: item._count.id,
      }));

      // Calculate growth percentage
      const growthPercentage =
        complaintsLastMonth === 0
          ? complaintsThisMonth > 0
            ? 100
            : 0
          : ((complaintsThisMonth - complaintsLastMonth) /
              complaintsLastMonth) *
            100;

      // Calculate overdue complaints (complaints older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overdueComplaints = await prisma.complaint.count({
        where: {
          ...filters,
          createdAt: {
            lt: sevenDaysAgo,
          },
          // Consider overdue any complaint that is not resolved yet
          status: {
            not: "RESOLVED",
          },
        },
      });

      // Calculate average resolution time
      const resolvedComplaintsData = await prisma.complaint.findMany({
        where: {
          ...filters,
          status: "RESOLVED",
          resolvedAt: {
            not: null,
          },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      });

      const avgResolutionTime =
        resolvedComplaintsData.length > 0
          ? resolvedComplaintsData.reduce((total, complaint) => {
              const resolutionTime =
                new Date(complaint.resolvedAt) - new Date(complaint.createdAt);
              return total + resolutionTime;
            }, 0) /
            resolvedComplaintsData.length /
            (1000 * 60 * 60 * 24) // Convert to days
          : 0;

      // Get total users count
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({
        where: { isActive: true },
      });

      const statsData = {
        totalComplaints,
        newComplaints,
        inProgressComplaints,
        resolvedComplaints,
        totalUsers,
        activeUsers,
        complaintsByType: complaintsByTypeWithNames,
        complaintsByStatus: complaintsByStatus.map((item) => ({
          status: getStatusLabel(item.status),
          count: item._count.id,
        })),
        overdueComplaints,
        avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      };

      console.log("Dashboard stats:", statsData);
      res.json(statsData);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  }
);

// Get monthly statistics
router.get(
  "/monthly",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();

      const monthlyStats = await Promise.all(
        Array.from({ length: 12 }, async (_, index) => {
          const month = index + 1;
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 1);

          const count = await prisma.complaint.count({
            where: {
              createdAt: {
                gte: startDate,
                lt: endDate,
              },
            },
          });

          return {
            month: getMonthName(month),
            count,
          };
        })
      );

      res.json(monthlyStats);
    } catch (error) {
      console.error("Get monthly stats error:", error);
      res.status(500).json({ error: "خطأ في جلب الإحصائيات الشهرية" });
    }
  }
);

// Helper functions
function getStatusLabel(status) {
  const statusLabels = {
    UNRESOLVED: "غير محلولة",
    IN_PROGRESS: "قيد التنفيذ",
    BEING_RESOLVED: "يتم حلها الآن",
    OVERDUE: "متأخرة",
    RESOLVED: "تم الحل",
  };
  return statusLabels[status] || status;
}

function getMonthName(month) {
  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return monthNames[month - 1];
}

module.exports = router;
