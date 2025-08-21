// Test setup file for Jest
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-for-testing-only";
process.env.DATABASE_URL = "file:./test.db";

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Helper to create test data
  createTestUser: async (prisma, userData = {}) => {
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("TestPassword123!", 12);

    return await prisma.user.create({
      data: {
        email: "test@example.com",
        phone: "01000000000",
        nationalId: "12345678901234",
        fullName: "Test User",
        role: "CITIZEN",
        password: hashedPassword,
        isActive: true,
        ...userData,
      },
    });
  },

  // Helper to create test complaint
  createTestComplaint: async (prisma, complaintData = {}) => {
    const complainant = await prisma.complainant.create({
      data: {
        fullName: "Test Complainant",
        phone: "01000000001",
        nationalId: "12345678901235",
        email: "complainant@example.com",
      },
    });

    const complaintType = await prisma.complaintType.findFirst();

    return await prisma.complaint.create({
      data: {
        complainantId: complainant.id,
        typeId: complaintType.id,
        title: "Test Complaint",
        description: "Test complaint description",
        status: "UNRESOLVED",
        ...complaintData,
      },
    });
  },

  // Helper to generate JWT token
  generateToken: (payload) => {
    const jwt = require("jsonwebtoken");
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  },
};
