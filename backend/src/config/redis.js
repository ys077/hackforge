const Redis = require("ioredis");
const logger = require("../utils/logger");

let redisClient = null;
let subscriberClient = null;

const createRedisClient = (options = {}) => {
  const config = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    ...options,
  };

  const client = new Redis(config);

  client.on("connect", () => {
    logger.info("✅ Redis client connected");
  });

  client.on("ready", () => {
    logger.info("✅ Redis client ready");
  });

  client.on("error", (err) => {
    logger.error("❌ Redis client error:", err);
  });

  client.on("close", () => {
    logger.warn("Redis client connection closed");
  });

  client.on("reconnecting", () => {
    logger.info("Redis client reconnecting...");
  });

  return client;
};

const connectRedis = async () => {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
    logger.info("✅ Redis connection established successfully");
    return redisClient;
  } catch (error) {
    logger.error("❌ Redis connection failed:", error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const getSubscriberClient = () => {
  if (!subscriberClient) {
    subscriberClient = createRedisClient();
  }
  return subscriberClient;
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info("Redis client disconnected");
    }
    if (subscriberClient) {
      await subscriberClient.quit();
      subscriberClient = null;
      logger.info("Redis subscriber client disconnected");
    }
  } catch (error) {
    logger.error("Error disconnecting Redis:", error);
    throw error;
  }
};

// Cache helper functions
const cache = {
  async get(key) {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key, value, ttlSeconds = 3600) {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key) {
    const client = getRedisClient();
    await client.del(key);
  },

  async delPattern(pattern) {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  },

  async exists(key) {
    const client = getRedisClient();
    return await client.exists(key);
  },

  async ttl(key) {
    const client = getRedisClient();
    return await client.ttl(key);
  },

  async incr(key) {
    const client = getRedisClient();
    return await client.incr(key);
  },

  async expire(key, seconds) {
    const client = getRedisClient();
    return await client.expire(key, seconds);
  },

  // Hash operations
  async hget(key, field) {
    const client = getRedisClient();
    const data = await client.hget(key, field);
    return data ? JSON.parse(data) : null;
  },

  async hset(key, field, value) {
    const client = getRedisClient();
    await client.hset(key, field, JSON.stringify(value));
  },

  async hgetall(key) {
    const client = getRedisClient();
    const data = await client.hgetall(key);
    const result = {};
    for (const [field, value] of Object.entries(data)) {
      result[field] = JSON.parse(value);
    }
    return result;
  },

  // List operations
  async lpush(key, value) {
    const client = getRedisClient();
    await client.lpush(key, JSON.stringify(value));
  },

  async rpush(key, value) {
    const client = getRedisClient();
    await client.rpush(key, JSON.stringify(value));
  },

  async lrange(key, start, stop) {
    const client = getRedisClient();
    const data = await client.lrange(key, start, stop);
    return data.map((item) => JSON.parse(item));
  },

  // Set operations
  async sadd(key, ...members) {
    const client = getRedisClient();
    await client.sadd(key, ...members.map((m) => JSON.stringify(m)));
  },

  async smembers(key) {
    const client = getRedisClient();
    const data = await client.smembers(key);
    return data.map((item) => JSON.parse(item));
  },

  async sismember(key, member) {
    const client = getRedisClient();
    return await client.sismember(key, JSON.stringify(member));
  },

  // Distributed lock
  async acquireLock(lockKey, ttlMs = 10000) {
    const client = getRedisClient();
    const lockValue = Date.now().toString();
    const result = await client.set(lockKey, lockValue, "PX", ttlMs, "NX");
    return result ? lockValue : null;
  },

  async releaseLock(lockKey, lockValue) {
    const client = getRedisClient();
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    return await client.eval(script, 1, lockKey, lockValue);
  },
};

module.exports = {
  createRedisClient,
  connectRedis,
  getRedisClient,
  getSubscriberClient,
  disconnectRedis,
  cache,
};
