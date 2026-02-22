require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const connectRedis = require("./config/redis");
const logger = require("./utils/logger");
const { globalErrorHandler, notFound } = require("./middleware/errorHandler");
const rateLimiter = require("./middleware/rateLimiter");

// ─── ROUTES ────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const tradeRoutes = require("./routes/trade.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const aiRoutes = require("./routes/ai.routes");
const stripeRoutes = require("./routes/stripe.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();

// ─── DB CONNECTIONS ────────────────────────────────────────────────────────
connectDB();
connectRedis();

// ─── STRIPE WEBHOOK (raw body needed before json parser) ──────────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// ─── CORE MIDDLEWARE ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());

// ─── LOGGING ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// ─── GLOBAL RATE LIMIT ─────────────────────────────────────────────────────
app.use("/api/", rateLimiter.global);

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({
  status: "ok",
  env: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
}));

// ─── API ROUTES ────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/trades",    tradeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/stripe",    stripeRoutes);
app.use("/api/reports",   reportRoutes);

// ─── ERROR HANDLING ────────────────────────────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ─── START ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 EdgeIQ API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
