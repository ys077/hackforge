const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        "aadhaar",
        "pan",
        "passbook",
        "certificate",
        "photo",
        "voter_id",
        "driving_license",
        "other",
      ],
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      maxlength: 200,
    },
    filePath: {
      type: String,
      required: true,
      maxlength: 500,
    },
    fileName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
      maxlength: 100,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    verificationNotes: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    // OCR extracted data
    ocrData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ocrConfidence: {
      type: Number,
    },
    // Document specific fields
    documentNumber: {
      type: String,
      maxlength: 50,
      index: true,
    },
    documentHolderName: {
      type: String,
      maxlength: 200,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    // AI verification
    aiVerified: {
      type: Boolean,
      default: false,
    },
    aiVerificationScore: {
      type: Number,
    },
    aiVerificationNotes: {
      type: String,
    },
    // Metadata
    isPrimary: {
      type: Boolean,
      default: false,
    },
    uploadIp: {
      type: String,
      maxlength: 45,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
documentSchema.index({ workerId: 1, documentType: 1, isPrimary: 1 });

// Virtual for worker
documentSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Check if document is verified
documentSchema.methods.isVerified = function () {
  return this.verificationStatus === "verified";
};

// Check if document is expired
documentSchema.methods.isExpired = function () {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
};

// Verify document
documentSchema.methods.verify = async function (verifierId, notes = null) {
  this.verificationStatus = "verified";
  this.verifiedBy = verifierId;
  this.verifiedAt = new Date();
  if (notes) {
    this.verificationNotes = notes;
  }
  await this.save();
};

// Reject document
documentSchema.methods.reject = async function (verifierId, reason) {
  this.verificationStatus = "rejected";
  this.verifiedBy = verifierId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
};

// Set OCR data
documentSchema.methods.setOCRData = async function (data, confidence) {
  this.ocrData = data;
  this.ocrConfidence = confidence;

  // Extract common fields from OCR
  if (data.name) this.documentHolderName = data.name;
  if (data.document_number) this.documentNumber = data.document_number;
  if (data.issue_date) this.issueDate = data.issue_date;
  if (data.expiry_date) this.expiryDate = data.expiry_date;

  await this.save();
};

// Static: get worker's documents by type
documentSchema.statics.getWorkerDocuments = async function (
  workerId,
  documentType = null,
) {
  const query = { workerId };
  if (documentType) {
    query.documentType = documentType;
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static: check if worker has verified document
documentSchema.statics.hasVerifiedDocument = async function (
  workerId,
  documentType,
) {
  const count = await this.countDocuments({
    workerId,
    documentType,
    verificationStatus: "verified",
  });
  return count > 0;
};

// Static: get verification statistics for a worker
documentSchema.statics.getVerificationStats = async function (workerId) {
  const documents = await this.find({ workerId }).select(
    "documentType verificationStatus",
  );

  const stats = {
    total: documents.length,
    verified: 0,
    pending: 0,
    rejected: 0,
    by_type: {},
  };

  for (const doc of documents) {
    if (doc.verificationStatus === "verified") stats.verified++;
    else if (doc.verificationStatus === "pending") stats.pending++;
    else if (doc.verificationStatus === "rejected") stats.rejected++;

    if (!stats.by_type[doc.documentType]) {
      stats.by_type[doc.documentType] = { verified: false, pending: false };
    }

    if (doc.verificationStatus === "verified") {
      stats.by_type[doc.documentType].verified = true;
    } else if (doc.verificationStatus === "pending") {
      stats.by_type[doc.documentType].pending = true;
    }
  }

  return stats;
};

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
