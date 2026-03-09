const mongoose = require("mongoose");

const schemeApplicationSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    schemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovernmentScheme",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "documents_required",
        "approved",
        "rejected",
      ],
      default: "draft",
      index: true,
    },
    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    eligibilityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    documentsSubmitted: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    additionalInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    submissionData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reviewNotes: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    benefitReceived: {
      type: Number,
    },
    submittedAt: {
      type: Date,
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index: one active application per worker per scheme
schemeApplicationSchema.index(
  { workerId: 1, schemeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ["rejected"] } },
  },
);

// Virtual for worker
schemeApplicationSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for scheme
schemeApplicationSchema.virtual("scheme", {
  ref: "GovernmentScheme",
  localField: "schemeId",
  foreignField: "_id",
  justOne: true,
});

// Generate reference number
schemeApplicationSchema.methods.generateReferenceNumber = function () {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  this.referenceNumber = `SCH${timestamp}${random}`;
  return this.referenceNumber;
};

// Submit application
schemeApplicationSchema.methods.submit = async function () {
  if (this.status !== "draft") {
    throw new Error("Only draft applications can be submitted");
  }

  this.status = "submitted";
  this.submittedAt = new Date();

  if (!this.referenceNumber) {
    this.generateReferenceNumber();
  }

  await this.save();
};

// Update status
schemeApplicationSchema.methods.updateStatus = async function (
  newStatus,
  notes = null,
) {
  const statusTimestampMap = {
    submitted: "submittedAt",
    reviewed: "reviewedAt",
    approved: "approvedAt",
    rejected: "rejectedAt",
  };

  const previousStatus = this.status;
  this.status = newStatus;

  if (statusTimestampMap[newStatus]) {
    this[statusTimestampMap[newStatus]] = new Date();
  }

  if (notes) {
    if (newStatus === "rejected") {
      this.rejectionReason = notes;
    } else {
      this.reviewNotes = notes;
    }
  }

  await this.save();

  return { previousStatus, newStatus };
};

// Check if application can be edited
schemeApplicationSchema.methods.canEdit = function () {
  return this.status === "draft" || this.status === "documents_required";
};

// Static: check if worker has active application for scheme
schemeApplicationSchema.statics.hasActiveApplication = async function (
  workerId,
  schemeId,
) {
  const count = await this.countDocuments({
    workerId,
    schemeId,
    status: { $nin: ["rejected"] },
  });
  return count > 0;
};

// Static: get application statistics
schemeApplicationSchema.statics.getStatistics = async function (
  schemeId = null,
) {
  const match = schemeId
    ? { schemeId: new mongoose.Types.ObjectId(schemeId) }
    : {};

  const stats = await this.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const result = {
    total: 0,
    draft: 0,
    submitted: 0,
    under_review: 0,
    documents_required: 0,
    approved: 0,
    rejected: 0,
  };

  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }

  return result;
};

const SchemeApplication = mongoose.model(
  "SchemeApplication",
  schemeApplicationSchema,
);

module.exports = SchemeApplication;
