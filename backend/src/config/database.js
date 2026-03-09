const mongoose = require("mongoose");
const logger = require("../utils/logger");

// MongoDB connection URI
const getMongoUri = () => {
  // Railway MongoDB URL (prioritize this)
  if (process.env.MONGO_URL) {
    return process.env.MONGO_URL;
  }

  // Fallback to individual components
  const host = process.env.MONGO_HOST || "localhost";
  const port = process.env.MONGO_PORT || "27017";
  const database = process.env.MONGO_DB || "hackforge";
  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;

  if (user && password) {
    return `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin`;
  }

  return `mongodb://${host}:${port}/${database}`;
};

// Mongoose connection options
const mongooseOptions = {
  maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 10,
  minPoolSize: process.env.NODE_ENV === "production" ? 5 : 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
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
      logger.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    // Enable debug mode in development
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", true);
    }

    await mongoose.connect(uri, mongooseOptions);

    logger.info(
      `✅ Connected to MongoDB (${process.env.NODE_ENV || "development"})`,
    );

    return mongoose.connection;
  } catch (error) {
    logger.error("❌ Unable to connect to MongoDB:", error);
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
