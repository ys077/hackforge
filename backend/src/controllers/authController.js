const authService = require("../services/authService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route POST /api/auth/send-otp
 * @desc Send OTP to phone number
 */
exports.sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.sendOTP(phone);
  success(res, result, "OTP sent successfully");
});

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP and login
 */
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyOTP(phone, otp);
  success(res, result, "Login successful");
});

/**
 * @route POST /api/auth/complete-profile
 * @desc Complete user profile after OTP verification
 */
exports.completeProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;
  const result = await authService.completeProfile(userId, profileData);
  success(res, result, "Profile completed successfully");
});

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  success(res, result, "Token refreshed");
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 */
exports.logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await authService.logout(userId);
  success(res, result, "Logged out successfully");
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 */
exports.getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await authService.getCurrentUser(userId);
  success(res, result);
});

/**
 * @route PUT /api/auth/fcm-token
 * @desc Update FCM token
 */
exports.updateFCMToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { fcmToken } = req.body;
  const result = await authService.updateFCMToken(userId, fcmToken);
  success(res, result);
});
