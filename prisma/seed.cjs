const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create complaint types
  const complaintTypes = [
    {
      name: 'شكوى طرق',
      description: 'شكاوى متعلقة بالطرق والشوارع',
      icon: '🚧'
    },
    {
      name: 'شكوى إنارة',
      description: 'شكاوى متعلقة بإضاءة الشوارع',
      icon: '💡'
    },
    {
      name: 'شكوى صرف صحي',
      description: 'شكاوى متعلقة بالصرف الصحي',
      icon: '🚰'
    },
    {
      name: 'شكوى مياه',
      description: 'شكاوى متعلقة بمياه الشرب',
      icon: '💧'
    },
    {
      name: 'شكوى كهرباء',
      description: 'شكاوى متعلقة بالكهرباء',
      icon: '⚡'
    },
    {
      name: 'شكوى نظافة',
      description: 'شكاوى متعلقة بالنظافة العامة',
      icon: '🧹'
    },
    {
      name: 'شكوى مرور',
      description: 'شكاوى متعلقة بالمرور والمواصلات',
      icon: '🚗'
    },
    {
      name: 'شكوى حدائق',
      description: 'شكاوى متعلقة بالحدائق والمناطق الخضراء',
      icon: '🌳'
    },
    {
      name: 'شكوى أمن',
      description: 'شكاوى متعلقة بالأمن والسلامة',
      icon: '👮'
    },
    {
      name: 'شكوى أخرى',
      description: 'شكاوى أخرى متنوعة',
      icon: '📋'
    }
  ];

  console.log('📝 Creating complaint types...');
  for (const type of complaintTypes) {
    await prisma.complaintType.upsert({
      where: { name: type.name },
      update: {
        description: type.description,
        icon: type.icon,
        isActive: true
      },
      create: {
        name: type.name,
        description: type.description,
        icon: type.icon,
        isActive: true
      }
    });
  }

  // Create default admin users with enhanced security
  console.log('👥 Creating admin users...');
  const hashedPassword = await bcrypt.hash("Emovmmm#951753", 12);

  // First admin
  await prisma.user.upsert({
    where: { email: "emanhassanmahmoud1@gmail.com" },
    update: {
      fullName: "إيمان حسن محمود",
      phone: "01000000001",
      nationalId: "12345678901234",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "emanhassanmahmoud1@gmail.com",
      phone: "01000000001",
      nationalId: "12345678901234",
      fullName: "إيمان حسن محمود",
      role: "ADMIN",
      password: hashedPassword,
      isActive: true,
    },
  });

  // Second admin
  await prisma.user.upsert({
    where: { email: "karemelolary8@gmail.com" },
    update: {
      fullName: "كريم العكري",
      phone: "01000000002",
      nationalId: "12345678901235",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "karemelolary8@gmail.com",
      phone: "01000000002",
      nationalId: "12345678901235",
      fullName: "كريم العكري",
      role: "ADMIN",
      password: hashedPassword,
      isActive: true,
    },
  });

  // Create sample employee
  await prisma.user.upsert({
    where: { email: "employee@example.com" },
    update: {
      fullName: "موظف تجريبي",
      phone: "01000000003",
      nationalId: "12345678901236",
      password: hashedPassword,
      role: "EMPLOYEE",
      isActive: true,
    },
    create: {
      email: "employee@example.com",
      phone: "01000000003",
      nationalId: "12345678901236",
      fullName: "موظف تجريبي",
      role: "EMPLOYEE",
      password: hashedPassword,
      isActive: true,
    },
  });

  // Create sample complainant
  await prisma.complainant.upsert({
    where: { phone: "01000000004" },
    update: {
      fullName: "مواطن تجريبي",
      nationalId: "12345678901237",
      email: "citizen@example.com",
    },
    create: {
      fullName: "مواطن تجريبي",
      phone: "01000000004",
      nationalId: "12345678901237",
      email: "citizen@example.com",
    },
  });

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
