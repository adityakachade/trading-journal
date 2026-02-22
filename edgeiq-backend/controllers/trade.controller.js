const Trade = require("../models/Trade");
const User = require("../models/User");
const { AppError, catchAsync, sendSuccess, sendPaginated } = require("../utils/appError");
const { cache } = require("../config/redis");
const aiService = require("../services/ai.service");
const behaviorService = require("../services/behavior.service");

// ─── GET ALL TRADES ────────────────────────────────────────────────────────
exports.getTrades = catchAsync(async (req, res) => {
  const {
    page = 1, limit = 20, status, strategy, session,
    symbol, dateFrom, dateTo, sort = "-tradeDate",
  } = req.query;

  const userId = req.user._id;
  const cacheKey = `trades:${userId}:${JSON.stringify(req.query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return sendPaginated(res, cached.trades, cached.total, page, limit);

  const filter = { userId };
  if (status) filter.status = status;
  if (strategy) filter.strategy = strategy;
  if (session) filter.session = session;
  if (symbol) filter.symbol = new RegExp(symbol, "i");
  if (dateFrom || dateTo) {
    filter.tradeDate = {};
    if (dateFrom) filter.tradeDate.$gte = new Date(dateFrom);
    if (dateTo) filter.tradeDate.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const [trades, total] = await Promise.all([
    Trade.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    Trade.countDocuments(filter),
  ]);

  await cache.set(cacheKey, { trades, total }, 60);
  sendPaginated(res, trades, total, page, limit);
});

// ─── GET SINGLE TRADE ──────────────────────────────────────────────────────
exports.getTrade = catchAsync(async (req, res, next) => {
  const trade = await Trade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trade) return next(new AppError("Trade not found.", 404));
  sendSuccess(res, { trade });
});

// ─── CREATE TRADE ──────────────────────────────────────────────────────────
exports.createTrade = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Check monthly limit for free tier
  if (!user.canAddTrade()) {
    return next(new AppError(
      "You've reached the 30 trade limit for the free plan. Upgrade to Pro for unlimited trades.",
      403,
      "TRADE_LIMIT_REACHED"
    ));
  }

  // Debug: Log the incoming request body
  console.log('Incoming trade data:', req.body);
  console.log('Screenshot URL present:', !!req.body.screenshotUrl);
  console.log('Screenshot URL length:', req.body.screenshotUrl?.length || 0);
  console.log('Screenshot URL type:', typeof req.body.screenshotUrl);
  console.log('Screenshot URL starts with:', req.body.screenshotUrl?.substring(0, 50) + '...');

  const tradeData = { ...req.body, userId: user._id };
  
  // Handle large screenshot URLs by truncating if necessary
  if (tradeData.screenshotUrl && tradeData.screenshotUrl.length > 1000000) {
    console.log('Screenshot URL too large, truncating...');
    tradeData.screenshotUrl = tradeData.screenshotUrl.substring(0, 1000000) + '...[truncated]';
  }
  
  console.log('Final tradeData screenshotUrl:', tradeData.screenshotUrl?.substring(0, 50) + '...');

  const trade = await Trade.create(tradeData);
  
  console.log('Created trade screenshotUrl:', trade.screenshotUrl?.substring(0, 50) + '...');

  // Update user counters
  const now = new Date();
  const resetDate = new Date(user.monthlyTradeResetDate);
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    user.monthlyTradeCount = 1;
    user.monthlyTradeResetDate = now;
  } else {
    user.monthlyTradeCount += 1;
  }
  user.tradeCount += 1;
  await user.save({ validateBeforeSave: false });

  // Invalidate trades cache
  await cache.delPattern(`trades:${user._id}:*`);
  await cache.delPattern(`analytics:${user._id}:*`);

  // Trigger AI analysis asynchronously (Pro/Elite only)
  if (user.isPro) {
    aiService.analyzeTrade(trade._id, user.subscriptionTier).catch(err => {
      console.error("AI analysis failed:", err.message);
    });
  }

  // Run behavior analysis in background
  behaviorService.analyzeBehavior(user._id).catch(() => {});

  sendSuccess(res, { trade }, 201);
});

// ─── UPDATE TRADE ──────────────────────────────────────────────────────────
exports.updateTrade = catchAsync(async (req, res, next) => {
  const trade = await Trade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trade) return next(new AppError("Trade not found.", 404));

  Object.assign(trade, req.body);
  await trade.save();

  await cache.delPattern(`trades:${req.user._id}:*`);
  await cache.delPattern(`analytics:${req.user._id}:*`);

  // Re-run AI if exit price was just added and user is Pro
  if (req.body.exitPrice && req.user.isPro) {
    aiService.analyzeTrade(trade._id, req.user.subscriptionTier).catch(() => {});
  }

  sendSuccess(res, { trade });
});

// ─── DELETE TRADE ──────────────────────────────────────────────────────────
exports.deleteTrade = catchAsync(async (req, res, next) => {
  const trade = await Trade.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!trade) return next(new AppError("Trade not found.", 404));

  req.user.tradeCount = Math.max(0, req.user.tradeCount - 1);
  await req.user.save({ validateBeforeSave: false });

  await cache.delPattern(`trades:${req.user._id}:*`);
  await cache.delPattern(`analytics:${req.user._id}:*`);

  sendSuccess(res, { message: "Trade deleted." });
});

// ─── GET AI ANALYSIS (trigger manually) ────────────────────────────────────
exports.getAIAnalysis = catchAsync(async (req, res, next) => {
  const trade = await Trade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trade) return next(new AppError("Trade not found.", 404));

  if (!req.user.isPro) {
    return next(new AppError("AI analysis requires a Pro or Elite subscription.", 403, "UPGRADE_REQUIRED"));
  }

  const analysis = await aiService.analyzeTrade(trade._id, req.user.subscriptionTier);
  sendSuccess(res, { analysis });
});

// ─── BULK IMPORT (CSV) ─────────────────────────────────────────────────────
exports.bulkImport = catchAsync(async (req, res, next) => {
  const { trades } = req.body;
  if (!Array.isArray(trades) || trades.length === 0) {
    return next(new AppError("trades array is required.", 400));
  }
  if (trades.length > 500) {
    return next(new AppError("Maximum 500 trades per import.", 400));
  }

  const docs = trades.map(t => ({ ...t, userId: req.user._id }));
  const inserted = await Trade.insertMany(docs, { ordered: false });

  req.user.tradeCount += inserted.length;
  await req.user.save({ validateBeforeSave: false });
  await cache.delPattern(`trades:${req.user._id}:*`);
  await cache.delPattern(`analytics:${req.user._id}:*`);

  sendSuccess(res, {
    message: `${inserted.length} trades imported successfully.`,
    count: inserted.length,
  }, 201);
});

// ─── EXPORT TRADES ───────────────────────────────────────────────────────────
exports.exportTrades = catchAsync(async (req, res) => {
  const { format = 'csv' } = req.query;
  const userId = req.user._id;
  
  const trades = await Trade.find({ userId }).sort('-tradeDate').lean();
  
  if (format === 'csv') {
    const csv = [
      'Date,Symbol,Direction,Entry,Exit,Position Size,PnL,Status,Strategy,Session,Emotion Before,Emotion After,Notes'
    ];
    
    trades.forEach(trade => {
      csv.push([
        trade.tradeDate.toISOString().split('T')[0],
        trade.symbol,
        trade.direction,
        trade.entryPrice,
        trade.exitPrice || '',
        trade.positionSize,
        trade.pnl || 0,
        trade.status,
        trade.strategy,
        trade.session,
        trade.emotionBefore,
        trade.emotionAfter || '',
        `"${(trade.notes || '').replace(/"/g, '""')}"`
      ].join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="trades_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv.join('\n'));
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trades_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({ trades, exportedAt: new Date().toISOString() });
  }
});
