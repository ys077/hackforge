const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { connectDatabase } = require("./config/database");
const notificationService = require("./services/notificationService");

// Optional Redis import - won't crash if Redis is unavailable
let getRedisClient;
try {
  getRedisClient = require("./config/redis").getRedisClient;
} catch (err) {
  logger.warn("Redis module not available");
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// Pass Socket.IO instance to notification service
notificationService.setSocketIO(io);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    // Allow connection without auth for now
    return next();
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, config.jwt.secret);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Store io instance on app
app.set("io", io);

// Start server
const startServer = async () => {
  try {
    // Start HTTP server FIRST so healthcheck endpoint is available immediately
    // This prevents Railway healthcheck failures while DB/Redis are connecting
    const port = process.env.PORT || config.port;
    server.listen(port, "0.0.0.0", () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: /health or /api/health`);

      if (config.env === "development") {
        logger.info(`API URL: http://localhost:${port}/api`);
        logger.info("Development mode - detailed logging enabled");
      }
    });

    // Socket.IO connection logging
    io.on("connection", (socket) => {
      logger.debug(`Socket connected: ${socket.id}`, {
        userId: socket.user?.id,
      });

      socket.on("disconnect", (reason) => {
        logger.debug(`Socket disconnected: ${socket.id}`, { reason });
      });
    });

    // Connect to database (after server is already listening)
    // Wrapped in its own try/catch so DB failure doesn't kill the server
    try {
      logger.info("Connecting to database...");
      await connectDatabase();
      logger.info("Database connected successfully");
    } catch (dbError) {
      logger.error(
        "Database connection failed - server running but DB unavailable:",
        dbError.message,
      );
    }

    // Connect to Redis (optional - server continues if Redis unavailable)
    if (getRedisClient && process.env.REDIS_HOST) {
      try {
        logger.info("Connecting to Redis...");
        const redis = getRedisClient();
        await redis.ping();
        logger.info("Redis connected successfully");
      } catch (redisError) {
        logger.warn(
          "Redis connection failed - continuing without Redis:",
          redisError.message,
        );
      }
    } else {
      logger.info("Redis not configured - skipping Redis connection");
    }
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${config.port} is already in use`);
  } else {
    logger.error("Server error:", error);
  }
  process.exit(1);
});

// Start the server
startServer();

module.exports = server;
