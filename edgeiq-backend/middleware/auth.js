const { verifyAccessToken } = require("../utils/jwt");
const { AppError, catchAsync } = require("../utils/appError");
const User = require("../models/User");

// ─── PROTECT: verify JWT ────────────────────────────────────────────────────
const protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No token provided. Please log in.", 401));
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user) {
    return next(new AppError("User no longer exists.", 401));
  }

  req.user = user;
  next();
});

// ─── RESTRICT: role-based ───────────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action.", 403));
  }
  next();
};

// ─── REQUIRE TIER: subscription gating ─────────────────────────────────────
const requireTier = (...tiers) => (req, res, next) => {
  const tierLevel = { free: 0, pro: 1, elite: 2 };
  const minLevel = Math.min(...tiers.map(t => tierLevel[t] ?? 0));
  const userLevel = tierLevel[req.user.subscriptionTier] ?? 0;

  if (userLevel < minLevel) {
    const requiredTier = tiers.sort((a, b) => tierLevel[a] - tierLevel[b])[0];
    return next(new AppError(
      `This feature requires a ${requiredTier} subscription. Upgrade to unlock.`,
      403,
      "UPGRADE_REQUIRED"
    ));
  }
  next();
};

// ─── CHECK: subscription active ────────────────────────────────────────────
const requireActiveSubscription = (req, res, next) => {
  const { subscriptionTier, subscriptionStatus } = req.user;
  if (subscriptionTier !== "free" && subscriptionStatus !== "active") {
    return next(new AppError("Your subscription is not active. Please update your billing.", 402));
  }
  next();
};

module.exports = { protect, restrictTo, requireTier, requireActiveSubscription };
