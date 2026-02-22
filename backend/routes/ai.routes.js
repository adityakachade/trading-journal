const express = require("express");
const router = express.Router();
const { protect, requireTier } = require("../middleware/auth");
const { catchAsync, sendSuccess, AppError } = require("../utils/appError");
const rateLimiter = require("../middleware/rateLimiter");
const aiService = require("../services/ai.service");
const behaviorService = require("../services/behavior.service");

router.use(protect);

// Get behavior summary (Free for development)
router.get("/behavior",
  catchAsync(async (req, res) => {
    const summary = await behaviorService.getBehaviorSummary(req.user._id);
    sendSuccess(res, summary);
  })
);

// Trigger behavior re-analysis (Free for development)
router.post("/behavior/analyze",
  rateLimiter.ai,
  catchAsync(async (req, res) => {
    const result = await behaviorService.analyzeBehavior(req.user._id);
    sendSuccess(res, result);
  })
);

// Generate weekly report (Free for development)
router.post("/weekly-report",
  rateLimiter.ai,
  catchAsync(async (req, res) => {
    const { weekStart, weekEnd } = req.body;
    if (!weekStart || !weekEnd) {
      throw new AppError("weekStart and weekEnd are required.", 400);
    }
    const result = await aiService.generateWeeklyReport(
      req.user._id,
      new Date(weekStart),
      new Date(weekEnd)
    );
    sendSuccess(res, result);
  })
);

// Generate monthly growth plan (Free for development)
router.post("/monthly-plan",
  rateLimiter.ai,
  catchAsync(async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) throw new AppError("month and year are required.", 400);
    const plan = await aiService.generateMonthlyGrowthPlan(req.user._id, month, year);
    sendSuccess(res, { plan });
  })
);

// Get all weekly reports (Free for development)
router.get("/reports",
  catchAsync(async (req, res) => {
    const { WeeklyReport } = require("../models/Report");
    const { page = 1, limit = 10 } = req.query;
    const reports = await WeeklyReport.find({ userId: req.user._id })
      .sort("-weekStart")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    sendSuccess(res, { reports });
  })
);

// Get AI insights (Free for development)
router.get("/insights",
  catchAsync(async (req, res) => {
    const insights = await aiService.getInsights(req.user._id);
    sendSuccess(res, insights);
  })
);

// Get trade analysis (Free for development)
router.get("/trade-analysis/:tradeId",
  catchAsync(async (req, res) => {
    const { tradeId } = req.params;
    const analysis = await aiService.getTradeAnalysis(req.user._id, tradeId);
    sendSuccess(res, analysis);
  })
);

// Get pattern detection (Free for development)
router.get("/patterns",
  catchAsync(async (req, res) => {
    const patterns = await aiService.getPatterns(req.user._id);
    sendSuccess(res, patterns);
  })
);

// Get emotional analysis (Free for development)
router.get("/emotional-analysis",
  catchAsync(async (req, res) => {
    const analysis = await aiService.getEmotionalAnalysis(req.user._id);
    sendSuccess(res, analysis);
  })
);

// Get recommendations (Free for development)
router.get("/recommendations",
  catchAsync(async (req, res) => {
    const recommendations = await aiService.getRecommendations(req.user._id);
    sendSuccess(res, recommendations);
  })
);

// Generate report (Free for development)
router.post("/generate-report",
  rateLimiter.ai,
  catchAsync(async (req, res) => {
    const { type } = req.body;
    const report = await aiService.generateReport(req.user._id, type);
    sendSuccess(res, report);
  })
);

module.exports = router;
