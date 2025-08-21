const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { isAdminUser } = require("../config/admin");
const { JWT_CONFIG } = require("../config/security");

const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "رمز الوصول مطلوب" });
    }

    // Verify JWT with proper configuration
    const verifyOptions = {
      issuer: JWT_CONFIG.issuer,
      algorithms: [JWT_CONFIG.algorithm]
    };

    let decoded;
    try {
      if (JWT_CONFIG.algorithm === 'RS256' && JWT_CONFIG.publicKey) {
        decoded = jwt.verify(token, JWT_CONFIG.publicKey, verifyOptions);
      } else {
        decoded = jwt.verify(token, JWT_CONFIG.secret, verifyOptions);
      }
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ error: "رمز وصول غير صالح أو منتهي الصلاحية" });
    }

    // Check if userId or complainantId exists in the decoded token
    if (!decoded.userId && !decoded.complainantId) {
      return res
        .status(401)
        .json({ error: "رمز وصول غير صالح - معرف المستخدم مفقود" });
    }

    // If it's a complainant token, we need to fetch complainant data
    if (decoded.complainantId) {
      const complainant = await prisma.complainant.findUnique({
        where: { id: decoded.complainantId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          nationalId: true,
          email: true,
        },
      });

      if (!complainant) {
        return res.status(401).json({ error: "مشتكي غير صالح" });
      }

      req.user = {
        id: complainant.id,
        complainantId: complainant.id,
        role: "CITIZEN",
        fullName: complainant.fullName,
        phone: complainant.phone,
        nationalId: complainant.nationalId,
        email: complainant.email,
      };
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        nationalId: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "مستخدم غير صالح أو غير نشط" });
    }

    // Check if user is admin using the configuration system
    const isAdmin = isAdminUser(user);
    if (isAdmin && user.role !== 'ADMIN') {
      // Update user role to ADMIN if they're in the admin config
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      user.role = 'ADMIN';
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({ error: "رمز وصول غير صالح" });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "مصادقة مطلوبة" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "غير مسموح لك بالوصول" });
    }

    next();
  };
};

// Enhanced authorization policies
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "مصادقة مطلوبة" });
  }

  if (req.user.role !== 'ADMIN' && !isAdminUser(req.user)) {
    return res.status(403).json({ error: "يتطلب صلاحيات المدير" });
  }

  next();
};

const requireOwnerOrAdmin = (resourceType = 'complaint') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "مصادقة مطلوبة" });
    }

    // Admin can access everything
    if (req.user.role === 'ADMIN' || isAdminUser(req.user)) {
      return next();
    }

    // For complaints, check ownership
    if (resourceType === 'complaint') {
      const complaintId = req.params.id || req.params.complaintId;
      if (!complaintId) {
        return res.status(400).json({ error: "معرف الشكوى مطلوب" });
      }

      try {
        const complaint = await prisma.complaint.findUnique({
          where: { id: complaintId },
          select: { 
            id: true, 
            complainantId: true, 
            assignedToId: true 
          }
        });

        if (!complaint) {
          return res.status(404).json({ error: "الشكوى غير موجودة" });
        }

        // Check if user owns the complaint or is assigned to it
        const isOwner = req.user.complainantId === complaint.complainantId;
        const isAssigned = req.user.role === 'EMPLOYEE' && complaint.assignedToId === req.user.id;

        if (!isOwner && !isAssigned) {
          return res.status(403).json({ error: "غير مسموح لك بالوصول لهذه الشكوى" });
        }
      } catch (error) {
        console.error("Ownership check error:", error);
        return res.status(500).json({ error: "خطأ في التحقق من الصلاحيات" });
      }
    }

    next();
  };
};

// Generate JWT tokens with proper configuration
const generateTokens = (payload) => {
  const signOptions = {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    algorithm: JWT_CONFIG.algorithm
  };

  let accessToken, refreshToken;

  if (JWT_CONFIG.algorithm === 'RS256' && JWT_CONFIG.privateKey) {
    accessToken = jwt.sign(payload, JWT_CONFIG.privateKey, {
      ...signOptions,
      expiresIn: JWT_CONFIG.accessTokenExpiry
    });
    refreshToken = jwt.sign(payload, JWT_CONFIG.privateKey, {
      ...signOptions,
      expiresIn: JWT_CONFIG.refreshTokenExpiry
    });
  } else {
    accessToken = jwt.sign(payload, JWT_CONFIG.secret, {
      ...signOptions,
      expiresIn: JWT_CONFIG.accessTokenExpiry
    });
    refreshToken = jwt.sign(payload, JWT_CONFIG.secret, {
      ...signOptions,
      expiresIn: JWT_CONFIG.refreshTokenExpiry
    });
  }

  return { accessToken, refreshToken };
};

// Rate limiting middleware for sensitive endpoints
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters for different endpoints
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const complaintSubmissionRateLimiter = createRateLimiter(60 * 60 * 1000, 10); // 10 complaints per hour
const adminActionRateLimiter = createRateLimiter(5 * 60 * 1000, 50); // 50 actions per 5 minutes

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireOwnerOrAdmin,
  generateTokens,
  createRateLimiter,
  authRateLimiter,
  complaintSubmissionRateLimiter,
  adminActionRateLimiter,
  JWT_CONFIG,
};
