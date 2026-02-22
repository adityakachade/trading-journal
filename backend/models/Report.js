const mongoose = require("mongoose");

// ─── WEEKLY REPORT ─────────────────────────────────────────────────────────
const weeklyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },

  stats: {
    totalTrades: { type: Number, default: 0 },
    winCount: { type: Number, default: 0 },
    lossCount: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalPnl: { type: Number, default: 0 },
    avgRMultiple: { type: Number, default: 0 },
    avgQualityScore: { type: Number, default: 0 },
    bestTrade: { type: Number, default: 0 },
    worstTrade: { type: Number, default: 0 },
    disciplineScore: { type: Number, default: 0 },
  },

  behavioralFlags: [{
    type: { type: String },
    count: { type: Number },
    severity: { type: String, enum: ["low", "medium", "high"] },
  }],

  aiSummary: { type: String, default: "" },
  aiRecommendations: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

weeklyReportSchema.index({ userId: 1, weekStart: -1 });

// ─── BEHAVIOR LOG ──────────────────────────────────────────────────────────
const behaviorLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: { type: Date, default: Date.now },
  behaviors: {
    overtradingDetected: { type: Boolean, default: false },
    revengeTradeDetected: { type: Boolean, default: false },
    fomoDetected: { type: Boolean, default: false },
    inconsistentRisk: { type: Boolean, default: false },
    emotionalBias: { type: Boolean, default: false },
  },
  consistencyScore: { type: Number, min: 0, max: 100, default: 0 },
  disciplineScore: { type: Number, min: 0, max: 100, default: 0 },
  tradeCount: { type: Number, default: 0 },
}, { timestamps: true });

behaviorLogSchema.index({ userId: 1, date: -1 });

module.exports = {
  WeeklyReport: mongoose.model("WeeklyReport", weeklyReportSchema),
  BehaviorLog: mongoose.model("BehaviorLog", behaviorLogSchema),
};
