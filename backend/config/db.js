const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    logger.error("❌ MONGODB_URI is not defined in environment variables!");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 5000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting reconnect...");
    });

  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
