"""
AI Job Matching Engine — NLP-powered job recommendation system.
Matches users to jobs based on verified documents, skills, education, schemes, and location.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from functools import lru_cache
from loguru import logger

from config import settings
from utils.nlp_utils import get_nlp_engine


class JobMatcher:
    """AI Job Matching Engine with NLP similarity and multi-signal ranking."""

    EDUCATION_LEVELS = {
        'none': 0, 'primary': 1, 'secondary': 2, 'higher_secondary': 3,
        'diploma': 3.5, 'graduate': 4, 'post_graduate': 5, 'doctorate': 6,
    }

    def __init__(self):
        self.tfidf = TfidfVectorizer(
            lowercase=True,
            stop_words='english',
            ngram_range=(1, 2),
            max_features=3000,
        )
        self.nlp = get_nlp_engine()
        logger.info("Job Matcher initialized")

    def calculate_match(
        self,
        worker_skills: List[str],
        worker_education: str,
        worker_experience: float,
        worker_location: Optional[Tuple[float, float]],
        job_skills: List[str],
        job_education: str,
        job_exp_min: float,
        job_exp_max: Optional[float],
        job_location: Optional[Tuple[float, float]],
    ) -> Dict[str, Any]:
        """Calculate overall job match score between worker and job."""

        # Skills match using NLP
        skills_score, matched_skills, missing_skills = self.nlp.compute_skill_similarity(
            worker_skills, job_skills
        )
        skills_score *= 100  # Convert to percentage

        # Education match
        education_match, education_score = self._calculate_education_match(
            worker_education, job_education
        )

        # Experience match
        experience_match, experience_score = self._calculate_experience_match(
            worker_experience, job_exp_min, job_exp_max
        )

        # Location score
        location_score = self._calculate_location_score(worker_location, job_location)

        # Calculate weighted overall score
        overall_score = (
            skills_score * settings.skills_weight +
            education_score * settings.education_weight +
            experience_score * settings.experience_weight +
            location_score * settings.location_weight
        )

        return {
            'match_score': round(overall_score, 2),
            'skills_match': round(skills_score, 2),
            'education_match': education_match,
            'experience_match': experience_match,
            'location_score': round(location_score, 2),
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'breakdown': {
                'skills': round(skills_score, 2),
                'education': round(education_score, 2),
                'experience': round(experience_score, 2),
                'location': round(location_score, 2),
            },
        }

    def recommend_jobs(
        self,
        worker: Dict[str, Any],
        jobs: List[Dict[str, Any]],
        top_n: int = None,
        scheme_benefits: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Recommend top-N jobs for a worker with multi-signal ranking.
        
        Matches based on: verified documents, skill certificates, education,
        scheme eligibility, resume data, and location.
        """

        if top_n is None:
            top_n = settings.job_top_n

        worker_skills = worker.get('skills', [])
        worker_education = worker.get('education', 'none')
        worker_experience = worker.get('experience_years', 0)
        worker_state = worker.get('state', '')
        worker_city = worker.get('city', '')

        # Build worker profile text for NLP matching
        worker_profile_text = self.nlp.generate_profile_text(worker)

        recommendations = []

        for job in jobs:
            try:
                job_skills = job.get('skills_required', [])
                job_education = job.get('education_required', 'none')
                job_exp_min = job.get('experience_min', 0)
                job_exp_max = job.get('experience_max')

                # Skill match
                skill_sim, matched_skills, missing_skills = self.nlp.compute_skill_similarity(
                    worker_skills, job_skills
                )

                # Education match
                edu_match, edu_score = self._calculate_education_match(
                    worker_education, job_education
                )

                # Experience match
                exp_match, exp_score = self._calculate_experience_match(
                    worker_experience, job_exp_min, job_exp_max
                )

                # Location match (text-based)
                location_score = self._calculate_location_text_match(
                    worker_city, worker_state, job.get('location', '')
                )

                # NLP description similarity
                job_text = f"{job.get('title', '')} {job.get('description', '')} {' '.join(job_skills)}"
                nlp_similarity = self.nlp.compute_text_similarity(worker_profile_text, job_text)

                # Scheme eligibility bonus
                scheme_bonus = 0.0
                if scheme_benefits:
                    for benefit in scheme_benefits:
                        if any(kw in benefit.lower() for kw in ['training', 'skill', 'employment']):
                            scheme_bonus += 0.05

                # Calculate overall match score
                match_score = (
                    skill_sim * 0.30 +
                    (edu_score / 100) * 0.15 +
                    (exp_score / 100) * 0.15 +
                    (location_score / 100) * 0.15 +
                    nlp_similarity * 0.20 +
                    scheme_bonus * 0.05
                ) * 100

                # Generate match explanation
                explanation_parts = []
                if skill_sim > 0.5:
                    explanation_parts.append(f"Skills match: {', '.join(matched_skills[:3])}")
                if edu_match:
                    explanation_parts.append("Education meets requirements")
                if exp_match:
                    explanation_parts.append("Experience level matches")
                if location_score > 50:
                    explanation_parts.append("Location is nearby")

                recommendation = {
                    'job_title': job.get('title', ''),
                    'company': job.get('company', ''),
                    'location': job.get('location', ''),
                    'salary': job.get('salary', ''),
                    'match_score': round(match_score, 2),
                    'application_link': job.get('application_link', ''),
                    'job_type': job.get('job_type', ''),
                    'matched_skills': matched_skills[:5],
                    'missing_skills': missing_skills[:5],
                    'education_match': edu_match,
                    'experience_match': exp_match,
                    'explanation': ' | '.join(explanation_parts) if explanation_parts else 'General match based on profile',
                    'breakdown': {
                        'skill_similarity': round(skill_sim * 100, 2),
                        'education_score': round(edu_score, 2),
                        'experience_score': round(exp_score, 2),
                        'location_score': round(location_score, 2),
                        'nlp_similarity': round(nlp_similarity * 100, 2),
                    },
                }
                recommendations.append(recommendation)

            except Exception as e:
                logger.warning(f"Error matching job {job.get('title')}: {e}")

        # Sort by match score (highest first)
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)

        return recommendations[:top_n]

    def _calculate_education_match(
        self,
        worker_education: Optional[str],
        job_education: Optional[str],
    ) -> Tuple[bool, float]:
        """Calculate education match."""

        if not job_education or job_education.lower() == 'none':
            return True, 100.0

        worker_level = self.EDUCATION_LEVELS.get(
            worker_education.lower() if worker_education else 'none', 0
        )
        job_level = self.EDUCATION_LEVELS.get(job_education.lower(), 0)

        if worker_level >= job_level:
            score = 100.0
            if worker_level > job_level + 1:
                score = 85.0  # Overqualified penalty
            return True, score
        else:
            gap = job_level - worker_level
            score = max(0, 100 - gap * 25)
            return False, score

    def _calculate_experience_match(
        self,
        worker_experience: float,
        job_exp_min: float,
        job_exp_max: Optional[float],
    ) -> Tuple[bool, float]:
        """Calculate experience match."""

        if job_exp_min == 0 and not job_exp_max:
            return True, 100.0

        if worker_experience >= job_exp_min:
            if job_exp_max and worker_experience > job_exp_max:
                overage = worker_experience - job_exp_max
                score = max(65, 100 - overage * 5)
                return True, score
            return True, 100.0
        else:
            gap = job_exp_min - worker_experience
            score = max(0, 100 - gap * 20)
            return False, score

    def _calculate_location_score(
        self,
        worker_location: Optional[Tuple[float, float]],
        job_location: Optional[Tuple[float, float]],
    ) -> float:
        """Calculate location score based on GPS distance."""

        if not worker_location or not job_location:
            return 50.0

        distance = self._haversine_distance(
            worker_location[0], worker_location[1],
            job_location[0], job_location[1],
        )

        if distance <= 2:
            return 100.0
        elif distance <= 5:
            return 90.0
        elif distance <= 10:
            return 75.0
        elif distance <= 20:
            return 50.0
        elif distance <= 50:
            return 25.0
        else:
            return 10.0

    def _calculate_location_text_match(
        self,
        worker_city: str,
        worker_state: str,
        job_location: str,
    ) -> float:
        """Calculate location match using text comparison."""

        if not job_location:
            return 50.0

        job_loc_lower = job_location.lower()

        # Check for "multiple locations" or "india"
        if 'multiple' in job_loc_lower or 'all india' in job_loc_lower or 'remote' in job_loc_lower:
            return 80.0

        score = 30.0  # Base score

        if worker_city and worker_city.lower() in job_loc_lower:
            score = 100.0
        elif worker_state and worker_state.lower() in job_loc_lower:
            score = 70.0
        else:
            # Check for major city proximity markers (e.g., NCR, metro)
            metros = {
                'delhi': ['ncr', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
                'mumbai': ['navi mumbai', 'thane', 'kalyan', 'bhiwandi'],
                'bangalore': ['bengaluru', 'electronic city', 'whitefield'],
                'chennai': ['madras'],
                'kolkata': ['calcutta', 'howrah'],
                'hyderabad': ['secunderabad', 'cyberabad'],
                'pune': ['pcmc', 'pimpri'],
            }

            for city, aliases in metros.items():
                if worker_city and worker_city.lower() in [city] + aliases:
                    if any(a in job_loc_lower for a in [city] + aliases):
                        score = 85.0
                        break

        return score

    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float,
    ) -> float:
        """Calculate distance between two GPS points in kilometers."""

        R = 6371

        lat1_rad = np.radians(lat1)
        lat2_rad = np.radians(lat2)
        delta_lat = np.radians(lat2 - lat1)
        delta_lon = np.radians(lon2 - lon1)

        a = (
            np.sin(delta_lat / 2) ** 2 +
            np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon / 2) ** 2
        )
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

        return R * c


@lru_cache(maxsize=1)
def get_job_matcher() -> JobMatcher:
    """Get cached JobMatcher instance."""
    return JobMatcher()
