const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const stripeService = require("../services/stripe.service");

// Webhook must be BEFORE auth middleware (uses raw body)
router.post("/webhook", stripeService.handleWebhook);

// Protected routes
router.use(protect);
router.post("/checkout",       stripeService.createCheckoutSession);
router.post("/portal",         stripeService.createPortalSession);
router.get("/subscription",    stripeService.getSubscriptionStatus);

module.exports = router;
