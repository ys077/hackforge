const {
  Employer,
  User,
  Job,
  Application,
  InterviewSlot,
} = require("../models");
const mapService = require("../services/mapService");
const { success } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");
const { NotFoundError } = require("../utils/errors");
const { cache } = require("../config/redis");

/**
 * @route GET /api/employers/profile
 * @desc Get employer profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;

  const employer = await Employer.findByPk(employerId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "phone", "email"],
      },
    ],
  });

  if (!employer) {
    throw new NotFoundError("Employer");
  }

  success(res, employer);
});

/**
 * @route PUT /api/employers/profile
 * @desc Update employer profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;

  const employer = await Employer.findByPk(employerId);

  if (!employer) {
    throw new NotFoundError("Employer");
  }

  const allowedFields = [
    "company_name",
    "company_type",
    "company_description",
    "industry",
    "address",
    "city",
    "state",
    "location_lat",
    "location_lng",
    "contact_email",
    "contact_phone",
    "website",
    "employee_count",
    "gst_number",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      employer[field] = req.body[field];
    }
  }

  await employer.save();

  // Update user info if provided
  if (req.body.name || req.body.email) {
    const user = await User.findByPk(req.user.id);
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    await user.save();
  }

  // Clear cache
  await cache.del(`employer:${employerId}`);

  success(res, employer, "Profile updated");
});

/**
 * @route PUT /api/employers/logo
 * @desc Update company logo
 */
exports.updateLogo = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;

  const employer = await Employer.findByPk(employerId);

  if (!employer) {
    throw new NotFoundError("Employer");
  }

  if (req.file) {
    employer.logo_url = `/uploads/${req.file.filename}`;
    await employer.save();
    await cache.del(`employer:${employerId}`);
  }

  success(res, employer, "Logo updated");
});

/**
 * @route GET /api/employers/dashboard
 * @desc Get employer dashboard data
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;

  const employer = await Employer.findByPk(employerId, {
    include: [{ model: User, as: "user" }],
  });

  if (!employer) {
    throw new NotFoundError("Employer");
  }

  // Get job statistics
  const { Op } = require("../utils/mongoOp");

  const [
    activeJobs,
    totalApplications,
    pendingApplications,
    upcomingInterviews,
  ] = await Promise.all([
    Job.count({ where: { employer_id: employerId, status: "active" } }),
    Application.count({
      include: [
        {
          model: Job,
          as: "job",
          where: { employer_id: employerId },
          required: true,
        },
      ],
    }),
    Application.count({
      where: { status: "pending" },
      include: [
        {
          model: Job,
          as: "job",
          where: { employer_id: employerId },
          required: true,
        },
      ],
    }),
    InterviewSlot.count({
      where: {
        employer_id: employerId,
        start_time: { [Op.gt]: new Date() },
        status: "available",
      },
    }),
  ]);

  success(res, {
    employer: {
      company_name: employer.company_name,
      is_verified: employer.is_verified,
      rating: employer.rating,
      total_jobs_posted: employer.total_jobs_posted,
      total_hires: employer.total_hires,
    },
    stats: {
      active_jobs: activeJobs,
      total_applications: totalApplications,
      pending_applications: pendingApplications,
      upcoming_interviews: upcomingInterviews,
    },
  });
});

/**
 * @route GET /api/employers/statistics
 * @desc Get employer detailed statistics
 */
exports.getStatistics = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { Op } = require("../utils/mongoOp");
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) {
    dateFilter.created_at = { [Op.gte]: new Date(startDate) };
  }
  if (endDate) {
    dateFilter.created_at = {
      ...dateFilter.created_at,
      [Op.lte]: new Date(endDate),
    };
  }

  // Job statistics
  const jobs = await Job.findAll({
    where: { employer_id: employerId, ...dateFilter },
    attributes: ["status"],
  });

  const jobStats = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  // Application statistics
  const applications = await Application.findAll({
    include: [
      {
        model: Job,
        as: "job",
        where: { employer_id: employerId },
        required: true,
      },
    ],
    where: dateFilter,
    attributes: ["status"],
  });

  const appStats = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  // Interview statistics
  const interviews = await InterviewSlot.count({
    where: { employer_id: employerId, ...dateFilter },
  });

  success(res, {
    jobs: {
      total: jobs.length,
      by_status: jobStats,
    },
    applications: {
      total: applications.length,
      by_status: appStats,
    },
    interviews: {
      total: interviews,
    },
  });
});

/**
 * @route GET /api/employers/candidates/search
 * @desc Search candidates (workers)
 */
exports.searchCandidates = asyncHandler(async (req, res) => {
  const { Worker, Skill } = require("../models");
  const { Op } = require("../utils/mongoOp");

  const {
    skills,
    education,
    experience_min,
    experience_max,
    city,
    state,
    lat,
    lng,
    radius,
  } = req.query;

  const where = {
    is_available: true,
  };

  if (skills) {
    where.skills = { [Op.overlap]: skills.split(",") };
  }
  if (education) {
    where.education = education;
  }
  if (experience_min) {
    where.experience_years = { [Op.gte]: parseInt(experience_min) };
  }
  if (experience_max) {
    where.experience_years = {
      ...where.experience_years,
      [Op.lte]: parseInt(experience_max),
    };
  }
  if (city) {
    where.city = { [Op.iLike]: `%${city}%` };
  }
  if (state) {
    where.state = state;
  }

  // Location filter
  if (lat && lng && radius) {
    const bbox = mapService.getBoundingBox(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius) || 10,
    );
    where.location_lat = { [Op.between]: [bbox.minLat, bbox.maxLat] };
    where.location_lng = { [Op.between]: [bbox.minLng, bbox.maxLng] };
  }

  const { count, rows: workers } = await Worker.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["name"],
      },
    ],
    attributes: [
      "id",
      "occupation",
      "education",
      "experience_years",
      "skills",
      "city",
      "state",
      "profile_completion",
    ],
    order: [["profile_completion", "DESC"]],
    limit: parseInt(req.query.limit) || 20,
    offset:
      ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 20),
  });

  // Add distance if coordinates provided
  let workersWithDistance = workers;
  if (lat && lng) {
    workersWithDistance = workers.map((w) => ({
      ...w.toJSON(),
      distance: mapService.getDistance(
        parseFloat(lat),
        parseFloat(lng),
        w.location_lat,
        w.location_lng,
      ),
    }));
  }

  success(res, {
    data: workersWithDistance,
    pagination: {
      total: count,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    },
  });
});
