const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { protect, requireTier } = require("../middleware/auth");

router.use(protect);

router.get("/summary",          analyticsController.getSummary);
router.get("/equity-curve",     analyticsController.getEquityCurve);
router.get("/sessions",         analyticsController.getSessionPerformance);
router.get("/strategies",       analyticsController.getStrategyPerformance);
router.get("/daily-pnl",        analyticsController.getDailyPnl);
router.get("/mistakes",         analyticsController.getMistakeBreakdown);
router.get("/emotions",         analyticsController.getEmotionPerformance);

module.exports = router;
