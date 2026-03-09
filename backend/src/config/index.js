require("dotenv").config();

const config = {
  // Server
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || "v1",

  // Database
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || "hackforge",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    ssl: process.env.DB_SSL === "true",
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    uploadDir: process.env.UPLOAD_DIR || "uploads",
    allowedTypes: (
      process.env.ALLOWED_FILE_TYPES ||
      "image/jpeg,image/png,image/jpg,application/pdf"
    ).split(","),
  },

  // MapTiler
  mapTiler: {
    apiKey: process.env.MAPTILER_API_KEY || "1ePgGuUyZhKj3gBeAZ6O",
    baseUrl: process.env.MAPTILER_BASE_URL || "https://api.maptiler.com",
  },

  // ML Service
  mlService: {
    url: process.env.ML_SERVICE_URL || "http://localhost:8000",
    timeout: parseInt(process.env.ML_SERVICE_TIMEOUT, 10) || 30000,
  },

  // SMS Provider
  sms: {
    provider: process.env.SMS_PROVIDER || "twilio",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
    },
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@hackforge.com",
  },

  // Socket.IO
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3001",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/app.log",
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || "default-32-character-encryption-",
  },

  // External APIs
  external: {
    aadhaarVerificationUrl: process.env.AADHAAR_VERIFICATION_URL || "",
    panVerificationUrl: process.env.PAN_VERIFICATION_URL || "",
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || "*").split(","),
  },
};

// Validate required configurations in production
const validateConfig = () => {
  if (config.env === "production") {
    const required = ["JWT_SECRET", "MONGO_URL"];
    const recommended = ["MAPTILER_API_KEY"];

    const missing = required.filter((key) => !process.env[key]);
    const missingRecommended = recommended.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn(
        `⚠️ Warning: Missing required environment variables: ${missing.join(", ")}`,
      );
      console.warn(
        "Server may not function correctly without these variables.",
      );
    }

    if (missingRecommended.length > 0) {
      console.warn(
        `ℹ️ Info: Missing recommended environment variables: ${missingRecommended.join(", ")}`,
      );
    }
  }
};

validateConfig();

module.exports = config;
