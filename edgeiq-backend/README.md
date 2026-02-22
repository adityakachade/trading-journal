# EdgeIQ Backend — Production API

> Node.js + Express + MongoDB + Redis + OpenAI + Stripe

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your keys

# 3. Seed demo data (optional)
npm run seed

# 4. Start development server
npm run dev

# 5. Start production
npm start
```

---

## 📁 Project Structure

```
edgeiq-backend/
├── server.js                  # Entry point
├── config/
│   ├── db.js                  # MongoDB connection
│   └── redis.js               # Redis connection + cache helpers
├── models/
│   ├── User.js                # User schema + methods
│   ├── Trade.js               # Trade schema + auto-calculations
│   └── Report.js              # WeeklyReport + BehaviorLog schemas
├── controllers/
│   ├── auth.controller.js     # Auth logic
│   ├── trade.controller.js    # Trade CRUD + AI trigger
│   └── analytics.controller.js# Dashboard analytics
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── trade.routes.js
│   ├── analytics.routes.js
│   ├── ai.routes.js
│   ├── stripe.routes.js
│   └── report.routes.js
├── middleware/
│   ├── auth.js                # JWT protect + role/tier gates
│   ├── validate.js            # Zod schemas + validator
│   ├── rateLimiter.js         # Per-endpoint rate limits
│   └── errorHandler.js        # Global error handler
├── services/
│   ├── ai.service.js          # OpenAI trade analysis + reports
│   ├── behavior.service.js    # Pattern detection engine
│   ├── stripe.service.js      # Stripe checkout + webhooks
│   └── email.service.js       # Nodemailer transactional email
└── utils/
    ├── jwt.js                 # Token generation/verification
    ├── appError.js            # AppError class + helpers
    ├── logger.js              # Winston logger
    └── seed.js                # Dev data seeder
```

---

## 🔐 Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in **15 minutes**. Use `/api/auth/refresh` with your refresh token to rotate.

---

## 📡 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Register new user |
| POST | `/api/auth/login` | - | Login, returns token pair |
| POST | `/api/auth/refresh` | - | Rotate access + refresh tokens |
| POST | `/api/auth/logout` | ✅ | Revoke refresh token |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/auth/verify-email/:token` | - | Verify email |
| POST | `/api/auth/forgot-password` | - | Send reset email |
| PATCH | `/api/auth/reset-password/:token` | - | Reset password |

---

### Trades

| Method | Endpoint | Tier | Description |
|--------|----------|------|-------------|
| GET | `/api/trades` | Free | List trades (paginated, filterable) |
| POST | `/api/trades` | Free (30/mo limit) | Create trade |
| GET | `/api/trades/:id` | Free | Get single trade |
| PATCH | `/api/trades/:id` | Free | Update trade |
| DELETE | `/api/trades/:id` | Free | Delete trade |
| POST | `/api/trades/:id/analyze` | Pro | Trigger AI analysis |
| POST | `/api/trades/bulk-import` | Pro | Import up to 500 trades |

**Trade Query Params:** `page`, `limit`, `status`, `strategy`, `session`, `symbol`, `dateFrom`, `dateTo`, `sort`

---

### Analytics

| Method | Endpoint | Tier | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/summary` | Free | PnL, win rate, drawdown, streaks |
| GET | `/api/analytics/equity-curve` | Free | Cumulative PnL over time |
| GET | `/api/analytics/sessions` | Free | Performance by session |
| GET | `/api/analytics/strategies` | Free | Performance by strategy |
| GET | `/api/analytics/daily-pnl` | Free | Heatmap data |
| GET | `/api/analytics/mistakes` | Free | Mistake breakdown |
| GET | `/api/analytics/emotions` | Pro | Emotion performance analysis |

**Query Params for summary/equity:** `range` (7d, 30d, 90d, 1y, all)

---

### AI

| Method | Endpoint | Tier | Description |
|--------|----------|------|-------------|
| GET | `/api/ai/behavior` | Pro | Behavior summary + flags |
| POST | `/api/ai/behavior/analyze` | Pro | Trigger behavior analysis |
| POST | `/api/ai/weekly-report` | Pro | Generate AI weekly report |
| GET | `/api/ai/reports` | Pro | List saved reports |
| POST | `/api/ai/monthly-plan` | Elite | Generate monthly growth plan |

---

### Stripe / Billing

| Method | Endpoint | Tier | Description |
|--------|----------|------|-------------|
| POST | `/api/stripe/checkout` | Free | Create Stripe checkout session |
| POST | `/api/stripe/portal` | Pro | Open billing portal |
| GET | `/api/stripe/subscription` | Free | Get subscription status |
| POST | `/api/stripe/webhook` | - | Stripe webhook handler |

---

### Reports

| Method | Endpoint | Tier | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/weekly` | Pro | List weekly reports |
| GET | `/api/reports/weekly/:id` | Pro | Get single report |
| POST | `/api/reports/weekly/:id/email` | Pro | Email report to self |

---

## 💰 Subscription Tiers

| Feature | Free | Pro ($19/mo) | Elite ($49/mo) |
|---------|------|-------------|----------------|
| Trades/month | 30 | Unlimited | Unlimited |
| Basic analytics | ✅ | ✅ | ✅ |
| AI trade analysis | ❌ | ✅ | ✅ |
| Weekly AI reports | ❌ | ✅ | ✅ |
| Emotion analytics | ❌ | ✅ | ✅ |
| Behavior detection | ❌ | ✅ | ✅ |
| CSV bulk import | ❌ | ✅ | ✅ |
| Monthly growth plan | ❌ | ❌ | ✅ |
| Psychology scoring | ❌ | ❌ | ✅ |
| Pattern detection | ❌ | ❌ | ✅ |

---

## 🤖 AI Analysis Response

```json
{
  "qualityScore": 8.4,
  "riskDisciplineRating": 9.1,
  "emotionalDisciplineRating": 8.0,
  "mistakeDetected": false,
  "behavioralFlags": [],
  "coachingFeedback": "Clean execution with disciplined risk management. The breakout entry was well-timed with price above key structure.",
  "suggestedImprovement": "Consider trailing your stop after 1.5R to protect profits on extended moves."
}
```

---

## 🛡 Security Features

- **Helmet** — HTTP security headers
- **CORS** — Origin whitelist
- **Rate limiting** — Per-endpoint limits (auth: 10/15m, AI: 20/hr)
- **Zod validation** — All inputs validated
- **Mongo sanitize** — NoSQL injection prevention
- **JWT rotation** — Refresh token rotation with blocklist
- **Bcrypt** — Password hashing (12 rounds)
- **Stripe signature** — Webhook verification

---

## 🧠 Behavior Detection Engine

Automatically detects:

- **Overtrading** — 5+ trades within 4 hours
- **Revenge Trading** — Trade placed within 15min of a loss
- **FOMO** — Emotion/mistake tagged as FOMO
- **Inconsistent Risk** — Position size coefficient of variation >50%
- **Emotional Bias** — >30% of trades with negative emotions

Runs asynchronously after every trade creation.

---

## 🚀 Deployment

### Railway / Render (Backend)
```bash
# Environment: set all .env variables in dashboard
# Start command: node server.js
# Build command: npm install
```

### MongoDB Atlas
- Create cluster → Get connection string → Set MONGODB_URI

### Redis
- Use Redis Cloud (free tier) or Upstash
- Set REDIS_URL in environment

### Stripe Webhooks
```bash
# Install Stripe CLI for local testing
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

### CORS
Set `CLIENT_URL` to your frontend domain (e.g., `https://edgeiq.vercel.app`)

---

## 🧪 Demo Accounts (after seed)

| Email | Password | Tier |
|-------|----------|------|
| demo@edgeiq.app | Demo1234! | Pro |
| elite@edgeiq.app | Elite1234! | Elite |
