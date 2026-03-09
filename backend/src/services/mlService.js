const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { MLServiceError } = require("../utils/errors");
const { retry } = require("../utils/helpers");

class MLService {
  constructor() {
    this.baseUrl = config.mlService.url;
    this.timeout = config.mlService.timeout;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request/response logging
    this.client.interceptors.request.use((config) => {
      logger.debug("ML Service Request", {
        method: config.method,
        url: config.url,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        logger.logML(response.config.url, true);
        return response;
      },
      (error) => {
        logger.logML(error.config?.url, false);
        throw error;
      },
    );
  }

  /**
   * Calculate job match score
   */
  async calculateJobMatch(workerProfile, job) {
    try {
      const response = await retry(async () => {
        return this.client.post("/ml/job-match", {
          worker: {
            skills: workerProfile.skills,
            education: workerProfile.education,
            experience_years: workerProfile.experience_years,
            location: {
              lat: workerProfile.location_lat,
              lng: workerProfile.location_lng,
            },
            occupation: workerProfile.occupation,
            preferred_job_types: workerProfile.preferred_job_types,
          },
          job: {
            title: job.title,
            skills_required: job.skills_required,
            education_required: job.education_required,
            experience_min: job.experience_min,
            experience_max: job.experience_max,
            job_type: job.job_type,
            location: {
              lat: job.location_lat,
              lng: job.location_lng,
            },
          },
        });
      }, 3);

      return {
        match_score: response.data.match_score,
        skills_match: response.data.skills_match,
        education_match: response.data.education_match,
        experience_match: response.data.experience_match,
        location_score: response.data.location_score,
        breakdown: response.data.breakdown,
      };
    } catch (error) {
      logger.error("ML Service job-match error:", error);

      // Return fallback score if ML service fails
      return this.calculateFallbackJobMatch(workerProfile, job);
    }
  }

  /**
   * Generate resume from worker profile
   */
  async generateResume(workerProfile, user, options = {}) {
    try {
      const response = await this.client.post("/ml/resume-generate", {
        profile: {
          name: user.name,
          phone: user.phone,
          email: user.email,
          age: workerProfile.age,
          gender: workerProfile.gender,
          occupation: workerProfile.occupation,
          education: workerProfile.education,
          experience_years: workerProfile.experience_years,
          skills: workerProfile.skills,
          languages_known: workerProfile.languages_known,
          city: workerProfile.city,
          state: workerProfile.state,
          bio: workerProfile.bio,
        },
        options: {
          template: options.template || "basic",
          language: options.language || "en",
          include_photo: options.include_photo || false,
        },
      });

      return {
        content: response.data.content,
        summary: response.data.summary,
        work_experience: response.data.work_experience,
        education: response.data.education,
        skills: response.data.skills,
      };
    } catch (error) {
      logger.error("ML Service resume-generate error:", error);
      throw new MLServiceError("Failed to generate resume");
    }
  }

  /**
   * Analyze resume for ATS score
   */
  async analyzeResume(resumeContent, jobDescription = null) {
    try {
      const response = await this.client.post("/ml/resume-analyze", {
        resume: resumeContent,
        job_description: jobDescription,
      });

      return {
        ats_score: response.data.ats_score,
        feedback: response.data.feedback,
        suggestions: response.data.suggestions,
        keyword_match: response.data.keyword_match,
        sections_analysis: response.data.sections_analysis,
      };
    } catch (error) {
      logger.error("ML Service resume-analyze error:", error);
      throw new MLServiceError("Failed to analyze resume");
    }
  }

  /**
   * Calculate trust score
   */
  async calculateTrustScore(workerData) {
    try {
      const response = await this.client.post("/ml/trust-score", {
        profile_completeness: workerData.profileCompleteness,
        documents: workerData.documents,
        applications: workerData.applications,
        interviews: workerData.interviews,
        activity_history: workerData.activityHistory,
      });

      return {
        overall_score: response.data.overall_score,
        profile_completeness_score: response.data.profile_completeness_score,
        document_verification_score: response.data.document_verification_score,
        employment_history_score: response.data.employment_history_score,
        skills_score: response.data.skills_score,
        activity_score: response.data.activity_score,
        trust_level: response.data.trust_level,
        positive_factors: response.data.positive_factors,
        negative_factors: response.data.negative_factors,
        improvement_suggestions: response.data.improvement_suggestions,
      };
    } catch (error) {
      logger.error("ML Service trust-score error:", error);

      // Return fallback calculation
      return this.calculateFallbackTrustScore(workerData);
    }
  }

  /**
   * Check scheme eligibility
   */
  async checkSchemeEligibility(workerProfile, scheme) {
    try {
      const response = await this.client.post("/ml/scheme-eligibility", {
        worker: {
          age: workerProfile.age,
          gender: workerProfile.gender,
          education: workerProfile.education,
          occupation: workerProfile.occupation,
          state: workerProfile.state,
          income: workerProfile.income,
          documents: workerProfile.documents,
        },
        scheme: {
          id: scheme.id,
          eligibility_rules: scheme.eligibility_rules,
          min_age: scheme.min_age,
          max_age: scheme.max_age,
          gender_eligibility: scheme.gender_eligibility,
          education_required: scheme.education_required,
          required_documents: scheme.required_documents,
        },
      });

      return {
        eligible: response.data.eligible,
        eligibility_score: response.data.eligibility_score,
        matched_criteria: response.data.matched_criteria,
        missing_criteria: response.data.missing_criteria,
        required_documents: response.data.required_documents,
        recommendations: response.data.recommendations,
      };
    } catch (error) {
      logger.error("ML Service scheme-eligibility error:", error);

      // Return fallback eligibility check
      return this.checkFallbackEligibility(workerProfile, scheme);
    }
  }

  /**
   * Verify document using OCR and AI
   */
  async verifyDocument(documentType, documentImage) {
    try {
      const response = await this.client.post("/ml/verify-document", {
        document_type: documentType,
        image: documentImage, // base64 encoded
      });

      return {
        verified: response.data.verified,
        confidence: response.data.confidence,
        extracted_data: response.data.extracted_data,
        issues: response.data.issues,
      };
    } catch (error) {
      logger.error("ML Service verify-document error:", error);
      throw new MLServiceError("Failed to verify document");
    }
  }

  /**
   * Translate text
   */
  async translateText(text, sourceLang, targetLang) {
    try {
      const response = await this.client.post("/ml/translate", {
        text,
        source_language: sourceLang,
        target_language: targetLang,
      });

      return {
        translated_text: response.data.translated_text,
        confidence: response.data.confidence,
      };
    } catch (error) {
      logger.error("ML Service translate error:", error);
      throw new MLServiceError("Failed to translate text");
    }
  }

  /**
   * Fallback job match calculation
   */
  calculateFallbackJobMatch(workerProfile, job) {
    let score = 50; // Base score
    let skillsMatch = 0;
    let educationMatch = false;
    let experienceMatch = false;

    // Skills match (40% weight)
    if (job.skills_required && workerProfile.skills) {
      const requiredSkills = new Set(
        job.skills_required.map((s) => s.toLowerCase()),
      );
      const workerSkills = new Set(
        workerProfile.skills.map((s) => s.toLowerCase()),
      );
      let matches = 0;
      for (const skill of requiredSkills) {
        if (workerSkills.has(skill)) matches++;
      }
      skillsMatch =
        requiredSkills.size > 0 ? (matches / requiredSkills.size) * 100 : 0;
      score += skillsMatch * 0.4;
    }

    // Education match (30% weight)
    const eduLevels = {
      none: 0,
      primary: 1,
      secondary: 2,
      higher_secondary: 3,
      graduate: 4,
      post_graduate: 5,
    };
    const requiredLevel = eduLevels[job.education_required] || 0;
    const workerLevel = eduLevels[workerProfile.education] || 0;
    educationMatch = workerLevel >= requiredLevel;
    if (educationMatch) score += 30;

    // Experience match (30% weight)
    const workerExp = workerProfile.experience_years || 0;
    if (workerExp >= (job.experience_min || 0)) {
      experienceMatch = true;
      score += 30;
    }

    return {
      match_score: Math.min(Math.round(score), 100),
      skills_match: Math.round(skillsMatch),
      education_match: educationMatch,
      experience_match: experienceMatch,
      location_score: 50, // Default
      breakdown: {
        skills: skillsMatch,
        education: educationMatch ? 100 : 0,
        experience: experienceMatch ? 100 : 0,
      },
    };
  }

  /**
   * Fallback trust score calculation
   */
  calculateFallbackTrustScore(workerData) {
    let profileScore = workerData.profileCompleteness || 0;
    let documentScore = 0;
    let activityScore = 0;

    // Document score
    if (workerData.documents) {
      const verified = workerData.documents.filter((d) => d.verified).length;
      const total = workerData.documents.length;
      documentScore = total > 0 ? (verified / total) * 100 : 0;
    }

    // Activity score
    if (workerData.applications > 0 || workerData.interviews > 0) {
      activityScore = Math.min(
        workerData.applications * 5 + workerData.interviews * 10,
        100,
      );
    }

    const overallScore = Math.round(
      profileScore * 0.2 + documentScore * 0.35 + activityScore * 0.15 + 30, // Base score
    );

    let trustLevel = "unverified";
    if (overallScore >= 90) trustLevel = "premium";
    else if (overallScore >= 75) trustLevel = "trusted";
    else if (overallScore >= 50) trustLevel = "verified";
    else if (overallScore >= 25) trustLevel = "basic";

    return {
      overall_score: overallScore,
      profile_completeness_score: profileScore,
      document_verification_score: documentScore,
      employment_history_score: 0,
      skills_score: 0,
      activity_score: activityScore,
      trust_level: trustLevel,
      positive_factors: [],
      negative_factors: [],
      improvement_suggestions: [
        "Complete your profile",
        "Upload verification documents",
      ],
    };
  }

  /**
   * Fallback eligibility check
   */
  checkFallbackEligibility(workerProfile, scheme) {
    const issues = [];
    let score = 100;

    // Age check
    if (scheme.min_age && workerProfile.age < scheme.min_age) {
      issues.push(`Age below minimum (${scheme.min_age})`);
      score -= 25;
    }
    if (scheme.max_age && workerProfile.age > scheme.max_age) {
      issues.push(`Age above maximum (${scheme.max_age})`);
      score -= 25;
    }

    // Gender check
    if (
      scheme.gender_eligibility !== "all" &&
      workerProfile.gender !== scheme.gender_eligibility
    ) {
      issues.push("Gender eligibility not met");
      score -= 25;
    }

    // State check
    if (scheme.state && workerProfile.state !== scheme.state) {
      issues.push("State eligibility not met");
      score -= 25;
    }

    return {
      eligible: issues.length === 0,
      eligibility_score: Math.max(score, 0),
      matched_criteria: [],
      missing_criteria: issues,
      required_documents: scheme.required_documents || [],
      recommendations:
        issues.length > 0 ? ["Check eligibility criteria carefully"] : [],
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get("/health", { timeout: 5000 });
      return { healthy: true, status: response.data };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new MLService();
