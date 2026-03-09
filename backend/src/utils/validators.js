const Joi = require("joi");

// Common validation patterns
const patterns = {
  phone: /^[6-9]\d{9}$/, // Indian mobile number
  pincode: /^\d{6}$/,
  aadhaar: /^\d{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  otp: /^\d{6}$/,
  mongoId: /^[0-9a-fA-F]{24}$/,
};

// Common validation schemas
const schemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),

  // Auth schemas (grouped)
  auth: {
    sendOTP: Joi.object({
      phone: Joi.string().pattern(patterns.phone).required().messages({
        "string.pattern.base":
          "Please enter a valid 10-digit Indian mobile number",
      }),
    }),
    verifyOTP: Joi.object({
      phone: Joi.string().pattern(patterns.phone).required(),
      otp: Joi.string().pattern(patterns.otp).required().messages({
        "string.pattern.base": "Please enter a valid 6-digit OTP",
      }),
    }),
    completeProfile: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      role: Joi.string().valid("worker", "employer").required(),
      language: Joi.string()
        .valid("en", "hi", "ta", "te", "kn", "mr", "bn", "gu")
        .default("en"),
    }),
    refreshToken: Joi.object({
      refreshToken: Joi.string().required(),
    }),
    updateFCM: Joi.object({
      fcmToken: Joi.string().required(),
    }),
  },

  // Worker schemas (grouped)
  worker: {
    updateProfile: Joi.object({
      age: Joi.number().integer().min(18).max(80),
      gender: Joi.string().valid("male", "female", "other"),
      occupation: Joi.string().max(100),
      education: Joi.string().valid(
        "none",
        "primary",
        "secondary",
        "higher_secondary",
        "graduate",
        "post_graduate",
      ),
      experienceYears: Joi.number().integer().min(0).max(50),
      languagesKnown: Joi.array().items(Joi.string().max(20)).max(10),
      bio: Joi.string().max(500),
    }),
    updateLocation: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(500),
    }),
    updateSkills: Joi.object({
      skills: Joi.array().items(Joi.string().max(50)).max(20).required(),
    }),
    updateAvailability: Joi.object({
      isAvailable: Joi.boolean().required(),
      availableFrom: Joi.date(),
      availableTo: Joi.date(),
    }),
  },

  // Document schemas (grouped)
  document: {
    upload: Joi.object({
      documentType: Joi.string()
        .valid("aadhaar", "pan", "passbook", "certificate", "photo")
        .required(),
    }),
  },

  // Scheme schemas (grouped)
  scheme: {
    apply: Joi.object({
      schemeId: Joi.string().pattern(patterns.mongoId).required(),
      documents: Joi.array().items(Joi.string().pattern(patterns.mongoId)),
    }),
    update: Joi.object({
      status: Joi.string().valid("pending", "approved", "rejected"),
      remarks: Joi.string().max(500),
    }),
    create: Joi.object({
      name: Joi.string().min(5).max(200).required(),
      description: Joi.string().min(20).max(2000).required(),
      schemeType: Joi.string().valid("central", "state", "local").required(),
      benefitType: Joi.string()
        .valid("financial", "insurance", "training", "loan", "other")
        .required(),
      benefitAmountMax: Joi.number().positive(),
      minAge: Joi.number().integer().min(0).max(120),
      maxAge: Joi.number().integer().min(0).max(120),
      genderEligibility: Joi.string().valid("all", "male", "female", "other"),
      requiredDocuments: Joi.array().items(Joi.string()),
      eligibilityRules: Joi.object(),
      isActive: Joi.boolean().default(true),
    }),
  },

  // Job schemas (grouped)
  job: {
    search: Joi.object({
      q: Joi.string().min(1).max(200),
      skills: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string(),
      ),
      education: Joi.string(),
      jobType: Joi.string().valid("full_time", "part_time", "contract", "gig"),
      salaryMin: Joi.number().positive(),
      salaryMax: Joi.number().positive(),
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
      radius: Joi.number().positive().max(100),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
    apply: Joi.object({
      jobId: Joi.string().pattern(patterns.mongoId).required(),
      coverNote: Joi.string().max(1000),
      resumeId: Joi.string().pattern(patterns.mongoId),
    }),
    create: Joi.object({
      title: Joi.string().min(5).max(200).required(),
      description: Joi.string().min(20).max(5000).required(),
      skillsRequired: Joi.array()
        .items(Joi.string().max(50))
        .min(1)
        .max(20)
        .required(),
      educationRequired: Joi.string().valid(
        "none",
        "primary",
        "secondary",
        "higher_secondary",
        "graduate",
        "post_graduate",
      ),
      experienceMin: Joi.number().integer().min(0).max(50).default(0),
      experienceMax: Joi.number().integer().min(0).max(50),
      salaryMin: Joi.number().positive(),
      salaryMax: Joi.number().positive(),
      salaryType: Joi.string().valid("hourly", "daily", "weekly", "monthly"),
      jobType: Joi.string()
        .valid("full_time", "part_time", "contract", "gig")
        .required(),
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      locationAddress: Joi.string().max(500),
      vacancies: Joi.number().integer().min(1).default(1),
      expiresAt: Joi.date().greater("now"),
    }),
    update: Joi.object({
      title: Joi.string().min(5).max(200),
      description: Joi.string().min(20).max(5000),
      skillsRequired: Joi.array().items(Joi.string().max(50)).min(1).max(20),
      status: Joi.string().valid("active", "closed", "filled"),
      vacancies: Joi.number().integer().min(0),
    }),
    updateApplicationStatus: Joi.object({
      status: Joi.string()
        .valid("pending", "shortlisted", "interview", "hired", "rejected")
        .required(),
      remarks: Joi.string().max(500),
    }),
  },

  // Resume schemas (grouped)
  resume: {
    generate: Joi.object({
      templateId: Joi.string(),
      language: Joi.string()
        .valid("en", "hi", "ta", "te", "kn", "mr", "bn", "gu")
        .default("en"),
    }),
    create: Joi.object({
      title: Joi.string().min(2).max(100).required(),
      content: Joi.object().required(),
      templateId: Joi.string(),
    }),
    update: Joi.object({
      title: Joi.string().min(2).max(100),
      content: Joi.object(),
      isActive: Joi.boolean(),
    }),
    analyze: Joi.object({
      resumeId: Joi.string().pattern(patterns.mongoId).required(),
      jobDescription: Joi.string().max(5000),
    }),
    translate: Joi.object({
      resumeId: Joi.string().pattern(patterns.mongoId).required(),
      targetLanguage: Joi.string()
        .valid("en", "hi", "ta", "te", "kn", "mr", "bn", "gu")
        .required(),
    }),
  },

  // Employer schemas (grouped)
  employer: {
    updateProfile: Joi.object({
      companyName: Joi.string().min(2).max(200),
      companyType: Joi.string().valid(
        "individual",
        "startup",
        "sme",
        "corporate",
        "ngo",
      ),
      gstNumber: Joi.string().max(20),
      address: Joi.string().max(500),
      contactEmail: Joi.string().email(),
      contactPhone: Joi.string().pattern(patterns.phone),
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
      website: Joi.string().uri(),
      description: Joi.string().max(1000),
    }),
  },

  // Interview schemas (grouped)
  interview: {
    book: Joi.object({
      slotId: Joi.string().pattern(patterns.mongoId).required(),
    }),
    reschedule: Joi.object({
      newSlotId: Joi.string().pattern(patterns.mongoId).required(),
      reason: Joi.string().max(500),
    }),
    createSlots: Joi.object({
      jobId: Joi.string().pattern(patterns.mongoId).required(),
      slots: Joi.array()
        .items(
          Joi.object({
            startTime: Joi.date().greater("now").required(),
            endTime: Joi.date().greater(Joi.ref("startTime")).required(),
            maxBookings: Joi.number().integer().min(1).default(1),
            location: Joi.string().max(500),
            type: Joi.string()
              .valid("in_person", "phone", "video")
              .default("in_person"),
          }),
        )
        .min(1)
        .required(),
    }),
    complete: Joi.object({
      status: Joi.string()
        .valid("completed", "no_show", "cancelled")
        .required(),
      feedback: Joi.string().max(1000),
      rating: Joi.number().min(1).max(5),
    }),
    cancel: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  // Legacy schemas (for backward compatibility)
  userRegistration: Joi.object({
    phone: Joi.string().pattern(patterns.phone).required().messages({
      "string.pattern.base":
        "Please enter a valid 10-digit Indian mobile number",
    }),
    name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid("worker", "employer").required(),
    language: Joi.string()
      .valid("en", "hi", "ta", "te", "kn", "mr", "bn", "gu")
      .default("en"),
  }),

  // OTP verification (legacy)
  otpVerification: Joi.object({
    phone: Joi.string().pattern(patterns.phone).required(),
    otp: Joi.string().pattern(patterns.otp).required().messages({
      "string.pattern.base": "Please enter a valid 6-digit OTP",
    }),
  }),

  // Location query
  locationQuery: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().positive().max(100).default(10),
  }),

  // Search query
  searchQuery: Joi.object({
    q: Joi.string().min(1).max(200),
    skills: Joi.array().items(Joi.string()),
    education: Joi.string(),
    jobType: Joi.string(),
    salary_min: Joi.number().positive(),
    salary_max: Joi.number().positive(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radius: Joi.number().positive().max(100),
  }),
};

// Express middleware factory for route validation
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: errors,
        },
      });
    }

    req[source] = value;
    next();
  };
};

// Helper function for manual validation
const validateData = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return { valid: false, errors, value: null };
  }

  return { valid: true, errors: null, value };
};

// Alias for backward compatibility
const validateRequest = validate;

// Individual validators
const validators = {
  isValidPhone: (phone) => patterns.phone.test(phone),
  isValidAadhaar: (aadhaar) => patterns.aadhaar.test(aadhaar),
  isValidPAN: (pan) => patterns.pan.test(pan),
  isValidPincode: (pincode) => patterns.pincode.test(pincode),
  isValidUUID: (uuid) => patterns.uuid.test(uuid),
  isValidOTP: (otp) => patterns.otp.test(otp),

  isValidEmail: (email) => {
    const result = Joi.string().email().validate(email);
    return !result.error;
  },

  isValidCoordinates: (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  sanitizeString: (str) => {
    if (typeof str !== "string") return str;
    return str.trim().replace(/[<>]/g, "");
  },

  sanitizePhone: (phone) => {
    if (typeof phone !== "string") return phone;
    return phone.replace(/\D/g, "").slice(-10);
  },
};

module.exports = {
  patterns,
  schemas,
  validate,
  validateData,
  validateRequest,
  validators,
};
