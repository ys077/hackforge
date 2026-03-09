const express = require("express");
const router = express.Router();
const employerController = require("../controllers/employerController");
const {
  authenticate,
  employerOnly,
  loadEmployerProfile,
} = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");
const { uploadLogo } = require("../middleware/upload");

// All routes require authentication and employer role
router.use(authenticate, employerOnly, loadEmployerProfile);

/**
 * @route GET /api/employers/profile
 * @desc Get employer profile
 * @access Private (Employer)
 */
router.get("/profile", employerController.getProfile);

/**
 * @route PUT /api/employers/profile
 * @desc Update employer profile
 * @access Private (Employer)
 */
router.put(
  "/profile",
  validate(schemas.employer.updateProfile),
  employerController.updateProfile,
);

/**
 * @route PUT /api/employers/logo
 * @desc Update company logo
 * @access Private (Employer)
 */
router.put("/logo", uploadLogo, employerController.updateLogo);

/**
 * @route GET /api/employers/dashboard
 * @desc Get employer dashboard
 * @access Private (Employer)
 */
router.get("/dashboard", employerController.getDashboard);

/**
 * @route GET /api/employers/statistics
 * @desc Get employer statistics
 * @access Private (Employer)
 */
router.get("/statistics", employerController.getStatistics);

/**
 * @route GET /api/employers/candidates/search
 * @desc Search candidates
 * @access Private (Employer)
 */
router.get("/candidates/search", employerController.searchCandidates);

module.exports = router;
