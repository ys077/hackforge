const { Resume, Worker, User } = require("../models");
const mlService = require("./mlService");
const { cache } = require("../config/redis");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { paginate, formatPaginationResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

class ResumeService {
  /**
   * Generate resume from worker profile
   */
  async generateResume(workerId, options = {}) {
    const worker = await Worker.findByPk(workerId, {
      include: [{ model: User, as: "user" }],
    });

    if (!worker) {
      throw new NotFoundError("Worker");
    }

    // Generate content using ML service
    const generatedContent = await mlService.generateResume(
      worker,
      worker.user,
      options, // will pass linkedin_url, certificates array, template
    );

    // Create resume record
    const resume = await Resume.create({
      worker_id: workerId,
      title: options.title || `Resume - ${worker.user.name || "My Resume"}`,
      personal_info: {
        name: worker.user.name,
        phone: worker.user.phone,
        email: worker.user.email,
        location: worker.location_address,
        city: worker.city,
        state: worker.state,
      },
      summary: generatedContent.summary,
      work_experience: generatedContent.work_experience || [],
      education: generatedContent.education || [],
      skills: generatedContent.skills || worker.skills || [],
      languages:
        worker.languages_known?.map((lang) => ({
          language: lang,
          proficiency: "conversational",
        })) || [],
      content: generatedContent.content || {},
      // Store the generated PDF file if provided
      file_url: generatedContent.pdf_base64 ? `data:application/pdf;base64,${generatedContent.pdf_base64}` : null,
      template: options.template || "basic",
      language: options.language || "en",
      is_ai_generated: true,
      ats_score: generatedContent.ats_score,
      ats_feedback: JSON.stringify(generatedContent.ats_feedback || [])
    });

    // We don't need a separate analysis call if the generation returns it
    logger.info(`Resume generated: ${resume.id}`);

    return {
      resume,
      analysis: {
         ats_score: generatedContent.ats_score,
         feedback: generatedContent.ats_feedback
      }
    };
  }

  /**
   * Create resume manually
   */
  async createResume(workerId, resumeData) {
    const worker = await Worker.findByPk(workerId, {
      include: [{ model: User, as: "user" }],
    });

    if (!worker) {
      throw new NotFoundError("Worker");
    }

    const resume = await Resume.create({
      worker_id: workerId,
      title: resumeData.title || "My Resume",
      personal_info: resumeData.personal_info || {
        name: worker.user.name,
        phone: worker.user.phone,
        email: worker.user.email,
      },
      summary: resumeData.summary,
      work_experience: resumeData.work_experience || [],
      education: resumeData.education || [],
      skills: resumeData.skills || [],
      languages: resumeData.languages || [],
      certifications: resumeData.certifications || [],
      content: resumeData.content || {},
      template: resumeData.template || "basic",
      language: resumeData.language || "en",
      is_ai_generated: false,
    });

    // Analyze for ATS score
    try {
      const analysis = await mlService.analyzeResume(resume.getFullContent());
      await resume.updateATSScore(analysis.ats_score, analysis.feedback);
    } catch (error) {
      logger.error("Failed to analyze resume:", error);
    }

    return resume;
  }

  /**
   * Get worker's resumes
   */
  async getWorkerResumes(workerId, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const { offset } = paginate(page, limit);

    const { count, rows: resumes } = await Resume.findAndCountAll({
      where: { worker_id: workerId },
      order: [
        ["is_primary", "DESC"],
        ["updated_at", "DESC"],
      ],
      limit,
      offset,
    });

    return formatPaginationResponse(resumes, count, page, limit);
  }

  /**
   * Get resume by ID
   */
  async getResumeById(resumeId, workerId = null) {
    const where = { id: resumeId };
    if (workerId) {
      where.worker_id = workerId;
    }

    const resume = await Resume.findOne({
      where,
      include: [
        {
          model: Worker,
          as: "worker",
          include: [
            { model: User, as: "user", attributes: ["name", "phone", "email"] },
          ],
        },
      ],
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    return resume;
  }

  /**
   * Update resume
   */
  async updateResume(resumeId, workerId, updateData) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    // Update fields
    const allowedFields = [
      "title",
      "personal_info",
      "summary",
      "work_experience",
      "education",
      "skills",
      "languages",
      "certifications",
      "content",
      "template",
      "language",
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        resume[field] = updateData[field];
      }
    }

    resume.is_ai_enhanced = resume.is_ai_enhanced || !!updateData.ai_enhanced;
    await resume.incrementVersion();

    // Re-analyze for ATS score
    try {
      const analysis = await mlService.analyzeResume(resume.getFullContent());
      await resume.updateATSScore(analysis.ats_score, analysis.feedback);
    } catch (error) {
      logger.error("Failed to analyze updated resume:", error);
    }

    return resume;
  }

  /**
   * Set resume as primary
   */
  async setPrimaryResume(resumeId, workerId) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    await resume.markAsPrimary();

    return resume;
  }

  /**
   * Delete resume
   */
  async deleteResume(resumeId, workerId) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    await resume.destroy();

    return { message: "Resume deleted successfully" };
  }

  /**
   * Enhance resume using AI
   */
  async enhanceResume(resumeId, workerId, options = {}) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
      include: [
        {
          model: Worker,
          as: "worker",
          include: [{ model: User, as: "user" }],
        },
      ],
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    // Get enhanced content from ML service
    const enhanced = await mlService.generateResume(
      resume.worker,
      resume.worker.user,
      {
        ...options,
        existing_content: resume.getFullContent(),
        enhance_mode: true,
      },
    );

    // Update resume with enhanced content
    if (enhanced.summary) resume.summary = enhanced.summary;
    if (enhanced.work_experience)
      resume.work_experience = enhanced.work_experience;
    if (enhanced.skills) resume.skills = enhanced.skills;

    resume.is_ai_enhanced = true;
    await resume.incrementVersion();

    // Re-analyze
    const analysis = await mlService.analyzeResume(resume.getFullContent());
    await resume.updateATSScore(analysis.ats_score, analysis.feedback);

    return {
      resume,
      analysis,
    };
  }

  /**
   * Analyze resume against a job
   */
  async analyzeResumeForJob(resumeId, workerId, jobDescription) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    const analysis = await mlService.analyzeResume(
      resume.getFullContent(),
      jobDescription,
    );

    return {
      resumeId,
      analysis,
    };
  }

  /**
   * Translate resume to another language
   */
  async translateResume(resumeId, workerId, targetLanguage) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    // Translate key text fields
    const content = resume.getFullContent();
    const translatedContent = {};

    if (content.summary) {
      const translated = await mlService.translateText(
        content.summary,
        resume.language,
        targetLanguage,
      );
      translatedContent.summary = translated.translated_text;
    }

    // Create new resume with translated content
    const translatedResume = await Resume.create({
      worker_id: workerId,
      title: `${resume.title} (${targetLanguage.toUpperCase()})`,
      personal_info: resume.personal_info,
      summary: translatedContent.summary || resume.summary,
      work_experience: resume.work_experience,
      education: resume.education,
      skills: resume.skills,
      languages: resume.languages,
      certifications: resume.certifications,
      content: { ...resume.content, ...translatedContent },
      template: resume.template,
      language: targetLanguage,
      is_ai_generated: true,
    });

    // Analyze translated resume
    try {
      const analysis = await mlService.analyzeResume(
        translatedResume.getFullContent(),
      );
      await translatedResume.updateATSScore(
        analysis.ats_score,
        analysis.feedback,
      );
    } catch (error) {
      logger.error("Failed to analyze translated resume:", error);
    }

    return translatedResume;
  }

  /**
   * Download resume (update download count)
   */
  async downloadResume(resumeId, workerId) {
    const resume = await Resume.findOne({
      where: { id: resumeId, worker_id: workerId },
      include: [
        {
          model: Worker,
          as: "worker",
          include: [{ model: User, as: "user", attributes: ["name"] }],
        },
      ],
    });

    if (!resume) {
      throw new NotFoundError("Resume");
    }

    await resume.incrementDownloads();

    return {
      resume,
      content: resume.getFullContent(),
    };
  }

  /**
   * Get primary resume for a worker
   */
  async getPrimaryResume(workerId) {
    let resume = await Resume.getPrimaryResume(workerId);

    if (!resume) {
      // Get most recent resume
      resume = await Resume.findOne({
        where: { worker_id: workerId },
        order: [["updated_at", "DESC"]],
      });
    }

    return resume;
  }
}

module.exports = new ResumeService();
