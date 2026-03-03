# 📈 EdgeIQ — AI-Powered Trading Journal & Simulator

> **Master the Markets with discipline.** A professional-grade trading ecosystem combining real-time simulation, AI-driven behavioral feedback, and institutional analytics.

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/adityakachade/trading-journal/graphs/commit-activity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Powered](https://img.shields.io/badge/AI-OpenAI%20GPT--4o-blue.svg)](https://openai.com/)
[![TradingView](https://img.shields.io/badge/Charts-Lightweight%20Charts-00d4aa.svg)](https://www.tradingview.com/lightweight-charts/)

---

## 🌟 New Feature: Professional Trading Suite (v2.0)

Experience high-frequency trading simulation drawing inspiration from **MT5** and **Upstox**:

- **Market Explorer**: Global search for Forex (EUR/USD), Crypto (BTC/ETH), Stocks (AAPL/TSLA), and NSE (RELIANCE).
- **Persistent Watchlist**: Star your favorite symbols for instant access across sessions.
- **One-Click Execution**: Capture live prices for Stop Loss and Take Profit using the **[SET CUR]** helper.
- **Visual Trading**: Real-time Entry, SL, and TP lines rendered directly on the candlestick chart.
- **Real-time Sync**: Open positions are synced to MongoDB Atlas instantly, ensuring your journal is always up-to-date.

---

## 🧠 Core Features

### � AI Behavioral Analysis
- **Execution Feedback**: Instant AI coaching on every trade you take.
- **Behavioral Flags**: AI detects patterns like *Overtrading*, *Revenge Trading*, and *FOMO*.
- **Weekly Progress Reports**: Automated PDF/Email reports summarizing your psychological performance.

### � Advanced Performance Metrics
- **Dynamic Equity Curve**: Real-time PnL tracking and drawdown analysis.
- **Session & Strategy Heatmaps**: Visualizes consistency and identifies your most profitable setups.
- **Risk management Estimator**: Real-time Risk:Reward calculations before you click buy or sell.

### 💼 Production Architecture
- **Monorepo Structure**: Unified build system for both Frontend (React) and Backend (Node.js).
- **Security Hardening**: JWT rotation, Rate Limiting, and Mongo Sanitization built-in.
- **Payment Integration**: Secure Stripe checkout for Pro/Elite upgrades.

---

## 🚀 Deployment (One-Click Ready)

EdgeIQ is optimized for production hosting (Render, Vercel, Railway, etc.):

1. **Clone & Setup**:
   ```bash
   git clone https://github.com/adityakachade/trading-journal.git
   cd trading-journal
   ```

2. **Backend Configuration**:
   ```bash
   cd backend
   cp .env.example .env
   # Add your MONGODB_URI, REDIS_URL, and OPENAI_API_KEY
   ```

3. **Unified Build**:
   At the root of the project:
   ```bash
   npm install        # Install root, backend, & frontend dependencies
   npm run build      # Build the frontend and prepare the server
   npm run prod       # Start the production server serving the frontend
   ```

*The application serves the React production build from the backend on port 5000 in production mode.*

---

## 🤝 Community & Support

- **Contributions**: Pull requests are welcome! See the contributing guide for details.
- **Feedback**: Open an issue for feature requests or bug reports.

<p align="center">Made with ❤️ for disciplined traders by EdgeIQ Team.</p>
