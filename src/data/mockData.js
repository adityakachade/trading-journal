export const equityData = [
  { date: "Jan 1", pnl: 0 }, { date: "Jan 8", pnl: 420 }, { date: "Jan 15", pnl: 310 },
  { date: "Jan 22", pnl: 890 }, { date: "Jan 29", pnl: 760 }, { date: "Feb 5", pnl: 1240 },
  { date: "Feb 12", pnl: 1100 }, { date: "Feb 19", pnl: 1680 }, { date: "Feb 26", pnl: 2100 },
  { date: "Mar 5", pnl: 1900 }, { date: "Mar 12", pnl: 2450 }, { date: "Mar 19", pnl: 2800 },
];

export const weeklyPnL = [
  { day: "Mon", pnl: 320, trades: 4 }, { day: "Tue", pnl: -140, trades: 3 },
  { day: "Wed", pnl: 580, trades: 6 }, { day: "Thu", pnl: 210, trades: 2 },
  { day: "Fri", pnl: 430, trades: 5 },
];

export const sessionData = [
  { session: "London", winRate: 68, pnl: 1240 },
  { session: "NY", winRate: 72, pnl: 1890 },
  { session: "Asia", winRate: 54, pnl: 310 },
  { session: "Overlap", winRate: 81, pnl: 2100 },
];

export const emotionData = [
  { name: "Confident", value: 35, color: "#00d4aa" },
  { name: "Neutral", value: 28, color: "#6366f1" },
  { name: "Anxious", value: 18, color: "#f59e0b" },
  { name: "FOMO", value: 12, color: "#ef4444" },
  { name: "Revenge", value: 7, color: "#dc2626" },
];

export const trades = [
  { id: 1, symbol: "EURUSD", dir: "LONG", entry: 1.0842, exit: 1.0891, pnl: 490, rr: "2.1R", strategy: "Breakout", emotion: "Confident", aiScore: 8.4, mistake: null, date: "2024-03-19", status: "WIN" },
  { id: 2, symbol: "GBPJPY", dir: "SHORT", entry: 191.24, exit: 191.89, pnl: -650, rr: "-1.0R", strategy: "Reversal", emotion: "Anxious", aiScore: 4.2, mistake: "FOMO Entry", date: "2024-03-18", status: "LOSS" },
  { id: 3, symbol: "XAUUSD", dir: "LONG", entry: 2184.5, exit: 2201.3, pnl: 1680, rr: "3.4R", strategy: "Trend Follow", emotion: "Confident", aiScore: 9.1, mistake: null, date: "2024-03-17", status: "WIN" },
  { id: 4, symbol: "NAS100", dir: "SHORT", entry: 18240, exit: 18190, pnl: 500, rr: "1.8R", strategy: "HTF Rejection", emotion: "Neutral", aiScore: 7.6, mistake: null, date: "2024-03-16", status: "WIN" },
  { id: 5, symbol: "EURUSD", dir: "LONG", entry: 1.0812, exit: 1.0790, pnl: -220, rr: "-0.6R", strategy: "Breakout", emotion: "Revenge", aiScore: 3.1, mistake: "Revenge Trade", date: "2024-03-15", status: "LOSS" },
  { id: 6, symbol: "BTCUSD", dir: "LONG", entry: 68200, exit: 69850, pnl: 1650, rr: "2.8R", strategy: "Momentum", emotion: "Confident", aiScore: 8.8, mistake: null, date: "2024-03-14", status: "WIN" },
];

export const aiInsights = [
  { type: "warning", icon: "⚠️", title: "Revenge Trading Detected", desc: "You placed 3 trades within 15 minutes after a loss on Tuesday. Win rate on revenge trades: 22%." },
  { type: "success", icon: "✅", title: "London Overlap Mastery", desc: "Your win rate during London/NY overlap is 81%. Consider focusing more sessions here." },
  { type: "info", icon: "🧠", title: "Emotional Pattern", desc: "Trades tagged 'Anxious' have a 34% win rate vs 74% when 'Confident'. Journal before every entry." },
  { type: "warning", icon: "📊", title: "Risk Inconsistency", desc: "Position sizing variance is 40% week-over-week. Standardize to 1% risk per trade." },
];

export const navItems = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "journal", icon: "📓", label: "Trade Journal" },
  { id: "analytics", icon: "📈", label: "Analytics" },
  { id: "live", icon: "📈", label: "Live Trading" },
  { id: "ai", icon: "🤖", label: "AI Insights" },
];
