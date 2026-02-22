const Trade = require("../models/Trade");
const { catchAsync, sendSuccess } = require("../utils/appError");
const { cache } = require("../config/redis");

// ─── HELPER: get date range ────────────────────────────────────────────────
const getDateRange = (range) => {
  const now = new Date();
  const from = new Date();
  switch (range) {
    case "7d":  from.setDate(now.getDate() - 7); break;
    case "30d": from.setDate(now.getDate() - 30); break;
    case "90d": from.setDate(now.getDate() - 90); break;
    case "1y":  from.setFullYear(now.getFullYear() - 1); break;
    case "all": return {};
    default:    from.setDate(now.getDate() - 30);
  }
  return { $gte: from, $lte: now };
};

// ─── DASHBOARD SUMMARY ─────────────────────────────────────────────────────
exports.getSummary = catchAsync(async (req, res) => {
  const { range = "30d" } = req.query;
  const userId = req.user._id;
  const cacheKey = `analytics:${userId}:summary:${range}`;
  const cached = await cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached);

  const dateFilter = getDateRange(range);
  const filter = { userId, ...(Object.keys(dateFilter).length && { tradeDate: dateFilter }) };

  const trades = await Trade.find(filter).select("pnl status rMultiple strategy session mistakeTag tradeDate").lean();

  const wins = trades.filter(t => t.status === "win");
  const losses = trades.filter(t => t.status === "loss");
  const closedTrades = trades.filter(t => t.status !== "open");

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0;
  const avgRMultiple = closedTrades.length
    ? closedTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0) / closedTrades.length
    : 0;

  // Profit factor
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Drawdown calculation
  let peak = 0, maxDrawdown = 0, runningPnl = 0;
  const sortedTrades = [...trades].sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
  for (const t of sortedTrades) {
    runningPnl += t.pnl || 0;
    if (runningPnl > peak) peak = runningPnl;
    const dd = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Streak
  let streak = 0, streakType = null;
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    const s = sortedTrades[i].status;
    if (s === "open") continue;
    if (!streakType) streakType = s;
    if (s === streakType) streak++;
    else break;
  }

  const summary = {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    avgRMultiple: parseFloat(avgRMultiple.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    currentStreak: streak,
    streakType,
    avgWin: wins.length ? parseFloat((grossProfit / wins.length).toFixed(2)) : 0,
    avgLoss: losses.length ? parseFloat((grossLoss / losses.length).toFixed(2)) : 0,
    bestTrade: trades.length ? Math.max(...trades.map(t => t.pnl)) : 0,
    worstTrade: trades.length ? Math.min(...trades.map(t => t.pnl)) : 0,
  };

  await cache.set(cacheKey, summary, 120);
  sendSuccess(res, summary);
});

// ─── EQUITY CURVE ──────────────────────────────────────────────────────────
exports.getEquityCurve = catchAsync(async (req, res) => {
  const { range = "30d", groupBy = "day" } = req.query;
  const userId = req.user._id;
  const cacheKey = `analytics:${userId}:equity:${range}:${groupBy}`;
  const cached = await cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached);

  const dateFilter = getDateRange(range);
  const filter = { userId, status: { $ne: "open" }, ...(Object.keys(dateFilter).length && { tradeDate: dateFilter }) };

  const trades = await Trade.find(filter).select("pnl tradeDate").sort("tradeDate").lean();

  let cumPnl = 0;
  const curve = trades.map(t => {
    cumPnl += t.pnl || 0;
    return {
      date: new Date(t.tradeDate).toISOString().split("T")[0],
      pnl: parseFloat(cumPnl.toFixed(2)),
      tradePnl: parseFloat((t.pnl || 0).toFixed(2)),
    };
  });

  await cache.set(cacheKey, curve, 120);
  sendSuccess(res, curve);
});

// ─── PERFORMANCE BY SESSION ────────────────────────────────────────────────
exports.getSessionPerformance = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = `analytics:${userId}:sessions`;
  const cached = await cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached);

  const sessions = await Trade.aggregate([
    { $match: { userId, status: { $ne: "open" } } },
    { $group: {
      _id: "$session",
      totalTrades: { $sum: 1 },
      wins: { $sum: { $cond: [{ $eq: ["$status", "win"] }, 1, 0] } },
      totalPnl: { $sum: "$pnl" },
      avgRMultiple: { $avg: "$rMultiple" },
    }},
    { $project: {
      session: "$_id",
      totalTrades: 1,
      wins: 1,
      winRate: { $multiply: [{ $divide: ["$wins", "$totalTrades"] }, 100] },
      totalPnl: { $round: ["$totalPnl", 2] },
      avgRMultiple: { $round: ["$avgRMultiple", 2] },
    }},
    { $sort: { totalPnl: -1 } },
  ]);

  await cache.set(cacheKey, sessions, 180);
  sendSuccess(res, sessions);
});

// ─── PERFORMANCE BY STRATEGY ───────────────────────────────────────────────
exports.getStrategyPerformance = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = `analytics:${userId}:strategies`;
  const cached = await cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached);

  const strategies = await Trade.aggregate([
    { $match: { userId, status: { $ne: "open" } } },
    { $group: {
      _id: "$strategy",
      totalTrades: { $sum: 1 },
      wins: { $sum: { $cond: [{ $eq: ["$status", "win"] }, 1, 0] } },
      totalPnl: { $sum: "$pnl" },
      avgRMultiple: { $avg: "$rMultiple" },
      avgQualityScore: { $avg: "$aiAnalysis.qualityScore" },
    }},
    { $project: {
      strategy: "$_id",
      totalTrades: 1,
      wins: 1,
      winRate: { $round: [{ $multiply: [{ $divide: ["$wins", "$totalTrades"] }, 100] }, 1] },
      totalPnl: { $round: ["$totalPnl", 2] },
      avgRMultiple: { $round: ["$avgRMultiple", 2] },
      avgQualityScore: { $round: ["$avgQualityScore", 1] },
    }},
    { $sort: { totalPnl: -1 } },
  ]);

  sendSuccess(res, strategies);
});

// ─── DAILY PNL (heatmap data) ──────────────────────────────────────────────
exports.getDailyPnl = catchAsync(async (req, res) => {
  const { year = new Date().getFullYear(), month } = req.query;
  const userId = req.user._id;

  const startDate = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1);
  const endDate = month
    ? new Date(year, month, 0)
    : new Date(year, 11, 31);

  const daily = await Trade.aggregate([
    { $match: { userId, status: { $ne: "open" }, tradeDate: { $gte: startDate, $lte: endDate } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$tradeDate" } },
      pnl: { $sum: "$pnl" },
      trades: { $sum: 1 },
      wins: { $sum: { $cond: [{ $eq: ["$status", "win"] }, 1, 0] } },
    }},
    { $sort: { _id: 1 } },
  ]);

  sendSuccess(res, daily);
});

// ─── MISTAKES BREAKDOWN ────────────────────────────────────────────────────
exports.getMistakeBreakdown = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const mistakes = await Trade.aggregate([
    { $match: { userId, mistakeTag: { $ne: null } } },
    { $group: {
      _id: "$mistakeTag",
      count: { $sum: 1 },
      totalPnlLost: { $sum: { $cond: [{ $lt: ["$pnl", 0] }, "$pnl", 0] } },
    }},
    { $sort: { count: -1 } },
  ]);

  sendSuccess(res, mistakes);
});

// ─── EMOTION PERFORMANCE ────────────────────────────────────────────────────
exports.getEmotionPerformance = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  const emotions = await Trade.aggregate([
    { $match: { userId, status: { $ne: "open" } } },
    { $group: {
      _id: "$emotionBefore",
      trades: { $sum: 1 },
      wins: { $sum: { $cond: [{ $eq: ["$status", "win"] }, 1, 0] } },
      pnl: { $sum: "$pnl" },
    }},
    { $addFields: { winRate: { $multiply: [{ $divide: ["$wins", "$trades"] }, 100] } } },
    { $sort: { trades: -1 } },
  ]);

  sendSuccess(res, emotions);
});
