const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { connectDatabase } = require("./config/database");
const { getRedisClient } = require("./config/redis");
const notificationService = require("./services/notificationService");

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
    // Connect to database
    logger.info("Connecting to database...");
    await connectDatabase();
    logger.info("Database connected successfully");

    // Connect to Redis
    logger.info("Connecting to Redis...");
    const redis = getRedisClient();
    await redis.ping();
    logger.info("Redis connected successfully");

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API URL: http://localhost:${config.port}/api`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);

      if (config.env === "development") {
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
