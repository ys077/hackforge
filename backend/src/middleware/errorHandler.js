const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");
const { errorResponse } = require("../utils/responses");

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errorCode = err.errorCode || "INTERNAL_ERROR";
  let details = null;

  // Handle specific error types
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation error";
    details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    errorCode = "CONFLICT_ERROR";
    message = "Resource already exists";
    details = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
    }));
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    errorCode = "REFERENCE_ERROR";
    message = "Referenced resource does not exist";
  }

  if (err.name === "SequelizeDatabaseError") {
    statusCode = 500;
    errorCode = "DATABASE_ERROR";
    message = "Database error occurred";
    // Don't expose raw database errors in production
    if (process.env.NODE_ENV === "production") {
      message = "An error occurred while processing your request";
    }
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Authentication token has expired";
  }

  if (err.name === "MulterError") {
    statusCode = 400;
    errorCode = "FILE_UPLOAD_ERROR";

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size exceeds the maximum limit";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files uploaded";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field";
        break;
      default:
        message = "File upload error";
    }
  }

  if (err.code === "ECONNREFUSED") {
    statusCode = 503;
    errorCode = "SERVICE_UNAVAILABLE";
    message = "Service temporarily unavailable";
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === "function") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";
    details = err.array();
  }

  // Handle Axios errors (external service calls)
  if (err.isAxiosError) {
    statusCode = 502;
    errorCode = "EXTERNAL_SERVICE_ERROR";
    message = "External service error";

    if (err.response) {
      // External service returned an error
      logger.error("External service error response:", {
        url: err.config?.url,
        status: err.response.status,
        data: err.response.data,
      });
    } else if (err.request) {
      // Request was made but no response received
      message = "External service is not responding";
    }
  }

  // Build response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
    timestamp: new Date().toISOString(),
  };

  // Add details in development or for validation errors
  if (details || (process.env.NODE_ENV !== "production" && err.stack)) {
    if (details) {
      response.error.details = details;
    }
    if (process.env.NODE_ENV !== "production") {
      response.error.stack = err.stack;
    }
  }

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    "ROUTE_NOT_FOUND",
  );
};

/**
 * Async handler wrapper to catch promise rejections
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout handler
 */
const timeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    res.setTimeout(timeoutMs, () => {
      logger.error("Request timeout", {
        method: req.method,
        url: req.originalUrl,
        timeout: timeoutMs,
      });

      return errorResponse(res, "Request timeout", 408, "REQUEST_TIMEOUT");
    });
    next();
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
};
