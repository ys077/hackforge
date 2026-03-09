const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");
const {
  authenticate,
  workerOnly,
  loadWorkerProfile,
} = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");

// All routes require authentication and worker role
router.use(authenticate, workerOnly, loadWorkerProfile);

/**
 * @route GET /api/workers/profile
 * @desc Get worker profile
 * @access Private (Worker)
 */
router.get("/profile", workerController.getProfile);

/**
 * @route PUT /api/workers/profile
 * @desc Update worker profile
 * @access Private (Worker)
 */
router.put(
  "/profile",
  validate(schemas.worker.updateProfile),
  workerController.updateProfile,
);

/**
 * @route PUT /api/workers/location
 * @desc Update worker location
 * @access Private (Worker)
 */
router.put(
  "/location",
  validate(schemas.worker.updateLocation),
  workerController.updateLocation,
);

/**
 * @route PUT /api/workers/skills
 * @desc Update worker skills
 * @access Private (Worker)
 */
router.put(
  "/skills",
  validate(schemas.worker.updateSkills),
  workerController.updateSkills,
);

/**
 * @route PUT /api/workers/availability
 * @desc Update availability
 * @access Private (Worker)
 */
router.put(
  "/availability",
  validate(schemas.worker.updateAvailability),
  workerController.updateAvailability,
);

/**
 * @route GET /api/workers/applications
 * @desc Get worker's applications
 * @access Private (Worker)
 */
router.get("/applications", workerController.getApplications);

/**
 * @route GET /api/workers/trust-score
 * @desc Get worker's trust score
 * @access Private (Worker)
 */
router.get("/trust-score", workerController.getTrustScore);

/**
 * @route GET /api/workers/dashboard
 * @desc Get worker dashboard data
 * @access Private (Worker)
 */
router.get("/dashboard", workerController.getDashboard);

module.exports = router;
