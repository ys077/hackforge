const documentService = require("../services/documentService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route POST /api/documents/upload
 * @desc Upload a document
 */
exports.uploadDocument = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { document_type, document_name, is_primary } = req.body;

  const result = await documentService.uploadDocument(
    workerId,
    document_type,
    req.file,
    {
      document_name,
      is_primary,
      upload_ip: req.ip,
    },
  );

  created(res, result, "Document uploaded");
});

/**
 * @route GET /api/documents
 * @desc Get worker's documents
 */
exports.getDocuments = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const documentType = req.query.type;
  const result = await documentService.getWorkerDocuments(
    workerId,
    documentType,
  );
  success(res, result);
});

/**
 * @route GET /api/documents/:id
 * @desc Get document by ID
 */
exports.getDocument = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await documentService.getDocumentById(id, workerId);
  success(res, result);
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete document
 */
exports.deleteDocument = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await documentService.deleteDocument(id, workerId);
  success(res, result);
});

/**
 * @route GET /api/documents/stats
 * @desc Get verification stats
 */
exports.getVerificationStats = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const result = await documentService.getVerificationStats(workerId);
  success(res, result);
});

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/documents/pending
 * @desc Get pending documents for review
 */
exports.getPendingDocuments = asyncHandler(async (req, res) => {
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await documentService.getPendingDocuments(pagination);
  success(res, result);
});

/**
 * @route PUT /api/admin/documents/:id/verify
 * @desc Manually verify document
 */
exports.manualVerify = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const { id } = req.params;
  const { approved, notes } = req.body;
  const result = await documentService.manualVerify(
    id,
    adminId,
    approved,
    notes,
  );
  success(res, result, approved ? "Document verified" : "Document rejected");
});
