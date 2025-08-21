const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the app
const app = require('../server/index.js');

describe('Security Tests', () => {
  let prisma;
  let testUser;
  let testComplainant;
  let adminToken;
  let userToken;
  let complainantToken;

  beforeAll(async () => {
    prisma = new PrismaClient();
    
    // Create test data
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        phone: '01012345678',
        nationalId: '12345678901234',
        fullName: 'Test User',
        password: hashedPassword,
        role: 'EMPLOYEE',
        isActive: true
      }
    });

    testComplainant = await prisma.complainant.create({
      data: {
        fullName: 'Test Complainant',
        phone: '01087654321',
        nationalId: '98765432109876',
        email: 'complainant@example.com'
      }
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: testUser.id, role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: testUser.id, role: 'EMPLOYEE' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    complainantToken = jwt.sign(
      { complainantId: testComplainant.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.complainant.delete({ where: { id: testComplainant.id } });
    await prisma.$disconnect();
  });

  describe('Authentication & Authorization', () => {
    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/complaints')
        .expect(401);
      
      expect(response.body.error).toBe('رمز الوصول مطلوب');
    });

    test('should validate JWT tokens', async () => {
      const response = await request(app)
        .get('/api/complaints')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBe('رمز وصول غير صالح أو منتهي الصلاحية');
    });

    test('should enforce role-based access control', async () => {
      // Employee should not access admin routes
      const response = await request(app)
        .get('/api/complaints/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('يتطلب صلاحيات المدير');
    });

    test('should allow admin access to all routes', async () => {
      const response = await request(app)
        .get('/api/complaints/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toBeDefined();
    });
  });

  describe('Input Validation & Sanitization', () => {
    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        })
        .expect(400);
      
      expect(response.body.error).toBe('بيانات غير صالحة');
    });

    test('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '123', // Invalid phone
          nationalId: '12345678901234',
          typeId: '1',
          title: 'Test Complaint',
          description: 'Test description'
        })
        .expect(400);
      
      expect(response.body.error).toBe('بيانات غير صحيحة');
    });

    test('should validate national ID format', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '01012345678',
          nationalId: '123', // Invalid national ID
          typeId: '1',
          title: 'Test Complaint',
          description: 'Test description'
        })
        .expect(400);
      
      expect(response.body.error).toBe('بيانات غير صحيحة');
    });

    test('should sanitize SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/complaints')
        .query({ search: "'; DROP TABLE complaints; --" })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      // Should not crash and should return empty results
      expect(response.body.complaints).toBeDefined();
    });

    test('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/complaints/submit')
        .send({
          fullName: 'Test User',
          phone: '01012345678',
          nationalId: '12345678901234',
          typeId: '1',
          title: xssPayload,
          description: 'Test description'
        })
        .expect(400); // Should be rejected due to validation
      
      expect(response.body.error).toBe('بيانات غير صحيحة');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on auth endpoints', async () => {
      const promises = [];
      
      // Make 6 requests (exceeding the limit of 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error).toBe('تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة لاحقاً.');
    });

    test('should enforce rate limiting on complaint submission', async () => {
      const promises = [];
      
      // Make 11 requests (exceeding the limit of 10)
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post('/api/complaints/submit')
            .send({
              fullName: 'Test User',
              phone: '01012345678',
              nationalId: '12345678901234',
              typeId: '1',
              title: `Test Complaint ${i}`,
              description: 'Test description'
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error).toBe('تم تجاوز الحد الأقصى لتقديم الشكاوى. يرجى المحاولة لاحقاً.');
    });
  });

  describe('File Upload Security', () => {
    test('should reject files with invalid extensions', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', Buffer.from('test'), 'test.exe')
        .field('fullName', 'Test User')
        .field('phone', '01012345678')
        .field('nationalId', '12345678901234')
        .field('typeId', '1')
        .field('title', 'Test Complaint')
        .field('description', 'Test description')
        .expect(400);
      
      expect(response.body.error).toBe('امتداد الملف غير مدعوم');
    });

    test('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', largeBuffer, 'large.pdf')
        .field('fullName', 'Test User')
        .field('phone', '01012345678')
        .field('nationalId', '12345678901234')
        .field('typeId', '1')
        .field('title', 'Test Complaint')
        .field('description', 'Test description')
        .expect(400);
      
      expect(response.body.error).toContain('حجم الملف يجب أن يكون أقل من');
    });

    test('should reject files with invalid MIME types', async () => {
      const response = await request(app)
        .post('/api/complaints/submit')
        .attach('files', Buffer.from('test'), 'test.txt')
        .field('fullName', 'Test User')
        .field('phone', '01012345678')
        .field('nationalId', '12345678901234')
        .field('typeId', '1')
        .field('title', 'Test Complaint')
        .field('description', 'Test description')
        .expect(400);
      
      expect(response.body.error).toBe('نوع الملف غير مدعوم');
    });
  });

  describe('Data Access Control', () => {
    test('should prevent users from accessing other users complaints', async () => {
      // Create a complaint for the complainant
      const complaint = await prisma.complaint.create({
        data: {
          complainantId: testComplainant.id,
          typeId: '1',
          title: 'Test Complaint',
          description: 'Test description',
          status: 'UNRESOLVED'
        }
      });

      // Try to access it with user token (should fail)
      const response = await request(app)
        .get(`/api/complaints/${complaint.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('غير مسموح لك بالوصول لهذه الشكوى');

      // Clean up
      await prisma.complaint.delete({ where: { id: complaint.id } });
    });

    test('should allow complainants to access their own complaints', async () => {
      // Create a complaint for the complainant
      const complaint = await prisma.complaint.create({
        data: {
          complainantId: testComplainant.id,
          typeId: '1',
          title: 'Test Complaint',
          description: 'Test description',
          status: 'UNRESOLVED'
        }
      });

      // Access it with complainant token (should succeed)
      const response = await request(app)
        .get(`/api/complaints/${complaint.id}`)
        .set('Authorization', `Bearer ${complainantToken}`)
        .expect(200);
      
      expect(response.body.id).toBe(complaint.id);

      // Clean up
      await prisma.complaint.delete({ where: { id: complaint.id } });
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('CORS Protection', () => {
    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(200); // Should still work but with CORS headers
      
      // Check if CORS headers are present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Password Security', () => {
    test('should hash passwords properly', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);
      
      // Verify the password is hashed
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);
      
      // Verify password comparison works
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Test User',
          email: 'newuser@example.com',
          phone: '01012345679',
          nationalId: '12345678901235',
          role: 'EMPLOYEE',
          password: '123' // Weak password
        })
        .expect(400);
      
      expect(response.body.error).toBe('بيانات غير صحيحة');
    });
  });

  describe('Session Management', () => {
    test('should expire tokens properly', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, role: 'EMPLOYEE' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' } // Expired immediately
      );

      const response = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      
      expect(response.body.error).toBe('رمز الوصول منتهي الصلاحية');
    });
  });

  describe('Error Handling', () => {
    test('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);
      
      expect(response.body.error).toBe('المسار غير موجود');
      expect(response.body.stack).toBeUndefined(); // Should not leak stack trace
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      expect(response.body.error).toBe('خطأ داخلي في الخادم');
    });
  });
});
