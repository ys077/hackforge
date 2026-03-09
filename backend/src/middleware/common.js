const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

/**
 * Request ID middleware
 */
const requestId = (req, res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
};

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", logData);
    } else {
      logger.http("Request completed", logData);
    }
  });

  next();
};

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = value.trim();
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? item.trim() : item,
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Language detection middleware
 */
const detectLanguage = (req, res, next) => {
  // Check for language in header, query, or use user preference
  let language = req.headers["accept-language"]?.split(",")[0]?.split("-")[0];

  if (req.query.lang) {
    language = req.query.lang;
  }

  if (req.user?.language) {
    language = req.user.language;
  }

  // Default to English if no valid language found
  const supportedLanguages = ["en", "hi", "ta", "te", "kn", "mr", "bn", "gu"];
  req.language = supportedLanguages.includes(language) ? language : "en";

  next();
};

/**
 * Pagination middleware
 */
const pagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    offset,
  };

  // Helper to format pagination response
  req.formatPagination = (total) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  });

  next();
};

/**
 * Sorting middleware
 */
const sorting = (allowedFields = []) => {
  return (req, res, next) => {
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder =
      req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Validate sort field
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      req.sort = { field: "created_at", order: "DESC" };
    } else {
      req.sort = { field: sortBy, order: sortOrder };
    }

    next();
  };
};

/**
 * Cache control middleware
 */
const cacheControl = (maxAge = 0, options = {}) => {
  return (req, res, next) => {
    if (options.noCache) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else if (maxAge > 0) {
      res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
    } else {
      res.setHeader("Cache-Control", "private, no-cache");
    }
    next();
  };
};

/**
 * CORS preflight handler
 */
const corsPreflightHandler = (req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Request-ID",
    );
    res.header("Access-Control-Max-Age", "86400");
    return res.status(204).send();
  }
  next();
};

/**
 * API versioning middleware
 */
const apiVersion = (version) => {
  return (req, res, next) => {
    req.apiVersion = version;
    res.setHeader("X-API-Version", version);
    next();
  };
};

/**
 * Maintenance mode middleware
 */
const maintenanceMode = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === "true") {
    return res.status(503).json({
      success: false,
      error: {
        code: "MAINTENANCE",
        message: "Service is under maintenance. Please try again later.",
      },
    });
  }
  next();
};

module.exports = {
  requestId,
  requestLogger,
  sanitizeBody,
  detectLanguage,
  pagination,
  sorting,
  cacheControl,
  corsPreflightHandler,
  apiVersion,
  maintenanceMode,
  // Aliases for backward compatibility
  requestIdMiddleware: requestId,
  requestLoggingMiddleware: requestLogger,
  languageDetector: detectLanguage,
};
