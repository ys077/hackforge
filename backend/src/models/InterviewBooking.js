const mongoose = require("mongoose");

const interviewBookingSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSlot",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      default: "scheduled",
    },
    confirmationCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    confirmedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: ["worker", "employer", "system"],
    },
    // Interview outcome
    outcome: {
      type: String,
      enum: ["pending", "passed", "failed", "on_hold"],
      default: "pending",
    },
    interviewerNotes: {
      type: String,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Worker notes
    workerNotes: {
      type: String,
    },
    // Reminders
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
    },
    // Attendance
    checkedInAt: {
      type: Date,
    },
    // Rescheduling
    originalSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSlot",
    },
    rescheduleCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound unique index
interviewBookingSchema.index({ workerId: 1, slotId: 1 }, { unique: true });

interviewBookingSchema.index({ applicationId: 1 });
interviewBookingSchema.index({ status: 1 });
interviewBookingSchema.index({ outcome: 1 });

// Virtual for worker
interviewBookingSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for slot
interviewBookingSchema.virtual("slot", {
  ref: "InterviewSlot",
  localField: "slotId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for application
interviewBookingSchema.virtual("application", {
  ref: "Application",
  localField: "applicationId",
  foreignField: "_id",
  justOne: true,
});

// Generate confirmation code
interviewBookingSchema.methods.generateConfirmationCode = function () {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.confirmationCode = `INT${code}`;
  return this.confirmationCode;
};

// Confirm booking
interviewBookingSchema.methods.confirm = async function () {
  this.status = "confirmed";
  this.confirmedAt = new Date();
  await this.save();
  return this;
};

// Cancel booking
interviewBookingSchema.methods.cancel = async function (
  reason,
  cancelledBy = "worker",
) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  await this.save();
  return this;
};

// Mark as completed
interviewBookingSchema.methods.complete = async function (
  outcome = "pending",
  notes = null,
  rating = null,
) {
  this.status = "completed";
  this.completedAt = new Date();
  this.outcome = outcome;
  if (notes) this.interviewerNotes = notes;
  if (rating) this.rating = rating;
  await this.save();
  return this;
};

// Mark as no-show
interviewBookingSchema.methods.markNoShow = async function () {
  this.status = "no_show";
  this.outcome = "failed";
  await this.save();
  return this;
};

// Check in
interviewBookingSchema.methods.checkIn = async function () {
  this.checkedInAt = new Date();
  await this.save();
  return this;
};

// Can be cancelled
interviewBookingSchema.methods.canBeCancelled = function () {
  return ["scheduled", "confirmed"].includes(this.status);
};

// Can be rescheduled
interviewBookingSchema.methods.canBeRescheduled = function () {
  return (
    ["scheduled", "confirmed"].includes(this.status) && this.rescheduleCount < 2
  );
};

// Static: check for double booking
interviewBookingSchema.statics.hasDoubleBooking = async function (
  workerId,
  slotId,
) {
  const InterviewSlot = mongoose.model("InterviewSlot");
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) return false;

  // Check if worker has another booking at overlapping time
  const existingBookings = await this.find({
    workerId,
    status: { $nin: ["cancelled", "no_show"] },
  }).populate({
    path: "slotId",
    match: {
      status: { $ne: "cancelled" },
      startTime: { $lt: slot.endTime },
      endTime: { $gt: slot.startTime },
    },
  });

  return existingBookings.some((booking) => booking.slotId !== null);
};

// Static: check if worker already booked this slot
interviewBookingSchema.statics.hasBookedSlot = async function (
  workerId,
  slotId,
) {
  const count = await this.countDocuments({
    workerId,
    slotId,
    status: { $nin: ["cancelled"] },
  });
  return count > 0;
};

// Static: get upcoming interviews for worker
interviewBookingSchema.statics.getUpcomingForWorker = async function (
  workerId,
  options = {},
) {
  return this.find({
    workerId,
    status: { $in: ["scheduled", "confirmed"] },
  })
    .populate({
      path: "slotId",
      match: { startTime: { $gt: new Date() } },
    })
    .sort({ "slotId.startTime": 1 })
    .limit(options.limit || 50);
};

// Static: get bookings needing reminders
interviewBookingSchema.statics.getBookingsNeedingReminder = async function (
  hoursAhead = 24,
) {
  const reminderTime = new Date();
  reminderTime.setHours(reminderTime.getHours() + hoursAhead);

  return this.find({
    status: { $in: ["scheduled", "confirmed"] },
    reminderSent: false,
  }).populate({
    path: "slotId",
    match: {
      startTime: { $lte: reminderTime, $gt: new Date() },
    },
  });
};

// Static: get interview statistics for employer
interviewBookingSchema.statics.getEmployerStatistics = async function (
  employerId,
) {
  const InterviewSlot = mongoose.model("InterviewSlot");

  // Get all slot IDs for this employer
  const slots = await InterviewSlot.find({ employerId }).select("_id");
  const slotIds = slots.map((s) => s._id);

  const stats = await this.aggregate([
    { $match: { slotId: { $in: slotIds } } },
    {
      $group: {
        _id: { status: "$status", outcome: "$outcome" },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    passed: 0,
    failed: 0,
  };

  for (const stat of stats) {
    const count = stat.count;
    result.total += count;
    result[stat._id.status] = (result[stat._id.status] || 0) + count;
    if (stat._id.outcome && stat._id.outcome !== "pending") {
      result[stat._id.outcome] = (result[stat._id.outcome] || 0) + count;
    }
  }

  return result;
};

const InterviewBooking = mongoose.model(
  "InterviewBooking",
  interviewBookingSchema,
);

module.exports = InterviewBooking;
