const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const { catchAsync, sendSuccess } = require("../utils/appError");
const User = require("../models/User");

router.use(protect);

// Get own profile
router.get("/profile", catchAsync(async (req, res) => {
  sendSuccess(res, { user: req.user.getPublicProfile() });
}));

// Update preferences
router.patch("/preferences", validate(schemas.preferences), catchAsync(async (req, res) => {
  req.user.preferences = { ...req.user.preferences, ...req.body };
  await req.user.save({ validateBeforeSave: false });
  sendSuccess(res, { preferences: req.user.preferences });
}));

// Change password
router.patch("/password", validate(schemas.changePassword), catchAsync(async (req, res, next) => {
  const { AppError } = require("../utils/appError");
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError("Current password is incorrect.", 401));
  }
  user.password = req.body.newPassword;
  await user.save();
  sendSuccess(res, { message: "Password updated successfully." });
}));

// Admin: list all users
router.get("/", restrictTo("admin"), catchAsync(async (req, res) => {
  const { page = 1, limit = 50, tier } = req.query;
  const filter = tier ? { subscriptionTier: tier } : {};
  const users = await User.find(filter)
    .select("-__v")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await User.countDocuments(filter);
  const { sendPaginated } = require("../utils/appError");
  sendPaginated(res, users, total, page, limit);
}));

// Admin: get single user
router.get("/:id", restrictTo("admin"), catchAsync(async (req, res, next) => {
  const { AppError } = require("../utils/appError");
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found.", 404));
  sendSuccess(res, { user });
}));

module.exports = router;
