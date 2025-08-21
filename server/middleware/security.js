const { body, validationResult } = require("express-validator");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const {
  VALIDATION_RULES,
  SECURITY_HEADERS,
  AUDIT_CONFIG,
} = require("../config/security");

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "بيانات غير صحيحة",
      details: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// XSS Protection middleware
const xssProtection = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = xss(req.query[key]);
      }
    });
  }

  next();
};

// Path traversal protection
const preventPathTraversal = (req, res, next) => {
  const checkPath = (path) => {
    if (!path) return true;

    // Check for path traversal attempts
    const dangerousPatterns = [
      /\.\./g, // Directory traversal
      /\/\//g, // Double slashes
      /\\/g, // Backslashes
      /%2e%2e/gi, // URL encoded ..
      /%2f/gi, // URL encoded /
      /%5c/gi, // URL encoded \
      /null/g, // Null bytes
      /%00/g, // URL encoded null
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(path));
  };

  // Check URL path
  if (!checkPath(req.path)) {
    return res.status(400).json({ error: "مسار غير صالح" });
  }

  // Check query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string" && !checkPath(value)) {
      return res.status(400).json({ error: "معاملات غير صالحة" });
    }
  }

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  next();
};

// Audit logging middleware
const auditLog = (action) => {
  return (req, res, next) => {
    if (!AUDIT_CONFIG.enabled) return next();

    const originalSend = res.send;
    res.send = function (data) {
      // Log the action after response is sent
      const logData = {
        timestamp: new Date().toISOString(),
        action,
        userId: req.user?.id || "anonymous",
        userRole: req.user?.role || "anonymous",
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || generateRequestId(),
      };

      // Log sensitive actions with more detail
      if (AUDIT_CONFIG.sensitiveActions.includes(action)) {
        logData.details = {
          body: req.body,
          query: req.query,
          params: req.params,
        };
      }

      console.log(`[AUDIT] ${JSON.stringify(logData)}`);

      originalSend.call(this, data);
    };

    next();
  };
};

// Generate unique request ID
const generateRequestId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Validation schemas for different endpoints
const authValidation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("البريد الإلكتروني غير صحيح")
    .isLength({ max: VALIDATION_RULES.email.maxLength })
    .withMessage(
      `البريد الإلكتروني يجب أن يكون أقل من ${VALIDATION_RULES.email.maxLength} حرف`
    ),
  body("phone")
    .matches(VALIDATION_RULES.phone.pattern)
    .withMessage("رقم الهاتف يجب أن يكون 11 رقم")
    .isLength({ max: VALIDATION_RULES.phone.maxLength })
    .withMessage(
      `رقم الهاتف يجب أن يكون أقل من ${VALIDATION_RULES.phone.maxLength} رقم`
    ),
  body("nationalId")
    .matches(VALIDATION_RULES.nationalId.pattern)
    .withMessage("الرقم القومي يجب أن يكون 14 رقم")
    .isLength({ max: VALIDATION_RULES.nationalId.maxLength })
    .withMessage(
      `الرقم القومي يجب أن يكون أقل من ${VALIDATION_RULES.nationalId.maxLength} رقم`
    ),
  body("password")
    .optional()
    .isLength({
      min: VALIDATION_RULES.password.minLength,
      max: VALIDATION_RULES.password.maxLength,
    })
    .withMessage(
      `كلمة المرور يجب أن تكون بين ${VALIDATION_RULES.password.minLength} و ${VALIDATION_RULES.password.maxLength} حرف`
    )
    .matches(VALIDATION_RULES.password.pattern)
    .withMessage(
      "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص"
    ),
  validateInput,
];

const complaintValidation = [
  body("fullName")
    .isLength({ min: 2, max: 100 })
    .withMessage("الاسم يجب أن يكون بين 2 و 100 حرف")
    .trim()
    .escape(),
  body("phone")
    .matches(VALIDATION_RULES.phone.pattern)
    .withMessage("رقم الهاتف يجب أن يكون 11 رقم"),
  body("nationalId")
    .matches(VALIDATION_RULES.nationalId.pattern)
    .withMessage("الرقم القومي يجب أن يكون 14 رقم"),
  body("title")
    .isLength({
      min: VALIDATION_RULES.complaintTitle.minLength,
      max: VALIDATION_RULES.complaintTitle.maxLength,
    })
    .withMessage(
      `عنوان الشكوى يجب أن يكون بين ${VALIDATION_RULES.complaintTitle.minLength} و ${VALIDATION_RULES.complaintTitle.maxLength} حرف`
    )
    .trim()
    .escape(),
  body("description")
    .isLength({
      min: VALIDATION_RULES.complaintDescription.minLength,
      max: VALIDATION_RULES.complaintDescription.maxLength,
    })
    .withMessage(
      `وصف الشكوى يجب أن يكون بين ${VALIDATION_RULES.complaintDescription.minLength} و ${VALIDATION_RULES.complaintDescription.maxLength} حرف`
    )
    .trim()
    .escape(),
  body("typeId").isLength({ min: 1 }).withMessage("نوع الشكوى مطلوب"),
  body("location")
    .optional()
    .isLength({ max: VALIDATION_RULES.location.maxLength })
    .withMessage(
      `الموقع يجب أن يكون أقل من ${VALIDATION_RULES.location.maxLength} حرف`
    )
    .trim()
    .escape(),
  body("email").optional().isEmail().withMessage("البريد الإلكتروني غير صحيح"),
  validateInput,
];

const userValidation = [
  body("fullName")
    .isLength({ min: 2, max: 100 })
    .withMessage("الاسم يجب أن يكون بين 2 و 100 حرف")
    .trim()
    .escape(),
  body("email")
    .isEmail()
    .withMessage("البريد الإلكتروني غير صحيح")
    .isLength({ max: VALIDATION_RULES.email.maxLength })
    .withMessage(
      `البريد الإلكتروني يجب أن يكون أقل من ${VALIDATION_RULES.email.maxLength} حرف`
    ),
  body("phone")
    .matches(VALIDATION_RULES.phone.pattern)
    .withMessage("رقم الهاتف يجب أن يكون 11 رقم"),
  body("nationalId")
    .matches(VALIDATION_RULES.nationalId.pattern)
    .withMessage("الرقم القومي يجب أن يكون 14 رقم"),
  body("role")
    .isIn(["ADMIN", "EMPLOYEE", "CITIZEN"])
    .withMessage("الدور غير صحيح"),
  validateInput,
];

// SQL injection protection for Prisma queries
const sanitizePrismaQuery = (query) => {
  if (typeof query === "string") {
    // Remove any potential SQL injection patterns
    return query.replace(/[;'"\\]/g, "");
  }
  return query;
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const { FILE_UPLOAD_CONFIG } = require("../config/security");

  // Check file size
  if (req.file.size > FILE_UPLOAD_CONFIG.maxFileSize) {
    return res.status(400).json({
      error: `حجم الملف يجب أن يكون أقل من ${
        FILE_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)
      } ميجابايت`,
    });
  }

  // Check MIME type
  if (!FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: "نوع الملف غير مسموح به",
    });
  }

  // Check file extension
  const ext = require("path").extname(req.file.originalname).toLowerCase();
  if (!FILE_UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
    return res.status(400).json({
      error: "امتداد الملف غير مسموح به",
    });
  }

  next();
};

module.exports = {
  validateInput,
  xssProtection,
  preventPathTraversal,
  securityHeaders,
  auditLog,
  authValidation,
  complaintValidation,
  userValidation,
  sanitizePrismaQuery,
  validateFileUpload,
  mongoSanitize,
  xss,
};
