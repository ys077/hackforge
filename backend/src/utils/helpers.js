const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * Generate a unique UUID
 */
const generateUUID = () => uuidv4();

/**
 * Generate OTP of specified length
 */
const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Generate secure random string
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Generate reference number for applications
 */
const generateReferenceNumber = (prefix = "HF") => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Hash a string using SHA256
 */
const hashString = (str) => {
  return crypto.createHash("sha256").update(str).digest("hex");
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

/**
 * Format pagination response
 */
const formatPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Sleep function for delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Format currency for Indian Rupees
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date to readable string
 */
const formatDate = (date, locale = "en-IN") => {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format datetime to readable string
 */
const formatDateTime = (date, locale = "en-IN") => {
  return new Date(date).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Get time ago string
 */
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};

/**
 * Mask sensitive data
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return "****";
  return phone.slice(0, 2) + "****" + phone.slice(-2);
};

const maskAadhaar = (aadhaar) => {
  if (!aadhaar || aadhaar.length < 4) return "****";
  return "XXXX-XXXX-" + aadhaar.slice(-4);
};

const maskEmail = (email) => {
  if (!email) return "****";
  const [name, domain] = email.split("@");
  const maskedName = name.slice(0, 2) + "***";
  return `${maskedName}@${domain}`;
};

/**
 * Parse skills string to array
 */
const parseSkills = (skillsInput) => {
  if (Array.isArray(skillsInput)) return skillsInput;
  if (typeof skillsInput === "string") {
    return skillsInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  }
  return [];
};

/**
 * Calculate match score between two skill arrays
 */
const calculateSkillMatch = (required, available) => {
  if (!required || required.length === 0) return 100;
  if (!available || available.length === 0) return 0;

  const requiredSet = new Set(required.map((s) => s.toLowerCase()));
  const availableSet = new Set(available.map((s) => s.toLowerCase()));

  let matchCount = 0;
  for (const skill of requiredSet) {
    if (availableSet.has(skill)) {
      matchCount++;
    }
  }

  return Math.round((matchCount / requiredSet.size) * 100);
};

/**
 * Education level comparison
 */
const EDUCATION_LEVELS = {
  none: 0,
  primary: 1,
  secondary: 2,
  higher_secondary: 3,
  graduate: 4,
  post_graduate: 5,
};

const compareEducation = (required, available) => {
  const requiredLevel = EDUCATION_LEVELS[required] || 0;
  const availableLevel = EDUCATION_LEVELS[available] || 0;
  return availableLevel >= requiredLevel;
};

/**
 * Deep clone an object
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Pick specific keys from object
 */
const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Omit specific keys from object
 */
const omit = (obj, keys) => {
  const keysSet = new Set(keys);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!keysSet.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Check if value is empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Title case a string
 */
const titleCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
};

/**
 * Chunk array into smaller arrays
 */
const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

module.exports = {
  generateUUID,
  generateOTP,
  generateSecureToken,
  generateReferenceNumber,
  hashString,
  calculateDistance,
  paginate,
  formatPaginationResponse,
  sleep,
  retry,
  formatCurrency,
  formatDate,
  formatDateTime,
  timeAgo,
  maskPhone,
  maskAadhaar,
  maskEmail,
  parseSkills,
  calculateSkillMatch,
  EDUCATION_LEVELS,
  compareEducation,
  deepClone,
  pick,
  omit,
  isEmpty,
  capitalize,
  titleCase,
  chunk,
};
