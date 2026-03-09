const schemeService = require("../services/schemeService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route GET /api/schemes
 * @desc Get all schemes
 */
exports.getSchemes = asyncHandler(async (req, res) => {
  const filters = {
    scheme_type: req.query.scheme_type,
    state: req.query.state,
    benefit_type: req.query.benefit_type,
    search: req.query.q,
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await schemeService.getSchemes(filters, pagination);
  success(res, result);
});

/**
 * @route GET /api/schemes/:id
 * @desc Get scheme by ID
 */
exports.getScheme = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await schemeService.getSchemeById(id);
  success(res, result);
});

/**
 * @route GET /api/schemes/eligible
 * @desc Get eligible schemes for worker
 */
exports.getEligibleSchemes = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await schemeService.getEligibleSchemes(workerId, pagination);
  success(res, result);
});

/**
 * @route POST /api/schemes/:id/apply
 * @desc Apply for a scheme
 */
exports.applyForScheme = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const applicationData = {
    documents: req.body.documents,
    formData: req.body.form_data,
    additionalInfo: req.body.additional_info,
  };
  const result = await schemeService.applyForScheme(
    workerId,
    id,
    applicationData,
  );
  created(res, result, "Application drafted");
});

/**
 * @route PUT /api/schemes/applications/:id/submit
 * @desc Submit a draft application
 */
exports.submitApplication = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await schemeService.submitApplication(id, workerId);
  success(res, result, "Application submitted");
});

/**
 * @route GET /api/schemes/applications
 * @desc Get worker's scheme applications
 */
exports.getMyApplications = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const filters = { status: req.query.status };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await schemeService.getWorkerApplications(
    workerId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route GET /api/schemes/applications/:id
 * @desc Get application details
 */
exports.getApplicationDetails = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await schemeService.getApplicationDetails(id, workerId);
  success(res, result);
});

/**
 * @route PUT /api/schemes/applications/:id
 * @desc Update draft application
 */
exports.updateApplication = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const updateData = {
    documents: req.body.documents,
    formData: req.body.form_data,
    additionalInfo: req.body.additional_info,
  };
  const result = await schemeService.updateApplication(
    id,
    workerId,
    updateData,
  );
  success(res, result, "Application updated");
});

/**
 * @route GET /api/schemes/track/:referenceNumber
 * @desc Track application by reference number
 */
exports.trackApplication = asyncHandler(async (req, res) => {
  const { referenceNumber } = req.params;
  const result = await schemeService.trackApplication(referenceNumber);
  success(res, result);
});

/**
 * Admin Routes
 */

/**
 * @route POST /api/admin/schemes
 * @desc Create a scheme
 */
exports.createScheme = asyncHandler(async (req, res) => {
  const result = await schemeService.createScheme(req.body);
  created(res, result, "Scheme created");
});

/**
 * @route PUT /api/admin/schemes/:id
 * @desc Update a scheme
 */
exports.updateScheme = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await schemeService.updateScheme(id, req.body);
  success(res, result, "Scheme updated");
});

/**
 * @route PUT /api/admin/schemes/applications/:id/review
 * @desc Review scheme application
 */
exports.reviewApplication = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const { id } = req.params;
  const reviewData = {
    status: req.body.status,
    notes: req.body.notes,
    benefitAmount: req.body.benefit_amount,
  };
  const result = await schemeService.reviewApplication(id, adminId, reviewData);
  success(res, result, "Application reviewed");
});

/**
 * @route GET /api/admin/schemes/:id/statistics
 * @desc Get scheme statistics
 */
exports.getSchemeStatistics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await schemeService.getSchemeStatistics(id);
  success(res, result);
});
