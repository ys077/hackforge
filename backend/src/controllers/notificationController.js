const notificationService = require("../services/notificationService");
const { success } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route GET /api/notifications
 * @desc Get user notifications
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const filters = {
    type: req.query.type,
    unread_only: req.query.unread_only === "true",
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await notificationService.getUserNotifications(
    userId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const count = await notificationService.getUnreadCount(userId);
  success(res, { count });
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await notificationService.markAsRead(id, userId);
  success(res, result);
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await notificationService.markAllAsRead(userId);
  success(res, result);
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete notification
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await notificationService.deleteNotification(id, userId);
  success(res, result);
});
