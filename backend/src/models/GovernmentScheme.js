const mongoose = require("mongoose");

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    nameHindi: {
      type: String,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
    },
    descriptionHindi: {
      type: String,
    },
    department: {
      type: String,
      maxlength: 200,
    },
    ministry: {
      type: String,
      maxlength: 200,
    },
    schemeType: {
      type: String,
      enum: ["central", "state", "local"],
      default: "central",
    },
    state: {
      type: String,
      maxlength: 100,
    },
    benefitType: {
      type: String,
      enum: ["financial", "training", "subsidy", "insurance", "loan", "other"],
      required: true,
    },
    benefitAmountMin: {
      type: Number,
    },
    benefitAmountMax: {
      type: Number,
    },
    benefitDescription: {
      type: String,
    },
    eligibilityRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Structured eligibility criteria
    minAge: {
      type: Number,
    },
    maxAge: {
      type: Number,
    },
    genderEligibility: {
      type: String,
      enum: ["all", "male", "female"],
      default: "all",
    },
    incomeLimit: {
      type: Number,
    },
    educationRequired: {
      type: [String],
      default: [],
    },
    occupationCategories: {
      type: [String],
      default: [],
    },
    requiredDocuments: {
      type: [String],
      default: ["aadhaar"],
    },
    applicationProcess: {
      type: String,
    },
    applicationUrl: {
      type: String,
      maxlength: 500,
    },
    helpline: {
      type: String,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    totalApplications: {
      type: Number,
      default: 0,
    },
    approvedApplications: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
governmentSchemeSchema.index({ name: 1 });
governmentSchemeSchema.index({ schemeType: 1 });
governmentSchemeSchema.index({ state: 1 });
governmentSchemeSchema.index({ benefitType: 1 });
governmentSchemeSchema.index({ occupationCategories: 1 });
governmentSchemeSchema.index({ isActive: 1 });
governmentSchemeSchema.index({ tags: 1 });

// Check if scheme is currently active
governmentSchemeSchema.methods.isCurrentlyActive = function () {
  if (!this.isActive) return false;

  const now = new Date();
  if (this.startDate && new Date(this.startDate) > now) return false;
  if (this.endDate && new Date(this.endDate) < now) return false;

  return true;
};

// Check basic eligibility for a worker profile
governmentSchemeSchema.methods.checkBasicEligibility = function (
  workerProfile,
) {
  // Age check
  if (this.minAge && workerProfile.age && workerProfile.age < this.minAge) {
    return { eligible: false, reason: "Age below minimum requirement" };
  }
  if (this.maxAge && workerProfile.age && workerProfile.age > this.maxAge) {
    return { eligible: false, reason: "Age above maximum limit" };
  }

  // Gender check
  if (
    this.genderEligibility !== "all" &&
    workerProfile.gender !== this.genderEligibility
  ) {
    return { eligible: false, reason: "Gender eligibility not met" };
  }

  // State check
  if (this.state && workerProfile.state && this.state !== workerProfile.state) {
    return { eligible: false, reason: "State eligibility not met" };
  }

  return { eligible: true, reason: null };
};

// Get formatted benefit range
governmentSchemeSchema.methods.getBenefitRange = function () {
  if (!this.benefitAmountMin && !this.benefitAmountMax) {
    return this.benefitDescription || "Varies";
  }

  if (this.benefitAmountMin && this.benefitAmountMax) {
    return `₹${this.benefitAmountMin.toLocaleString("en-IN")} - ₹${this.benefitAmountMax.toLocaleString("en-IN")}`;
  }

  if (this.benefitAmountMax) {
    return `Up to ₹${this.benefitAmountMax.toLocaleString("en-IN")}`;
  }

  return `From ₹${this.benefitAmountMin.toLocaleString("en-IN")}`;
};

// Static: find schemes by eligibility
governmentSchemeSchema.statics.findEligibleSchemes = async function (
  workerProfile,
  options = {},
) {
  const query = {
    isActive: true,
    $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
  };

  // State filter
  if (workerProfile.state) {
    query.$or = [{ state: null }, { state: workerProfile.state }];
  }

  // Gender filter
  if (workerProfile.gender) {
    query.genderEligibility = { $in: ["all", workerProfile.gender] };
  }

  // Age filter
  if (workerProfile.age) {
    query.$and = [
      { $or: [{ minAge: null }, { minAge: { $lte: workerProfile.age } }] },
      { $or: [{ maxAge: null }, { maxAge: { $gte: workerProfile.age } }] },
    ];
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

const GovernmentScheme = mongoose.model(
  "GovernmentScheme",
  governmentSchemeSchema,
);

module.exports = GovernmentScheme;
