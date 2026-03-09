const Joi = require("joi");

// Common validation patterns
const patterns = {
  phone: /^[6-9]\d{9}$/, // Indian mobile number
  pincode: /^\d{6}$/,
  aadhaar: /^\d{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  otp: /^\d{6}$/,
};

// Common validation schemas
const schemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default("created_at"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),

  // User registration
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

  // OTP verification
  otpVerification: Joi.object({
    phone: Joi.string().pattern(patterns.phone).required(),
    otp: Joi.string().pattern(patterns.otp).required().messages({
      "string.pattern.base": "Please enter a valid 6-digit OTP",
    }),
  }),

  // Worker profile
  workerProfile: Joi.object({
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
    experience_years: Joi.number().integer().min(0).max(50),
    location_lat: Joi.number().min(-90).max(90),
    location_lng: Joi.number().min(-180).max(180),
    skills: Joi.array().items(Joi.string().max(50)).max(20),
    languages_known: Joi.array().items(Joi.string().max(20)).max(10),
  }),

  // Employer profile
  employerProfile: Joi.object({
    company_name: Joi.string().min(2).max(200).required(),
    company_type: Joi.string()
      .valid("individual", "startup", "sme", "corporate", "ngo")
      .required(),
    gst_number: Joi.string().max(20),
    address: Joi.string().max(500),
    contact_email: Joi.string().email(),
    contact_phone: Joi.string().pattern(patterns.phone),
    location_lat: Joi.number().min(-90).max(90),
    location_lng: Joi.number().min(-180).max(180),
  }),

  // Job creation
  jobCreation: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(20).max(5000).required(),
    skills_required: Joi.array()
      .items(Joi.string().max(50))
      .min(1)
      .max(20)
      .required(),
    education_required: Joi.string().valid(
      "none",
      "primary",
      "secondary",
      "higher_secondary",
      "graduate",
      "post_graduate",
    ),
    experience_min: Joi.number().integer().min(0).max(50).default(0),
    experience_max: Joi.number().integer().min(0).max(50),
    salary_min: Joi.number().positive(),
    salary_max: Joi.number().positive(),
    salary_type: Joi.string().valid("hourly", "daily", "weekly", "monthly"),
    job_type: Joi.string()
      .valid("full_time", "part_time", "contract", "gig")
      .required(),
    location_lat: Joi.number().min(-90).max(90).required(),
    location_lng: Joi.number().min(-180).max(180).required(),
    location_address: Joi.string().max(500),
    vacancies: Joi.number().integer().min(1).default(1),
    expires_at: Joi.date().greater("now"),
  }),

  // Document upload
  documentUpload: Joi.object({
    document_type: Joi.string()
      .valid("aadhaar", "pan", "passbook", "certificate", "photo")
      .required(),
  }),

  // Interview slot
  interviewSlot: Joi.object({
    job_id: Joi.string().uuid().required(),
    start_time: Joi.date().greater("now").required(),
    end_time: Joi.date().greater(Joi.ref("start_time")).required(),
    max_bookings: Joi.number().integer().min(1).default(1),
    location: Joi.string().max(500),
    type: Joi.string()
      .valid("in_person", "phone", "video")
      .default("in_person"),
  }),

  // Application
  jobApplication: Joi.object({
    job_id: Joi.string().uuid().required(),
    cover_note: Joi.string().max(1000),
    resume_id: Joi.string().uuid(),
  }),

  // Scheme application
  schemeApplication: Joi.object({
    scheme_id: Joi.string().uuid().required(),
    documents: Joi.array().items(Joi.string().uuid()),
  }),

  // Location query
  locationQuery: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().positive().max(100).default(10), // km
  }),

  // Search query
  searchQuery: Joi.object({
    q: Joi.string().min(1).max(200),
    skills: Joi.array().items(Joi.string()),
    education: Joi.string(),
    job_type: Joi.string(),
    salary_min: Joi.number().positive(),
    salary_max: Joi.number().positive(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radius: Joi.number().positive().max(100),
  }),
};

// Validate function wrapper
const validate = (schema, data) => {
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

// Express middleware factory
const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const { valid, errors, value } = validate(schema, req[source]);

    if (!valid) {
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
  validateRequest,
  validators,
};
