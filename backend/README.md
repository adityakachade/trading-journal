# EdgeIQ Backend — Production API

> Node.js + Express + MongoDB + Redis + OpenAI + Stripe

The heartbeat of the EdgeIQ ecosystem, providing real-time data synchronization, AI behavioral analysis, and secure transaction handling.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Fill in your `MONGODB_URI`, `REDIS_URL`, `OPENAI_API_KEY`, and `STRIPE_SECRET_KEY`.

### Database Seeding
Initialize your environment with demo data for testing:
```bash
npm run seed
```

---

## 📁 Monorepo Integration

This backend is designed to serve as a **standalone API** or as a **unified server** serving the React frontend.

- **Development**: Run `npm run dev` for Nodemon with hot-reload.
- **Production**: Run `node server.js` with `NODE_ENV=production`. It will automatically serve static files from `../frontend/build`.

---

## 📡 Core API Modules

### 📈 Trading & Market Explorer
- `POST /api/trades`: Create and immediately sync 'OPEN' trades.
- `PATCH /api/trades/:id`: Update SL/TP or close positions with auto-journaling.
- `GET /api/trades/stats`: Fetch real-time metrics for the dashboard.

### 🧠 AI Engine (`aiService.js`)
- `POST /api/trades/:id/analyze`: Instant execution feedback.
- `POST /api/ai/behavior/analyze`: Detect overtrading and FOMO patterns.
- `POST /api/ai/weekly-report`: Generate aggregated behavioral PDF reports.

### 💳 Billing & Security
- `POST /api/stripe/checkout`: Tiered subscription management.
- `rateLimiter.js`: Global and per-route DDoS protection.
- `auth.js`: Multi-tiered role/plan access control.

---

## 🛠️ Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis (ioredis)
- **AI**: OpenAI SDK
- **Logging**: Winston + Morgan

---

## 🚀 Deployment
Configured for **Render** / **Railway** with `0.0.0.0` binding.
Use the root `npm run build` command for a seamless build-and-serve workflow.
