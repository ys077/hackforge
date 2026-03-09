const { Notification, User } = require("../models");
const { getRedisClient, getSubscriberClient } = require("../config/redis");
const { addJob, QUEUE_NAMES } = require("../config/queue");
const { paginate, formatPaginationResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

class NotificationService {
  constructor() {
    this.io = null; // Socket.IO instance, set by server
  }

  /**
   * Set Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO handlers
   */
  setupSocketHandlers() {
    if (!this.io) return;

    this.io.on("connection", (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Join user's room
      socket.on("join", async (userId) => {
        if (userId) {
          socket.join(`user:${userId}`);
          logger.debug(`User ${userId} joined room`);

          // Send unread count
          const unreadCount = await Notification.getUnreadCount(userId);
          socket.emit("unread_count", { count: unreadCount });
        }
      });

      // Leave room
      socket.on("leave", (userId) => {
        if (userId) {
          socket.leave(`user:${userId}`);
          logger.debug(`User ${userId} left room`);
        }
      });

      socket.on("disconnect", () => {
        logger.debug(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send notification to user
   */
  async sendNotification(userId, notificationData) {
    // Create notification record
    const notification = await Notification.create({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      related_id: notificationData.related_id,
      related_type: notificationData.related_type,
      priority: notificationData.priority || "normal",
      channels: notificationData.channels || ["in_app"],
      actions: notificationData.actions || [],
    });

    await notification.markAsSent("in_app");

    // Send via Socket.IO
    if (this.io) {
      this.io.to(`user:${userId}`).emit("notification", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.created_at,
      });
    }

    // Send via other channels
    if (notificationData.channels?.includes("push")) {
      await this.sendPushNotification(userId, notification);
    }
    if (notificationData.channels?.includes("sms")) {
      await this.sendSMSNotification(userId, notification);
    }

    logger.info(`Notification sent to user ${userId}: ${notification.id}`);

    return notification;
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findByPk(userId);

      if (!user?.fcm_token) {
        return;
      }

      // Queue push notification
      await addJob(QUEUE_NAMES.NOTIFICATION, "send-push", {
        fcmToken: user.fcm_token,
        title: notification.title,
        body: notification.message,
        data: notification.data,
      });

      await notification.updateDeliveryStatus("push", "queued");
    } catch (error) {
      logger.error("Failed to send push notification:", error);
      await notification.updateDeliveryStatus("push", "failed");
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, notification) {
    try {
      const user = await User.findByPk(userId);

      if (!user?.phone) {
        return;
      }

      // Queue SMS
      await addJob(QUEUE_NAMES.SMS, "send-sms", {
        phone: user.phone,
        message: `${notification.title}: ${notification.message}`,
      });

      await notification.updateDeliveryStatus("sms", "queued");
    } catch (error) {
      logger.error("Failed to send SMS notification:", error);
      await notification.updateDeliveryStatus("sms", "failed");
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, filters = {}, pagination = {}) {
    const { type, unread_only = false } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = { user_id: userId };
    if (type) {
      where.type = type;
    }
    if (unread_only) {
      where.is_read = false;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return formatPaginationResponse(notifications, count, page, limit);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (notification) {
      await notification.markAsRead();

      // Emit updated unread count
      if (this.io) {
        const unreadCount = await Notification.getUnreadCount(userId);
        this.io
          .to(`user:${userId}`)
          .emit("unread_count", { count: unreadCount });
      }
    }

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const count = await Notification.markAllAsRead(userId);

    // Emit updated unread count
    if (this.io) {
      this.io.to(`user:${userId}`).emit("unread_count", { count: 0 });
    }

    return { marked: count };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (notification) {
      await notification.destroy();
    }

    return { deleted: !!notification };
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(userIds, notificationData) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendNotification(userId, notificationData)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.info(
      `Bulk notifications sent: ${succeeded} succeeded, ${failed} failed`,
    );

    return { succeeded, failed };
  }

  /**
   * Job alert notification
   */
  async sendJobAlert(userId, job) {
    return this.sendNotification(userId, {
      type: "job_alert",
      title: "New Job Match",
      message: `New opportunity: ${job.title}`,
      data: {
        job_id: job.id,
        job_title: job.title,
        company: job.employer?.company_name,
      },
      related_id: job.id,
      related_type: "job",
      actions: [
        {
          label: "View Job",
          action: "view_job",
          data: { job_id: job.id },
        },
      ],
    });
  }

  /**
   * Application update notification
   */
  async sendApplicationUpdate(userId, application, newStatus) {
    const statusMessages = {
      shortlisted:
        "Congratulations! You have been shortlisted for the position.",
      interview_scheduled: "Your interview has been scheduled.",
      selected: "Congratulations! You have been selected for the job.",
      rejected:
        "We regret to inform you that your application was not selected.",
    };

    return this.sendNotification(userId, {
      type: "application_update",
      title: "Application Update",
      message:
        statusMessages[newStatus] || `Your application status: ${newStatus}`,
      data: {
        application_id: application.id,
        job_id: application.job_id,
        status: newStatus,
      },
      related_id: application.id,
      related_type: "application",
      priority: newStatus === "selected" ? "high" : "normal",
      channels: ["in_app", "push"],
    });
  }

  /**
   * Interview reminder notification
   */
  async sendInterviewReminder(userId, booking, slot) {
    return this.sendNotification(userId, {
      type: "interview_reminder",
      title: "Interview Reminder",
      message: `Your interview is scheduled for ${new Date(slot.start_time).toLocaleString()}`,
      data: {
        booking_id: booking.id,
        start_time: slot.start_time,
        location: slot.location,
        interview_type: slot.interview_type,
      },
      related_id: booking.id,
      related_type: "interview",
      priority: "high",
      channels: ["in_app", "push", "sms"],
    });
  }

  /**
   * Document verification notification
   */
  async sendDocumentVerified(userId, document) {
    return this.sendNotification(userId, {
      type: "document_verified",
      title: "Document Verified",
      message: `Your ${document.document_type} has been verified successfully.`,
      data: {
        document_id: document.id,
        document_type: document.document_type,
      },
      related_id: document.id,
      related_type: "document",
    });
  }

  /**
   * Scheme update notification
   */
  async sendSchemeUpdate(userId, application, newStatus) {
    return this.sendNotification(userId, {
      type: "scheme_update",
      title: "Scheme Application Update",
      message: `Your scheme application status: ${newStatus}`,
      data: {
        application_id: application.id,
        scheme_id: application.scheme_id,
        status: newStatus,
      },
      related_id: application.id,
      related_type: "scheme_application",
      priority: newStatus === "approved" ? "high" : "normal",
    });
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(notificationData, filters = {}) {
    const where = { is_active: true };

    if (filters.role) {
      where.role = filters.role;
    }

    const users = await User.findAll({
      where,
      attributes: ["id"],
    });

    const userIds = users.map((u) => u.id);

    return this.sendBulkNotifications(userIds, {
      ...notificationData,
      type: "system",
    });
  }

  /**
   * Cleanup old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    const deleted = await Notification.deleteOldNotifications(daysOld);
    logger.info(`Cleaned up ${deleted} old notifications`);
    return { deleted };
  }
}

module.exports = new NotificationService();
