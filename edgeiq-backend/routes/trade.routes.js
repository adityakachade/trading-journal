const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/trade.controller");
const { protect, requireTier } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const rateLimiter = require("../middleware/rateLimiter");

router.use(protect);

router.route("/")
  .get(tradeController.getTrades)
  .post(rateLimiter.trade, validate(schemas.createTrade), tradeController.createTrade);

router.post("/bulk-import", requireTier("pro"), tradeController.bulkImport);

router.get("/export", tradeController.exportTrades);

router.route("/:id")
  .get(tradeController.getTrade)
  .patch(validate(schemas.updateTrade), tradeController.updateTrade)
  .delete(tradeController.deleteTrade);

router.post("/:id/analyze", requireTier("pro"), rateLimiter.ai, tradeController.getAIAnalysis);

module.exports = router;
