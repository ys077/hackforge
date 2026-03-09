const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
        "withdrawn",
      ],
      default: "pending",
    },
    coverNote: {
      type: String,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    skillsMatchScore: {
      type: Number,
    },
    educationMatch: {
      type: Boolean,
      default: false,
    },
    experienceMatch: {
      type: Boolean,
      default: false,
    },
    distanceKm: {
      type: Number,
    },
    employerNotes: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    shortlistedAt: {
      type: Date,
    },
    selectedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    withdrawnAt: {
      type: Date,
    },
    lastStatusChangeAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound unique index: one application per worker per job
applicationSchema.index({ workerId: 1, jobId: 1 }, { unique: true });

// Indexes
applicationSchema.index({ status: 1 });
applicationSchema.index({ matchScore: -1 });

// Virtual for worker
applicationSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for job
applicationSchema.virtual("job", {
  ref: "Job",
  localField: "jobId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for resume
applicationSchema.virtual("resume", {
  ref: "Resume",
  localField: "resumeId",
  foreignField: "_id",
  justOne: true,
});

// Update status with timestamp
applicationSchema.methods.updateStatus = async function (
  newStatus,
  notes = null,
) {
  const statusTimestampMap = {
    shortlisted: "shortlistedAt",
    selected: "selectedAt",
    rejected: "rejectedAt",
    withdrawn: "withdrawnAt",
  };

  this.status = newStatus;
  this.lastStatusChangeAt = new Date();

  if (statusTimestampMap[newStatus]) {
    this[statusTimestampMap[newStatus]] = new Date();
  }

  if (notes) {
    if (newStatus === "rejected") {
      this.rejectionReason = notes;
    } else {
      this.employerNotes = notes;
    }
  }

  await this.save();
};

// Check if application can be modified
applicationSchema.methods.canBeModified = function () {
  return ["pending", "shortlisted"].includes(this.status);
};

// Check if worker can withdraw
applicationSchema.methods.canWithdraw = function () {
  return !["selected", "rejected", "withdrawn"].includes(this.status);
};

// Static: check if worker already applied
applicationSchema.statics.hasApplied = async function (workerId, jobId) {
  const count = await this.countDocuments({ workerId, jobId });
  return count > 0;
};

// Static: get application statistics for a job
applicationSchema.statics.getJobStatistics = async function (jobId) {
  const stats = await this.aggregate([
    { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const result = {
    total: 0,
    pending: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
  };

  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }

  return result;
};

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;
