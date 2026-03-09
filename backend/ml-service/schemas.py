from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


# ==================== Common Models ====================

class Location(BaseModel):
    lat: float
    lng: float


# ==================== Model 1: Scheme Recommender ====================

class SchemeWorker(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    state: Optional[str] = None
    income: Optional[float] = None
    skills: List[str] = []
    documents: List[str] = []


class SchemeRecommendRequest(BaseModel):
    worker: SchemeWorker
    top_n: int = 5
    category_filter: Optional[str] = None


class SchemeRecommendation(BaseModel):
    scheme_name: str
    scheme_id: str
    eligibility_score: float
    eligible: bool
    required_documents: List[str] = []
    benefits: str = ""
    application_link: str = ""
    category: str = ""
    matched_criteria: List[str] = []
    missing_criteria: List[str] = []
    explanation: str = ""
    recommendations: List[str] = []


class SchemeRecommendResponse(BaseModel):
    total_schemes_analyzed: int
    recommendations: List[SchemeRecommendation]
    worker_profile_summary: str = ""


class SchemeScrapeResponse(BaseModel):
    total_schemes: int
    categories: List[str] = []
    last_updated: str = ""


# Legacy schema for backward compatibility
class SchemeDetails(BaseModel):
    id: str
    eligibility_rules: Dict[str, Any] = {}
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    gender_eligibility: str = "all"
    education_required: Optional[str] = None
    required_documents: List[str] = []


class SchemeEligibilityRequest(BaseModel):
    worker: SchemeWorker
    scheme: SchemeDetails


class SchemeEligibilityResponse(BaseModel):
    eligible: bool
    eligibility_score: float
    matched_criteria: List[str]
    missing_criteria: List[str]
    required_documents: List[str]
    recommendations: List[str]
    explanation: str = ""


# ==================== Model 2: Resume Builder ====================

class ResumeProfile(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    experience_years: Optional[float] = 0
    skills: List[str] = []
    languages_known: List[str] = []
    city: Optional[str] = None
    state: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None


class ResumeOptions(BaseModel):
    template: str = "ats_optimized"
    language: str = "en"
    include_photo: bool = False
    generate_pdf: bool = True


class ResumeGenerateRequest(BaseModel):
    profile: ResumeProfile
    options: ResumeOptions = ResumeOptions()
    certificates: List[str] = []  # Base64 encoded cert images


class ResumeGenerateResponse(BaseModel):
    content: Dict[str, Any]
    summary: str
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    skills: List[str]
    certifications: List[Dict[str, Any]] = []
    achievements: List[str] = []
    json_resume: Dict[str, Any] = {}
    pdf_base64: Optional[str] = None


class LinkedInParseRequest(BaseModel):
    linkedin_url: str


class LinkedInParseResponse(BaseModel):
    success: bool
    source: str = ""
    name: str = ""
    headline: str = ""
    location: str = ""
    summary: str = ""
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    error: Optional[str] = None


class CertificateParseRequest(BaseModel):
    image: str  # Base64 encoded


class CertificateParseResponse(BaseModel):
    success: bool
    skill_name: str = ""
    issuing_organization: str = ""
    certification_year: Optional[int] = None
    holder_name: str = ""
    skills_extracted: List[str] = []
    category: str = ""
    confidence: float = 0.0
    error: Optional[str] = None


class ResumeAnalyzeRequest(BaseModel):
    resume: str
    job_description: Optional[str] = None


class ResumeAnalyzeResponse(BaseModel):
    ats_score: float
    feedback: List[str]
    suggestions: List[str]
    keyword_match: Optional[float] = None
    sections_analysis: Dict[str, Any]


# ==================== Model 3: Document Verification ====================

class DocumentVerifyRequest(BaseModel):
    document_type: str  # aadhaar, pan, voter_id, passbook, certificate, employment_letter, trade_license
    image: str  # Base64 encoded
    user_name: Optional[str] = None
    user_dob: Optional[str] = None
    user_address: Optional[str] = None


class DocumentVerifyResponse(BaseModel):
    verified: bool
    document_type: str = ""
    confidence: float = 0.0
    trust_score: int = 0
    verification_status: str = "pending"  # verified, suspicious, rejected
    extracted_data: Dict[str, Any] = {}
    tampering_analysis: Dict[str, Any] = {}
    format_validation: Dict[str, Any] = {}
    consistency_check: Dict[str, Any] = {}
    ml_classification: Optional[Dict[str, Any]] = None  # PyTorch classifier result
    detected_issues: List[str] = []
    checks_performed: List[str] = []


class DocumentClassifyRequest(BaseModel):
    image: str  # Base64 encoded document image


class DocumentClassifyResponse(BaseModel):
    predicted_type: str
    confidence: float
    model_available: bool
    all_scores: Dict[str, float] = {}
    error: Optional[str] = None


class MultiDocumentVerifyRequest(BaseModel):
    documents: List[Dict[str, str]]  # Each: {type, image}
    user_name: Optional[str] = None
    user_dob: Optional[str] = None


class MultiDocumentVerifyResponse(BaseModel):
    overall_trust_score: float
    overall_status: str
    verified_count: int
    total_documents: int
    document_results: List[Dict[str, Any]]
    cross_document_validation: Dict[str, Any] = {}
    detected_issues: List[str] = []


class TrustScoreDocument(BaseModel):
    type: str
    verified: bool


class TrustScoreRequest(BaseModel):
    profile_completeness: float = 0
    documents: List[TrustScoreDocument] = []
    applications: int = 0
    interviews: int = 0
    activity_history: List[Dict[str, Any]] = []
    verification_results: Optional[List[Dict[str, Any]]] = None


class TrustScoreResponse(BaseModel):
    overall_score: float
    trust_level: str
    profile_completeness_score: float
    document_verification_score: float
    consistency_score: float = 50.0
    authenticity_score: float = 50.0
    employment_history_score: float
    skills_score: float
    activity_score: float
    eligibility_flags: Dict[str, bool] = {}
    positive_factors: List[str]
    negative_factors: List[str]
    improvement_suggestions: List[str]


# ==================== Model 4: Job Matcher ====================

class WorkerProfile(BaseModel):
    skills: List[str] = []
    education: Optional[str] = None
    experience_years: Optional[float] = 0
    location: Optional[Location] = None
    occupation: Optional[str] = None
    preferred_job_types: List[str] = []
    city: Optional[str] = None
    state: Optional[str] = None


class JobDetails(BaseModel):
    title: str
    skills_required: List[str] = []
    education_required: Optional[str] = None
    experience_min: Optional[float] = 0
    experience_max: Optional[float] = None
    job_type: Optional[str] = None
    location: Optional[Location] = None


class JobMatchRequest(BaseModel):
    worker: WorkerProfile
    job: JobDetails


class JobMatchResponse(BaseModel):
    match_score: float
    skills_match: float
    education_match: bool
    experience_match: bool
    location_score: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    breakdown: Dict[str, Any]


class JobRecommendRequest(BaseModel):
    worker: WorkerProfile
    top_n: int = 10
    location_filter: Optional[str] = None
    scheme_benefits: Optional[List[str]] = None


class JobRecommendation(BaseModel):
    job_title: str
    company: str
    location: str
    salary: str = ""
    match_score: float
    application_link: str
    job_type: str = ""
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    education_match: bool = True
    experience_match: bool = True
    explanation: str = ""
    breakdown: Dict[str, Any] = {}


class JobRecommendResponse(BaseModel):
    total_jobs_analyzed: int
    recommendations: List[JobRecommendation]


class JobScrapeResponse(BaseModel):
    total_jobs: int
    locations: List[str] = []
    last_updated: str = ""


# ==================== Other ====================

class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str


class TranslateResponse(BaseModel):
    translated_text: str
    confidence: float


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime: float
    models_loaded: List[str] = []
