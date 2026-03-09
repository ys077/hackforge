const mongoose = require("mongoose");

const employerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      maxlength: 200,
    },
    companyType: {
      type: String,
      enum: ["individual", "startup", "sme", "corporate", "ngo", "government"],
      default: "individual",
      required: true,
    },
    companyDescription: {
      type: String,
    },
    industry: {
      type: String,
      maxlength: 100,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    foundedYear: {
      type: Number,
    },
    website: {
      type: String,
      maxlength: 255,
    },
    gstNumber: {
      type: String,
      maxlength: 20,
    },
    panNumber: {
      type: String,
      maxlength: 10,
    },
    address: {
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
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    contactEmail: {
      type: String,
      maxlength: 255,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      maxlength: 15,
    },
    logoUrl: {
      type: String,
      maxlength: 500,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocuments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    totalJobsPosted: {
      type: Number,
      default: 0,
    },
    totalHires: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
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

// Indexes
employerSchema.index({ companyName: 1 });
employerSchema.index({ companyType: 1 });
employerSchema.index({ city: 1 });
employerSchema.index({ state: 1 });
employerSchema.index({ isVerified: 1 });
employerSchema.index({ industry: 1 });
employerSchema.index({ location: "2dsphere" });

// Virtual for user
employerSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Get location for distance calculations
employerSchema.methods.getLocation = function () {
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
employerSchema.methods.setLocation = function (lat, lng) {
  this.location = {
    type: "Point",
    coordinates: [lng, lat],
  };
};

// Update job statistics
employerSchema.methods.incrementJobCount = async function () {
  this.totalJobsPosted += 1;
  await this.save();
};

employerSchema.methods.incrementHireCount = async function () {
  this.totalHires += 1;
  await this.save();
};

// Update rating
employerSchema.methods.updateRating = async function (newRating) {
  const totalRating = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = Number((totalRating / this.ratingCount).toFixed(1));
  await this.save();
};

const Employer = mongoose.model("Employer", employerSchema);

module.exports = Employer;
