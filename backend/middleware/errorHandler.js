const logger = require("../utils/logger");

const notFound = (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log non-operational errors
  if (!err.isOperational) {
    logger.error("UNEXPECTED ERROR:", err);
  }

  // ─── MONGOOSE ERRORS ─────────────────────────────────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({ status: "fail", message: `Invalid ${err.path}: ${err.value}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ status: "fail", message: `${field} already exists` });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ status: "fail", message: messages.join(". ") });
  }

  // ─── JWT ERRORS ────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ status: "fail", message: "Invalid token. Please log in again." });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ status: "fail", message: "Token expired. Please log in again." });
  }

  // ─── STRIPE ERRORS ─────────────────────────────────────────────────────
  if (err.type && err.type.startsWith("Stripe")) {
    return res.status(402).json({ status: "fail", message: err.message });
  }

  // ─── OPERATIONAL / KNOWN ERRORS ────────────────────────────────────────
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // ─── UNKNOWN SERVER ERROR ──────────────────────────────────────────────
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message,
  });
};

module.exports = { notFound, globalErrorHandler };
