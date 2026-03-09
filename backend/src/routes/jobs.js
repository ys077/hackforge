const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const {
  authenticate,
  authorize,
  workerOnly,
  employerOnly,
  loadWorkerProfile,
  loadEmployerProfile,
} = require("../middleware/auth");
const { searchLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../utils/validators");

/**
 * @route POST /api/jobs/scrape
 * @desc Trigger AI job scraping
 * @access Private (Admin)
 */
router.post(
  "/scrape",
  authenticate,
  authorize("admin"),
  jobController.triggerScrape
);

/**
 * Public routes
 */

/**
 * @route GET /api/jobs
 * @desc Search jobs
 * @access Public
 */
router.get(
  "/",
  searchLimiter,
  validate(schemas.job.search, "query"),
  jobController.searchJobs,
);

/**
 * @route GET /api/jobs/:id
 * @desc Get job by ID
 * @access Public (enhanced for authenticated workers)
 */
router.get(
  "/:id",
  authenticate.optional,
  loadWorkerProfile.optional,
  jobController.getJob,
);

/**
 * Worker routes
 */

/**
 * @route GET /api/jobs/recommended
 * @desc Get recommended jobs
 * @access Private (Worker)
 */
router.get(
  "/worker/recommended",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  jobController.getRecommendedJobs,
);

/**
 * @route POST /api/jobs/:id/apply
 * @desc Apply to a job
 * @access Private (Worker)
 */
router.post(
  "/:id/apply",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  validate(schemas.job.apply),
  jobController.applyToJob,
);

/**
 * Employer routes
 */

/**
 * @route POST /api/jobs
 * @desc Create a job
 * @access Private (Employer)
 */
router.post(
  "/",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  validate(schemas.job.create),
  jobController.createJob,
);

/**
 * @route PUT /api/jobs/:id
 * @desc Update a job
 * @access Private (Employer)
 */
router.put(
  "/:id",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  validate(schemas.job.update),
  jobController.updateJob,
);

/**
 * @route GET /api/jobs/employer/my-jobs
 * @desc Get employer's jobs
 * @access Private (Employer)
 */
router.get(
  "/employer/my-jobs",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  jobController.getEmployerJobs,
);

/**
 * @route PUT /api/jobs/:id/close
 * @desc Close a job
 * @access Private (Employer)
 */
router.put(
  "/:id/close",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  jobController.closeJob,
);

/**
 * @route GET /api/jobs/:id/applications
 * @desc Get job applications
 * @access Private (Employer)
 */
router.get(
  "/:id/applications",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  jobController.getJobApplications,
);

/**
 * @route PUT /api/applications/:id/status
 * @desc Update application status
 * @access Private (Employer)
 */
router.put(
  "/applications/:id/status",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  validate(schemas.job.updateApplicationStatus),
  jobController.updateApplicationStatus,
);

module.exports = router;
