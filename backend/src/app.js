const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");

const config = require("./config");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const {
  requestIdMiddleware,
  requestLoggingMiddleware,
  languageDetector,
} = require("./middleware/common");
const { standardLimiter } = require("./middleware/rateLimiter");
const logger = require("./utils/logger");

// Create Express app
const app = express();

// Trust proxy (for Railway, Heroku, etc.)
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = config.cors.origins;
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "Accept-Language",
    ],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    maxAge: 86400, // 24 hours
  }),
);

// Compression
app.use(compression());

// Request ID
app.use(requestIdMiddleware);

// Request logging (development)
if (config.env === "development") {
  app.use(morgan("dev"));
}

// Request logging (production - custom format)
if (config.env === "production") {
  app.use(requestLoggingMiddleware);
}

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Language detection
app.use(languageDetector);

// Rate limiting
app.use("/api", standardLimiter);

// Static files (uploads)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    maxAge: "1d",
    etag: true,
  }),
);

// API routes
app.use("/api", routes);

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "HackForge API",
    version: "1.0.0",
    description: "Backend API for informal workers platform",
    docs: "/api/docs",
    health: "/api/health",
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close database connections
  try {
    const { sequelize } = require("./config/database");
    await sequelize.close();
    logger.info("Database connections closed");
  } catch (error) {
    logger.error("Error closing database:", error);
  }

  // Close Redis connections
  try {
    const { closeConnections } = require("./config/redis");
    await closeConnections();
    logger.info("Redis connections closed");
  } catch (error) {
    logger.error("Error closing Redis:", error);
  }

  // Close queue connections
  try {
    const { closeQueues } = require("./config/queue");
    await closeQueues();
    logger.info("Queue connections closed");
  } catch (error) {
    logger.error("Error closing queues:", error);
  }

  logger.info("Graceful shutdown complete");
  process.exit(0);
};

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = app;
