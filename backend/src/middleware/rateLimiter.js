const rateLimit = require("express-rate-limit");
const { cache, getRedisClient } = require("../config/redis");
const logger = require("../utils/logger");
const { RateLimitError } = require("../utils/errors");
const { rateLimitResponse } = require("../utils/responses");

/**
 * Redis store for rate limiting
 */
class RedisStore {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.prefix = options.prefix || "rl:";
  }

  async increment(key) {
    const client = getRedisClient();
    const redisKey = `${this.prefix}${key}`;

    const result = await client.multi().incr(redisKey).pttl(redisKey).exec();

    const count = result[0][1];
    const ttl = result[1][1];

    // Set expiry if this is the first request
    if (ttl === -1) {
      await client.pexpire(redisKey, this.windowMs);
    }

    return {
      totalHits: count,
      resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)),
    };
  }

  async decrement(key) {
    const client = getRedisClient();
    const redisKey = `${this.prefix}${key}`;
    await client.decr(redisKey);
  }

  async resetKey(key) {
    const client = getRedisClient();
    const redisKey = `${this.prefix}${key}`;
    await client.del(redisKey);
  }
}

/**
 * Custom key generator
 */
const keyGenerator = (req) => {
  // Use user ID if authenticated, otherwise use IP
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Rate limit exceeded handler
 */
const limitHandler = (req, res, next, options) => {
  logger.warn("Rate limit exceeded", {
    ip: req.ip,
    userId: req.user?.id,
    path: req.path,
  });

  return rateLimitResponse(res, "Too many requests. Please try again later.");
};

/**
 * Skip handler for whitelisted IPs
 */
const skipHandler = (req) => {
  const whitelist = (process.env.RATE_LIMIT_WHITELIST || "").split(",");
  return whitelist.includes(req.ip);
};

/**
 * Standard rate limiter for general API requests
 */
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator,
  handler: limitHandler,
  skip: skipHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  keyGenerator: (req) => `auth:${req.ip}`,
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts. Please try again later.",
});

/**
 * OTP rate limiter
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 OTP requests per hour
  keyGenerator: (req) => `otp:${req.body?.phone || req.ip}`,
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many OTP requests. Please try again later.",
});

/**
 * Upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  keyGenerator,
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Upload limit exceeded. Please try again later.",
});

/**
 * Search rate limiter
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  keyGenerator,
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Application submission rate limiter
 */
const applicationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 applications per day
  keyGenerator,
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Application limit reached. Please try again tomorrow.",
});

/**
 * Create custom rate limiter
 */
const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    keyGenerator: options.keyGenerator || keyGenerator,
    handler: options.handler || limitHandler,
    skip: options.skip || skipHandler,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

/**
 * Sliding window rate limiter using Redis
 */
const slidingWindowLimiter = (options = {}) => {
  const { windowMs = 60000, max = 100, keyPrefix = "sliding:" } = options;

  return async (req, res, next) => {
    const key = `${keyPrefix}${keyGenerator(req)}`;
    const client = getRedisClient();
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries and add new entry
      await client
        .multi()
        .zremrangebyscore(key, "-inf", windowStart)
        .zadd(key, now, `${now}:${Math.random()}`)
        .expire(key, Math.ceil(windowMs / 1000))
        .exec();

      // Count requests in window
      const count = await client.zcount(key, windowStart, now);

      // Set headers
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));

      if (count > max) {
        logger.warn("Sliding window rate limit exceeded", {
          ip: req.ip,
          userId: req.user?.id,
          count,
          max,
        });
        return rateLimitResponse(res);
      }

      next();
    } catch (error) {
      logger.error("Rate limiter error:", error);
      // Allow request through on rate limiter failure
      next();
    }
  };
};

module.exports = {
  standardLimiter,
  authLimiter,
  otpLimiter,
  uploadLimiter,
  searchLimiter,
  applicationLimiter,
  createRateLimiter,
  slidingWindowLimiter,
  RedisStore,
};
