const { Op } = require("../utils/mongoOp");
const {
  GovernmentScheme,
  SchemeApplication,
  Worker,
  Document,
} = require("../models");
const mlService = require("./mlService");
const { cache } = require("../config/redis");
const { addJob, QUEUE_NAMES } = require("../config/queue");
const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../utils/errors");
const {
  paginate,
  formatPaginationResponse,
  generateReferenceNumber,
} = require("../utils/helpers");
const logger = require("../utils/logger");

class SchemeService {
  /**
   * Get all active schemes
   */
  async getSchemes(filters = {}, pagination = {}) {
    const { scheme_type, state, benefit_type, search } = filters;

    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = {
      is_active: true,
      [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }],
    };

    if (scheme_type) {
      where.scheme_type = scheme_type;
    }
    if (state) {
      where[Op.or] = [
        { state: null }, // Central schemes
        { state },
      ];
    }
    if (benefit_type) {
      where.benefit_type = benefit_type;
    }
    if (search) {
      where[Op.and] = [
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { tags: { [Op.overlap]: [search.toLowerCase()] } },
          ],
        },
      ];
    }

    const { count, rows: schemes } = await GovernmentScheme.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return formatPaginationResponse(schemes, count, page, limit);
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(schemeId) {
    const cacheKey = `scheme:${schemeId}`;
    let scheme = await cache.get(cacheKey);

    if (!scheme) {
      scheme = await GovernmentScheme.findByPk(schemeId);

      if (!scheme) {
        throw new NotFoundError("Scheme");
      }

      await cache.set(cacheKey, scheme.toJSON(), 3600); // Cache for 1 hour
    }

    return scheme;
  }

  /**
   * Get eligible schemes for a worker
   */
  async getEligibleSchemes(workerId, pagination = {}) {
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      throw new NotFoundError("Worker");
    }

    // Get worker's verified documents
    const documents = await Document.getWorkerDocuments(workerId);
    const verifiedDocTypes = documents
      .filter((d) => d.verification_status === "verified")
      .map((d) => d.document_type);

    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    // Get all active schemes
    const allSchemes = await GovernmentScheme.findEligibleSchemes(worker, {
      limit: 100, // Get more for filtering
    });

    // Calculate eligibility for each scheme
    const eligibleSchemes = await Promise.all(
      allSchemes.map(async (scheme) => {
        const eligibility = await mlService.checkSchemeEligibility(
          {
            ...worker.toJSON(),
            documents: verifiedDocTypes,
          },
          scheme,
        );

        return {
          ...scheme.toJSON(),
          eligibilityScore: eligibility.eligibility_score,
          eligible: eligibility.eligible,
          matchedCriteria: eligibility.matched_criteria,
          missingCriteria: eligibility.missing_criteria,
          missingDocuments: scheme.required_documents.filter(
            (d) => !verifiedDocTypes.includes(d),
          ),
        };
      }),
    );

    // Sort by eligibility score
    const sortedSchemes = eligibleSchemes
      .filter((s) => s.eligible || s.eligibilityScore >= 50)
      .sort((a, b) => b.eligibilityScore - a.eligibilityScore);

    // Paginate
    const paginatedSchemes = sortedSchemes.slice(offset, offset + limit);

    return formatPaginationResponse(
      paginatedSchemes,
      sortedSchemes.length,
      page,
      limit,
    );
  }

  /**
   * Apply for a scheme
   */
  async applyForScheme(workerId, schemeId, applicationData = {}) {
    const scheme = await GovernmentScheme.findByPk(schemeId);
    if (!scheme || !scheme.isCurrentlyActive()) {
      throw new NotFoundError("Scheme");
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      throw new NotFoundError("Worker");
    }

    // Check if already applied
    const hasApplication = await SchemeApplication.hasActiveApplication(
      workerId,
      schemeId,
    );
    if (hasApplication) {
      throw new ConflictError(
        "You already have an active application for this scheme",
      );
    }

    // Check eligibility
    const documents = await Document.getWorkerDocuments(workerId);
    const verifiedDocTypes = documents
      .filter((d) => d.verification_status === "verified")
      .map((d) => d.document_type);

    const eligibility = await mlService.checkSchemeEligibility(
      {
        ...worker.toJSON(),
        documents: verifiedDocTypes,
      },
      scheme,
    );

    if (!eligibility.eligible && eligibility.eligibility_score < 50) {
      throw new ValidationError(
        "You are not eligible for this scheme",
        eligibility.missing_criteria,
      );
    }

    // Check required documents
    const missingDocs = scheme.required_documents.filter(
      (d) => !verifiedDocTypes.includes(d),
    );

    // Create application
    const application = await SchemeApplication.create({
      worker_id: workerId,
      scheme_id: schemeId,
      status: missingDocs.length > 0 ? "documents_required" : "draft",
      eligibility_score: eligibility.eligibility_score,
      documents_submitted: applicationData.documents || [],
      submission_data: applicationData.formData || {},
      additional_info: applicationData.additionalInfo || {},
    });

    // Generate reference number
    application.generateReferenceNumber();
    await application.save();

    // Update scheme application count
    scheme.total_applications += 1;
    await scheme.save();

    logger.info(`Scheme application created: ${application.id}`);

    return {
      application,
      missingDocuments: missingDocs,
      eligibility,
    };
  }

  /**
   * Submit a draft application
   */
  async submitApplication(applicationId, workerId) {
    const application = await SchemeApplication.findOne({
      where: { id: applicationId, worker_id: workerId },
      include: [{ model: GovernmentScheme, as: "scheme" }],
    });

    if (!application) {
      throw new NotFoundError("Application");
    }

    if (
      application.status !== "draft" &&
      application.status !== "documents_required"
    ) {
      throw new ValidationError("Application is not in a submittable state");
    }

    // Verify required documents are submitted
    const documents = await Document.getWorkerDocuments(workerId);
    const verifiedDocTypes = documents
      .filter((d) => d.verification_status === "verified")
      .map((d) => d.document_type);

    const missingDocs = application.scheme.required_documents.filter(
      (d) => !verifiedDocTypes.includes(d),
    );

    if (missingDocs.length > 0) {
      application.status = "documents_required";
      await application.save();
      throw new ValidationError("Missing required documents", missingDocs);
    }

    await application.submit();

    // Queue for processing
    await addJob(QUEUE_NAMES.NOTIFICATION, "scheme-application-submitted", {
      applicationId: application.id,
      workerId,
    });

    return application;
  }

  /**
   * Get worker's scheme applications
   */
  async getWorkerApplications(workerId, filters = {}, pagination = {}) {
    const { status } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = { worker_id: workerId };
    if (status) {
      where.status = status;
    }

    const { count, rows: applications } =
      await SchemeApplication.findAndCountAll({
        where,
        include: [
          {
            model: GovernmentScheme,
            as: "scheme",
            attributes: [
              "id",
              "name",
              "benefit_type",
              "benefit_amount_min",
              "benefit_amount_max",
            ],
          },
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

    return formatPaginationResponse(applications, count, page, limit);
  }

  /**
   * Get application details
   */
  async getApplicationDetails(applicationId, workerId) {
    const application = await SchemeApplication.findOne({
      where: { id: applicationId, worker_id: workerId },
      include: [
        {
          model: GovernmentScheme,
          as: "scheme",
        },
      ],
    });

    if (!application) {
      throw new NotFoundError("Application");
    }

    // Get submitted documents
    const documents = await Document.findAll({
      where: {
        id: { [Op.in]: application.documents_submitted },
      },
    });

    return {
      application,
      documents,
    };
  }

  /**
   * Update application (for draft status)
   */
  async updateApplication(applicationId, workerId, updateData) {
    const application = await SchemeApplication.findOne({
      where: { id: applicationId, worker_id: workerId },
    });

    if (!application) {
      throw new NotFoundError("Application");
    }

    if (!application.canEdit()) {
      throw new ValidationError("Application cannot be modified");
    }

    if (updateData.documents) {
      application.documents_submitted = updateData.documents;
    }
    if (updateData.formData) {
      application.submission_data = updateData.formData;
    }
    if (updateData.additionalInfo) {
      application.additional_info = updateData.additionalInfo;
    }

    await application.save();

    return application;
  }

  /**
   * Track application by reference number
   */
  async trackApplication(referenceNumber) {
    const application = await SchemeApplication.findOne({
      where: { reference_number: referenceNumber },
      include: [
        {
          model: GovernmentScheme,
          as: "scheme",
          attributes: ["id", "name", "benefit_type"],
        },
      ],
    });

    if (!application) {
      throw new NotFoundError("Application with this reference number");
    }

    return {
      referenceNumber: application.reference_number,
      schemeName: application.scheme.name,
      status: application.status,
      submittedAt: application.submitted_at,
      reviewedAt: application.reviewed_at,
      approvedAt: application.approved_at,
      benefitReceived: application.benefit_received,
    };
  }

  /**
   * Admin: Review application
   */
  async reviewApplication(applicationId, adminId, reviewData) {
    const application = await SchemeApplication.findByPk(applicationId);

    if (!application) {
      throw new NotFoundError("Application");
    }

    const { status, notes, benefitAmount } = reviewData;

    await application.updateStatus(status, notes);

    if (status === "approved" && benefitAmount) {
      application.benefit_received = benefitAmount;
      await application.save();

      // Update scheme statistics
      const scheme = await GovernmentScheme.findByPk(application.scheme_id);
      if (scheme) {
        scheme.approved_applications += 1;
        await scheme.save();
      }
    }

    // Queue notification
    await addJob(QUEUE_NAMES.NOTIFICATION, "scheme-application-update", {
      applicationId: application.id,
      workerId: application.worker_id,
      newStatus: status,
    });

    return application;
  }

  /**
   * Create/Update scheme (Admin)
   */
  async createScheme(schemeData) {
    const scheme = await GovernmentScheme.create(schemeData);

    // Clear scheme cache
    await cache.delPattern("schemes:*");

    logger.info(`Scheme created: ${scheme.id}`);

    return scheme;
  }

  /**
   * Update scheme (Admin)
   */
  async updateScheme(schemeId, updateData) {
    const scheme = await GovernmentScheme.findByPk(schemeId);

    if (!scheme) {
      throw new NotFoundError("Scheme");
    }

    Object.assign(scheme, updateData);
    await scheme.save();

    // Clear caches
    await cache.del(`scheme:${schemeId}`);
    await cache.delPattern("schemes:*");

    return scheme;
  }

  /**
   * Get scheme statistics
   */
  async getSchemeStatistics(schemeId) {
    const scheme = await GovernmentScheme.findByPk(schemeId);

    if (!scheme) {
      throw new NotFoundError("Scheme");
    }

    const stats = await SchemeApplication.getStatistics(schemeId);

    return {
      ...stats,
      approval_rate:
        stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(2) : 0,
    };
  }
}

module.exports = new SchemeService();
