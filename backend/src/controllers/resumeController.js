const resumeService = require("../services/resumeService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route POST /api/resumes/generate
 * @desc Generate resume from profile
 */
exports.generateResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const options = {
    template: req.body.template,
    language: req.body.language,
    include_photo: req.body.include_photo,
    title: req.body.title,
  };
  const result = await resumeService.generateResume(workerId, options);
  created(res, result, "Resume generated");
});

/**
 * @route POST /api/resumes
 * @desc Create resume manually
 */
exports.createResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const result = await resumeService.createResume(workerId, req.body);
  created(res, result, "Resume created");
});

/**
 * @route GET /api/resumes
 * @desc Get worker's resumes
 */
exports.getResumes = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
  };
  const result = await resumeService.getWorkerResumes(workerId, pagination);
  success(res, result);
});

/**
 * @route GET /api/resumes/:id
 * @desc Get resume by ID
 */
exports.getResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.getResumeById(id, workerId);
  success(res, result);
});

/**
 * @route PUT /api/resumes/:id
 * @desc Update resume
 */
exports.updateResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.updateResume(id, workerId, req.body);
  success(res, result, "Resume updated");
});

/**
 * @route PUT /api/resumes/:id/primary
 * @desc Set resume as primary
 */
exports.setPrimaryResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.setPrimaryResume(id, workerId);
  success(res, result, "Primary resume updated");
});

/**
 * @route DELETE /api/resumes/:id
 * @desc Delete resume
 */
exports.deleteResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.deleteResume(id, workerId);
  success(res, result);
});

/**
 * @route POST /api/resumes/:id/enhance
 * @desc Enhance resume using AI
 */
exports.enhanceResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.enhanceResume(id, workerId, req.body);
  success(res, result, "Resume enhanced");
});

/**
 * @route POST /api/resumes/:id/analyze
 * @desc Analyze resume against a job
 */
exports.analyzeResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const { job_description } = req.body;
  const result = await resumeService.analyzeResumeForJob(
    id,
    workerId,
    job_description,
  );
  success(res, result);
});

/**
 * @route POST /api/resumes/:id/translate
 * @desc Translate resume
 */
exports.translateResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const { target_language } = req.body;
  const result = await resumeService.translateResume(
    id,
    workerId,
    target_language,
  );
  created(res, result, "Resume translated");
});

/**
 * @route GET /api/resumes/:id/download
 * @desc Download resume
 */
exports.downloadResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const result = await resumeService.downloadResume(id, workerId);
  success(res, result);
});

/**
 * @route GET /api/resumes/primary
 * @desc Get primary resume
 */
exports.getPrimaryResume = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const result = await resumeService.getPrimaryResume(workerId);
  success(res, result);
});
