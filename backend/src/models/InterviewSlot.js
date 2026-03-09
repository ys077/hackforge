const mongoose = require("mongoose");

const interviewSlotSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    interviewType: {
      type: String,
      enum: ["in_person", "phone", "video"],
      default: "in_person",
    },
    location: {
      type: String,
    },
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    meetingLink: {
      type: String,
      maxlength: 500,
    },
    phoneNumber: {
      type: String,
      maxlength: 15,
    },
    maxBookings: {
      type: Number,
      default: 1,
    },
    currentBookings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "booked", "cancelled", "completed"],
      default: "available",
    },
    notes: {
      type: String,
    },
    instructions: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes
interviewSlotSchema.index({ jobId: 1, status: 1 });
interviewSlotSchema.index({ startTime: 1, endTime: 1 });
interviewSlotSchema.index({ employerId: 1 });

// Virtual for job
interviewSlotSchema.virtual("job", {
  ref: "Job",
  localField: "jobId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for employer
interviewSlotSchema.virtual("employer", {
  ref: "Employer",
  localField: "employerId",
  foreignField: "_id",
  justOne: true,
});

// Check if slot is available
interviewSlotSchema.methods.isAvailable = function () {
  if (this.status !== "available") return false;
  if (this.currentBookings >= this.maxBookings) return false;
  if (new Date() > this.startTime) return false;
  return true;
};

// Check if slot can be cancelled
interviewSlotSchema.methods.canBeCancelled = function () {
  return this.status === "available" || this.status === "booked";
};

// Book a slot
interviewSlotSchema.methods.book = async function () {
  if (!this.isAvailable()) {
    throw new Error("Slot is not available");
  }

  this.currentBookings += 1;
  if (this.currentBookings >= this.maxBookings) {
    this.status = "booked";
  }

  await this.save();
  return this;
};

// Release a booking
interviewSlotSchema.methods.releaseBooking = async function () {
  if (this.currentBookings > 0) {
    this.currentBookings -= 1;
    if (this.status === "booked" && this.currentBookings < this.maxBookings) {
      this.status = "available";
    }
    await this.save();
  }
  return this;
};

// Cancel slot
interviewSlotSchema.methods.cancel = async function (reason = null) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  if (reason) {
    this.cancellationReason = reason;
  }
  await this.save();
  return this;
};

// Get formatted time range
interviewSlotSchema.methods.getTimeRange = function () {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const start = new Date(this.startTime).toLocaleTimeString("en-IN", options);
  const end = new Date(this.endTime).toLocaleTimeString("en-IN", options);
  return `${start} - ${end}`;
};

// Get formatted date
interviewSlotSchema.methods.getFormattedDate = function () {
  return new Date(this.startTime).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Static: find available slots for a job
interviewSlotSchema.statics.findAvailableSlots = async function (
  jobId,
  options = {},
) {
  return this.find({
    jobId,
    status: "available",
    startTime: { $gt: new Date() },
    $expr: { $lt: ["$currentBookings", "$maxBookings"] },
  })
    .sort({ startTime: 1 })
    .limit(options.limit || 100);
};

// Static: find slots within date range
interviewSlotSchema.statics.findInDateRange = async function (
  jobId,
  startDate,
  endDate,
) {
  return this.find({
    jobId,
    startTime: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ startTime: 1 });
};

// Static: check for overlapping slots
interviewSlotSchema.statics.hasOverlap = async function (
  jobId,
  startTime,
  endTime,
  excludeId = null,
) {
  const query = {
    jobId,
    status: { $ne: "cancelled" },
    $or: [
      {
        startTime: { $gte: startTime, $lt: endTime },
      },
      {
        endTime: { $gt: startTime, $lte: endTime },
      },
      {
        $and: [
          { startTime: { $lte: startTime } },
          { endTime: { $gte: endTime } },
        ],
      },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const count = await this.countDocuments(query);
  return count > 0;
};

// Static: create multiple slots
interviewSlotSchema.statics.createBulkSlots = async function (
  jobId,
  employerId,
  slots,
) {
  const createdSlots = [];

  for (const slot of slots) {
    const hasOverlap = await this.hasOverlap(
      jobId,
      slot.startTime,
      slot.endTime,
    );
    if (!hasOverlap) {
      const newSlot = await this.create({
        jobId,
        employerId,
        ...slot,
      });
      createdSlots.push(newSlot);
    }
  }

  return createdSlots;
};

const InterviewSlot = mongoose.model("InterviewSlot", interviewSlotSchema);

module.exports = InterviewSlot;
