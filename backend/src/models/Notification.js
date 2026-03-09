const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "job_alert",
        "application_update",
        "interview_reminder",
        "scheme_update",
        "document_verified",
        "profile_update",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Related entities
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedType: {
      type: String,
      maxlength: 50,
    },
    // Notification state
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // Delivery channels
    channels: {
      type: [String],
      default: ["in_app"],
    },
    // Delivery status per channel
    deliveryStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    // Scheduled notification
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    // Action buttons
    actions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Expiry
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledAt: 1 });

// Virtual for user
notificationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Mark as read
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

// Mark as sent
notificationSchema.methods.markAsSent = async function (channel = null) {
  this.sentAt = new Date();
  if (channel) {
    this.deliveryStatus = {
      ...this.deliveryStatus,
      [channel]: "sent",
    };
  }
  await this.save();
};

// Update delivery status
notificationSchema.methods.updateDeliveryStatus = async function (
  channel,
  status,
) {
  this.deliveryStatus = {
    ...this.deliveryStatus,
    [channel]: status,
  };
  await this.save();
};

// Check if notification is valid
notificationSchema.methods.isValid = function () {
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }
  return true;
};

// Static: create job alert notification
notificationSchema.statics.createJobAlert = async function (userId, job) {
  return this.create({
    userId,
    type: "job_alert",
    title: "New Job Match",
    message: `New job opportunity: ${job.title}`,
    data: {
      jobId: job._id,
      jobTitle: job.title,
      company: job.employer?.companyName,
      salary: job.salaryMax,
    },
    relatedId: job._id,
    relatedType: "job",
    actions: [
      {
        label: "View Job",
        action: "view_job",
        data: { jobId: job._id },
      },
    ],
  });
};

// Static: create application update notification
notificationSchema.statics.createApplicationUpdate = async function (
  userId,
  application,
  newStatus,
) {
  const statusMessages = {
    shortlisted: "Congratulations! You have been shortlisted",
    interview_scheduled: "Your interview has been scheduled",
    selected: "Congratulations! You have been selected",
    rejected: "Unfortunately, your application was not selected",
  };

  return this.create({
    userId,
    type: "application_update",
    title: "Application Update",
    message:
      statusMessages[newStatus] || `Your application status: ${newStatus}`,
    data: {
      applicationId: application._id,
      jobId: application.jobId,
      status: newStatus,
    },
    relatedId: application._id,
    relatedType: "application",
    priority: newStatus === "selected" ? "high" : "normal",
  });
};

// Static: create interview reminder
notificationSchema.statics.createInterviewReminder = async function (
  userId,
  interview,
  hoursBefore = 24,
) {
  return this.create({
    userId,
    type: "interview_reminder",
    title: "Interview Reminder",
    message: `Your interview is scheduled in ${hoursBefore} hours`,
    data: {
      interviewId: interview._id,
      startTime: interview.startTime,
      location: interview.location,
    },
    relatedId: interview._id,
    relatedType: "interview",
    priority: "high",
    scheduledAt: new Date(
      new Date(interview.startTime).getTime() - hoursBefore * 60 * 60 * 1000,
    ),
  });
};

// Static: get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
  });
};

// Static: get user notifications
notificationSchema.statics.getUserNotifications = async function (
  userId,
  options = {},
) {
  return this.find({
    userId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static: mark all as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );
  return result.modifiedCount;
};

// Static: delete old notifications
notificationSchema.statics.deleteOldNotifications = async function (
  daysOld = 30,
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
