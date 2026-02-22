const crypto = require("crypto");
const User = require("../models/User");
const { generateTokenPair, verifyRefreshToken, generateAccessToken } = require("../utils/jwt");
const { AppError, catchAsync, sendSuccess } = require("../utils/appError");
const { cache } = require("../config/redis");
const emailService = require("../services/email.service");

// ─── REGISTER ──────────────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError("Email already registered.", 409));

  const emailToken = crypto.randomBytes(32).toString("hex");
  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: crypto.createHash("sha256").update(emailToken).digest("hex"),
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });

  // Send verification email (non-blocking)
  emailService.sendVerificationEmail(user.email, user.name, emailToken).catch(() => {});

  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

  // Store refresh token
  user.refreshTokens = [refreshToken];
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    user: user.getPublicProfile(),
    accessToken,
    refreshToken,
  }, 201);
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshTokens");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Invalid email or password.", 401));
  }

  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

  // Keep last 5 refresh tokens (multi-device support)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    user: user.getPublicProfile(),
    accessToken,
    refreshToken,
  });
});

// ─── REFRESH TOKEN ─────────────────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError("Refresh token required.", 400));

  // Check blocklist
  const isBlocked = await cache.get(`blocklist:${refreshToken}`);
  if (isBlocked) return next(new AppError("Token revoked.", 401));

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return next(new AppError("Invalid or expired refresh token.", 401));
  }

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    return next(new AppError("Refresh token not recognized.", 401));
  }

  // Rotate: remove old, add new
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user._id, user.role);
  user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken).concat(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, { accessToken, refreshToken: newRefreshToken });
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  const user = await User.findById(req.user._id).select("+refreshTokens");

  if (refreshToken) {
    // Blocklist the refresh token for 7d
    await cache.set(`blocklist:${refreshToken}`, 1, 7 * 24 * 60 * 60);
    user.refreshTokens = (user.refreshTokens || []).filter(t => t !== refreshToken);
    await user.save({ validateBeforeSave: false });
  }

  sendSuccess(res, { message: "Logged out successfully." });
});

// ─── VERIFY EMAIL ──────────────────────────────────────────────────────────
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) return next(new AppError("Token is invalid or has expired.", 400));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, { message: "Email verified successfully." });
});

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  // Always return 200 to prevent email enumeration
  if (!user) return sendSuccess(res, { message: "If that email exists, a reset link has been sent." });

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
  await user.save({ validateBeforeSave: false });

  emailService.sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {});

  sendSuccess(res, { message: "If that email exists, a reset link has been sent." });
});

// ─── RESET PASSWORD ────────────────────────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires +refreshTokens");

  if (!user) return next(new AppError("Token is invalid or has expired.", 400));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // invalidate all sessions
  await user.save();

  sendSuccess(res, { message: "Password reset successful. Please log in." });
});

// ─── GET CURRENT USER ──────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  sendSuccess(res, { user: req.user.getPublicProfile() });
});
