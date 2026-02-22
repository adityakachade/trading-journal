const express = require("express");
const router = express.Router();
const { protect, requireTier } = require("../middleware/auth");
const { catchAsync, sendSuccess } = require("../utils/appError");
const { WeeklyReport } = require("../models/Report");
const emailService = require("../services/email.service");

router.use(protect);

// List reports
router.get("/weekly",
  requireTier("pro"),
  catchAsync(async (req, res) => {
    const { page = 1, limit = 12 } = req.query;
    const [reports, total] = await Promise.all([
      WeeklyReport.find({ userId: req.user._id })
        .sort("-weekStart")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      WeeklyReport.countDocuments({ userId: req.user._id }),
    ]);
    const { sendPaginated } = require("../utils/appError");
    sendPaginated(res, reports, total, page, limit);
  })
);

// Get single report
router.get("/weekly/:id",
  requireTier("pro"),
  catchAsync(async (req, res, next) => {
    const { AppError } = require("../utils/appError");
    const report = await WeeklyReport.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) return next(new AppError("Report not found.", 404));
    sendSuccess(res, { report });
  })
);

// Email report to self
router.post("/weekly/:id/email",
  requireTier("pro"),
  catchAsync(async (req, res, next) => {
    const { AppError } = require("../utils/appError");
    const report = await WeeklyReport.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) return next(new AppError("Report not found.", 404));

    await emailService.sendWeeklyReportEmail(
      req.user.email,
      req.user.name,
      report.stats
    );

    sendSuccess(res, { message: "Report emailed successfully." });
  })
);

module.exports = router;
