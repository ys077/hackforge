const {
  User,
  Worker,
  Employer,
  Job,
  Application,
  Document,
  GovernmentScheme,
  SchemeApplication,
} = require("../models");
const { success } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");
const { Op } = require("sequelize");

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalWorkers,
    totalEmployers,
    newUsersThisWeek,
    totalJobs,
    activeJobs,
    totalApplications,
    pendingDocuments,
    totalSchemeApplications,
  ] = await Promise.all([
    User.count(),
    Worker.count(),
    Employer.count(),
    User.count({ where: { created_at: { [Op.gte]: lastWeek } } }),
    Job.count(),
    Job.count({ where: { status: "active" } }),
    Application.count(),
    Document.count({ where: { verification_status: "pending" } }),
    SchemeApplication.count(),
  ]);

  success(res, {
    users: {
      total: totalUsers,
      workers: totalWorkers,
      employers: totalEmployers,
      new_this_week: newUsersThisWeek,
    },
    jobs: {
      total: totalJobs,
      active: activeJobs,
    },
    applications: {
      total: totalApplications,
    },
    documents: {
      pending: pendingDocuments,
    },
    schemes: {
      applications: totalSchemeApplications,
    },
  });
});

/**
 * @route GET /api/admin/users
 * @desc Get all users
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const where = {};
  if (role) where.role = role;
  if (status === "active") where.is_active = true;
  if (status === "inactive") where.is_active = false;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["password_hash", "otp", "otp_expires_at", "refresh_token"],
    },
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  success(res, {
    data: users,
    pagination: { total: count, page, limit },
  });
});

/**
 * @route GET /api/admin/users/:id
 * @desc Get user details
 */
exports.getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: {
      exclude: ["password_hash", "otp", "otp_expires_at", "refresh_token"],
    },
  });

  if (!user) {
    throw new (require("../utils/errors").NotFoundError)("User");
  }

  let profile = null;
  if (user.role === "worker") {
    profile = await Worker.findOne({ where: { user_id: id } });
  } else if (user.role === "employer") {
    profile = await Employer.findOne({ where: { user_id: id } });
  }

  success(res, { user, profile });
});

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user status
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    throw new (require("../utils/errors").NotFoundError)("User");
  }

  user.is_active = is_active;
  await user.save();

  success(res, user, "User status updated");
});

/**
 * @route GET /api/admin/jobs
 * @desc Get all jobs
 */
exports.getJobs = asyncHandler(async (req, res) => {
  const { status, employer_id, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const where = {};
  if (status) where.status = status;
  if (employer_id) where.employer_id = employer_id;
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: jobs } = await Job.findAndCountAll({
    where,
    include: [
      {
        model: Employer,
        as: "employer",
        attributes: ["id", "company_name"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  success(res, {
    data: jobs,
    pagination: { total: count, page, limit },
  });
});

/**
 * @route PUT /api/admin/jobs/:id/status
 * @desc Update job status
 */
exports.updateJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const job = await Job.findByPk(id);
  if (!job) {
    throw new (require("../utils/errors").NotFoundError)("Job");
  }

  job.status = status;
  await job.save();

  success(res, job, "Job status updated");
});

/**
 * @route GET /api/admin/employers
 * @desc Get all employers
 */
exports.getEmployers = asyncHandler(async (req, res) => {
  const { is_verified, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const where = {};
  if (is_verified !== undefined) where.is_verified = is_verified === "true";
  if (search) {
    where[Op.or] = [
      { company_name: { [Op.iLike]: `%${search}%` } },
      { "$user.name$": { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: employers } = await Employer.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "phone", "email"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  success(res, {
    data: employers,
    pagination: { total: count, page, limit },
  });
});

/**
 * @route PUT /api/admin/employers/:id/verify
 * @desc Verify employer
 */
exports.verifyEmployer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_verified, notes } = req.body;

  const employer = await Employer.findByPk(id);
  if (!employer) {
    throw new (require("../utils/errors").NotFoundError)("Employer");
  }

  employer.is_verified = is_verified;
  employer.verified_at = is_verified ? new Date() : null;
  await employer.save();

  success(res, employer, `Employer ${is_verified ? "verified" : "unverified"}`);
});

/**
 * @route GET /api/admin/analytics
 * @desc Get platform analytics
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(startDate);
  if (endDate) dateFilter[Op.lte] = new Date(endDate);

  const whereDate =
    Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {};

  // User growth
  const usersByDay = await User.findAll({
    where: whereDate,
    attributes: [
      [
        require("../config/database").sequelize.fn(
          "DATE",
          require("../config/database").sequelize.col("created_at"),
        ),
        "date",
      ],
      [require("../config/database").sequelize.fn("COUNT", "*"), "count"],
    ],
    group: [
      require("../config/database").sequelize.fn(
        "DATE",
        require("../config/database").sequelize.col("created_at"),
      ),
    ],
    order: [
      [
        require("../config/database").sequelize.fn(
          "DATE",
          require("../config/database").sequelize.col("created_at"),
        ),
        "ASC",
      ],
    ],
    raw: true,
  });

  // Jobs by status
  const jobsByStatus = await Job.findAll({
    attributes: [
      "status",
      [require("../config/database").sequelize.fn("COUNT", "*"), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  // Applications by status
  const applicationsByStatus = await Application.findAll({
    attributes: [
      "status",
      [require("../config/database").sequelize.fn("COUNT", "*"), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  // Top skills
  const workers = await Worker.findAll({ attributes: ["skills"] });
  const skillCounts = {};
  workers.forEach((w) => {
    (w.skills || []).forEach((skill) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  success(res, {
    user_growth: usersByDay,
    jobs_by_status: jobsByStatus,
    applications_by_status: applicationsByStatus,
    top_skills: topSkills,
  });
});
