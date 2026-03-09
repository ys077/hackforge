const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/notifications
 * @desc Get notifications
 * @access Private
 */
router.get("/", notificationController.getNotifications);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread count
 * @access Private
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark as read
 * @access Private
 */
router.put("/:id/read", notificationController.markAsRead);

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all as read
 * @access Private
 */
router.put("/read-all", notificationController.markAllAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete notification
 * @access Private
 */
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
