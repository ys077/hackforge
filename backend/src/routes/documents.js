const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const {
  authenticate,
  workerOnly,
  loadWorkerProfile,
} = require("../middleware/auth");
const { uploadDocument } = require("../middleware/upload");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../utils/validators");

// All routes require authentication and worker role
router.use(authenticate, workerOnly, loadWorkerProfile);

/**
 * @route POST /api/documents/upload
 * @desc Upload document
 * @access Private (Worker)
 */
router.post(
  "/upload",
  uploadLimiter,
  uploadDocument,
  validate(schemas.document.upload),
  documentController.uploadDocument,
);

/**
 * @route GET /api/documents
 * @desc Get worker's documents
 * @access Private (Worker)
 */
router.get("/", documentController.getDocuments);

/**
 * @route GET /api/documents/stats
 * @desc Get verification stats
 * @access Private (Worker)
 */
router.get("/stats", documentController.getVerificationStats);

/**
 * @route GET /api/documents/:id
 * @desc Get document by ID
 * @access Private (Worker)
 */
router.get("/:id", documentController.getDocument);

/**
 * @route DELETE /api/documents/:id
 * @desc Delete document
 * @access Private (Worker)
 */
router.delete("/:id", documentController.deleteDocument);

module.exports = router;
