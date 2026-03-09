const jobService = require("../services/jobService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route POST /api/jobs
 * @desc Create a new job posting
 */
exports.createJob = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const result = await jobService.createJob(employerId, req.body);
  created(res, result, "Job created successfully");
});

/**
 * @route POST /api/jobs/scrape
 * @desc Trigger AI job scraping
 */
exports.triggerScrape = asyncHandler(async (req, res) => {
  const { keywords, location } = req.body;
  const mlService = require("../services/mlService");
  const result = await mlService.triggerJobScrape(keywords, location);
  success(res, result, "Job scraping triggered");
});

/**
 * @route PUT /api/jobs/:id
 * @desc Update a job
 */
exports.updateJob = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const result = await jobService.updateJob(id, employerId, req.body);
  success(res, result, "Job updated successfully");
});

/**
 * @route GET /api/jobs/:id
 * @desc Get job by ID
 */
exports.getJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workerId = req.worker?.id;
  const result = await jobService.getJobById(id, workerId);
  success(res, result);
});

/**
 * @route GET /api/jobs
 * @desc Search jobs
 */
exports.searchJobs = asyncHandler(async (req, res) => {
  const filters = {
    query: req.query.q,
    skills: req.query.skills ? req.query.skills.split(",") : null,
    education: req.query.education,
    job_type: req.query.job_type,
    salary_min: req.query.salary_min ? parseInt(req.query.salary_min) : null,
    salary_max: req.query.salary_max ? parseInt(req.query.salary_max) : null,
    lat: req.query.lat ? parseFloat(req.query.lat) : null,
    lng: req.query.lng ? parseFloat(req.query.lng) : null,
    radius: req.query.radius ? parseInt(req.query.radius) : 10,
    city: req.query.city,
    state: req.query.state,
  };

  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await jobService.searchJobs(filters, pagination);
  success(res, result);
});

/**
 * @route GET /api/jobs/recommended
 * @desc Get recommended jobs for worker
 */
exports.getRecommendedJobs = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await jobService.getRecommendedJobs(workerId, pagination);
  success(res, result);
});

/**
 * @route POST /api/jobs/:id/apply
 * @desc Apply to a job
 */
exports.applyToJob = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const applicationData = {
    resume_id: req.body.resume_id,
    cover_note: req.body.cover_note,
  };
  const result = await jobService.applyToJob(workerId, id, applicationData);
  created(res, result, "Application submitted successfully");
});

/**
 * @route GET /api/jobs/employer/my-jobs
 * @desc Get employer's jobs
 */
exports.getEmployerJobs = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const filters = { status: req.query.status };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await jobService.getEmployerJobs(
    employerId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route PUT /api/jobs/:id/close
 * @desc Close a job
 */
exports.closeJob = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const result = await jobService.closeJob(id, employerId);
  success(res, result, "Job closed successfully");
});

/**
 * @route GET /api/jobs/:id/applications
 * @desc Get job applications
 */
exports.getJobApplications = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const filters = {
    status: req.query.status,
    sortBy: req.query.sort_by,
    sortOrder: req.query.sort_order,
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await jobService.getJobApplications(
    id,
    employerId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route PUT /api/applications/:id/status
 * @desc Update application status
 */
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const { status, notes } = req.body;
  const result = await jobService.updateApplicationStatus(
    id,
    employerId,
    status,
    notes,
  );
  success(res, result, "Application status updated");
});
