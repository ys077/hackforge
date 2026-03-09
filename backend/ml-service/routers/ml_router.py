from fastapi import APIRouter, HTTPException, status
from loguru import logger
from datetime import datetime

from schemas import (
    # Model 1: Scheme Recommender
    SchemeRecommendRequest, SchemeRecommendResponse, SchemeRecommendation,
    SchemeScrapeResponse,
    SchemeEligibilityRequest, SchemeEligibilityResponse,
    # Model 2: Resume Builder
    ResumeGenerateRequest, ResumeGenerateResponse,
    ResumeAnalyzeRequest, ResumeAnalyzeResponse,
    LinkedInParseRequest, LinkedInParseResponse,
    CertificateParseRequest, CertificateParseResponse,
    # Model 3: Document Verification
    DocumentVerifyRequest, DocumentVerifyResponse,
    MultiDocumentVerifyRequest, MultiDocumentVerifyResponse,
    TrustScoreRequest, TrustScoreResponse,
    DocumentClassifyRequest, DocumentClassifyResponse,
    # Model 4: Job Matcher
    JobMatchRequest, JobMatchResponse,
    JobRecommendRequest, JobRecommendResponse, JobRecommendation,
    JobScrapeResponse,
    # Other
    TranslateRequest, TranslateResponse,
)
from services import (
    get_job_matcher,
    get_resume_generator,
    get_resume_analyzer,
    get_trust_calculator,
    get_scheme_checker,
    get_scheme_scraper,
    get_linkedin_parser,
    get_certificate_parser,
    get_document_verifier,
    get_document_classifier,
    get_job_scraper,
)

router = APIRouter(prefix="/ml", tags=["ML Services"])


# ==================== Model 1: Scheme Recommender ====================

@router.post("/schemes/recommend", response_model=SchemeRecommendResponse)
async def recommend_schemes(request: SchemeRecommendRequest):
    """🎯 Recommend top-N government schemes based on user profile.
    
    Analyzes user's age, gender, education, occupation, income, state,
    skills, and documents to find the most relevant government welfare schemes.
    Returns eligibility scores with explainability.
    """
    try:
        scraper = get_scheme_scraper()
        checker = get_scheme_checker()

        # Get all schemes
        schemes = scraper.get_all_schemes()

        # Filter by category if specified
        if request.category_filter:
            schemes = [s for s in schemes if s.get('category') == request.category_filter]

        # Get recommendations
        worker = request.worker.model_dump()
        recommendations = checker.recommend_schemes(
            worker=worker,
            schemes=schemes,
            top_n=request.top_n,
        )

        from utils.nlp_utils import get_nlp_engine
        nlp = get_nlp_engine()
        profile_summary = nlp.generate_profile_text(worker)

        return SchemeRecommendResponse(
            total_schemes_analyzed=len(schemes),
            recommendations=[SchemeRecommendation(**r) for r in recommendations],
            worker_profile_summary=profile_summary,
        )

    except Exception as e:
        logger.error(f"Scheme recommendation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scheme recommendation failed: {str(e)}",
        )


@router.post("/schemes/scrape", response_model=SchemeScrapeResponse)
async def scrape_schemes():
    """🔄 Trigger scraping of government schemes from india.gov.in portal."""
    try:
        scraper = get_scheme_scraper()
        schemes = await scraper.scrape_schemes()

        categories = list(set(s.get('category', '') for s in schemes if s.get('category')))

        return SchemeScrapeResponse(
            total_schemes=len(schemes),
            categories=sorted(categories),
            last_updated=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.error(f"Scheme scraping error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scheme scraping failed: {str(e)}",
        )


@router.post("/scheme-eligibility", response_model=SchemeEligibilityResponse)
async def check_scheme_eligibility(request: SchemeEligibilityRequest):
    """Check eligibility for a specific scheme (legacy endpoint)."""
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


# ==================== Model 2: Resume Builder ====================

@router.post("/resume/parse-linkedin", response_model=LinkedInParseResponse)
async def parse_linkedin_profile(request: LinkedInParseRequest):
    """🔗 Parse LinkedIn profile URL to extract structured resume data."""
    try:
        parser = get_linkedin_parser()
        result = await parser.parse_profile(request.linkedin_url)
        return LinkedInParseResponse(**result)

    except Exception as e:
        logger.error(f"LinkedIn parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LinkedIn parsing failed: {str(e)}",
        )


@router.post("/resume/parse-certificate", response_model=CertificateParseResponse)
async def parse_certificate(request: CertificateParseRequest):
    """📜 Parse skill certificate image using OCR to extract skills and issuer."""
    try:
        parser = get_certificate_parser()
        result = parser.parse_certificate(request.image)
        return CertificateParseResponse(**result)

    except Exception as e:
        logger.error(f"Certificate parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate parsing failed: {str(e)}",
        )


@router.post("/resume/generate", response_model=ResumeGenerateResponse)
async def generate_resume(request: ResumeGenerateRequest):
    """📄 Generate ATS-optimized resume from profile + LinkedIn + certificates.
    
    Combines multiple data sources:
    - User profile (name, skills, education, experience)
    - LinkedIn profile (if URL provided)
    - Skill certificates (parsed via OCR)
    
    Returns structured resume data + ATS PDF (base64).
    """
    try:
        generator = get_resume_generator()
        profile = request.profile.model_dump()

        # Parse LinkedIn if URL provided
        linkedin_data = None
        if request.profile.linkedin_url:
            parser = get_linkedin_parser()
            linkedin_data = await parser.parse_profile(request.profile.linkedin_url)

        # Parse certificates if provided
        cert_results = []
        if request.certificates:
            cert_parser = get_certificate_parser()
            for cert_image in request.certificates:
                cert_result = cert_parser.parse_certificate(cert_image)
                cert_results.append(cert_result)

        # Generate resume
        result = generator.generate(
            profile=profile,
            options=request.options.model_dump(),
            linkedin_data=linkedin_data,
            certificates=cert_results,
        )

        # Generate PDF if requested
        pdf_base64 = None
        if request.options.generate_pdf:
            pdf_base64 = generator.generate_pdf(
                profile=profile,
                options=request.options.model_dump(),
                linkedin_data=linkedin_data,
                certificates=cert_results,
            )

        return ResumeGenerateResponse(
            **result,
            pdf_base64=pdf_base64,
        )

    except Exception as e:
        logger.error(f"Resume generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume generation failed: {str(e)}",
        )


@router.post("/resume-generate", response_model=ResumeGenerateResponse)
async def generate_resume_legacy(request: ResumeGenerateRequest):
    """Generate resume (legacy endpoint)."""
    return await generate_resume(request)


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


# ==================== Model 3: Document Verification ====================

@router.post("/documents/verify", response_model=DocumentVerifyResponse)
async def verify_document(request: DocumentVerifyRequest):
    """🔍 Verify document authenticity using AI.
    
    Performs:
    - OCR text extraction
    - Tampering detection (ELA, edge, noise analysis)
    - Document number format validation (Aadhaar/PAN/Voter ID)
    - Cross-validation with user data
    - Fraud risk scoring (0-100)
    
    Returns: trust_score, verification_status, detected_issues
    """
    try:
        verifier = get_document_verifier()

        user_data = {}
        if request.user_name:
            user_data['name'] = request.user_name
        if request.user_dob:
            user_data['dob'] = request.user_dob
        if request.user_address:
            user_data['address'] = request.user_address

        result = verifier.verify_document(
            base64_image=request.image,
            document_type=request.document_type,
            user_data=user_data if user_data else None,
        )

        return DocumentVerifyResponse(**result)

    except Exception as e:
        logger.error(f"Document verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document verification failed: {str(e)}",
        )


@router.post("/documents/verify-multiple", response_model=MultiDocumentVerifyResponse)
async def verify_multiple_documents(request: MultiDocumentVerifyRequest):
    """🔍 Verify multiple documents and perform cross-document validation."""
    try:
        verifier = get_document_verifier()

        user_data = {}
        if request.user_name:
            user_data['name'] = request.user_name
        if request.user_dob:
            user_data['dob'] = request.user_dob

        result = verifier.verify_multiple_documents(
            documents=request.documents,
            user_data=user_data if user_data else None,
        )

        return MultiDocumentVerifyResponse(**result)

    except Exception as e:
        logger.error(f"Multi-document verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-document verification failed: {str(e)}",
        )


@router.post("/verify-document", response_model=DocumentVerifyResponse)
async def verify_document_legacy(request: DocumentVerifyRequest):
    """Verify document (legacy endpoint)."""
    return await verify_document(request)


@router.post("/documents/classify", response_model=DocumentClassifyResponse)
async def classify_document(request: DocumentClassifyRequest):
    """🏷️ Classify a document image using PyTorch ResNet-18 model.
    
    Returns predicted document type with confidence score and per-class probabilities.
    Supports: aadhaar, pan, passbook, certificate, employment_letter, trade_license.
    """
    try:
        classifier = get_document_classifier()
        result = classifier.classify_with_details(request.image)
        return DocumentClassifyResponse(**result)
    except Exception as e:
        logger.error(f"Document classification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document classification failed: {str(e)}",
        )


@router.post("/documents/trust-score", response_model=TrustScoreResponse)
async def calculate_enhanced_trust_score(request: TrustScoreRequest):
    """📊 Calculate enhanced trust score with document verification integration.
    
    Factors: verified documents, cross-doc consistency, authenticity scores,
    employment verification, platform activity.
    Users with high trust become eligible for jobs and loans.
    """
    try:
        calculator = get_trust_calculator()
        documents = [d.model_dump() for d in request.documents]

        result = calculator.calculate(
            profile_completeness=request.profile_completeness,
            documents=documents,
            applications=request.applications,
            interviews=request.interviews,
            activity_history=request.activity_history,
            verification_results=request.verification_results,
        )

        return TrustScoreResponse(**result)

    except Exception as e:
        logger.error(f"Trust score error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trust score calculation failed: {str(e)}",
        )


@router.post("/trust-score", response_model=TrustScoreResponse)
async def calculate_trust_score_legacy(request: TrustScoreRequest):
    """Calculate trust score (legacy endpoint)."""
    return await calculate_enhanced_trust_score(request)


# ==================== Model 4: Job Matcher ====================

@router.post("/jobs/recommend", response_model=JobRecommendResponse)
async def recommend_jobs(request: JobRecommendRequest):
    """💼 Recommend top-N jobs based on user profile and verified documents.
    
    Matches using: skills, education, experience, location, scheme eligibility.
    Returns jobs with match scores and direct apply links to Indeed.
    """
    try:
        scraper = get_job_scraper()
        matcher = get_job_matcher()

        # Get all jobs
        jobs = scraper.get_all_jobs()

        # Filter by location if specified
        if request.location_filter:
            location_jobs = scraper.get_jobs_by_location(request.location_filter)
            if location_jobs:
                jobs = location_jobs

        # Get recommendations
        worker = request.worker.model_dump()
        recommendations = matcher.recommend_jobs(
            worker=worker,
            jobs=jobs,
            top_n=request.top_n,
            scheme_benefits=request.scheme_benefits,
        )

        return JobRecommendResponse(
            total_jobs_analyzed=len(jobs),
            recommendations=[JobRecommendation(**r) for r in recommendations],
        )

    except Exception as e:
        logger.error(f"Job recommendation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job recommendation failed: {str(e)}",
        )


@router.post("/jobs/scrape", response_model=JobScrapeResponse)
async def scrape_jobs(query: str = "", location: str = ""):
    """🔄 Trigger job scraping from Indeed India portal."""
    try:
        scraper = get_job_scraper()
        jobs = await scraper.scrape_jobs(query=query, location=location)

        locations = list(set(j.get('location', '') for j in jobs if j.get('location')))

        return JobScrapeResponse(
            total_jobs=len(jobs),
            locations=sorted(locations),
            last_updated=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.error(f"Job scraping error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job scraping failed: {str(e)}",
        )


@router.post("/job-match", response_model=JobMatchResponse)
async def calculate_job_match(request: JobMatchRequest):
    """Calculate job match score between worker and job (legacy endpoint)."""
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


# ==================== Other ====================

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """Translate text between languages (placeholder)."""
    try:
        return TranslateResponse(
            translated_text=request.text,
            confidence=0.0,
        )

    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}",
        )
