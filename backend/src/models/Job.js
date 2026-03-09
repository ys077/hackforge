const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      type: String,
    },
    responsibilities: {
      type: String,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    educationRequired: {
      type: String,
      enum: [
        "none",
        "primary",
        "secondary",
        "higher_secondary",
        "graduate",
        "post_graduate",
      ],
      default: "none",
    },
    experienceMin: {
      type: Number,
      default: 0,
      min: 0,
    },
    experienceMax: {
      type: Number,
      min: 0,
    },
    salaryMin: {
      type: Number,
    },
    salaryMax: {
      type: Number,
    },
    salaryType: {
      type: String,
      enum: ["hourly", "daily", "weekly", "monthly"],
      default: "monthly",
    },
    jobType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "gig", "internship"],
      default: "full_time",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    locationAddress: {
      type: String,
    },
    city: {
      type: String,
      maxlength: 100,
    },
    state: {
      type: String,
      maxlength: 100,
    },
    pincode: {
      type: String,
      maxlength: 10,
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    vacancies: {
      type: Number,
      default: 1,
      min: 1,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed", "expired"],
      default: "active",
    },
    benefits: {
      type: [String],
      default: [],
    },
    workingHours: {
      type: String,
      maxlength: 100,
    },
    shiftType: {
      type: String,
      enum: ["day", "night", "rotating", "flexible"],
      default: "day",
    },
    genderPreference: {
      type: String,
      enum: ["any", "male", "female"],
      default: "any",
    },
    ageMin: {
      type: Number,
    },
    ageMax: {
      type: Number,
    },
    languagesRequired: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    externalSource: {
      type: String,
      maxlength: 100,
    },
    externalId: {
      type: String,
      maxlength: 100,
    },
    externalUrl: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
jobSchema.index({ employerId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ location: "2dsphere" });
jobSchema.index({ city: 1 });
jobSchema.index({ state: 1 });
jobSchema.index({ skillsRequired: 1 });
jobSchema.index({ educationRequired: 1 });
jobSchema.index({ salaryMin: 1, salaryMax: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ expiresAt: 1 });
jobSchema.index({ isFeatured: 1 });
jobSchema.index(
  { externalSource: 1, externalId: 1 },
  { unique: true, sparse: true },
);

// Virtual for employer
jobSchema.virtual("employer", {
  ref: "Employer",
  localField: "employerId",
  foreignField: "_id",
  justOne: true,
});

// Check if job is active
jobSchema.methods.isActive = function () {
  if (this.status !== "active") return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Increment view count
jobSchema.methods.incrementViews = async function () {
  this.viewsCount += 1;
  await this.save();
};

// Increment application count
jobSchema.methods.incrementApplications = async function () {
  this.applicationsCount += 1;
  await this.save();
};

// Get location for distance calculations
jobSchema.methods.getLocation = function () {
  if (this.location && this.location.coordinates) {
    return {
      lat: this.location.coordinates[1],
      lng: this.location.coordinates[0],
    };
  }
  return null;
};

// Set location from lat/lng
jobSchema.methods.setLocation = function (lat, lng) {
  this.location = {
    type: "Point",
    coordinates: [lng, lat],
  };
};

// Check if job has expired
jobSchema.methods.checkExpiry = async function () {
  if (
    this.expiresAt &&
    new Date() > this.expiresAt &&
    this.status === "active"
  ) {
    this.status = "expired";
    await this.save();
    return true;
  }
  return false;
};

// Static method to find active jobs
jobSchema.statics.findActiveJobs = async function (options = {}) {
  const query = {
    status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
  return this.find(query, null, options);
};

// Static method to find jobs within radius
jobSchema.statics.findNearbyJobs = async function (
  lat,
  lng,
  radiusKm = 10,
  options = {},
) {
  const radiusInMeters = radiusKm * 1000;

  return this.find({
    status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radiusInMeters,
      },
    },
  })
    .limit(options.limit || 20)
    .skip(options.offset || 0);
};

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
