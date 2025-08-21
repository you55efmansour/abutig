const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all complaint types
router.get('/', async (req, res) => {
  try {
    const types = await prisma.complaintType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json(types);
  } catch (error) {
    console.error('Get types error:', error);
    res.status(500).json({ error: 'خطأ في جلب أنواع الشكاوى' });
  }
});

// Create new complaint type (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), [
  body('name').isLength({ min: 2 }).withMessage('اسم النوع مطلوب'),
  body('description').optional().isString(),
  body('icon').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'بيانات غير صالحة',
        details: errors.array()
      });
    }

    const { name, description, icon } = req.body;

    const existingType = await prisma.complaintType.findUnique({
      where: { name }
    });

    if (existingType) {
      return res.status(400).json({ error: 'نوع الشكوى موجود بالفعل' });
    }

    const type = await prisma.complaintType.create({
      data: {
        name,
        description: description || null,
        icon: icon || null
      }
    });

    res.status(201).json({
      success: true,
      type,
      message: 'تم إنشاء نوع الشكوى بنجاح'
    });
  } catch (error) {
    console.error('Create type error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء نوع الشكوى' });
  }
});

// Update complaint type (Admin only)
router.patch('/:id', authenticateToken, requireRole(['ADMIN']), [
  body('name').optional().isLength({ min: 2 }).withMessage('اسم النوع مطلوب'),
  body('description').optional().isString(),
  body('icon').optional().isString(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'بيانات غير صالحة',
        details: errors.array()
      });
    }

    const typeId = req.params.id;
    const updateData = { ...req.body };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const type = await prisma.complaintType.update({
      where: { id: typeId },
      data: updateData
    });

    res.json({
      success: true,
      type,
      message: 'تم تحديث نوع الشكوى بنجاح'
    });
  } catch (error) {
    console.error('Update type error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'نوع الشكوى غير موجود' });
    }
    res.status(500).json({ error: 'خطأ في تحديث نوع الشكوى' });
  }
});

// Delete complaint type (Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const typeId = req.params.id;

    // Check if type has complaints
    const complaintsCount = await prisma.complaint.count({
      where: { typeId }
    });

    if (complaintsCount > 0) {
      return res.status(400).json({ 
        error: 'لا يمكن حذف نوع الشكوى لوجود شكاوى مرتبطة به' 
      });
    }

    await prisma.complaintType.delete({
      where: { id: typeId }
    });

    res.json({
      success: true,
      message: 'تم حذف نوع الشكوى بنجاح'
    });
  } catch (error) {
    console.error('Delete type error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'نوع الشكوى غير موجود' });
    }
    res.status(500).json({ error: 'خطأ في حذف نوع الشكوى' });
  }
});

module.exports = router;