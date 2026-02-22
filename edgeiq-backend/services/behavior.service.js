const Trade = require("../models/Trade");
const { BehaviorLog } = require("../models/Report");
const logger = require("../utils/logger");

// ─── MAIN BEHAVIOR ANALYZER ────────────────────────────────────────────────
exports.analyzeBehavior = async (userId) => {
  try {
    const now = new Date();
    const windowStart = new Date(now - 24 * 60 * 60 * 1000); // last 24h

    const recentTrades = await Trade.find({
      userId,
      createdAt: { $gte: windowStart },
    }).sort("createdAt").lean();

    if (recentTrades.length === 0) return null;

    const behaviors = {
      overtradingDetected: detectOvertrading(recentTrades),
      revengeTradeDetected: detectRevengeTrade(recentTrades),
      fomoDetected: detectFOMO(recentTrades),
      inconsistentRisk: await detectInconsistentRisk(userId),
      emotionalBias: detectEmotionalBias(recentTrades),
    };

    const disciplineScore = calculateDisciplineScore(behaviors, recentTrades);
    const consistencyScore = await calculateConsistencyScore(userId);

    await BehaviorLog.create({
      userId,
      date: now,
      behaviors,
      disciplineScore,
      consistencyScore,
      tradeCount: recentTrades.length,
    });

    return { behaviors, disciplineScore, consistencyScore };

  } catch (err) {
    logger.error(`Behavior analysis failed for user ${userId}: ${err.message}`);
    return null;
  }
};

// ─── DETECTORS ─────────────────────────────────────────────────────────────

// Overtrading: >5 trades in a 4-hour window
function detectOvertrading(trades) {
  if (trades.length < 5) return false;
  for (let i = 0; i < trades.length - 4; i++) {
    const window = trades.slice(i, i + 5);
    const timespan = new Date(window[4].createdAt) - new Date(window[0].createdAt);
    if (timespan <= 4 * 60 * 60 * 1000) return true;
  }
  return false;
}

// Revenge trading: losing trade followed by trade within 15 min
function detectRevengeTrade(trades) {
  for (let i = 0; i < trades.length - 1; i++) {
    if (trades[i].status === "loss") {
      const nextTrade = trades[i + 1];
      const timeDiff = new Date(nextTrade.createdAt) - new Date(trades[i].createdAt);
      if (timeDiff <= 15 * 60 * 1000) return true;
    }
  }
  return false;
}

// FOMO: emotion tagged as FOMO, or late entries on strong moves
function detectFOMO(trades) {
  return trades.some(t =>
    t.emotionBefore === "FOMO" ||
    t.mistakeTag === "FOMO Entry" ||
    t.mistakeTag === "Late Entry"
  );
}

// Inconsistent risk: position size variance > 50%
async function detectInconsistentRisk(userId) {
  const last20 = await Trade.find({ userId }).sort("-createdAt").limit(20).select("positionSize").lean();
  if (last20.length < 5) return false;

  const sizes = last20.map(t => t.positionSize).filter(Boolean);
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const variance = sizes.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / sizes.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avg > 0 ? (stdDev / avg) * 100 : 0;

  return coefficientOfVariation > 50;
}

// Emotional bias: >30% of recent trades with negative emotions
function detectEmotionalBias(trades) {
  const negativeEmotions = ["Anxious", "Revenge", "FOMO", "Fearful"];
  const negativeCount = trades.filter(t => negativeEmotions.includes(t.emotionBefore)).length;
  return trades.length > 0 && (negativeCount / trades.length) > 0.3;
}

// ─── SCORERS ───────────────────────────────────────────────────────────────

function calculateDisciplineScore(behaviors, trades) {
  let score = 100;

  if (behaviors.overtradingDetected) score -= 20;
  if (behaviors.revengeTradeDetected) score -= 25;
  if (behaviors.fomoDetected) score -= 15;
  if (behaviors.inconsistentRisk) score -= 20;
  if (behaviors.emotionalBias) score -= 10;

  // Bonus: trades with SL defined
  const withSL = trades.filter(t => t.stopLoss).length;
  if (trades.length > 0) {
    const slRatio = withSL / trades.length;
    if (slRatio < 0.5) score -= 10;
    else if (slRatio === 1) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

async function calculateConsistencyScore(userId) {
  const last30 = await Trade.find({ userId, status: { $ne: "open" } })
    .sort("-tradeDate").limit(30).select("positionSize rMultiple status").lean();

  if (last30.length < 5) return 50;

  const scores = [];

  // Win rate consistency (rolling 5-trade windows)
  for (let i = 0; i <= last30.length - 5; i++) {
    const window = last30.slice(i, i + 5);
    const wr = window.filter(t => t.status === "win").length / 5;
    scores.push(wr);
  }

  if (scores.length === 0) return 50;
  const avgWR = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, wr) => s + Math.pow(wr - avgWR, 2), 0) / scores.length;
  const consistency = Math.max(0, 100 - variance * 200);

  return parseFloat(consistency.toFixed(1));
}

// ─── GET BEHAVIOR SUMMARY ──────────────────────────────────────────────────
exports.getBehaviorSummary = async (userId) => {
  const logs = await BehaviorLog.find({ userId }).sort("-date").limit(30).lean();

  if (logs.length === 0) return { message: "No behavior data yet." };

  const latest = logs[0];
  const avgDiscipline = logs.reduce((s, l) => s + l.disciplineScore, 0) / logs.length;
  const avgConsistency = logs.reduce((s, l) => s + l.consistencyScore, 0) / logs.length;

  const flagCounts = {
    overtradingCount: logs.filter(l => l.behaviors.overtradingDetected).length,
    revengeTradeCount: logs.filter(l => l.behaviors.revengeTradeDetected).length,
    fomoCount: logs.filter(l => l.behaviors.fomoDetected).length,
    inconsistentRiskCount: logs.filter(l => l.behaviors.inconsistentRisk).length,
    emotionalBiasCount: logs.filter(l => l.behaviors.emotionalBias).length,
  };

  return {
    current: latest.behaviors,
    disciplineScore: parseFloat(avgDiscipline.toFixed(1)),
    consistencyScore: parseFloat(avgConsistency.toFixed(1)),
    flagCounts,
    trend: logs.slice(0, 7).map(l => ({
      date: l.date,
      disciplineScore: l.disciplineScore,
      consistencyScore: l.consistencyScore,
    })),
  };
};
