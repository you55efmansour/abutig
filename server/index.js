const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { migrateDatabase } = require("../prisma/migrate.cjs");

// Security middleware imports
const {
  xssProtection,
  preventPathTraversal,
  securityHeaders,
  mongoSanitize,
  xss
} = require("./middleware/security");

const {
  CSP_CONFIG,
  RATE_LIMIT_CONFIG,
  CORS_CONFIG,
  SECURITY_HEADERS,
  DB_SECURITY_CONFIG
} = require("./config/security");

const authRoutes = require("./routes/auth");
const complaintRoutes = require("./routes/complaints");
const userRoutes = require("./routes/users");
const typeRoutes = require("./routes/types");
const statsRoutes = require("./routes/stats");
const notificationRoutes = require("./routes/notifications");
const settingsRoutes = require("./routes/settings");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: CSP_CONFIG.directives,
  crossOriginEmbedderPolicy: false, // Allow external resources
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Enhanced CORS with security
app.use(cors(CORS_CONFIG));

// Security headers
app.use(securityHeaders);

// Input sanitization and protection
app.use(mongoSanitize());
app.use(xss());
app.use(xssProtection);
app.use(preventPathTraversal);

// Enhanced rate limiting with different rules for different endpoints
const generalLimiter = rateLimit(RATE_LIMIT_CONFIG.general);
app.use(generalLimiter);

// Body parsing middleware with enhanced security
app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    // Only verify JSON for specific content types
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      try {
        JSON.parse(buf);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "10mb",
  parameterLimit: 100 // Limit number of parameters
}));

// Static files with enhanced security headers
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${logLevel}] [${requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    
    // Log sensitive operations
    if (req.path.includes('/auth') || req.path.includes('/admin') || req.method === 'POST') {
      console.log(`[AUDIT] [${requestId}] ${req.method} ${req.path} - User: ${req.user?.id || 'anonymous'} - IP: ${req.ip}`);
    }
  });
  next();
});

// Routes with enhanced rate limiting
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/users", userRoutes);
app.use("/api/types", typeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);

// Enhanced health check with security
const healthHandler = (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
app.get("/", healthHandler);

// Enhanced 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "المسار غير موجود",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced global error handler with security
app.use((error, req, res, next) => {
  const requestId = res.getHeader('X-Request-ID') || 'unknown';
  
  console.error(`[ERROR] [${requestId}] Error:`, error);

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === "development";

  // Log error details for debugging
  if (isDevelopment) {
    console.error(`[ERROR] [${requestId}] Stack trace:`, error.stack);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: "بيانات غير صحيحة",
      details: error.message,
      requestId
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: "غير مصرح لك بالوصول",
      requestId
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: "رمز وصول غير صالح",
      requestId
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: "رمز الوصول منتهي الصلاحية",
      requestId
    });
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: "خطأ في قاعدة البيانات",
      requestId
    });
  }

  if (error.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: "بيانات غير صحيحة",
      requestId
    });
  }

  res.status(error.status || 500).json({
    error: error.message || "خطأ داخلي في الخادم",
    requestId,
    ...(isDevelopment && { stack: error.stack }),
  });
});

// Initialize default data with enhanced security
async function initializeData() {
  try {
    console.log("🔄 Running database migration...");
    await migrateDatabase();

    // Create default admin users with enhanced security
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Emovmmm#951753", 12);

    // Get admin emails from environment
    const adminEmails = (process.env.ADMIN_EMAILS || "emanhassanmahmoud1@gmail.com,karemelolary8@gmail.com").split(',');

    // Create admin users
    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i].trim();
      const adminNames = ["إيمان حسن محمود", "كريم العكري"];
      const adminPhones = ["01000000001", "01000000002"];
      const adminNationalIds = ["12345678901234", "12345678901235"];

      await prisma.user.upsert({
        where: { email },
        update: {
          fullName: adminNames[i] || `Admin ${i + 1}`,
          phone: adminPhones[i] || `0100000000${i + 1}`,
          nationalId: adminNationalIds[i] || `1234567890123${i + 4}`,
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
        create: {
          email,
          phone: adminPhones[i] || `0100000000${i + 1}`,
          nationalId: adminNationalIds[i] || `1234567890123${i + 4}`,
          fullName: adminNames[i] || `Admin ${i + 1}`,
          role: "ADMIN",
          password: hashedPassword,
          isActive: true,
        },
      });
    }

    console.log("✅ تم تهيئة البيانات الافتراضية");
  } catch (error) {
    console.error("❌ خطأ في تهيئة البيانات:", error);
    // Don't exit the process, just log the error
  }
}

// Enhanced server startup
app.listen(PORT, async () => {
  console.log(`🚀 الخادم يعمل على البورت ${PORT}`);
  console.log(`🔒 Security mode: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL || 'SQLite (dev.db)'}`);
  
  await initializeData();
});

// Enhanced graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 إيقاف الخادم...");
  try {
    await prisma.$disconnect();
    console.log("✅ تم إغلاق قاعدة البيانات بنجاح");
  } catch (error) {
    console.error("❌ خطأ في إغلاق قاعدة البيانات:", error);
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 إيقاف الخادم...");
  try {
    await prisma.$disconnect();
    console.log("✅ تم إغلاق قاعدة البيانات بنجاح");
  } catch (error) {
    console.error("❌ خطأ في إغلاق قاعدة البيانات:", error);
  }
  process.exit(0);
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Memory leak detection (development only)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }, 300000); // Every 5 minutes
}
