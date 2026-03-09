/**
 * Application Constants
 */

// User roles
const USER_ROLES = {
  WORKER: "worker",
  EMPLOYER: "employer",
  ADMIN: "admin",
};

// Supported languages
const LANGUAGES = {
  ENGLISH: "en",
  HINDI: "hi",
  TAMIL: "ta",
  TELUGU: "te",
  KANNADA: "kn",
  MARATHI: "mr",
  BENGALI: "bn",
  GUJARATI: "gu",
};

// Document types
const DOCUMENT_TYPES = {
  AADHAAR: "aadhaar",
  PAN: "pan",
  PASSBOOK: "passbook",
  CERTIFICATE: "certificate",
  PHOTO: "photo",
  VOTER_ID: "voter_id",
  DRIVING_LICENSE: "driving_license",
};

// Document verification status
const VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

// Education levels
const EDUCATION_LEVELS = {
  NONE: "none",
  PRIMARY: "primary",
  SECONDARY: "secondary",
  HIGHER_SECONDARY: "higher_secondary",
  GRADUATE: "graduate",
  POST_GRADUATE: "post_graduate",
};

// Job types
const JOB_TYPES = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  CONTRACT: "contract",
  GIG: "gig",
  INTERNSHIP: "internship",
};

// Job status
const JOB_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CLOSED: "closed",
  EXPIRED: "expired",
  DRAFT: "draft",
};

// Application status
const APPLICATION_STATUS = {
  PENDING: "pending",
  SHORTLISTED: "shortlisted",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  SELECTED: "selected",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
};

// Interview status
const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  RESCHEDULED: "rescheduled",
};

// Interview slot status
const SLOT_STATUS = {
  AVAILABLE: "available",
  BOOKED: "booked",
  CANCELLED: "cancelled",
};

// Interview types
const INTERVIEW_TYPES = {
  IN_PERSON: "in_person",
  PHONE: "phone",
  VIDEO: "video",
};

// Scheme application status
const SCHEME_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  DOCUMENTS_REQUIRED: "documents_required",
};

// Notification types
const NOTIFICATION_TYPES = {
  JOB_ALERT: "job_alert",
  APPLICATION_UPDATE: "application_update",
  INTERVIEW_REMINDER: "interview_reminder",
  SCHEME_UPDATE: "scheme_update",
  DOCUMENT_VERIFIED: "document_verified",
  PROFILE_UPDATE: "profile_update",
  SYSTEM: "system",
};

// Notification channels
const NOTIFICATION_CHANNELS = {
  PUSH: "push",
  SMS: "sms",
  EMAIL: "email",
  IN_APP: "in_app",
};

// Salary types
const SALARY_TYPES = {
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

// Gender options
const GENDERS = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

// Employer types
const EMPLOYER_TYPES = {
  INDIVIDUAL: "individual",
  STARTUP: "startup",
  SME: "sme",
  CORPORATE: "corporate",
  NGO: "ngo",
  GOVERNMENT: "government",
};

// Trust score thresholds
const TRUST_SCORE_THRESHOLDS = {
  VERY_LOW: 20,
  LOW: 40,
  MEDIUM: 60,
  HIGH: 80,
  VERY_HIGH: 100,
};

// Cache keys
const CACHE_KEYS = {
  USER: "user",
  JOB: "job",
  JOBS_LIST: "jobs_list",
  SCHEMES_LIST: "schemes_list",
  WORKER_PROFILE: "worker_profile",
  EMPLOYER_PROFILE: "employer_profile",
  TRUST_SCORE: "trust_score",
  JOB_MATCHES: "job_matches",
  SCHEME_MATCHES: "scheme_matches",
  STATISTICS: "statistics",
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  PHOTO: 5 * 1024 * 1024, // 5MB
  RESUME: 5 * 1024 * 1024, // 5MB
  MAX_TOTAL: 50 * 1024 * 1024, // 50MB
};

// Supported file types
const ALLOWED_FILE_TYPES = {
  IMAGES: ["image/jpeg", "image/jpg", "image/png"],
  DOCUMENTS: ["application/pdf"],
  ALL: ["image/jpeg", "image/jpg", "image/png", "application/pdf"],
};

// Default pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Distance (in km)
const DISTANCE = {
  DEFAULT_RADIUS: 10,
  MAX_RADIUS: 100,
};

// API Rate limits
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  },
  OTP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
  },
};

// Socket events
const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  NOTIFICATION: "notification",
  JOB_UPDATE: "job_update",
  APPLICATION_UPDATE: "application_update",
  INTERVIEW_UPDATE: "interview_update",
  ERROR: "error",
};

// Common Indian states
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
];

module.exports = {
  USER_ROLES,
  LANGUAGES,
  DOCUMENT_TYPES,
  VERIFICATION_STATUS,
  EDUCATION_LEVELS,
  JOB_TYPES,
  JOB_STATUS,
  APPLICATION_STATUS,
  INTERVIEW_STATUS,
  SLOT_STATUS,
  INTERVIEW_TYPES,
  SCHEME_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  SALARY_TYPES,
  GENDERS,
  EMPLOYER_TYPES,
  TRUST_SCORE_THRESHOLDS,
  CACHE_KEYS,
  CACHE_TTL,
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_TYPES,
  PAGINATION,
  DISTANCE,
  RATE_LIMITS,
  SOCKET_EVENTS,
  INDIAN_STATES,
};
