const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { JWT_CONFIG } = require('../config/security');

const router = express.Router();
const prisma = new PrismaClient();

// Citizen verification (SMS simulation)
router.post('/verify-citizen', [
  body('phone').isMobilePhone('ar-EG').withMessage('رقم هاتف غير صالح'),
  body('nationalId').isLength({ min: 14, max: 14 }).withMessage('الرقم القومي يجب أن يكون 14 رقم'),
  body('fullName').isLength({ min: 2 }).withMessage('الاسم مطلوب')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'بيانات غير صالحة',
        details: errors.array()
      });
    }

    const { phone, nationalId, fullName } = req.body;

    // Check if complainant exists, create if not
    let complainant = await prisma.complainant.findFirst({
      where: {
        OR: [
          { phone },
          { nationalId }
        ]
      }
    });

    if (!complainant) {
      complainant = await prisma.complainant.create({
        data: {
          phone,
          nationalId,
          fullName
        }
      });
    }

    // Generate access token for complainant
    const token = jwt.sign(
      { complainantId: complainant.id, type: 'complainant' },
      JWT_CONFIG.secret,
      { 
        expiresIn: '24h',
        issuer: JWT_CONFIG.issuer
      }
    );

    res.json({
      success: true,
      token,
      complainant: {
        id: complainant.id,
        fullName: complainant.fullName,
        phone: complainant.phone
      },
      message: 'تم التحقق بنجاح'
    });
  } catch (error) {
    console.error('Citizen verification error:', error);
    res.status(500).json({ error: 'خطأ في التحقق' });
  }
});

// Staff/Admin login
router.post('/login', [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور قصيرة جداً')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'بيانات غير صالحة',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'الحساب غير مفعل' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_CONFIG.secret,
      { 
        expiresIn: '8h',
        issuer: JWT_CONFIG.issuer
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

module.exports = router;