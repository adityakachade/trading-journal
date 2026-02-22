const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const { AppError, catchAsync, sendSuccess } = require("../utils/appError");
const logger = require("../utils/logger");

const TIER_MAP = {
  [process.env.STRIPE_PRO_PRICE_ID]: "pro",
  [process.env.STRIPE_ELITE_PRICE_ID]: "elite",
};

// ─── CREATE CHECKOUT SESSION ───────────────────────────────────────────────
exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const { priceId } = req.body;
  const user = req.user;

  if (!Object.keys(TIER_MAP).includes(priceId)) {
    return next(new AppError("Invalid price ID.", 400));
  }

  // Ensure Stripe customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save({ validateBeforeSave: false });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/billing?canceled=true`,
    metadata: { userId: user._id.toString() },
    subscription_data: {
      metadata: { userId: user._id.toString() },
    },
    allow_promotion_codes: true,
  });

  sendSuccess(res, { url: session.url, sessionId: session.id });
});

// ─── CREATE PORTAL SESSION (manage billing) ─────────────────────────────────
exports.createPortalSession = catchAsync(async (req, res, next) => {
  const user = req.user;
  if (!user.stripeCustomerId) {
    return next(new AppError("No billing account found.", 404));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/billing`,
  });

  sendSuccess(res, { url: session.url });
});

// ─── WEBHOOK HANDLER ───────────────────────────────────────────────────────
exports.handleWebhook = catchAsync(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Stripe webhook signature failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info(`Stripe event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await updateUserSubscription(session.metadata.userId, subscription);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const user = await User.findOne({ email: customer.email });
      if (user) await updateUserSubscription(user._id, sub);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const user = await User.findOne({ email: customer.email });
      if (user) {
        user.subscriptionTier = "free";
        user.subscriptionStatus = "canceled";
        user.stripeSubscriptionId = null;
        user.subscriptionCurrentPeriodEnd = null;
        await user.save({ validateBeforeSave: false });
        logger.info(`Subscription canceled for user ${user.email}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user) {
        user.subscriptionStatus = "past_due";
        await user.save({ validateBeforeSave: false });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user && user.subscriptionStatus === "past_due") {
        user.subscriptionStatus = "active";
        await user.save({ validateBeforeSave: false });
      }
      break;
    }
  }

  res.json({ received: true });
});

// ─── GET SUBSCRIPTION STATUS ───────────────────────────────────────────────
exports.getSubscriptionStatus = catchAsync(async (req, res) => {
  const user = req.user;

  let stripeDetails = null;
  if (user.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      stripeDetails = {
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    } catch (err) {
      logger.warn(`Could not fetch Stripe subscription: ${err.message}`);
    }
  }

  sendSuccess(res, {
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
    stripeDetails,
  });
});

// ─── HELPER ────────────────────────────────────────────────────────────────
async function updateUserSubscription(userId, subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const tier = TIER_MAP[priceId] || "free";

  await User.findByIdAndUpdate(userId, {
    subscriptionTier: tier,
    subscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
    subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });

  logger.info(`User ${userId} subscription updated to ${tier} (${subscription.status})`);
}
