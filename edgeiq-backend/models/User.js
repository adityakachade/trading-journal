const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [60, "Name cannot exceed 60 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // ─── SUBSCRIPTION ────────────────────────────────────────────────────────
  subscriptionTier: {
    type: String,
    enum: ["free", "pro", "elite"],
    default: "free",
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive", "canceled", "past_due", "trialing"],
    default: "active",
  },
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  subscriptionCurrentPeriodEnd: { type: Date, default: null },

  // ─── EMAIL VERIFICATION ──────────────────────────────────────────────────
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },

  // ─── PASSWORD RESET ──────────────────────────────────────────────────────
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },

  // ─── REFRESH TOKEN ───────────────────────────────────────────────────────
  refreshTokens: [{ type: String, select: false }],

  // ─── STATS CACHE ─────────────────────────────────────────────────────────
  tradeCount: { type: Number, default: 0 },
  monthlyTradeCount: { type: Number, default: 0 },
  monthlyTradeResetDate: { type: Date, default: () => new Date() },

  // ─── PREFERENCES ─────────────────────────────────────────────────────────
  preferences: {
    timezone: { type: String, default: "UTC" },
    currency: { type: String, default: "USD" },
    defaultRisk: { type: Number, default: 1 },
    notifications: { type: Boolean, default: true },
  },

  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── INDEXES ───────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ stripeCustomerId: 1 });

// ─── HOOKS ─────────────────────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── METHODS ───────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.canAddTrade = function () {
  const limits = { free: 30, pro: Infinity, elite: Infinity };
  const limit = limits[this.subscriptionTier] || 30;

  // Reset monthly count if it's a new month
  const now = new Date();
  const resetDate = new Date(this.monthlyTradeResetDate);
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    return true; // will reset on save
  }

  return this.monthlyTradeCount < limit;
};

userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    subscriptionTier: this.subscriptionTier,
    subscriptionStatus: this.subscriptionStatus,
    subscriptionCurrentPeriodEnd: this.subscriptionCurrentPeriodEnd,
    isEmailVerified: this.isEmailVerified,
    preferences: this.preferences,
    tradeCount: this.tradeCount,
    createdAt: this.createdAt,
  };
};

// ─── VIRTUALS ──────────────────────────────────────────────────────────────
userSchema.virtual("isPro").get(function () {
  return ["pro", "elite"].includes(this.subscriptionTier);
});
userSchema.virtual("isElite").get(function () {
  return this.subscriptionTier === "elite";
});

module.exports = mongoose.model("User", userSchema);
