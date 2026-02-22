const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { status: "fail", message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development",
  });

module.exports = {
  // General API — 100 req / 15 min
  global: createLimiter(15 * 60 * 1000, 100, "Too many requests. Please slow down."),

  // Auth endpoints — 100 attempts / 15 min (disabled for development)
  auth: createLimiter(15 * 60 * 1000, 100, "Too many auth attempts. Try again in 15 minutes."),

  // AI endpoints — 20 req / hour (cost-sensitive)
  ai: createLimiter(60 * 60 * 1000, 20, "AI request limit reached. Upgrade to Elite for more."),

  // Password reset — 5 / hour
  passwordReset: createLimiter(60 * 60 * 1000, 5, "Too many password reset attempts."),

  // Trade creation — 60 / hour
  trade: createLimiter(60 * 60 * 1000, 60, "Trade creation limit reached."),
};
