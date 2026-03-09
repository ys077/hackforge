const mongoose = require("mongoose");
const logger = require("../utils/logger");

// MongoDB connection URI - MUST be set via MONGO_URL environment variable
const getMongoUri = () => {
  if (!process.env.MONGO_URL) {
    throw new Error(
      "MONGO_URL environment variable is not set. " +
        "Please set it to your MongoDB connection string.",
    );
  }
  return process.env.MONGO_URL;
};

// Mongoose connection options
const mongooseOptions = {
  maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 10,
  minPoolSize: process.env.NODE_ENV === "production" ? 5 : 1,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  retryWrites: true,
};

// Connect to MongoDB
const connectDatabase = async () => {
  try {
    const uri = getMongoUri();

    // Set up mongoose event handlers
    mongoose.connection.on("connected", () => {
      logger.info("✅ MongoDB connection established successfully");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("❌ MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    // Enable debug mode in development
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", true);
    }

    logger.info("Connecting to MongoDB...");
    await mongoose.connect(uri, mongooseOptions);
    logger.info("MongoDB connected successfully");

    return mongoose.connection;
  } catch (error) {
    logger.error("❌ Unable to connect to MongoDB:", error.message);
    throw error;
  }
};

// Disconnect from MongoDB
const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
    throw error;
  }
};

// Get connection status
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  mongoose,
  connectDatabase,
  disconnectDatabase,
  isConnected,
  getMongoUri,
};
