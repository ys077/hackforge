const mongoose = require("mongoose");
const { connectDatabase, isConnected } = require("../config/database");

// Import all models
const User = require("./User");
const Worker = require("./Worker");
const Employer = require("./Employer");
const Skill = require("./Skill");
const Job = require("./Job");
const Application = require("./Application");
const GovernmentScheme = require("./GovernmentScheme");
const SchemeApplication = require("./SchemeApplication");
const Document = require("./Document");
const Resume = require("./Resume");
const TrustScore = require("./TrustScore");
const Notification = require("./Notification");
const InterviewSlot = require("./InterviewSlot");
const InterviewBooking = require("./InterviewBooking");

// =====================
// MONGOOSE MODELS
// =====================
// Note: In MongoDB/Mongoose, relationships are defined through:
// - ObjectId references (ref) in schemas
// - Virtual population using .populate()
// - No explicit associations needed like Sequelize
//
// Relationships summary:
// - User 1:1 Worker (via userId ref)
// - User 1:1 Employer (via userId ref)
// - Employer 1:M Job (via employerId ref)
// - Worker 1:M Document (via workerId ref)
// - Worker 1:M Resume (via workerId ref)
// - Worker 1:1 TrustScore (via workerId ref)
// - Worker 1:M Application (via workerId ref)
// - Job 1:M Application (via jobId ref)
// - Resume 1:M Application (via resumeId ref)
// - Worker 1:M SchemeApplication (via workerId ref)
// - GovernmentScheme 1:M SchemeApplication (via schemeId ref)
// - User 1:M Notification (via userId ref)
// - Job 1:M InterviewSlot (via jobId ref)
// - Employer 1:M InterviewSlot (via employerId ref)
// - Worker 1:M InterviewBooking (via workerId ref)
// - InterviewSlot 1:M InterviewBooking (via slotId ref)
// - Application 1:1 InterviewBooking (via applicationId ref)

// Export all models and connection utilities
module.exports = {
  mongoose,
  connectDatabase,
  isConnected,
  User,
  Worker,
  Employer,
  Skill,
  Job,
  Application,
  GovernmentScheme,
  SchemeApplication,
  Document,
  Resume,
  TrustScore,
  Notification,
  InterviewSlot,
  InterviewBooking,
};
