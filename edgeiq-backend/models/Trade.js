const mongoose = require("mongoose");

const aiAnalysisSchema = new mongoose.Schema({
  qualityScore: { type: Number, min: 0, max: 10 },
  riskDisciplineRating: { type: Number, min: 0, max: 10 },
  emotionalDisciplineRating: { type: Number, min: 0, max: 10 },
  mistakeDetected: { type: Boolean, default: false },
  behavioralFlags: [{ type: String }],
  coachingFeedback: { type: String },
  suggestedImprovement: { type: String },
  analyzedAt: { type: Date, default: Date.now },
}, { _id: false });

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // ─── INSTRUMENT ────────────────────────────────────────────────────────
  symbol: {
    type: String,
    required: [true, "Symbol is required"],
    uppercase: true,
    trim: true,
    maxlength: 20,
  },
  market: {
    type: String,
    enum: ["forex", "crypto", "stocks", "indices", "commodities", "futures"],
    default: "forex",
  },
  direction: {
    type: String,
    enum: ["LONG", "SHORT"],
    required: [true, "Direction is required"],
  },

  // ─── PRICES ────────────────────────────────────────────────────────────
  entryPrice: { type: Number, required: [true, "Entry price is required"], min: 0 },
  exitPrice: { type: Number, default: null },
  stopLoss: { type: Number, default: null },
  takeProfit: { type: Number, default: null },
  positionSize: { type: Number, required: [true, "Position size is required"], min: 0 },

  // ─── CALCULATED FIELDS (set by backend) ────────────────────────────────
  pnl: { type: Number, default: 0 },
  pnlPercent: { type: Number, default: 0 },
  riskPercent: { type: Number, default: null },
  riskReward: { type: Number, default: null },
  rMultiple: { type: Number, default: null }, // how many R won/lost
  status: {
    type: String,
    enum: ["open", "win", "loss", "breakeven"],
    default: "open",
  },

  // ─── CONTEXT ───────────────────────────────────────────────────────────
  strategy: {
    type: String,
    enum: ["Breakout", "Reversal", "Trend Follow", "HTF Rejection", "Momentum", "Scalp", "News", "Other"],
    default: "Other",
  },
  session: {
    type: String,
    enum: ["London", "New York", "Asia", "Overlap", "Off-Hours"],
    default: "London",
  },
  tradeDate: { type: Date, required: true, default: Date.now },
  duration: { type: Number, default: null }, // minutes

  // ─── PSYCHOLOGY ────────────────────────────────────────────────────────
  emotionBefore: {
    type: String,
    enum: ["Confident", "Neutral", "Anxious", "FOMO", "Revenge", "Excited", "Bored", "Fearful"],
    default: "Neutral",
  },
  emotionAfter: {
    type: String,
    enum: ["Satisfied", "Neutral", "Frustrated", "Relieved", "Regretful", "Euphoric", "Disappointed"],
    default: "Neutral",
  },
  mistakeTag: {
    type: String,
    enum: ["FOMO Entry", "Revenge Trade", "Overtrading", "Moved Stop", "Early Exit", "Late Entry", "No Setup", "Sized Too Big", null],
    default: null,
  },

  // ─── MEDIA & NOTES ─────────────────────────────────────────────────────
  screenshotUrl: { type: String, default: null },
  notes: { type: String, default: "", maxlength: 2000 },
  tags: [{ type: String, trim: true }],

  // ─── AI ANALYSIS ───────────────────────────────────────────────────────
  aiAnalysis: { type: aiAnalysisSchema, default: null },
  aiAnalysisPending: { type: Boolean, default: false },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── INDEXES ───────────────────────────────────────────────────────────────
tradeSchema.index({ userId: 1, tradeDate: -1 });
tradeSchema.index({ userId: 1, status: 1 });
tradeSchema.index({ userId: 1, strategy: 1 });
tradeSchema.index({ userId: 1, session: 1 });
tradeSchema.index({ userId: 1, createdAt: -1 });

// ─── PRE-SAVE: auto-calculate metrics ──────────────────────────────────────
tradeSchema.pre("save", function (next) {
  if (this.exitPrice && this.entryPrice) {
    const diff = this.direction === "LONG"
      ? this.exitPrice - this.entryPrice
      : this.entryPrice - this.exitPrice;

    this.pnl = parseFloat((diff * this.positionSize).toFixed(2));

    // R:R calculation
    if (this.stopLoss) {
      const riskPerUnit = Math.abs(this.entryPrice - this.stopLoss);
      if (riskPerUnit > 0) {
        this.riskReward = this.takeProfit
          ? parseFloat((Math.abs(this.takeProfit - this.entryPrice) / riskPerUnit).toFixed(2))
          : null;
        this.rMultiple = parseFloat((Math.abs(diff) / riskPerUnit * (diff >= 0 ? 1 : -1)).toFixed(2));
      }
    }

    // Status
    if (this.pnl > 0) this.status = "win";
    else if (this.pnl < 0) this.status = "loss";
    else this.status = "breakeven";
  }
  next();
});

module.exports = mongoose.model("Trade", tradeSchema);
