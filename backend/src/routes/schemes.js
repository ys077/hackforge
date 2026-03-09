const express = require("express");
const router = express.Router();
const schemeController = require("../controllers/schemeController");
const {
  authenticate,
  workerOnly,
  loadWorkerProfile,
} = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");
const { authorize } = require("../middleware/auth");

/**
 * Admin routes
 */

/**
 * @route POST /api/schemes/scrape
 * @desc Trigger AI scheme scraping
 * @access Private (Admin)
 */
router.post(
  "/scrape",
  authenticate,
  authorize("admin"),
  schemeController.triggerScrape,
);

/**
 * Public routes
 */

/**
 * @route GET /api/schemes
 * @desc Get all schemes
 * @access Public
 */
router.get("/", schemeController.getSchemes);

/**
 * @route GET /api/schemes/track/:referenceNumber
 * @desc Track application by reference number
 * @access Public
 */
router.get("/track/:referenceNumber", schemeController.trackApplication);

/**
 * @route GET /api/schemes/:id
 * @desc Get scheme by ID
 * @access Public
 */
router.get("/:id", schemeController.getScheme);

/**
 * Worker routes
 */

/**
 * @route GET /api/schemes/worker/eligible
 * @desc Get eligible schemes
 * @access Private (Worker)
 */
router.get(
  "/worker/eligible",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  schemeController.getEligibleSchemes,
);

/**
 * @route POST /api/schemes/:id/apply
 * @desc Apply for scheme
 * @access Private (Worker)
 */
router.post(
  "/:id/apply",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  validate(schemas.scheme.apply),
  schemeController.applyForScheme,
);

/**
 * @route GET /api/schemes/applications
 * @desc Get worker's applications
 * @access Private (Worker)
 */
router.get(
  "/worker/applications",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  schemeController.getMyApplications,
);

/**
 * @route GET /api/schemes/applications/:id
 * @desc Get application details
 * @access Private (Worker)
 */
router.get(
  "/applications/:id",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  schemeController.getApplicationDetails,
);

/**
 * @route PUT /api/schemes/applications/:id
 * @desc Update draft application
 * @access Private (Worker)
 */
router.put(
  "/applications/:id",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  validate(schemas.scheme.update),
  schemeController.updateApplication,
);

/**
 * @route PUT /api/schemes/applications/:id/submit
 * @desc Submit application
 * @access Private (Worker)
 */
router.put(
  "/applications/:id/submit",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  schemeController.submitApplication,
);

module.exports = router;
