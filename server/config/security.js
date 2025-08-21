const crypto = require('crypto');
const path = require('path');

// Enhanced JWT Configuration with better security
const JWT_CONFIG = {
  // Use RS256 for production, HS256 for development
  algorithm: process.env.NODE_ENV === 'production' ? 'RS256' : 'HS256',
  
  // JWT Secret (for HS256) - should be in environment variables
  secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  
  // RSA Keys for RS256 (production) - should be in environment variables
  privateKey: process.env.JWT_PRIVATE_KEY,
  publicKey: process.env.JWT_PUBLIC_KEY,
  
  // Token expiration times - configurable via environment
  accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  
  // JWT issuer and audience
  issuer: 'municipal-complaints-system',
  audience: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// Enhanced Content Security Policy
const CSP_CONFIG = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : null,
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ].filter(Boolean),
    styleSrc: [
      "'self'",
      process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : null,
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ].filter(Boolean),
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdn.jsdelivr.net"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "blob:"
    ],
    connectSrc: [
      "'self'",
      process.env.FRONTEND_URL || "http://localhost:5173",
      process.env.API_URL || "http://localhost:3001"
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  }
};

// Enhanced File Upload Security
const FILE_UPLOAD_CONFIG = {
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'],
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, '../uploads'),
  generateRandomFilename: (originalName) => {
    const ext = path.extname(originalName);
    const randomName = crypto.randomBytes(32).toString('hex');
    return `${randomName}${ext}`;
  },
  // Additional security checks
  validateFileContent: true,
  scanForMalware: process.env.NODE_ENV === 'production'
};

// Enhanced Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
  // General API rate limiting
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: { error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Authentication rate limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: { error: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // Complaint submission rate limiting
  complaintSubmission: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 complaints per hour
    message: { error: 'تم تجاوز الحد الأقصى لتقديم الشكاوى. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // Admin actions rate limiting
  adminActions: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 admin actions per 5 minutes
    message: { error: 'تم تجاوز الحد الأقصى للإجراءات الإدارية. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  }
};

// Enhanced Input Validation Rules
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    minLength: 5
  },
  phone: {
    pattern: /^01[0-2,5]{1}[0-9]{8}$/, // Egyptian phone numbers
    maxLength: 11,
    minLength: 11
  },
  nationalId: {
    pattern: /^[0-9]{14}$/,
    maxLength: 14,
    minLength: 14
  },
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  },
  complaintTitle: {
    minLength: 5,
    maxLength: 200
  },
  complaintDescription: {
    minLength: 10,
    maxLength: 2000
  },
  location: {
    maxLength: 500
  },
  fullName: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[\u0600-\u06FF\s]+$/ // Arabic characters only
  }
};

// Enhanced Security Headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains; preload' : null,
  'Content-Security-Policy': process.env.NODE_ENV === 'production' ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src 'none'; object-src 'none';" : null
};

// Enhanced Audit Log Configuration
const AUDIT_CONFIG = {
  enabled: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  sensitiveActions: [
    'user.login',
    'user.logout',
    'user.create',
    'user.update',
    'user.delete',
    'complaint.create',
    'complaint.update',
    'complaint.delete',
    'complaint.status_change',
    'admin.action',
    'file.upload',
    'file.download'
  ],
  // Log to file in production
  logToFile: process.env.NODE_ENV === 'production',
  logFilePath: process.env.LOG_FILE_PATH || './logs/audit.log'
};

// CORS Configuration
const CORS_CONFIG = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:5173'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-API-Key',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
};

// Database Security Configuration
const DB_SECURITY_CONFIG = {
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  },
  // Query timeout
  queryTimeout: 30000,
  // Enable query logging in development
  logQueries: process.env.NODE_ENV === 'development',
  // Sanitize all queries
  sanitizeQueries: true
};

module.exports = {
  JWT_CONFIG,
  CSP_CONFIG,
  FILE_UPLOAD_CONFIG,
  RATE_LIMIT_CONFIG,
  VALIDATION_RULES,
  SECURITY_HEADERS,
  AUDIT_CONFIG,
  CORS_CONFIG,
  DB_SECURITY_CONFIG
};
