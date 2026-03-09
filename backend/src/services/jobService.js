const { Op } = require("../utils/mongoOp");
const { Job, Employer, Application, Worker } = require("../models");
const mlService = require("./mlService");
const mapService = require("./mapService");
const { cache } = require("../config/redis");
const { addJob, QUEUE_NAMES } = require("../config/queue");
const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../utils/errors");
const { paginate, formatPaginationResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

class JobService {
  /**
   * Create a new job posting
   */
  async createJob(employerId, jobData) {
    const employer = await Employer.findByPk(employerId);

    if (!employer) {
      throw new NotFoundError("Employer");
    }

    const job = await Job.create({
      employer_id: employerId,
      title: jobData.title,
      description: jobData.description,
      requirements: jobData.requirements,
      responsibilities: jobData.responsibilities,
      skills_required: jobData.skills_required || [],
      education_required: jobData.education_required || "none",
      experience_min: jobData.experience_min || 0,
      experience_max: jobData.experience_max,
      salary_min: jobData.salary_min,
      salary_max: jobData.salary_max,
      salary_type: jobData.salary_type || "monthly",
      job_type: jobData.job_type,
      location_lat: jobData.location_lat,
      location_lng: jobData.location_lng,
      location_address: jobData.location_address,
      city: jobData.city,
      state: jobData.state,
      pincode: jobData.pincode,
      is_remote: jobData.is_remote || false,
      vacancies: jobData.vacancies || 1,
      benefits: jobData.benefits || [],
      working_hours: jobData.working_hours,
      shift_type: jobData.shift_type || "day",
      gender_preference: jobData.gender_preference || "any",
      age_min: jobData.age_min,
      age_max: jobData.age_max,
      languages_required: jobData.languages_required || [],
      expires_at: jobData.expires_at,
      status: jobData.status || "active",
    });

    // Update employer's job count
    await employer.incrementJobCount();

    // Clear related caches
    await cache.delPattern("jobs_list:*");

    // Queue job matching for relevant workers
    await addJob(QUEUE_NAMES.JOB_MATCHING, "new-job-matching", {
      jobId: job.id,
    });

    logger.info(`Job created: ${job.id}`);

    return job;
  }

  /**
   * Update a job
   */
  async updateJob(jobId, employerId, updateData) {
    const job = await Job.findOne({
      where: { id: jobId, employer_id: employerId },
    });

    if (!job) {
      throw new NotFoundError("Job");
    }

    // Fields that can be updated
    const allowedFields = [
      "title",
      "description",
      "requirements",
      "responsibilities",
      "skills_required",
      "education_required",
      "experience_min",
      "experience_max",
      "salary_min",
      "salary_max",
      "salary_type",
      "job_type",
      "location_lat",
      "location_lng",
      "location_address",
      "city",
      "state",
      "pincode",
      "is_remote",
      "vacancies",
      "benefits",
      "working_hours",
      "shift_type",
      "gender_preference",
      "age_min",
      "age_max",
      "languages_required",
      "expires_at",
      "status",
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        job[field] = updateData[field];
      }
    }

    await job.save();

    // Clear caches
    await cache.del(`job:${jobId}`);
    await cache.delPattern("jobs_list:*");

    return job;
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId, workerId = null) {
    // Try cache first
    const cacheKey = `job:${jobId}`;
    let job = await cache.get(cacheKey);

    if (!job) {
      job = await Job.findByPk(jobId, {
        include: [
          {
            model: Employer,
            as: "employer",
            attributes: [
              "id",
              "company_name",
              "company_type",
              "logo_url",
              "is_verified",
              "rating",
            ],
          },
        ],
      });

      if (!job) {
        throw new NotFoundError("Job");
      }

      await cache.set(cacheKey, job.toJSON(), 300);
    }

    // Increment view count
    await Job.increment("views_count", { where: { id: jobId } });

    // If worker provided, check if already applied and calculate match
    let applicationStatus = null;
    let matchScore = null;

    if (workerId) {
      const application = await Application.findOne({
        where: { worker_id: workerId, job_id: jobId },
        attributes: ["id", "status"],
      });
      applicationStatus = application?.status || null;

      // Calculate match score
      const worker = await Worker.findByPk(workerId);
      if (worker) {
        const match = await mlService.calculateJobMatch(worker, job);
        matchScore = match.match_score;
      }
    }

    return {
      ...job,
      applicationStatus,
      matchScore,
    };
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(filters = {}, pagination = {}) {
    const {
      query,
      skills,
      education,
      job_type,
      salary_min,
      salary_max,
      lat,
      lng,
      radius = 10,
      city,
      state,
      employer_id,
      status = "active",
    } = filters;

    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    // Build where clause
    const where = {
      status,
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
    };

    // Text search
    if (query) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // Skills filter
    if (skills && skills.length > 0) {
      where.skills_required = { [Op.overlap]: skills };
    }

    // Education filter
    if (education) {
      where.education_required = education;
    }

    // Job type filter
    if (job_type) {
      where.job_type = job_type;
    }

    // Salary filter
    if (salary_min) {
      where.salary_max = { [Op.gte]: salary_min };
    }
    if (salary_max) {
      where.salary_min = { [Op.lte]: salary_max };
    }

    // Location filters
    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }
    if (state) {
      where.state = state;
    }
    if (employer_id) {
      where.employer_id = employer_id;
    }

    // Location-based search
    if (lat && lng) {
      const bbox = mapService.getBoundingBox(lat, lng, radius);
      where.location_lat = { [Op.between]: [bbox.minLat, bbox.maxLat] };
      where.location_lng = { [Op.between]: [bbox.minLng, bbox.maxLng] };
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      include: [
        {
          model: Employer,
          as: "employer",
          attributes: [
            "id",
            "company_name",
            "company_type",
            "logo_url",
            "is_verified",
          ],
        },
      ],
      order: [
        ["is_featured", "DESC"],
        ["created_at", "DESC"],
      ],
      limit,
      offset,
    });

    // Calculate distances if coordinates provided
    let jobsWithDistance = jobs;
    if (lat && lng) {
      jobsWithDistance = jobs.map((job) => ({
        ...job.toJSON(),
        distance: mapService.getDistance(
          lat,
          lng,
          job.location_lat,
          job.location_lng,
        ),
      }));
    }

    return formatPaginationResponse(jobsWithDistance, count, page, limit);
  }

  /**
   * Get recommended jobs for a worker
   */
  async getRecommendedJobs(workerId, pagination = {}) {
    const worker = await Worker.findByPk(workerId, {
      include: [{ model: require("../models").User, as: "user" }],
    });

    if (!worker) {
      throw new NotFoundError("Worker");
    }

    const { page = 1, limit = 20 } = pagination;

    // Use ML service for recommendations
    const recommendations = await mlService.recommendJobs(worker);

    // Filter active jobs from recommendations and enrich with DB data
    const activeJobs = [];
    for (const rec of recommendations) {
      const job = await Job.findOne({
        where: { title: rec.job_title, status: "active" }, // simplified matching
        include: [
          {
            model: Employer,
            as: "employer",
            attributes: [
              "id",
              "company_name",
              "company_type",
              "logo_url",
              "is_verified",
            ],
          },
        ],
      });

      if (job) {
        activeJobs.push({
          ...job.toJSON(),
          matchScore: rec.match_score,
          skillsMatch: rec.match_score, // approximate mapping
          educationMatch: true,
          matchReason: rec.match_reason,
          distance: worker.location_lat && worker.location_lng 
            ? mapService.getDistance(
                worker.location_lat, worker.location_lng,
                job.location_lat, job.location_lng
              )
            : null
        });
      }

      // Keep external scraped jobs directly
      if (rec.source && rec.source !== "built-in") {
        activeJobs.push({
          id: `ext-${Math.random().toString(36).substring(7)}`,
          title: rec.job_title,
          employer: { company_name: rec.company },
          location_address: rec.location,
          matchScore: rec.match_score,
          matchReason: rec.match_reason,
          applicationUrl: rec.application_url,
          isExternal: true
        });
      }
    }

    // Sort by match score
    const sortedJobs = activeJobs.sort((a, b) => b.matchScore - a.matchScore);
    
    // Manual pagination
    const totalCount = sortedJobs.length;
    const startIndex = (page - 1) * limit;
    const paginatedJobs = sortedJobs.slice(startIndex, startIndex + limit);

    return formatPaginationResponse(paginatedJobs, totalCount, page, limit);
  }

  /**
   * Apply to a job
   */
  async applyToJob(workerId, jobId, applicationData = {}) {
    const job = await Job.findByPk(jobId);

    if (!job || !job.isActive()) {
      throw new NotFoundError("Job");
    }

    // Check if already applied
    const existingApplication = await Application.hasApplied(workerId, jobId);
    if (existingApplication) {
      throw new ConflictError("You have already applied to this job");
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      throw new NotFoundError("Worker");
    }

    // Calculate match score
    const match = await mlService.calculateJobMatch(worker, job);

    // Calculate distance
    let distance = null;
    if (worker.location_lat && worker.location_lng) {
      distance = mapService.getDistance(
        worker.location_lat,
        worker.location_lng,
        job.location_lat,
        job.location_lng,
      );
    }

    const application = await Application.create({
      worker_id: workerId,
      job_id: jobId,
      resume_id: applicationData.resume_id,
      cover_note: applicationData.cover_note,
      match_score: match.match_score,
      skills_match_score: match.skills_match,
      education_match: match.education_match,
      experience_match: match.experience_match,
      distance_km: distance,
      status: "pending",
    });

    // Update job application count
    await job.incrementApplications();

    // Queue notification to employer
    await addJob(QUEUE_NAMES.NOTIFICATION, "new-application", {
      applicationId: application.id,
      jobId: job.id,
      employerId: job.employer_id,
    });

    logger.info(`Application created: ${application.id}`);

    return application;
  }

  /**
   * Get employer's jobs
   */
  async getEmployerJobs(employerId, filters = {}, pagination = {}) {
    const { status } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = { employer_id: employerId };
    if (status) {
      where.status = status;
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    // Get application counts for each job
    const jobsWithStats = await Promise.all(
      jobs.map(async (job) => {
        const stats = await Application.getJobStatistics(job.id);
        return {
          ...job.toJSON(),
          applicationStats: stats,
        };
      }),
    );

    return formatPaginationResponse(jobsWithStats, count, page, limit);
  }

  /**
   * Close a job
   */
  async closeJob(jobId, employerId) {
    const job = await Job.findOne({
      where: { id: jobId, employer_id: employerId },
    });

    if (!job) {
      throw new NotFoundError("Job");
    }

    job.status = "closed";
    job.closed_at = new Date();
    await job.save();

    // Clear caches
    await cache.del(`job:${jobId}`);
    await cache.delPattern("jobs_list:*");

    return job;
  }

  /**
   * Get job applications
   */
  async getJobApplications(jobId, employerId, filters = {}, pagination = {}) {
    // Verify employer owns the job
    const job = await Job.findOne({
      where: { id: jobId, employer_id: employerId },
    });

    if (!job) {
      throw new NotFoundError("Job");
    }

    const { status, sortBy = "match_score", sortOrder = "DESC" } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = { job_id: jobId };
    if (status) {
      where.status = status;
    }

    const { count, rows: applications } = await Application.findAndCountAll({
      where,
      include: [
        {
          model: Worker,
          as: "worker",
          include: [
            {
              model: require("../models").User,
              as: "user",
              attributes: ["name", "phone", "email"],
            },
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });

    return formatPaginationResponse(applications, count, page, limit);
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId,
    employerId,
    newStatus,
    notes = null,
  ) {
    const application = await Application.findByPk(applicationId, {
      include: [
        {
          model: Job,
          as: "job",
          where: { employer_id: employerId },
        },
      ],
    });

    if (!application) {
      throw new NotFoundError("Application");
    }

    await application.updateStatus(newStatus, notes);

    // Queue notification to worker
    await addJob(QUEUE_NAMES.NOTIFICATION, "application-status-update", {
      applicationId: application.id,
      workerId: application.worker_id,
      newStatus,
    });

    return application;
  }
}

module.exports = new JobService();
