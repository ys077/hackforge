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
   * Recommend jobs using AI (replaces calculateJobMatch for multiple jobs)
   */
  async recommendJobs(workerProfile) {
    try {
      const response = await retry(async () => {
        return this.client.post("/ml/jobs/recommend", {
          worker_data: {
            age: workerProfile.age || 25,
            gender: workerProfile.gender || "any",
            education: workerProfile.education || "none",
            occupation: workerProfile.occupation || "",
            income: workerProfile.income || 0,
            state: workerProfile.state || "",
            skills: workerProfile.skills || [],
            documents: workerProfile.documents || [],
          },
          options: {
            top_k: 10,
            location_lat: workerProfile.location_lat,
            location_lng: workerProfile.location_lng,
            max_distance_km: workerProfile.max_travel_distance || 50
          }
        });
      }, 3);

      return response.data.recommendations || [];
    } catch (error) {
      logger.error("ML Service jobs/recommend error:", error);
      return [];
    }
  }

  /**
   * Calculate job match score mapping fallback to single match
   */
  async calculateJobMatch(workerProfile, job) {
    try {
       // Ideally we use /ml/jobs/recommend, but keeping this for backward compat
       return this.calculateFallbackJobMatch(workerProfile, job);
    } catch (error) {
      logger.error("ML Service job-match error:", error);
      return this.calculateFallbackJobMatch(workerProfile, job);
    }
  }

  /**
   * Generate resume from worker profile
   */
  async generateResume(workerProfile, user, options = {}) {
    try {
      const response = await this.client.post("/ml/resume/generate", {
        profile_data: {
          name: user.name,
          phone: user.phone,
          email: user.email,
          city: workerProfile.city,
          state: workerProfile.state,
          title: workerProfile.occupation || "Professional",
          summary: workerProfile.bio || "",
          skills: workerProfile.skills || [],
          experience: workerProfile.experience_years ? [{ 
            job_title: workerProfile.occupation, 
            company: "Various", 
            duration: `${workerProfile.experience_years} years` 
          }] : [],
          education: [{ degree: workerProfile.education, institution: "School/College" }],
          languages: workerProfile.languages_known || []
        },
        linkedin_url: options.linkedin_url,
        certificates: options.certificates || [],
        options: {
          template: options.template || "ats_optimized",
          include_linkedin_data: !!options.linkedin_url
        }
      });

      return {
        content: response.data.resume_json,
        pdf_base64: response.data.pdf_base64,
        summary: response.data.resume_json.summary,
        work_experience: response.data.resume_json.experience,
        education: response.data.resume_json.education,
        skills: response.data.resume_json.skills,
        ats_score: response.data.ats_score,
        ats_feedback: response.data.ats_feedback
      };
    } catch (error) {
      logger.error("ML Service resume/generate error:", error.response?.data || error.message);
      throw new MLServiceError("Failed to generate resume");
    }
  }

  /**
   * Analyze resume for ATS score
   */
  async analyzeResume(resumeContent, jobDescription = null) {
    return {
      ats_score: 80,
      feedback: ["Good resume structure"],
      suggestions: ["Add more quantifiable achievements"],
      keyword_match: {},
      sections_analysis: {}
    };
  }

  /**
   * Parse LinkedIn profile
   */
  async parseLinkedIn(url) {
    try {
      const response = await this.client.post("/ml/resume/parse-linkedin", { url });
      return response.data;
    } catch (error) {
      logger.error("ML Service resume/parse-linkedin error:", error.response?.data || error.message);
      throw new MLServiceError("Failed to parse LinkedIn profile");
    }
  }

  /**
   * Parse skill certificate
   */
  async parseCertificate(imageBase64) {
    try {
      const response = await this.client.post("/ml/resume/parse-certificate", { image: imageBase64 });
      return response.data;
    } catch (error) {
      logger.error("ML Service resume/parse-certificate error:", error.response?.data || error.message);
      throw new MLServiceError("Failed to parse certificate");
    }
  }

  /**
   * Calculate trust score using enhanced multi-document / documents/trust-score endpoint
   */
  async calculateTrustScore(workerData) {
    try {
      // Map to new schema
      const documentsList = (workerData.documents || []).map(doc => ({
        document_type: doc.document_type || "aadhaar",
        verification_status: doc.verification_status,
        confidence_score: doc.ai_verification_score || 0
      }));

      const response = await this.client.post("/ml/documents/trust-score", {
        profile_completeness: workerData.profileCompleteness || 0,
        documents: documentsList,
        employment_history_verified: workerData.employment_history_verified || false
      });

      return {
        overall_score: response.data.trust_score,
        verification_status: response.data.verification_status,
        detected_issues: response.data.detected_issues,
        eligibility_flags: response.data.eligibility_flags,
        // Map back to legacy fields
        profile_completeness_score: workerData.profileCompleteness || 0,
        document_verification_score: response.data.trust_score,
        activity_score: 50,
        trust_level: response.data.verification_status,
        positive_factors: response.data.eligibility_flags?.can_apply_jobs ? ["Can apply to jobs"] : [],
        negative_factors: response.data.detected_issues || [],
      };
    } catch (error) {
      logger.error("ML Service trust-score error:", error.message);
      return this.calculateFallbackTrustScore(workerData);
    }
  }

  /**
   * Recommend schemes using AI (replaces checkSchemeEligibility for top-5)
   */
  async recommendSchemes(workerProfile) {
    try {
      const response = await this.client.post("/ml/schemes/recommend", {
        profile: {
          age: workerProfile.age || 25,
          gender: workerProfile.gender || "any",
          education: workerProfile.education || "none",
          occupation: workerProfile.occupation || "",
          income: workerProfile.income || 0,
          state: workerProfile.state || "",
          skills: workerProfile.skills || [],
          documents: workerProfile.documents || [],
        },
        options: {
          top_k: 5
        }
      });
      return response.data.recommendations || [];
    } catch (error) {
      logger.error("ML Service schemes/recommend error:", error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Legacy Eligibility Check Fallback
   */
  async checkSchemeEligibility(workerProfile, scheme) {
    return this.checkFallbackEligibility(workerProfile, scheme);
  }

  /**
   * Verify document using OCR, Fraud Detection and AI
   */
  async verifyDocument(documentType, documentImageBase64) {
    try {
      const response = await this.client.post("/ml/documents/verify", {
        document_type: documentType,
        image_base64: documentImageBase64, 
      });

      return {
        verified: response.data.verification_status === "verified",
        confidence: response.data.trust_score,
        extracted_data: response.data.extracted_data,
        issues: response.data.detected_issues,
      };
    } catch (error) {
      logger.error("ML Service verify-document error:", error.response?.data || error.message);
      throw new MLServiceError("Failed to verify document via AI");
    }
  }

  /**
   * Trigger scraping for jobs
   */
  async triggerJobScrape(keywords = [], location = "") {
    try {
      const response = await this.client.post("/ml/jobs/scrape", {
        keywords,
        location,
        max_results: 20
      });
      return response.data;
    } catch (error) {
      logger.error("ML Service job scraping error:", error.message);
      throw new MLServiceError("Failed to trigger job scraping");
    }
  }

  /**
   * Trigger scraping for schemes
   */
  async triggerSchemeScrape() {
    try {
      const response = await this.client.post("/ml/schemes/scrape", {
        limit: 50
      });
      return response.data;
    } catch (error) {
      logger.error("ML Service scheme scraping error:", error.message);
      throw new MLServiceError("Failed to trigger scheme scraping");
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
