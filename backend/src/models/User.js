const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[6-9]\d{9}$/,
    },
    name: {
      type: String,
      maxlength: 100,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: ["worker", "employer", "admin"],
      default: "worker",
      required: true,
    },
    language: {
      type: String,
      default: "en",
      maxlength: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    fcmToken: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for worker profile
userSchema.virtual("workerProfile", {
  ref: "Worker",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// Virtual for employer profile
userSchema.virtual("employerProfile", {
  ref: "Employer",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// Instance methods
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.validatePassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return otp;
};

userSchema.methods.verifyOTP = function (otp) {
  if (!this.otp || !this.otpExpiresAt) return false;
  if (new Date() > this.otpExpiresAt) return false;
  return this.otp === otp;
};

userSchema.methods.clearOTP = function () {
  this.otp = null;
  this.otpExpiresAt = null;
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.otpExpiresAt;
  delete obj.refreshToken;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;

// Static methods
User.findByPhone = async function (phone) {
  return this.findOne({ where: { phone } });
};

User.findByEmail = async function (email) {
  return this.findOne({ where: { email } });
};

module.exports = User;
