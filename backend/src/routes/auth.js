const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../utils/validators");

/**
 * @route POST /api/auth/send-otp
 * @desc Send OTP to phone number
 * @access Public
 */
router.post(
  "/send-otp",
  otpLimiter,
  validate(schemas.auth.sendOTP),
  authController.sendOTP,
);

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP and login
 * @access Public
 */
router.post(
  "/verify-otp",
  authLimiter,
  validate(schemas.auth.verifyOTP),
  authController.verifyOTP,
);

/**
 * @route POST /api/auth/complete-profile
 * @desc Complete user profile
 * @access Private
 */
router.post(
  "/complete-profile",
  authenticate,
  validate(schemas.auth.completeProfile),
  authController.completeProfile,
);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post(
  "/refresh-token",
  authLimiter,
  validate(schemas.auth.refreshToken),
  authController.refreshToken,
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @route PUT /api/auth/fcm-token
 * @desc Update FCM token
 * @access Private
 */
router.put(
  "/fcm-token",
  authenticate,
  validate(schemas.auth.updateFCM),
  authController.updateFCMToken,
);

module.exports = router;
