const {
  Worker,
  User,
  TrustScore,
  Application,
  Document,
  Resume,
} = require("../models");
const mapService = require("../services/mapService");
const { success } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError } = require("../utils/errors");
const { cache } = require("../config/redis");

/**
 * @route GET /api/workers/profile
 * @desc Get worker profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;

  const worker = await Worker.findByPk(workerId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "phone", "email", "language"],
      },
    ],
  });

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  // Get trust score
  const { trustScore } = await TrustScore.getOrCreate(workerId);

  // Get document stats
  const documentStats = await Document.getVerificationStats(workerId);

  // Get application stats
  const applicationStats = await Application.getWorkerStatistics(workerId);

  success(res, {
    worker,
    trustScore,
    documentStats,
    applicationStats,
  });
});

/**
 * @route PUT /api/workers/profile
 * @desc Update worker profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;

  const worker = await Worker.findByPk(workerId);

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  const allowedFields = [
    "age",
    "gender",
    "occupation",
    "education",
    "experience_years",
    "location_lat",
    "location_lng",
    "location_address",
    "city",
    "state",
    "skills",
    "languages_known",
    "preferred_job_types",
    "bio",
    "max_travel_distance",
    "salary_expectation",
    "is_available",
    "availability_hours",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      worker[field] = req.body[field];
    }
  }

  worker.calculateProfileCompletion();
  await worker.save();

  // Update user info if provided
  if (req.body.name || req.body.email || req.body.language) {
    const user = await User.findByPk(req.user.id);
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.language) user.language = req.body.language;
    await user.save();
  }

  // Clear cache
  await cache.del(`worker:${workerId}`);

  success(res, worker, "Profile updated");
});

/**
 * @route PUT /api/workers/location
 * @desc Update worker location
 */
exports.updateLocation = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { lat, lng } = req.body;

  const worker = await Worker.findByPk(workerId);

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  worker.location_lat = lat;
  worker.location_lng = lng;

  // Reverse geocode to get address
  try {
    const location = await mapService.reverseGeocode(lat, lng);
    if (location) {
      worker.location_address = location.formatted_address;
      worker.city = location.city;
      worker.state = location.state;
    }
  } catch (error) {
    // Continue without address
  }

  await worker.save();
  await cache.del(`worker:${workerId}`);

  success(res, worker, "Location updated");
});

/**
 * @route PUT /api/workers/skills
 * @desc Update worker skills
 */
exports.updateSkills = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { skills } = req.body;

  const worker = await Worker.findByPk(workerId);

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  worker.skills = skills;
  worker.calculateProfileCompletion();
  await worker.save();

  await cache.del(`worker:${workerId}`);

  success(res, worker, "Skills updated");
});

/**
 * @route PUT /api/workers/availability
 * @desc Update availability status
 */
exports.updateAvailability = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { is_available, availability_hours } = req.body;

  const worker = await Worker.findByPk(workerId);

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  worker.is_available = is_available;
  if (availability_hours) {
    worker.availability_hours = availability_hours;
  }
  await worker.save();

  success(res, worker, "Availability updated");
});

/**
 * @route GET /api/workers/applications
 * @desc Get worker's job applications
 */
exports.getApplications = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;

  const { count, rows: applications } = await Application.findAndCountAll({
    where: { worker_id: workerId },
    include: [
      {
        model: require("../models").Job,
        as: "job",
        attributes: ["id", "title", "company_name", "job_type", "status"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(req.query.limit) || 20,
    offset:
      ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 20),
  });

  success(res, {
    data: applications,
    pagination: {
      total: count,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    },
  });
});

/**
 * @route GET /api/workers/trust-score
 * @desc Get worker's trust score
 */
exports.getTrustScore = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;

  const { trustScore, created } = await TrustScore.getOrCreate(workerId);

  if (created) {
    await trustScore.recalculate();
  }

  success(res, {
    trustScore,
    breakdown: {
      profile_completeness: trustScore.profile_completeness_score,
      document_verification: trustScore.document_verification_score,
      employment_history: trustScore.employment_history_score,
      skills: trustScore.skills_score,
      activity: trustScore.activity_score,
    },
    improvement_suggestions: trustScore.improvement_suggestions || [],
  });
});

/**
 * @route GET /api/workers/dashboard
 * @desc Get worker dashboard data
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;

  const worker = await Worker.findByPk(workerId, {
    include: [{ model: User, as: "user" }],
  });

  if (!worker) {
    throw new NotFoundError("Worker");
  }

  // Get various stats in parallel
  const [trustScore, applicationStats, documentStats, primaryResume] =
    await Promise.all([
      TrustScore.getOrCreate(workerId).then((r) => r.trustScore),
      Application.getWorkerStatistics(workerId),
      Document.getVerificationStats(workerId),
      Resume.getPrimaryResume(workerId),
    ]);

  success(res, {
    worker: {
      name: worker.user?.name,
      profile_completion: worker.profile_completion,
      is_available: worker.is_available,
      skills_count: worker.skills?.length || 0,
    },
    trustScore: {
      overall: trustScore.overall_score,
      level: trustScore.trust_level,
    },
    applications: applicationStats,
    documents: {
      total: documentStats.total,
      verified: documentStats.verified,
      pending: documentStats.pending,
    },
    hasResume: !!primaryResume,
  });
});
