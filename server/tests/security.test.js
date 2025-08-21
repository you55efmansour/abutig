const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Mock the server app
let app;

beforeAll(async () => {
  // Import the app after setting up test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  
  // Create test database connection
  await prisma.$connect();
  
  // Import app after environment setup
  app = require('../index');
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data
  await prisma.complaintLog.deleteMany();
  await prisma.complaintStatusChange.deleteMany();
  await prisma.complaintFile.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.complainant.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['emanhassanmahmoud1@gmail.com', 'karemelolary8@gmail.com']
      }
    }
  });
});

describe('Security Tests', () => {
  let adminToken, citizenToken, employeeToken;
  let adminUser, citizenUser, employeeUser;
  let testComplaint;

  beforeEach(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        phone: '01000000010',
        nationalId: '12345678901240',
        fullName: 'Admin Test',
        role: 'ADMIN',
        password: hashedPassword,
        isActive: true
      }
    });

    employeeUser = await prisma.user.create({
      data: {
        email: 'employee@test.com',
        phone: '01000000011',
        nationalId: '12345678901241',
        fullName: 'Employee Test',
        role: 'EMPLOYEE',
        password: hashedPassword,
        isActive: true
      }
    });

    const complainant = await prisma.complainant.create({
      data: {
        fullName: 'Citizen Test',
        phone: '01000000012',
        nationalId: '12345678901242',
        email: 'citizen@test.com'
      }
    });

    // Create test complaint
    const complaintType = await prisma.complaintType.findFirst();
    testComplaint = await prisma.complaint.create({
      data: {
        complainantId: complainant.id,
        typeId: complaintType.id,
        title: 'Test Complaint',
        description: 'Test complaint description',
        status: 'UNRESOLVED'
      }
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    citizenToken = jwt.sign(
      { complainantId: complainant.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    employeeToken = jwt.sign(
      { userId: employeeUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Tests', () => {
    test('should reject requests without valid JWT token', async () => {
      const response = await request(app)
        .get('/api/complaints')
        .expect(401);

      expect(response.body.error).toBe('رمز الوصول مطلوب');
    });

    test('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/complaints')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('رمز وصول غير صالح أو منتهي الصلاحية');
    });

    test('should reject requests with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('رمز وصول غير صالح أو منتهي الصلاحية');
    });
  });

  describe('Authorization Tests', () => {
    test('citizen should not access another user complaint', async () => {
      // Create another complaint
      const anotherComplainant = await prisma.complainant.create({
        data: {
          fullName: 'Another Citizen',
          phone: '01000000013',
          nationalId: '12345678901243'
        }
      });

      const complaintType = await prisma.complaintType.findFirst();
      const anotherComplaint = await prisma.complaint.create({
        data: {
          complainantId: anotherComplainant.id,
          typeId: complaintType.id,
          title: 'Another Complaint',
          description: 'Another complaint description',
          status: 'UNRESOLVED'
        }
      });

      const response = await request(app)
        .get(`/api/complaints/${anotherComplaint.id}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);

      expect(response.body.error).toBe('غير مسموح لك بالوصول لهذه الشكوى');
    });

    test('employee should not access unassigned complaints', async () => {
      const response = await request(app)
        .get(`/api/complaints/${testComplaint.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.error).toBe('غير مسموح لك بالوصول لهذه الشكوى');
    });

    test('admin should access all complaints', async () => {
      const response = await request(app)
        .get(`/api/complaints/${testComplaint.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testComplaint.id);
    });

    test('only admin should access admin-only endpoints', async () => {
      const response = await request(app)
        .get('/api/complaints/admin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.error).toBe('غير مسموح لك بالوصول');
    });
  });

  describe('Input Validation Tests', () => {
    test('should reject XSS payloads in complaint submission', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '01000000014',
          nationalId: '12345678901244',
          typeId: (await prisma.complaintType.findFirst()).id,
          title: xssPayload,
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.error).toBe('بيانات غير صحيحة');
    });

    test('should reject SQL injection attempts', async () => {
      const sqlInjectionPayload = "'; DROP TABLE complaints; --";
      
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '01000000015',
          nationalId: '12345678901245',
          typeId: (await prisma.complaintType.findFirst()).id,
          title: 'Test Title',
          description: sqlInjectionPayload
        })
        .expect(400);

      expect(response.body.error).toBe('بيانات غير صحيحة');
    });

    test('should reject invalid phone numbers', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: 'invalid-phone',
          nationalId: '12345678901246',
          typeId: (await prisma.complaintType.findFirst()).id,
          title: 'Test Title',
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.error).toBe('بيانات غير صحيحة');
    });

    test('should reject invalid national ID', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '01000000016',
          nationalId: '123', // Too short
          typeId: (await prisma.complaintType.findFirst()).id,
          title: 'Test Title',
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.error).toBe('بيانات غير صحيحة');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should limit authentication attempts', async () => {
      const loginAttempts = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'wrong-password'
          })
      );

      const responses = await Promise.all(loginAttempts);
      const lastResponse = responses[responses.length - 1];
      
      expect(lastResponse.status).toBe(429);
    });

    test('should limit complaint submissions', async () => {
      const complaintType = await prisma.complaintType.findFirst();
      const submissionAttempts = Array(11).fill().map((_, index) => 
        request(app)
          .post('/api/complaints/submit')
          .send({
            fullName: `Test User ${index}`,
            phone: `0100000001${index}`,
            nationalId: `1234567890124${index}`,
            typeId: complaintType.id,
            title: `Test Title ${index}`,
            description: 'Test description'
          })
      );

      const responses = await Promise.all(submissionAttempts);
      const lastResponse = responses[responses.length - 1];
      
      expect(lastResponse.status).toBe(429);
    });
  });

  describe('File Upload Security Tests', () => {
    test('should reject files with disallowed extensions', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload'
        })
        .field('fullName', 'Test User')
        .field('phone', '01000000017')
        .field('nationalId', '12345678901247')
        .field('typeId', (await prisma.complaintType.findFirst()).id)
        .field('title', 'Test Title')
        .field('description', 'Test description')
        .expect(400);

      expect(response.body.error).toBe('امتداد الملف غير مدعوم');
    });

    test('should reject files exceeding size limit', async () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', largeFile, {
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        })
        .field('fullName', 'Test User')
        .field('phone', '01000000018')
        .field('nationalId', '12345678901248')
        .field('typeId', (await prisma.complaintType.findFirst()).id)
        .field('title', 'Test Title')
        .field('description', 'Test description')
        .expect(400);

      expect(response.body.error).toContain('حجم الملف يجب أن يكون أقل من');
    });
  });

  describe('Path Traversal Tests', () => {
    test('should reject path traversal attempts in file uploads', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', Buffer.from('test'), {
          filename: '../../../etc/passwd',
          contentType: 'text/plain'
        })
        .field('fullName', 'Test User')
        .field('phone', '01000000019')
        .field('nationalId', '12345678901249')
        .field('typeId', (await prisma.complaintType.findFirst()).id)
        .field('title', 'Test Title')
        .field('description', 'Test description')
        .expect(400);

      expect(response.body.error).toBe('امتداد الملف غير مدعوم');
    });
  });

  describe('Status Change Authorization Tests', () => {
    test('only admin and assigned employee can change complaint status', async () => {
      // Assign complaint to employee
      await prisma.complaint.update({
        where: { id: testComplaint.id },
        data: { assignedToId: employeeUser.id }
      });

      // Citizen should not be able to change status
      const citizenResponse = await request(app)
        .patch(`/api/complaints/${testComplaint.id}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(403);

      expect(citizenResponse.body.error).toBe('غير مسموح لك بالوصول');

      // Employee should be able to change status
      const employeeResponse = await request(app)
        .patch(`/api/complaints/${testComplaint.id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(employeeResponse.body.success).toBe(true);
    });
  });
});
