from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App settings
    app_name: str = "HackForge ML Service"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8001
    
    # Redis settings
    redis_url: str = "redis://localhost:6379/1"
    
    # Model settings
    model_cache_dir: str = "./models"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    
    # OCR settings
    tesseract_path: Optional[str] = None
    
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
