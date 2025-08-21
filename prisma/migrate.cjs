const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');

    // Update existing complaints to use new status values
    console.log('📝 Updating complaint statuses...');
    
    // Map old status values to new ones
    const statusMapping = {
      'NEW': 'UNRESOLVED',
      'UNDER_REVIEW': 'IN_PROGRESS',
      'IN_PROGRESS': 'IN_PROGRESS',
      'BEING_RESOLVED': 'BEING_RESOLVED',
      'OVERDUE': 'OVERDUE',
      'RESOLVED': 'RESOLVED',
      'REJECTED': 'UNRESOLVED', // Map rejected to unresolved
      'CLOSED': 'RESOLVED' // Map closed to resolved
    };

    // Get all complaints with old status values
    const complaints = await prisma.complaint.findMany({
      select: { id: true, status: true }
    });

    for (const complaint of complaints) {
      const newStatus = statusMapping[complaint.status] || 'UNRESOLVED';
      if (newStatus !== complaint.status) {
        await prisma.complaint.update({
          where: { id: complaint.id },
          data: { status: newStatus }
        });
        console.log(`Updated complaint ${complaint.id}: ${complaint.status} -> ${newStatus}`);
      }
    }

    // Update user roles to use new enum
    console.log('👥 Updating user roles...');
    
    const roleMapping = {
      'ADMIN': 'ADMIN',
      'EMPLOYEE': 'EMPLOYEE',
      'CITIZEN': 'CITIZEN'
    };

    const users = await prisma.user.findMany({
      select: { id: true, role: true }
    });

    for (const user of users) {
      const newRole = roleMapping[user.role] || 'CITIZEN';
      if (newRole !== user.role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: newRole }
        });
        console.log(`Updated user ${user.id}: ${user.role} -> ${newRole}`);
      }
    }

    // Update complaint logs to use new status enum
    console.log('📋 Updating complaint logs...');
    
    const logs = await prisma.complaintLog.findMany({
      select: { id: true, oldStatus: true, newStatus: true }
    });

    for (const log of logs) {
      const updates = {};
      
      if (log.oldStatus && statusMapping[log.oldStatus]) {
        updates.oldStatus = statusMapping[log.oldStatus];
      }
      
      if (log.newStatus && statusMapping[log.newStatus]) {
        updates.newStatus = statusMapping[log.newStatus];
      }

      if (Object.keys(updates).length > 0) {
        await prisma.complaintLog.update({
          where: { id: log.id },
          data: updates
        });
        console.log(`Updated log ${log.id}`);
      }
    }

    // Create default complaint types if they don't exist
    console.log('🏷️ Ensuring complaint types exist...');
    
    const defaultTypes = [
      {
        name: "شكوى بناء مخالف",
        description: "بناء بدون ترخيص أو مخالف للقوانين",
        icon: "🏚️",
      },
      {
        name: "شكوى صرف صحي",
        description: "مشاكل في شبكة الصرف الصحي",
        icon: "🚽",
      },
      {
        name: "شكوى نظافة أو قمامة",
        description: "تراكم القمامة أو عدم النظافة",
        icon: "♻️",
      },
      {
        name: "شكوى طريق أو رصف",
        description: "تلف في الطرق أو الأرصفة",
        icon: "🚧",
      },
      {
        name: "شكوى إنارة",
        description: "مشاكل في الإنارة العامة",
        icon: "💡",
      },
      {
        name: "شكوى ضعف أو انقطاع الإنترنت",
        description: "ضعف أو انقطاع الإنترنت / الشبكة",
        icon: "📶",
      },
      {
        name: "شكوى تعديات على ممتلكات عامة",
        description: "تعديات على الأراضي أو الممتلكات العامة",
        icon: "🌳",
      },
      {
        name: "شكوى صيانة أو كهرباء",
        description: "مشاكل في الصيانة أو الكهرباء",
        icon: "🛠️",
      },
      {
        name: "شكوى أمنية أو تعدي",
        description: "مشاكل أمنية أو تعديات",
        icon: "🚓",
      },
      {
        name: "أخرى",
        description: "شكاوى أخرى (مع تحديد التفاصيل)",
        icon: "✉️",
      },
    ];

    for (const type of defaultTypes) {
      await prisma.complaintType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };
