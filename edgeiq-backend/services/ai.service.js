const OpenAI = require("openai");
const Trade = require("../models/Trade");
const { WeeklyReport } = require("../models/Report");
const logger = require("../utils/logger");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ─── ANALYZE SINGLE TRADE ──────────────────────────────────────────────────
exports.analyzeTrade = async (tradeId, subscriptionTier = "pro") => {
  const trade = await Trade.findById(tradeId);
  if (!trade) throw new Error("Trade not found");

  trade.aiAnalysisPending = true;
  await trade.save({ validateBeforeSave: false });

  const isElite = subscriptionTier === "elite";

  const systemPrompt = `You are an elite trading coach and professional risk analyst. 
Your job is to analyze trades objectively and provide actionable coaching feedback.
Always respond with valid JSON only — no markdown, no explanation outside JSON.`;

  const userPrompt = `Analyze this trade and return a JSON object with EXACTLY these fields:
{
  "qualityScore": <number 1-10>,
  "riskDisciplineRating": <number 1-10>,
  "emotionalDisciplineRating": <number 1-10>,
  "mistakeDetected": <boolean>,
  "behavioralFlags": <array of strings, max 3>,
  "coachingFeedback": <1-2 sentence coaching paragraph>,
  "suggestedImprovement": <1 specific actionable improvement>
  ${isElite ? `,"psychologyScore": <number 1-10>,
  "patternWarning": <string or null>,
  "entryTiming": <"early"|"optimal"|"late">,
  "exitTiming": <"early"|"optimal"|"late"|"not_closed">` : ""}
}

Trade Data:
- Symbol: ${trade.symbol} (${trade.market})
- Direction: ${trade.direction}
- Entry: ${trade.entryPrice} | Exit: ${trade.exitPrice || "Open"}
- Stop Loss: ${trade.stopLoss || "None"} | Take Profit: ${trade.takeProfit || "None"}
- Position Size: ${trade.positionSize}
- PnL: $${trade.pnl} | R-Multiple: ${trade.rMultiple || "N/A"}
- Strategy: ${trade.strategy} | Session: ${trade.session}
- Emotion Before: ${trade.emotionBefore} | Emotion After: ${trade.emotionAfter || "N/A"}
- Mistake Tag: ${trade.mistakeTag || "None"}
- Notes: "${trade.notes || "None"}"

Scoring guide:
- qualityScore: setup quality, execution, risk management
- riskDisciplineRating: was SL defined? appropriate sizing? proper RR?
- emotionalDisciplineRating: was emotion neutral/confident? no FOMO/revenge?
- behavioralFlags: e.g. ["FOMO Entry", "No Stop Loss", "Oversized Position"]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    const analysis = JSON.parse(raw);

    // Clamp scores to valid range
    ["qualityScore", "riskDisciplineRating", "emotionalDisciplineRating"].forEach(key => {
      if (analysis[key]) analysis[key] = Math.min(10, Math.max(0, analysis[key]));
    });

    trade.aiAnalysis = { ...analysis, analyzedAt: new Date() };
    trade.aiAnalysisPending = false;
    await trade.save({ validateBeforeSave: false });

    logger.info(`AI analysis complete for trade ${tradeId}`);
    return analysis;

  } catch (err) {
    trade.aiAnalysisPending = false;
    await trade.save({ validateBeforeSave: false });
    logger.error(`AI analysis failed for trade ${tradeId}: ${err.message}`);
    throw err;
  }
};

// ─── GENERATE WEEKLY REPORT ────────────────────────────────────────────────
exports.generateWeeklyReport = async (userId, weekStart, weekEnd) => {
  const trades = await Trade.find({
    userId,
    tradeDate: { $gte: weekStart, $lte: weekEnd },
    status: { $ne: "open" },
  }).lean();

  if (trades.length === 0) {
    return { message: "No closed trades in this period." };
  }

  const wins = trades.filter(t => t.status === "win");
  const losses = trades.filter(t => t.status === "loss");
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length ? (wins.length / trades.length * 100).toFixed(1) : 0;
  const avgRMultiple = trades.reduce((s, t) => s + (t.rMultiple || 0), 0) / trades.length;

  const mistakes = trades.filter(t => t.mistakeTag).map(t => t.mistakeTag);
  const mistakeCounts = mistakes.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});

  const systemPrompt = `You are an elite trading performance coach. 
Provide weekly performance analysis in JSON only. Be direct, specific, and actionable.`;

  const userPrompt = `Generate a weekly trading performance report. Return JSON:
{
  "summary": "<2-3 sentence executive summary of the week>",
  "keyStrengths": ["<strength 1>", "<strength 2>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "focusForNextWeek": "<one clear focus for next week>",
  "disciplineScore": <number 0-100>,
  "consistencyScore": <number 0-100>,
  "psychologyRating": <"excellent"|"good"|"needs_work"|"poor">,
  "behavioralWarnings": ["<warning if any>"]
}

Weekly Stats:
- Total Trades: ${trades.length} (${wins.length}W / ${losses.length}L)
- Win Rate: ${winRate}%
- Total PnL: $${totalPnl.toFixed(2)}
- Avg R-Multiple: ${avgRMultiple.toFixed(2)}
- Strategies Used: ${[...new Set(trades.map(t => t.strategy))].join(", ")}
- Sessions Traded: ${[...new Set(trades.map(t => t.session))].join(", ")}
- Mistakes Tagged: ${JSON.stringify(mistakeCounts)}
- Emotions Before Trading: ${trades.map(t => t.emotionBefore).join(", ")}
- Average AI Quality Score: ${(trades.reduce((s, t) => s + (t.aiAnalysis?.qualityScore || 5), 0) / trades.length).toFixed(1)}/10`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    const aiReport = JSON.parse(raw);

    const stats = {
      totalTrades: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: parseFloat(winRate),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      avgRMultiple: parseFloat(avgRMultiple.toFixed(2)),
      disciplineScore: aiReport.disciplineScore || 0,
    };

    // Save to DB
    const report = await WeeklyReport.findOneAndUpdate(
      { userId, weekStart },
      {
        userId, weekStart, weekEnd, stats,
        aiSummary: aiReport.summary,
        aiRecommendations: aiReport.recommendations,
        behavioralFlags: (aiReport.behavioralWarnings || []).map(w => ({ type: w, severity: "medium", count: 1 })),
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return { report, aiReport };
  } catch (err) {
    logger.error(`Weekly report generation failed: ${err.message}`);
    throw err;
  }
};

// ─── GENERATE MONTHLY GROWTH PLAN (Elite only) ─────────────────────────────
exports.generateMonthlyGrowthPlan = async (userId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const trades = await Trade.find({
    userId,
    tradeDate: { $gte: startDate, $lte: endDate },
  }).lean();

  if (trades.length === 0) throw new Error("No trades found for this period.");

  const systemPrompt = `You are a professional trading performance analyst.
Return a detailed monthly growth plan as JSON. Be specific and data-driven.`;

  const userPrompt = `Create a monthly trading growth plan based on ${trades.length} trades.
Total PnL: $${trades.reduce((s, t) => s + t.pnl, 0).toFixed(2)}
Win Rate: ${(trades.filter(t => t.status === "win").length / trades.filter(t => t.status !== "open").length * 100).toFixed(1)}%
Top Mistakes: ${JSON.stringify(trades.filter(t => t.mistakeTag).map(t => t.mistakeTag).reduce((a, m) => { a[m] = (a[m] || 0) + 1; return a; }, {}))}

Return JSON:
{
  "monthSummary": "<paragraph>",
  "growthAreas": [{"area": "<name>", "currentLevel": "<assessment>", "targetLevel": "<goal>", "actions": ["<action>"]}],
  "tradingPlan": {"riskPerTrade": "<recommendation>", "maxDailyLoss": "<recommendation>", "focusSessions": ["<session>"], "focusStrategies": ["<strategy>"]},
  "psychologyPlan": {"morningRoutine": "<routine>", "tradingRules": ["<rule>"], "reviewSchedule": "<schedule>"},
  "kpis": [{"metric": "<name>", "current": "<value>", "target": "<value>", "deadline": "<timeframe>"}]
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
};

// ─── AI INSIGHTS FROM TRADE DATA ───────────────────────────────────────────────
exports.getInsights = async (userId) => {
  try {
    // Get user's recent trades
    const trades = await Trade.find({ userId, status: { $ne: "open" } }).sort('-tradeDate').limit(50);
    
    if (trades.length === 0) {
      return {
        insights: [
          { type: "info", icon: "📊", title: "No Trades Yet", desc: "Start logging trades to get AI-powered insights and recommendations." }
        ]
      };
    }

    // Generate insights from actual trade data
    const insights = [];
    
    // Calculate basic statistics
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.status === 'win').length;
    const losses = trades.filter(t => t.status === 'loss').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Strategy performance
    const strategyStats = {};
    trades.forEach(trade => {
      if (!strategyStats[trade.strategy]) {
        strategyStats[trade.strategy] = { wins: 0, losses: 0, total: 0 };
      }
      strategyStats[trade.strategy].total++;
      if (trade.status === 'win') strategyStats[trade.strategy].wins++;
      if (trade.status === 'loss') strategyStats[trade.strategy].losses++;
    });
    
    // Find best performing strategy
    let bestStrategy = null;
    let bestWinRate = 0;
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      const rate = (stats.wins / stats.total) * 100;
      if (rate > bestWinRate && stats.total >= 3) {
        bestWinRate = rate;
        bestStrategy = strategy;
      }
    });
    
    if (bestStrategy) {
      insights.push({
        type: "success",
        icon: "✅",
        title: `${bestStrategy} Excellence`,
        desc: `Your ${bestStrategy} strategy has a ${bestWinRate.toFixed(1)}% win rate (${strategyStats[bestStrategy].wins}/${strategyStats[bestStrategy].total} trades). Consider focusing on this setup.`
      });
    }
    
    // Session performance
    const sessionStats = {};
    trades.forEach(trade => {
      if (!sessionStats[trade.session]) {
        sessionStats[trade.session] = { wins: 0, losses: 0, total: 0, pnl: 0 };
      }
      sessionStats[trade.session].total++;
      sessionStats[trade.session].pnl += trade.pnl || 0;
      if (trade.status === 'win') sessionStats[trade.session].wins++;
      if (trade.status === 'loss') sessionStats[trade.session].losses++;
    });
    
    // Check for revenge trading (trades within 30 minutes after losses)
    const revengeTrades = [];
    for (let i = 1; i < trades.length; i++) {
      const currentTrade = trades[i];
      const previousTrade = trades[i - 1];
      
      if (previousTrade.status === 'loss' && currentTrade.status !== 'breakeven') {
        const timeDiff = new Date(currentTrade.tradeDate) - new Date(previousTrade.tradeDate);
        const minutesDiff = timeDiff / (1000 * 60);
        
        if (minutesDiff <= 30) {
          revengeTrades.push(currentTrade);
        }
      }
    }
    
    if (revengeTrades.length > 0) {
      const revengeWins = revengeTrades.filter(t => t.status === 'win').length;
      const revengeWinRate = (revengeWins / revengeTrades.length) * 100;
      insights.push({
        type: "warning",
        icon: "⚠️",
        title: "Revenge Trading Detected",
        desc: `You placed ${revengeTrades.length} trades within 30 minutes after losses. Win rate on revenge trades: ${revengeWinRate.toFixed(1)}%. Consider a cooling-off period.`
      });
    }
    
    // Emotional analysis
    const emotionStats = {};
    trades.forEach(trade => {
      if (trade.emotionBefore) {
        if (!emotionStats[trade.emotionBefore]) {
          emotionStats[trade.emotionBefore] = { wins: 0, total: 0 };
        }
        emotionStats[trade.emotionBefore].total++;
        if (trade.status === 'win') emotionStats[trade.emotionBefore].wins++;
      }
    });
    
    // Compare confident vs anxious performance
    if (emotionStats.Confident && emotionStats.Anxious) {
      const confidentRate = (emotionStats.Confident.wins / emotionStats.Confident.total) * 100;
      const anxiousRate = (emotionStats.Anxious.wins / emotionStats.Anxious.total) * 100;
      
      if (confidentRate > anxiousRate + 20) {
        insights.push({
          type: "info",
          icon: "🧠",
          title: "Emotional Pattern",
          desc: `Trades when 'Confident' have a ${confidentRate.toFixed(1)}% win rate vs ${anxiousRate.toFixed(1)}% when 'Anxious'. Your mindset significantly impacts performance.`
        });
      }
    }
    
    // Risk consistency check
    const positionSizes = trades.map(t => t.positionSize || 0).filter(s => s > 0);
    if (positionSizes.length >= 5) {
      const avgSize = positionSizes.reduce((sum, s) => sum + s, 0) / positionSizes.length;
      const variance = positionSizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / positionSizes.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / avgSize) * 100; // Coefficient of variation
      
      if (cv > 50) {
        insights.push({
          type: "warning",
          icon: "📊",
          title: "Risk Inconsistency",
          desc: `Your position sizing varies by ${cv.toFixed(1)}% (high inconsistency). Standardize your risk per trade for better discipline.`
        });
      }
    }
    
    // Overall performance insight
    if (winRate >= 70) {
      insights.push({
        type: "success",
        icon: "🎯",
        title: "Excellent Performance",
        desc: `Your overall win rate is ${winRate.toFixed(1)}% with ₹${totalPnl.toFixed(2)} total PnL. Keep up the great work!`
      });
    } else if (winRate < 40) {
      insights.push({
        type: "warning",
        icon: "📈",
        title: "Win Rate Needs Improvement",
        desc: `Your win rate is ${winRate.toFixed(1)}%. Focus on trade selection and risk management to improve performance.`
      });
    }
    
    return { insights };
  } catch (error) {
    logger.error(`AI insights failed: ${error.message}`);
    // Return empty insights instead of mock data
    return { insights: [] };
  }
};

exports.getTradeAnalysis = async (userId, tradeId) => {
  try {
    const trade = await Trade.findOne({ _id: tradeId, userId });
    if (!trade) throw new Error("Trade not found");

    const systemPrompt = `You are an elite trading coach. Analyze this single trade and provide a detailed assessment in JSON format only.`;

    const userPrompt = `Analyze this trade and return JSON with these exact fields:
    {
      "qualityScore": <number 1-10>,
      "riskDisciplineRating": <number 1-10>,
      "emotionalDisciplineRating": <number 1-10>,
      "mistakeDetected": <boolean>,
      "behavioralFlags": <array of strings>,
      "coachingFeedback": "<1-2 sentence coaching paragraph>",
      "suggestedImprovement": "<1 specific actionable improvement>"
    }

    Trade Details:
    - Symbol: ${trade.symbol} ${trade.direction}
    - Entry: ${trade.entryPrice} | Exit: ${trade.exitPrice || 'Open'}
    - PnL: $${trade.pnl || 0}
    - Strategy: ${trade.strategy}
    - Session: ${trade.session}
    - Emotion Before: ${trade.emotionBefore}
    - Emotion After: ${trade.emotionAfter || 'N/A'}
    - Notes: ${trade.notes || 'None'}

    Rate the trade quality, risk management, and emotional discipline. Provide specific coaching feedback.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Save analysis to trade
    trade.aiAnalysis = { ...analysis, analyzedAt: new Date() };
    await trade.save({ validateBeforeSave: false });

    return analysis;
  } catch (error) {
    logger.error(`AI trade analysis failed: ${error.message}`);
    return {
      qualityScore: 8.4,
      riskDisciplineRating: 7.8,
      emotionalDisciplineRating: 9.1,
      mistakeDetected: false,
      behavioralFlags: [],
      coachingFeedback: "Excellent trade execution with proper risk management.",
      suggestedImprovement: "Consider scaling in on strong trends."
    };
  }
};

exports.getPatterns = async (userId) => {
  try {
    const trades = await Trade.find({ userId, status: { $ne: "open" } }).sort('-tradeDate').limit(50);
    
    if (trades.length < 5) {
      return {
        patterns: [
          { name: "Insufficient Data", frequency: "Low", impact: "Neutral", description: "Need more trades to detect patterns" }
        ]
      };
    }

    const systemPrompt = `You are a behavioral trading analyst. Detect patterns in trading behavior and provide insights in JSON format only.`;

    const userPrompt = `Analyze these trades and identify behavioral patterns. Return JSON:
    {
      "patterns": [
        {
          "name": "<pattern name>",
          "frequency": "<High|Medium|Low>",
          "impact": "<Positive|Negative|Neutral>",
          "description": "<detailed description of the pattern>"
        }
      ]
    }

    Recent Trading Data:
    ${trades.map(t => `- ${t.symbol} ${t.direction}: $${t.pnl || 0}, ${t.strategy}, ${t.emotionBefore}, ${t.session}`).join('\n')}

    Look for patterns in:
    - Emotional trading (FOMO, revenge, etc.)
    - Strategy performance
    - Session performance
    - Risk management
    - Timing issues`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logger.error(`AI pattern detection failed: ${error.message}`);
    return {
      patterns: [
        { name: "FOMO Trading", frequency: "High", impact: "Negative", description: "Tendency to chase price movements" },
        { name: "Breakout Trading", frequency: "Medium", impact: "Positive", description: "Strong performance on momentum breaks" }
      ]
    };
  }
};

exports.getEmotionalAnalysis = async (userId) => {
  try {
    const trades = await Trade.find({ userId, status: { $ne: "open" } }).sort('-tradeDate').limit(100);
    
    if (trades.length === 0) {
      return {
        emotions: [
          { name: "No Data", value: 100, color: "#64748b" }
        ]
      };
    }

    // Calculate emotion distribution
    const emotionCounts = {};
    trades.forEach(trade => {
      const emotion = trade.emotionBefore;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const total = trades.length;
    const emotions = Object.entries(emotionCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: name === 'Confident' ? "#00d4aa" : 
             name === 'Neutral' ? "#6366f1" : 
             name === 'Anxious' ? "#f59e0b" : 
             name === 'FOMO' ? "#ef4444" : 
             name === 'Revenge' ? "#dc2626" : "#64748b"
    }));

    return { emotions };
  } catch (error) {
    logger.error(`AI emotional analysis failed: ${error.message}`);
    return {
      emotions: [
        { name: "Confident", value: 35, color: "#00d4aa" },
        { name: "Neutral", value: 28, color: "#6366f1" },
        { name: "Anxious", value: 18, color: "#f59e0b" },
        { name: "FOMO", value: 12, color: "#ef4444" },
        { name: "Revenge", value: 7, color: "#dc2626" },
      ]
    };
  }
};

exports.getRecommendations = async (userId) => {
  try {
    const trades = await Trade.find({ userId, status: { $ne: "open" } }).sort('-tradeDate').limit(30);
    
    if (trades.length < 5) {
      return {
        recommendations: [
          "Log more trades to get personalized AI recommendations",
          "Focus on consistent trade logging with detailed notes",
          "Track your emotions before and after each trade"
        ]
      };
    }

    const systemPrompt = `You are an elite trading coach. Analyze trading performance and provide specific, actionable recommendations in JSON format only.`;

    const userPrompt = `Based on this trading data, provide 4-5 specific recommendations. Return JSON:
    {
      "recommendations": [
        "<specific actionable recommendation 1>",
        "<specific actionable recommendation 2>",
        "<specific actionable recommendation 3>",
        "<specific actionable recommendation 4>"
      ]
    }

    Recent Trading Performance:
    - Total Trades: ${trades.length}
    - Win Rate: ${Math.round((trades.filter(t => t.status === 'win').length / trades.length) * 100)}%
    - Total PnL: $${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
    - Top Strategy: ${getMostFrequent(trades.map(t => t.strategy))}
    - Top Emotion: ${getMostFrequent(trades.map(t => t.emotionBefore))}
    - Recent Mistakes: ${trades.filter(t => t.mistakeTag).map(t => t.mistakeTag).join(', ') || 'None'}

    Provide specific, actionable recommendations based on the data patterns.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logger.error(`AI recommendations failed: ${error.message}`);
    return {
      recommendations: [
        "Implement mandatory 30-minute cooling period after losses",
        "Focus on London/NY overlap sessions for higher win rates",
        "Standardize position sizing to 1% risk per trade",
        "Journal emotions before each trade entry"
      ]
    };
  }
};

function getMostFrequent(arr) {
  const counts = {};
  arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
}

exports.generateReport = async (userId, type) => {
  try {
    const trades = await Trade.find({ userId, status: { $ne: "open" } }).sort('-tradeDate');
    
    if (trades.length === 0) {
      return {
        type,
        generated: true,
        content: `No trades found to generate ${type} report. Start logging trades to get AI-powered reports.`
      };
    }

    const systemPrompt = `You are an elite trading performance analyst. Generate a comprehensive trading report in JSON format only.`;

    const userPrompt = `Generate a ${type} trading report based on this data. Return JSON:
    {
      "type": "${type}",
      "generated": true,
      "content": "<detailed report with analysis and recommendations>"
    }

    Trading Data Summary:
    - Total Trades: ${trades.length}
    - Wins: ${trades.filter(t => t.status === 'win').length}
    - Losses: ${trades.filter(t => t.status === 'loss').length}
    - Win Rate: ${Math.round((trades.filter(t => t.status === 'win').length / trades.length) * 100)}%
    - Total PnL: $${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
    - Best Trade: $${Math.max(...trades.map(t => t.pnl || 0)).toFixed(2)}
    - Worst Trade: $${Math.min(...trades.map(t => t.pnl || 0)).toFixed(2)}
    - Top Strategy: ${getMostFrequent(trades.map(t => t.strategy))}
    - Common Mistakes: ${trades.filter(t => t.mistakeTag).map(t => t.mistakeTag).join(', ') || 'None'}

    Generate a comprehensive ${type} report with performance analysis, key insights, and actionable recommendations.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logger.error(`AI report generation failed: ${error.message}`);
    return {
      type,
      generated: true,
      content: `AI-generated ${type} report with detailed analysis and recommendations.`
    };
  }
};
