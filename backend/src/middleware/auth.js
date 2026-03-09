const jwt = require("jsonwebtoken");
const config = require("../config");
const { User, Worker, Employer } = require("../models");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");
const { cache } = require("../config/redis");
const logger = require("../utils/logger");

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AuthenticationError("Token has expired");
      }
      throw new AuthenticationError("Invalid token");
    }

    // Try to get user from cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await cache.get(cacheKey);

    if (!user) {
      // Fetch user from database
      user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password_hash", "otp", "otp_expires_at"] },
      });

      if (!user) {
        throw new AuthenticationError("User not found");
      }

      if (!user.is_active) {
        throw new AuthenticationError("Account is deactivated");
      }

      // Cache user data
      await cache.set(cacheKey, user.toJSON(), 300); // 5 minutes
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.id;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password_hash", "otp", "otp_expires_at"] },
    });

    if (user && user.is_active) {
      req.user = user;
      req.userId = decoded.id;
    }

    next();
  } catch (error) {
    // Silently ignore auth errors for optional auth
    next();
  }
};

/**
 * Restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          "You do not have permission to perform this action",
        ),
      );
    }

    next();
  };
};

/**
 * Worker role authorization with profile loading
 */
const authorizeWorker = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    if (req.user.role !== "worker") {
      throw new AuthorizationError("This action requires a worker account");
    }

    // Load worker profile
    const cacheKey = `worker:${req.user.id}`;
    let worker = await cache.get(cacheKey);

    if (!worker) {
      worker = await Worker.findOne({ where: { user_id: req.user.id } });

      if (worker) {
        await cache.set(cacheKey, worker.toJSON(), 300);
      }
    }

    if (!worker) {
      throw new AuthorizationError(
        "Worker profile not found. Please complete your profile.",
      );
    }

    req.worker = worker;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Employer role authorization with profile loading
 */
const authorizeEmployer = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    if (req.user.role !== "employer") {
      throw new AuthorizationError("This action requires an employer account");
    }

    // Load employer profile
    const cacheKey = `employer:${req.user.id}`;
    let employer = await cache.get(cacheKey);

    if (!employer) {
      employer = await Employer.findOne({ where: { user_id: req.user.id } });

      if (employer) {
        await cache.set(cacheKey, employer.toJSON(), 300);
      }
    }

    if (!employer) {
      throw new AuthorizationError(
        "Employer profile not found. Please complete your profile.",
      );
    }

    req.employer = employer;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin role authorization
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError("Authentication required"));
  }

  if (req.user.role !== "admin") {
    return next(new AuthorizationError("Admin access required"));
  }

  next();
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError("Refresh token required");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (user.refresh_token !== refreshToken) {
      throw new AuthenticationError("Refresh token has been revoked");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      phone: user.phone,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeWorker,
  authorizeEmployer,
  authorizeAdmin,
  verifyRefreshToken,
  generateTokens,
};
