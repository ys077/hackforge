/**
 * Standardized API Response Helpers
 */

/**
 * Success response
 */
const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created response (201)
 */
const createdResponse = (
  res,
  data = null,
  message = "Resource created successfully",
) => {
  return successResponse(res, data, message, 201);
};

/**
 * No content response (204)
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Paginated response
 */
const paginatedResponse = (res, data, pagination, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response
 */
const errorResponse = (
  res,
  message = "An error occurred",
  statusCode = 500,
  errorCode = "INTERNAL_ERROR",
  details = null,
) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: errors,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Not found response
 */
const notFoundResponse = (res, resource = "Resource") => {
  return errorResponse(res, `${resource} not found`, 404, "NOT_FOUND");
};

/**
 * Unauthorized response
 */
const unauthorizedResponse = (res, message = "Authentication required") => {
  return errorResponse(res, message, 401, "UNAUTHORIZED");
};

/**
 * Forbidden response
 */
const forbiddenResponse = (res, message = "Access denied") => {
  return errorResponse(res, message, 403, "FORBIDDEN");
};

/**
 * Conflict response
 */
const conflictResponse = (res, message = "Resource already exists") => {
  return errorResponse(res, message, 409, "CONFLICT");
};

/**
 * Rate limit response
 */
const rateLimitResponse = (
  res,
  message = "Too many requests. Please try again later.",
) => {
  return errorResponse(res, message, 429, "RATE_LIMIT_EXCEEDED");
};

/**
 * Service unavailable response
 */
const serviceUnavailableResponse = (
  res,
  message = "Service temporarily unavailable",
) => {
  return errorResponse(res, message, 503, "SERVICE_UNAVAILABLE");
};

/**
 * Custom response builder
 */
const customResponse = (res, statusCode, body) => {
  return res.status(statusCode).json({
    ...body,
    timestamp: new Date().toISOString(),
  });
};

// HTTP Status codes reference
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  serviceUnavailableResponse,
  customResponse,
  HTTP_STATUS,
};
