const { z } = require("zod");
const { AppError } = require("../utils/appError");

// ─── VALIDATOR FACTORY ─────────────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
    return next(new AppError(message, 400));
  }
  req.body = result.data;
  next();
};

// ─── AUTH SCHEMAS ───────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

// ─── TRADE SCHEMAS ──────────────────────────────────────────────────────────
const MARKETS = ["forex", "crypto", "stocks", "indices", "commodities", "futures"];
const DIRECTIONS = ["LONG", "SHORT"];
const STRATEGIES = ["Breakout", "Reversal", "Trend Follow", "HTF Rejection", "Momentum", "Scalp", "News", "Other"];
const SESSIONS = ["London", "New York", "Asia", "Overlap", "Off-Hours"];
const EMOTIONS_BEFORE = ["Confident", "Neutral", "Anxious", "FOMO", "Revenge", "Excited", "Bored", "Fearful"];
const EMOTIONS_AFTER = ["Satisfied", "Neutral", "Frustrated", "Relieved", "Regretful", "Euphoric", "Disappointed"];
const MISTAKES = ["FOMO Entry", "Revenge Trade", "Overtrading", "Moved Stop", "Early Exit", "Late Entry", "No Setup", "Sized Too Big"];

const createTradeSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase().trim(),
  market: z.enum(MARKETS).default("forex"),
  direction: z.enum(DIRECTIONS),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional().nullable(),
  stopLoss: z.number().positive().optional().nullable(),
  takeProfit: z.number().positive().optional().nullable(),
  positionSize: z.number().positive(),
  strategy: z.enum(STRATEGIES).default("Other"),
  session: z.enum(SESSIONS).default("London"),
  tradeDate: z.string().datetime().optional().default(() => new Date().toISOString()),
  emotionBefore: z.enum(EMOTIONS_BEFORE).default("Neutral"),
  emotionAfter: z.enum(EMOTIONS_AFTER).optional(),
  mistakeTag: z.enum(MISTAKES).optional().nullable(),
  notes: z.string().max(2000).optional().default(""),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
  screenshotUrl: z.string().url().or(z.string().startsWith("data:image/")).optional().nullable(),
});

const updateTradeSchema = createTradeSchema.partial();

// ─── PREFERENCES SCHEMA ─────────────────────────────────────────────────────
const preferencesSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().max(10).optional(),
  defaultRisk: z.number().min(0.1).max(100).optional(),
  notifications: z.boolean().optional(),
});

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    changePassword: changePasswordSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    createTrade: createTradeSchema,
    updateTrade: updateTradeSchema,
    preferences: preferencesSchema,
  },
};
