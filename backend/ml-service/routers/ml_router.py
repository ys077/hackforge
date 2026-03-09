from fastapi import APIRouter, HTTPException, status
from loguru import logger

from schemas import (
    JobMatchRequest, JobMatchResponse,
    ResumeGenerateRequest, ResumeGenerateResponse,
    ResumeAnalyzeRequest, ResumeAnalyzeResponse,
    TrustScoreRequest, TrustScoreResponse,
    SchemeEligibilityRequest, SchemeEligibilityResponse,
    DocumentVerifyRequest, DocumentVerifyResponse,
    TranslateRequest, TranslateResponse,
)
from services import (
    get_job_matcher,
    get_resume_generator,
    get_resume_analyzer,
    get_trust_calculator,
    get_scheme_checker,
)

router = APIRouter(prefix="/ml", tags=["ML Services"])


@router.post("/job-match", response_model=JobMatchResponse)
async def calculate_job_match(request: JobMatchRequest):
    """Calculate job match score between worker and job."""
    try:
        matcher = get_job_matcher()
        
        worker_location = None
        if request.worker.location:
            worker_location = (request.worker.location.lat, request.worker.location.lng)
        
        job_location = None
        if request.job.location:
            job_location = (request.job.location.lat, request.job.location.lng)
        
        result = matcher.calculate_match(
            worker_skills=request.worker.skills,
            worker_education=request.worker.education,
            worker_experience=request.worker.experience_years,
            worker_location=worker_location,
            job_skills=request.job.skills_required,
            job_education=request.job.education_required,
            job_exp_min=request.job.experience_min or 0,
            job_exp_max=request.job.experience_max,
            job_location=job_location,
        )
        
        return JobMatchResponse(**result)
    
    except Exception as e:
        logger.error(f"Job match error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job matching failed: {str(e)}",
        )


@router.post("/resume-generate", response_model=ResumeGenerateResponse)
async def generate_resume(request: ResumeGenerateRequest):
    """Generate resume from worker profile."""
    try:
        generator = get_resume_generator()
        
        result = generator.generate(
            profile=request.profile.model_dump(),
            options=request.options.model_dump(),
        )
        
        return ResumeGenerateResponse(**result)
    
    except Exception as e:
        logger.error(f"Resume generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume generation failed: {str(e)}",
        )


@router.post("/resume-analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(request: ResumeAnalyzeRequest):
    """Analyze resume for ATS compatibility."""
    try:
        analyzer = get_resume_analyzer()
        
        result = analyzer.analyze(
            resume_text=request.resume,
            job_description=request.job_description,
        )
        
        return ResumeAnalyzeResponse(**result)
    
    except Exception as e:
        logger.error(f"Resume analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume analysis failed: {str(e)}",
        )


@router.post("/trust-score", response_model=TrustScoreResponse)
async def calculate_trust_score(request: TrustScoreRequest):
    """Calculate trust score for worker."""
    try:
        calculator = get_trust_calculator()
        
        documents = [d.model_dump() for d in request.documents]
        
        result = calculator.calculate(
            profile_completeness=request.profile_completeness,
            documents=documents,
            applications=request.applications,
            interviews=request.interviews,
            activity_history=request.activity_history,
        )
        
        return TrustScoreResponse(**result)
    
    except Exception as e:
        logger.error(f"Trust score error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trust score calculation failed: {str(e)}",
        )


@router.post("/scheme-eligibility", response_model=SchemeEligibilityResponse)
async def check_scheme_eligibility(request: SchemeEligibilityRequest):
    """Check scheme eligibility for worker."""
    try:
        checker = get_scheme_checker()
        
        result = checker.check_eligibility(
            worker=request.worker.model_dump(),
            scheme=request.scheme.model_dump(),
        )
        
        return SchemeEligibilityResponse(**result)
    
    except Exception as e:
        logger.error(f"Scheme eligibility error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scheme eligibility check failed: {str(e)}",
        )


@router.post("/verify-document", response_model=DocumentVerifyResponse)
async def verify_document(request: DocumentVerifyRequest):
    """Verify document using OCR and AI (placeholder)."""
    try:
        # Placeholder implementation
        # In production, this would use OCR and document verification models
        
        return DocumentVerifyResponse(
            verified=True,
            confidence=75.0,
            extracted_data={
                'document_type': request.document_type,
                'status': 'pending_manual_review',
            },
            issues=['Automated verification not available, queued for manual review'],
        )
    
    except Exception as e:
        logger.error(f"Document verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document verification failed: {str(e)}",
        )


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """Translate text between languages (placeholder)."""
    try:
        # Placeholder implementation
        # In production, this would use a translation API or model
        
        return TranslateResponse(
            translated_text=request.text,  # Passthrough for now
            confidence=0.0,
        )
    
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}",
        )
