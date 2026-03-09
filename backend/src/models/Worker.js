const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      min: 18,
      max: 80,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    occupation: {
      type: String,
      maxlength: 100,
    },
    education: {
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
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
      max: 50,
    },
    skills: {
      type: [String],
      default: [],
    },
    languagesKnown: {
      type: [String],
      default: ["en"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
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
    aadhaarNumber: {
      type: String,
      maxlength: 12,
    },
    panNumber: {
      type: String,
      maxlength: 10,
    },
    bankAccountNumber: {
      type: String,
      maxlength: 20,
    },
    bankIfsc: {
      type: String,
      maxlength: 11,
    },
    preferredJobTypes: {
      type: [String],
      default: [],
    },
    expectedSalaryMin: {
      type: Number,
    },
    expectedSalaryMax: {
      type: Number,
    },
    willingToRelocate: {
      type: Boolean,
      default: false,
    },
    maxTravelDistance: {
      type: Number,
      default: 10, // km
    },
    profileCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    bio: {
      type: String,
    },
    profilePhotoUrl: {
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
workerSchema.index({ userId: 1 }, { unique: true });
workerSchema.index({ location: "2dsphere" });
workerSchema.index({ city: 1 });
workerSchema.index({ state: 1 });
workerSchema.index({ skills: 1 });
workerSchema.index({ education: 1 });
workerSchema.index({ occupation: 1 });

// Virtual for user
workerSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Calculate profile completion percentage
workerSchema.methods.calculateProfileCompletion = function () {
  const fields = [
    "age",
    "gender",
    "occupation",
    "education",
    "experienceYears",
    "city",
    "state",
    "bio",
    "profilePhotoUrl",
  ];

  let completed = 0;
  for (const field of fields) {
    if (
      this[field] !== null &&
      this[field] !== undefined &&
      this[field] !== ""
    ) {
      completed++;
    }
  }

  // Check location
  if (
    this.location &&
    this.location.coordinates &&
    this.location.coordinates[0] !== 0
  ) {
    completed++;
  }

  // Check skills array
  if (this.skills && this.skills.length > 0) {
    completed++;
  }

  const totalFields = fields.length + 2;
  this.profileCompletion = Math.round((completed / totalFields) * 100);
  return this.profileCompletion;
};

// Get location for distance calculations
workerSchema.methods.getLocation = function () {
  if (
    this.location &&
    this.location.coordinates &&
    this.location.coordinates[0] !== 0
  ) {
    return {
      lat: this.location.coordinates[1],
      lng: this.location.coordinates[0],
    };
  }
  return null;
};

// Set location from lat/lng
workerSchema.methods.setLocation = function (lat, lng) {
  this.location = {
    type: "Point",
    coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
  };
};

const Worker = mongoose.model("Worker", workerSchema);

module.exports = Worker;
