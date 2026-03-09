from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App settings
    app_name: str = "HackForge ML Service"
    app_version: str = "2.0.0"
    debug: bool = False
    environment: str = "development"

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8001

    # Redis settings
    redis_url: str = "redis://localhost:6379/1"

    # NLP Model settings
    model_cache_dir: str = "./models"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"

    # OCR settings
    tesseract_path: Optional[str] = None

    # ------- Model 1: Scheme Recommender -------
    scheme_portal_url: str = "https://www.india.gov.in/my-government/schemes"
    scheme_scrape_interval_hours: int = 24
    scheme_cache_ttl_seconds: int = 86400
    scheme_top_n: int = 5

    # ------- Model 2: Resume Builder -------
    linkedin_scrape_enabled: bool = True
    resume_pdf_output_dir: str = "./output/resumes"
    resume_max_skills: int = 20
    resume_ats_optimization: bool = True

    # ------- Model 3: Document Verification -------
    doc_verify_tampering_threshold: float = 0.30
    doc_verify_min_confidence: float = 0.60
    trust_score_doc_weight: float = 0.35
    trust_score_consistency_weight: float = 0.25
    trust_score_authenticity_weight: float = 0.25
    trust_score_employment_weight: float = 0.15

    # ------- Model 4: Job Matcher -------
    job_portal_base_url: str = "https://in.indeed.com"
    naukri_base_url: str = "https://www.naukri.com/rural-jobs"
    job_scrape_interval_hours: int = 6
    job_cache_ttl_seconds: int = 21600
    job_top_n: int = 10

    # Matching weights
    skills_weight: float = 0.40
    education_weight: float = 0.25
    experience_weight: float = 0.20
    location_weight: float = 0.15

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
