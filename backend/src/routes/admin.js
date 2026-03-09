const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const schemeController = require("../controllers/schemeController");
const documentController = require("../controllers/documentController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");

// All admin routes require authentication and admin role
router.use(authenticate, authorize("admin"));

/**
 * Dashboard
 */
router.get("/dashboard", adminController.getDashboard);
router.get("/analytics", adminController.getAnalytics);

/**
 * User management
 */
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserDetails);
router.put("/users/:id/status", adminController.updateUserStatus);

/**
 * Job management
 */
router.get("/jobs", adminController.getJobs);
router.put("/jobs/:id/status", adminController.updateJobStatus);

/**
 * Employer management
 */
router.get("/employers", adminController.getEmployers);
router.put("/employers/:id/verify", adminController.verifyEmployer);

/**
 * Document verification
 */
router.get("/documents/pending", documentController.getPendingDocuments);
router.put("/documents/:id/verify", documentController.manualVerify);

/**
 * Scheme management
 */
router.post(
  "/schemes",
  validate(schemas.scheme.create),
  schemeController.createScheme,
);
router.put(
  "/schemes/:id",
  validate(schemas.scheme.update),
  schemeController.updateScheme,
);
router.put(
  "/schemes/applications/:id/review",
  schemeController.reviewApplication,
);
router.get("/schemes/:id/statistics", schemeController.getSchemeStatistics);

module.exports = router;
