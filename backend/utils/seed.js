require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Trade = require("../models/Trade");

const SYMBOLS = ["EURUSD", "GBPJPY", "XAUUSD", "NAS100", "BTCUSD", "GBPUSD", "USDJPY"];
const STRATEGIES = ["Breakout", "Reversal", "Trend Follow", "HTF Rejection", "Momentum"];
const SESSIONS = ["London", "New York", "Asia", "Overlap"];
const EMOTIONS_BEFORE = ["Confident", "Neutral", "Anxious", "FOMO", "Excited"];
const MISTAKES = [null, null, null, "FOMO Entry", "Revenge Trade", "Moved Stop"];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.random() * (max - min) + min;

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await User.deleteMany({ email: { $in: ["demo@edgeiq.app", "elite@edgeiq.app"] } });
  await Trade.deleteMany({ symbol: { $in: SYMBOLS } });

  // Create demo users
  const demoUser = await User.create({
    name: "Alex Kim",
    email: "demo@edgeiq.app",
    password: "Demo1234!",
    subscriptionTier: "pro",
    subscriptionStatus: "active",
    isEmailVerified: true,
  });

  const eliteUser = await User.create({
    name: "Sarah Chen",
    email: "elite@edgeiq.app",
    password: "Elite1234!",
    subscriptionTier: "elite",
    subscriptionStatus: "active",
    isEmailVerified: true,
  });

  // Generate 90 days of trades
  const trades = [];
  for (let day = 89; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dailyTrades = Math.floor(randomBetween(0, 4));

    for (let t = 0; t < dailyTrades; t++) {
      const symbol = randomFrom(SYMBOLS);
      const direction = Math.random() > 0.5 ? "LONG" : "SHORT";
      const entryPrice = randomBetween(1.0, 2000);
      const isWin = Math.random() > 0.35;
      const moveSize = randomBetween(0.001, 0.05) * entryPrice;
      const exitPrice = direction === "LONG"
        ? isWin ? entryPrice + moveSize : entryPrice - moveSize
        : isWin ? entryPrice - moveSize : entryPrice + moveSize;
      const stopLoss = direction === "LONG" ? entryPrice - moveSize * 0.5 : entryPrice + moveSize * 0.5;

      trades.push({
        userId: demoUser._id,
        symbol,
        market: symbol.includes("BTC") || symbol.includes("ETH") ? "crypto" : "forex",
        direction,
        entryPrice: parseFloat(entryPrice.toFixed(4)),
        exitPrice: parseFloat(exitPrice.toFixed(4)),
        stopLoss: parseFloat(stopLoss.toFixed(4)),
        positionSize: parseFloat(randomBetween(0.5, 5).toFixed(2)),
        strategy: randomFrom(STRATEGIES),
        session: randomFrom(SESSIONS),
        tradeDate: date,
        emotionBefore: randomFrom(EMOTIONS_BEFORE),
        mistakeTag: randomFrom(MISTAKES),
        notes: isWin ? "Clean setup, followed plan." : "Deviated from plan.",
        aiAnalysis: {
          qualityScore: isWin ? randomBetween(7, 10) : randomBetween(2, 6),
          riskDisciplineRating: randomBetween(5, 10),
          emotionalDisciplineRating: randomBetween(4, 10),
          mistakeDetected: !isWin,
          behavioralFlags: [],
          coachingFeedback: isWin ? "Well-executed setup with good risk management." : "Review your entry criteria.",
          suggestedImprovement: "Continue refining your entry timing.",
          analyzedAt: date,
        },
      });
    }
  }

  await Trade.insertMany(trades);

  // Update user trade count
  demoUser.tradeCount = trades.length;
  await demoUser.save({ validateBeforeSave: false });

  console.log(`✅ Seeded ${trades.length} trades for demo@edgeiq.app`);
  console.log("📧 Demo accounts:");
  console.log("   demo@edgeiq.app / Demo1234! (Pro)");
  console.log("   elite@edgeiq.app / Elite1234! (Elite)");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
