const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    title: {
      type: String,
      maxlength: 200,
      default: "My Resume",
    },
    version: {
      type: Number,
      default: 1,
    },
    filePath: {
      type: String,
      maxlength: 500,
    },
    fileName: {
      type: String,
      maxlength: 255,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
      maxlength: 100,
    },
    // Resume content (structured data)
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Personal information
    personalInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Work experience
    workExperience: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Education
    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Skills
    skills: {
      type: [String],
      default: [],
    },
    // Languages
    languages: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Certifications
    certifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Summary/Objective
    summary: {
      type: String,
    },
    // Template used
    template: {
      type: String,
      default: "basic",
    },
    // AI generated/enhanced
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    isAiEnhanced: {
      type: Boolean,
      default: false,
    },
    // ATS Score
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    atsFeedback: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Language of resume
    language: {
      type: String,
      default: "en",
      maxlength: 5,
    },
    // Primary resume flag
    isPrimary: {
      type: Boolean,
      default: false,
    },
    // Downloads count
    downloadsCount: {
      type: Number,
      default: 0,
    },
    // Last used in application
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
resumeSchema.index({ workerId: 1 });
resumeSchema.index({ isPrimary: 1 });
resumeSchema.index({ language: 1 });
resumeSchema.index({ atsScore: -1 });

// Virtual for worker
resumeSchema.virtual("worker", {
  ref: "Worker",
  localField: "workerId",
  foreignField: "_id",
  justOne: true,
});

// Increment version
resumeSchema.methods.incrementVersion = async function () {
  this.version += 1;
  await this.save();
};

// Mark as primary
resumeSchema.methods.markAsPrimary = async function () {
  // First, unmark any existing primary resumes for this worker
  await this.constructor.updateMany(
    { workerId: this.workerId, isPrimary: true },
    { isPrimary: false },
  );

  this.isPrimary = true;
  await this.save();
};

// Increment download count
resumeSchema.methods.incrementDownloads = async function () {
  this.downloadsCount += 1;
  await this.save();
};

// Update ATS score
resumeSchema.methods.updateATSScore = async function (score, feedback = {}) {
  this.atsScore = score;
  this.atsFeedback = feedback;
  await this.save();
};

// Mark as used
resumeSchema.methods.markAsUsed = async function () {
  this.lastUsedAt = new Date();
  await this.save();
};

// Get full content for PDF generation
resumeSchema.methods.getFullContent = function () {
  return {
    personalInfo: this.personalInfo,
    summary: this.summary,
    workExperience: this.workExperience,
    education: this.education,
    skills: this.skills,
    languages: this.languages,
    certifications: this.certifications,
    ...this.content,
  };
};

// Static: get worker's primary resume
resumeSchema.statics.getPrimaryResume = async function (workerId) {
  return this.findOne({
    workerId,
    isPrimary: true,
  });
};

// Static: get worker's resumes
resumeSchema.statics.getWorkerResumes = async function (
  workerId,
  options = {},
) {
  return this.find({ workerId })
    .sort({ isPrimary: -1, updatedAt: -1 })
    .limit(options.limit || 100);
};

// Static: create resume from worker profile
resumeSchema.statics.createFromProfile = async function (worker, user) {
  const resume = await this.create({
    workerId: worker._id,
    title: `Resume - ${user.name || "My Resume"}`,
    personalInfo: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      location: worker.locationAddress,
      city: worker.city,
      state: worker.state,
    },
    summary: worker.bio,
    skills: worker.skills || [],
    languages:
      worker.languagesKnown?.map((lang) => ({
        language: lang,
        proficiency: "conversational",
      })) || [],
    education: worker.education
      ? [
          {
            level: worker.education,
          },
        ]
      : [],
    workExperience: worker.occupation
      ? [
          {
            title: worker.occupation,
            years: worker.experienceYears,
          },
        ]
      : [],
    isAiGenerated: true,
  });

  return resume;
};

const Resume = mongoose.model("Resume", resumeSchema);

module.exports = Resume;
