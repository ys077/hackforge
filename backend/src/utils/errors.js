/**
 * Custom Error Classes for the Application
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.resource = resource;
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service = "Service") {
    super(`${service} is temporarily unavailable`, 503, "SERVICE_UNAVAILABLE");
    this.service = service;
  }
}

class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR");
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = "External service error") {
    super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR");
    this.service = service;
  }
}

class FileUploadError extends AppError {
  constructor(message = "File upload failed") {
    super(message, 400, "FILE_UPLOAD_ERROR");
  }
}

class OTPError extends AppError {
  constructor(message = "OTP verification failed") {
    super(message, 400, "OTP_ERROR");
  }
}

class DocumentVerificationError extends AppError {
  constructor(message = "Document verification failed") {
    super(message, 400, "DOCUMENT_VERIFICATION_ERROR");
  }
}

class SlotBookingError extends AppError {
  constructor(message = "Slot booking failed") {
    super(message, 400, "SLOT_BOOKING_ERROR");
  }
}

class MLServiceError extends AppError {
  constructor(message = "ML service error") {
    super(message, 502, "ML_SERVICE_ERROR");
  }
}

// Error factory function
const createError = (type, ...args) => {
  const errorMap = {
    validation: ValidationError,
    authentication: AuthenticationError,
    authorization: AuthorizationError,
    notFound: NotFoundError,
    conflict: ConflictError,
    rateLimit: RateLimitError,
    serviceUnavailable: ServiceUnavailableError,
    database: DatabaseError,
    externalService: ExternalServiceError,
    fileUpload: FileUploadError,
    otp: OTPError,
    documentVerification: DocumentVerificationError,
    slotBooking: SlotBookingError,
    mlService: MLServiceError,
  };

  const ErrorClass = errorMap[type] || AppError;
  return new ErrorClass(...args);
};

// Error code mapping
const ERROR_CODES = {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  TOKEN_INVALID: 1003,
  OTP_EXPIRED: 1004,
  OTP_INVALID: 1005,

  // Authorization errors (2xxx)
  ACCESS_DENIED: 2001,
  INSUFFICIENT_PERMISSIONS: 2002,
  ACCOUNT_SUSPENDED: 2003,

  // Validation errors (3xxx)
  INVALID_INPUT: 3001,
  MISSING_REQUIRED_FIELD: 3002,
  INVALID_FORMAT: 3003,
  INVALID_PHONE: 3004,

  // Resource errors (4xxx)
  USER_NOT_FOUND: 4001,
  JOB_NOT_FOUND: 4002,
  DOCUMENT_NOT_FOUND: 4003,
  SCHEME_NOT_FOUND: 4004,
  SLOT_NOT_FOUND: 4005,
  APPLICATION_NOT_FOUND: 4006,

  // Conflict errors (5xxx)
  USER_EXISTS: 5001,
  APPLICATION_EXISTS: 5002,
  SLOT_ALREADY_BOOKED: 5003,
  DOUBLE_BOOKING: 5004,

  // Service errors (6xxx)
  ML_SERVICE_ERROR: 6001,
  MAP_SERVICE_ERROR: 6002,
  SMS_SERVICE_ERROR: 6003,
  FILE_SERVICE_ERROR: 6004,

  // System errors (9xxx)
  INTERNAL_ERROR: 9001,
  DATABASE_ERROR: 9002,
  CACHE_ERROR: 9003,
  QUEUE_ERROR: 9004,
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  FileUploadError,
  OTPError,
  DocumentVerificationError,
  SlotBookingError,
  MLServiceError,
  createError,
  ERROR_CODES,
};
