from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class Location(BaseModel):
    lat: float
    lng: float


class WorkerProfile(BaseModel):
    skills: List[str] = []
    education: Optional[str] = None
    experience_years: Optional[float] = 0
    location: Optional[Location] = None
    occupation: Optional[str] = None
    preferred_job_types: List[str] = []


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
    breakdown: Dict[str, Any]


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


class ResumeOptions(BaseModel):
    template: str = "basic"
    language: str = "en"
    include_photo: bool = False


class ResumeGenerateRequest(BaseModel):
    profile: ResumeProfile
    options: ResumeOptions = ResumeOptions()


class ResumeGenerateResponse(BaseModel):
    content: Dict[str, Any]
    summary: str
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    skills: List[str]


class ResumeAnalyzeRequest(BaseModel):
    resume: str
    job_description: Optional[str] = None


class ResumeAnalyzeResponse(BaseModel):
    ats_score: float
    feedback: List[str]
    suggestions: List[str]
    keyword_match: Optional[float] = None
    sections_analysis: Dict[str, Any]


class TrustScoreDocument(BaseModel):
    type: str
    verified: bool


class TrustScoreRequest(BaseModel):
    profile_completeness: float = 0
    documents: List[TrustScoreDocument] = []
    applications: int = 0
    interviews: int = 0
    activity_history: List[Dict[str, Any]] = []


class TrustScoreResponse(BaseModel):
    overall_score: float
    profile_completeness_score: float
    document_verification_score: float
    employment_history_score: float
    skills_score: float
    activity_score: float
    trust_level: str
    positive_factors: List[str]
    negative_factors: List[str]
    improvement_suggestions: List[str]


class SchemeWorker(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    state: Optional[str] = None
    income: Optional[float] = None
    documents: List[str] = []


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


class DocumentVerifyRequest(BaseModel):
    document_type: str
    image: str  # Base64 encoded


class DocumentVerifyResponse(BaseModel):
    verified: bool
    confidence: float
    extracted_data: Dict[str, Any]
    issues: List[str]


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
