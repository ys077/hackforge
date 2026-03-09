import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import sys

from config import settings
from routers import ml_router
from schemas import HealthResponse


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG" if settings.debug else "INFO",
)

# Track startup time
start_time = time.time()

# Track loaded models
loaded_models = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events — initialize all AI models."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")

    # Initialize Model 1: Scheme Recommender
    try:
        from services import get_scheme_scraper, get_scheme_checker
        scraper = get_scheme_scraper()
        checker = get_scheme_checker()
        loaded_models.append("scheme_recommender")
        logger.info(f"✅ Model 1: Scheme Recommender loaded ({len(scraper.get_all_schemes())} schemes)")
    except Exception as e:
        logger.error(f"❌ Model 1 failed to load: {e}")

    # Initialize Model 2: Resume Builder
    try:
        from services import get_resume_generator, get_resume_analyzer, get_linkedin_parser, get_certificate_parser
        get_resume_generator()
        get_resume_analyzer()
        get_linkedin_parser()
        get_certificate_parser()
        loaded_models.append("resume_builder")
        logger.info("✅ Model 2: Resume Builder loaded")
    except Exception as e:
        logger.error(f"❌ Model 2 failed to load: {e}")

    # Initialize Model 3: Document Verifier & Trust Score
    try:
        from services import get_document_verifier, get_trust_calculator
        get_document_verifier()
        get_trust_calculator()
        loaded_models.append("document_verifier")
        loaded_models.append("trust_scorer")
        logger.info("✅ Model 3: Document Verifier & Trust Score loaded")
    except Exception as e:
        logger.error(f"❌ Model 3 failed to load: {e}")

    # Initialize Model 4: Job Matcher
    try:
        from services import get_job_scraper, get_job_matcher
        scraper = get_job_scraper()
        get_job_matcher()
        loaded_models.append("job_matcher")
        logger.info(f"✅ Model 4: Job Matcher loaded ({len(scraper.get_all_jobs())} jobs)")
    except Exception as e:
        logger.error(f"❌ Model 4 failed to load: {e}")

    # Initialize shared NLP engine
    try:
        from utils.nlp_utils import get_nlp_engine
        get_nlp_engine()
        loaded_models.append("nlp_engine")
        logger.info("✅ NLP Engine loaded")
    except Exception as e:
        logger.error(f"❌ NLP Engine failed to load: {e}")

    # Initialize shared OCR engine
    try:
        from utils.ocr_utils import get_ocr_engine
        get_ocr_engine(settings.tesseract_path)
        loaded_models.append("ocr_engine")
        logger.info("✅ OCR Engine loaded")
    except Exception as e:
        logger.error(f"❌ OCR Engine failed to load: {e}")

    logger.info(f"🚀 All models initialized: {len(loaded_models)} modules loaded")
    logger.info(f"📡 API docs available at http://{settings.host}:{settings.port}/docs")

    yield

    logger.info("Shutting down ML service...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    ## HackForge ML Service — AI-Powered Platform for Informal Workers

    ### 🎯 Model 1: Government Scheme Recommender
    Matches users to eligible Indian government welfare schemes from india.gov.in.
    Returns top-5 recommendations with explainability.

    ### 📄 Model 2: AI Resume Builder
    Generates ATS-optimized resumes from LinkedIn profiles + skill certificates.
    Outputs PDF and JSON resume data.

    ### 🔍 Model 3: Document Verification & Trust Score
    AI-powered document authenticity verification with OCR, tampering detection,
    and fraud risk scoring (0-100).

    ### 💼 Model 4: AI Job Matcher
    Recommends top-10 jobs matching user profile with Indeed apply links.
    Multi-signal ranking using NLP similarity.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    process_time = time.time() - start

    logger.debug(
        f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s"
    )

    return response


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        uptime=time.time() - start_time,
        models_loaded=loaded_models,
    )


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
        "models_loaded": loaded_models,
        "endpoints": {
            "scheme_recommend": "/ml/schemes/recommend",
            "scheme_scrape": "/ml/schemes/scrape",
            "resume_generate": "/ml/resume/generate",
            "resume_parse_linkedin": "/ml/resume/parse-linkedin",
            "resume_parse_certificate": "/ml/resume/parse-certificate",
            "document_verify": "/ml/documents/verify",
            "document_verify_multiple": "/ml/documents/verify-multiple",
            "trust_score": "/ml/documents/trust-score",
            "job_recommend": "/ml/jobs/recommend",
            "job_scrape": "/ml/jobs/scrape",
        },
    }


# Include routers
app.include_router(ml_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
