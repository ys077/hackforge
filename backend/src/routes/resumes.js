const express = require("express");
const router = express.Router();
const resumeController = require("../controllers/resumeController");
const {
  authenticate,
  workerOnly,
  loadWorkerProfile,
} = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");

// All routes require authentication and worker role
router.use(authenticate, workerOnly, loadWorkerProfile);

/**
 * @route POST /api/resumes/generate
 * @desc Generate resume from profile
 * @access Private (Worker)
 */
router.post(
  "/generate",
  // validate(schemas.resume.generate), // disabled temporarily for new schema fields
  resumeController.generateResume,
);

/**
 * @route POST /api/resumes/parse-linkedin
 * @desc Extract data from LinkedIn
 * @access Private (Worker)
 */
router.post(
  "/parse-linkedin",
  resumeController.parseLinkedIn,
);

/**
 * @route POST /api/resumes/parse-certificate
 * @desc Parse certificate image
 * @access Private (Worker)
 */
router.post(
  "/parse-certificate",
  resumeController.parseCertificate,
);

/**
 * @route POST /api/resumes
 * @desc Create resume manually
 * @access Private (Worker)
 */
router.post(
  "/",
  validate(schemas.resume.create),
  resumeController.createResume,
);

/**
 * @route GET /api/resumes
 * @desc Get worker's resumes
 * @access Private (Worker)
 */
router.get("/", resumeController.getResumes);

/**
 * @route GET /api/resumes/primary
 * @desc Get primary resume
 * @access Private (Worker)
 */
router.get("/primary", resumeController.getPrimaryResume);

/**
 * @route GET /api/resumes/:id
 * @desc Get resume by ID
 * @access Private (Worker)
 */
router.get("/:id", resumeController.getResume);

/**
 * @route PUT /api/resumes/:id
 * @desc Update resume
 * @access Private (Worker)
 */
router.put(
  "/:id",
  validate(schemas.resume.update),
  resumeController.updateResume,
);

/**
 * @route PUT /api/resumes/:id/primary
 * @desc Set as primary
 * @access Private (Worker)
 */
router.put("/:id/primary", resumeController.setPrimaryResume);

/**
 * @route DELETE /api/resumes/:id
 * @desc Delete resume
 * @access Private (Worker)
 */
router.delete("/:id", resumeController.deleteResume);

/**
 * @route POST /api/resumes/:id/enhance
 * @desc Enhance resume using AI
 * @access Private (Worker)
 */
router.post("/:id/enhance", resumeController.enhanceResume);

/**
 * @route POST /api/resumes/:id/analyze
 * @desc Analyze resume against job
 * @access Private (Worker)
 */
router.post(
  "/:id/analyze",
  validate(schemas.resume.analyze),
  resumeController.analyzeResume,
);

/**
 * @route POST /api/resumes/:id/translate
 * @desc Translate resume
 * @access Private (Worker)
 */
router.post(
  "/:id/translate",
  validate(schemas.resume.translate),
  resumeController.translateResume,
);

/**
 * @route GET /api/resumes/:id/download
 * @desc Download resume
 * @access Private (Worker)
 */
router.get("/:id/download", resumeController.downloadResume);

module.exports = router;
