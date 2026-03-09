const mongoose = require("mongoose");

const trustScoreSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      unique: true,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Component scores (0-100)
    profileCompletenessScore: {
      type: Number,
      default: 0,
    },
    documentVerificationScore: {
      type: Number,
      default: 0,
    },
    employmentHistoryScore: {
      type: Number,
      default: 0,
    },
    skillsScore: {
      type: Number,
      default: 0,
    },
    activityScore: {
      type: Number,
      default: 0,
    },
    // Detailed breakdown
    scoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Factors affecting score
    positiveFactors: {
      type: [String],
      default: [],
    },
    negativeFactors: {
      type: [String],
      default: [],
    },
    // Improvement suggestions
    improvementSuggestions: {
      type: [String],
      default: [],
    },
    // Verification counts
    verifiedDocumentsCount: {
      type: Number,
      default: 0,
    },
    totalDocumentsCount: {
      type: Number,
      default: 0,
    },
    // Activity metrics
    applicationsCount: {
      type: Number,
      default: 0,
    },
    successfulApplicationsCount: {
      type: Number,
      default: 0,
    },
    interviewsAttended: {
      type: Number,
      default: 0,
    },
    // Level/Badge
    trustLevel: {
      type: String,
      enum: ["unverified", "basic", "verified", "trusted", "premium"],
      default: "unverified",
    },
    // Last calculation timestamp
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    // ML model version used
    mlModelVersion: {
      type: String,
      maxlength: 20,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
trustScoreSchema.index({ overallScore: -1 });
trustScoreSchema.index({ trustLevel: 1 });
trustScoreSchema.index({ calculatedAt: -1 });

// Virtual for worker
trustScoreSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Calculate overall score from components
trustScoreSchema.methods.calculateOverallScore = function () {
  const weights = {
    profileCompleteness: 0.2,
    documentVerification: 0.35,
    employmentHistory: 0.2,
    skills: 0.1,
    activity: 0.15,
  };

  this.overallScore = Math.round(
    this.profileCompletenessScore * weights.profileCompleteness +
      this.documentVerificationScore * weights.documentVerification +
      this.employmentHistoryScore * weights.employmentHistory +
      this.skillsScore * weights.skills +
      this.activityScore * weights.activity,
  );

  // Determine trust level
  this.trustLevel = this.determineTrustLevel();

  return this.overallScore;
};

// Determine trust level based on score
trustScoreSchema.methods.determineTrustLevel = function () {
  if (this.overallScore >= 90) return "premium";
  if (this.overallScore >= 75) return "trusted";
  if (this.overallScore >= 50) return "verified";
  if (this.overallScore >= 25) return "basic";
  return "unverified";
};

// Generate improvement suggestions
trustScoreSchema.methods.generateSuggestions = function () {
  const suggestions = [];

  if (this.profileCompletenessScore < 100) {
    suggestions.push("Complete your profile to improve your trust score");
  }
  if (this.documentVerificationScore < 50) {
    suggestions.push("Upload and verify your identity documents");
  }
  if (this.verifiedDocumentsCount < 2) {
    suggestions.push(
      "Add at least 2 verified documents for better credibility",
    );
  }
  if (this.skillsScore < 50) {
    suggestions.push("Add more skills to your profile");
  }
  if (this.activityScore < 50) {
    suggestions.push(
      "Stay active by applying to jobs and attending interviews",
    );
  }

  this.improvementSuggestions = suggestions;
  return suggestions;
};

// Update and recalculate
trustScoreSchema.methods.recalculate = async function (componentScores = {}) {
  if (componentScores.profileCompleteness !== undefined) {
    this.profileCompletenessScore = componentScores.profileCompleteness;
  }
  if (componentScores.documentVerification !== undefined) {
    this.documentVerificationScore = componentScores.documentVerification;
  }
  if (componentScores.employmentHistory !== undefined) {
    this.employmentHistoryScore = componentScores.employmentHistory;
  }
  if (componentScores.skills !== undefined) {
    this.skillsScore = componentScores.skills;
  }
  if (componentScores.activity !== undefined) {
    this.activityScore = componentScores.activity;
  }

  this.calculateOverallScore();
  this.generateSuggestions();
  this.calculatedAt = new Date();

  await this.save();
  return this;
};

// Static: get or create trust score for worker
trustScoreSchema.statics.getOrCreate = async function (workerId) {
  let trustScore = await this.findOne({ workerId });
  let created = false;

  if (!trustScore) {
    trustScore = await this.create({
      workerId,
      overallScore: 0,
    });
    created = true;
  }

  return { trustScore, created };
};

// Static: get workers by trust level
trustScoreSchema.statics.getByTrustLevel = async function (
  level,
  options = {},
) {
  return this.find({ trustLevel: level })
    .sort({ overallScore: -1 })
    .limit(options.limit || 100);
};

// Get score label
trustScoreSchema.methods.getScoreLabel = function () {
  if (this.overallScore >= 80) return "Excellent";
  if (this.overallScore >= 60) return "Good";
  if (this.overallScore >= 40) return "Fair";
  if (this.overallScore >= 20) return "Needs Improvement";
  return "Low";
};

const TrustScore = mongoose.model("TrustScore", trustScoreSchema);

module.exports = TrustScore;
