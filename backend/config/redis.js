const Redis = require("ioredis");
const logger = require("../utils/logger");

let client = null;

const connectRedis = () => {
  try {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn("Redis retry limit reached. Running without cache.");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on("connect", () => logger.info("✅ Redis connected"));
    client.on("error", (err) => logger.warn(`Redis error: ${err.message}`));
    client.on("close", () => logger.warn("Redis connection closed"));

    client.connect().catch(() => {
      logger.warn("⚠️  Redis unavailable. Caching disabled.");
      client = null;
    });

  } catch (err) {
    logger.warn(`Redis init failed: ${err.message}. Caching disabled.`);
    client = null;
  }
};

const getRedis = () => client;

const cache = {
  async get(key) {
    if (!client) return null;
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value, ttlSeconds = 300) {
    if (!client) return;
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {}
  },
  async del(key) {
    if (!client) return;
    try { await client.del(key); } catch {}
  },
  async delPattern(pattern) {
    if (!client) return;
    try {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(...keys);
    } catch {}
  },
};

module.exports = connectRedis;
module.exports.getRedis = getRedis;
module.exports.cache = cache;
