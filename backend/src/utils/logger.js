const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Try to create logs directory - gracefully handle permission errors
const logsDir = path.join(process.cwd(), "logs");
let canWriteLogs = false;

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  // Test if we can write to the directory
  const testFile = path.join(logsDir, ".test");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  canWriteLogs = true;
} catch (err) {
  console.warn(`Warning: Cannot write to logs directory (${err.code}). Using console-only logging.`);
  canWriteLogs = false;
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || "development";
  const levels = {
    development: "debug",
    test: "error",
    production: process.env.LOG_LEVEL || "info",
  };
  return levels[env] || "info";
};

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      logFormat,
    ),
  }),
];

// Add file transports in production (only if we can write to logs directory)
if (process.env.NODE_ENV === "production" && canWriteLogs) {
  transports.push(
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  format: logFormat,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add convenience methods
logger.logRequest = (req, message = "") => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: req.user?.id,
  };
  logger.info(message || "HTTP Request", logData);
};

logger.logError = (error, req = null) => {
  const logData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.userId = req.user?.id;
  }

  logger.error("Application Error", logData);
};

logger.logDatabase = (operation, model, data = {}) => {
  logger.debug(`Database ${operation}`, { model, ...data });
};

logger.logCache = (operation, key, hit = null) => {
  const logData = { operation, key };
  if (hit !== null) {
    logData.hit = hit;
  }
  logger.debug("Cache operation", logData);
};

logger.logQueue = (queue, operation, jobId = null) => {
  logger.info("Queue operation", { queue, operation, jobId });
};

logger.logML = (endpoint, success, duration = null) => {
  logger.info("ML Service call", { endpoint, success, duration });
};

module.exports = logger;
