import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from functools import lru_cache
from loguru import logger
import re

from config import settings


class JobMatcher:
    """Job matching engine using skill similarity and rule-based scoring."""
    
    EDUCATION_LEVELS = {
        'none': 0,
        'primary': 1,
        'secondary': 2,
        'higher_secondary': 3,
        'diploma': 3.5,
        'graduate': 4,
        'post_graduate': 5,
        'doctorate': 6,
    }
    
    def __init__(self):
        self.tfidf = TfidfVectorizer(
            lowercase=True,
            stop_words='english',
            ngram_range=(1, 2),
        )
        
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
        """Calculate overall job match score."""
        
        # Skills match
        skills_score = self._calculate_skills_match(worker_skills, job_skills)
        
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
            'breakdown': {
                'skills': round(skills_score, 2),
                'education': round(education_score, 2),
                'experience': round(experience_score, 2),
                'location': round(location_score, 2),
            },
        }
    
    def _calculate_skills_match(
        self,
        worker_skills: List[str],
        job_skills: List[str],
    ) -> float:
        """Calculate skills match using TF-IDF and cosine similarity."""
        
        if not job_skills:
            return 100.0  # No skills required
            
        if not worker_skills:
            return 0.0
        
        # Normalize skills
        worker_set = set(s.lower().strip() for s in worker_skills)
        job_set = set(s.lower().strip() for s in job_skills)
        
        # Direct match
        matched = worker_set.intersection(job_set)
        direct_match_ratio = len(matched) / len(job_set) * 100
        
        # TF-IDF similarity for fuzzy matching
        try:
            worker_text = ' '.join(worker_skills)
            job_text = ' '.join(job_skills)
            
            tfidf_matrix = self.tfidf.fit_transform([worker_text, job_text])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            tfidf_score = similarity * 100
        except Exception as e:
            logger.warning(f"TF-IDF calculation failed: {e}")
            tfidf_score = direct_match_ratio
        
        # Combine scores (70% direct match, 30% similarity)
        return direct_match_ratio * 0.7 + tfidf_score * 0.3
    
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
            # Meets or exceeds requirement
            score = 100.0
            if worker_level > job_level + 1:
                # Overqualified - slight penalty
                score = 90.0
            return True, score
        else:
            # Below requirement
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
                # Overqualified
                overage = worker_experience - job_exp_max
                score = max(70, 100 - overage * 5)
                return True, score
            return True, 100.0
        else:
            # Under-qualified
            gap = job_exp_min - worker_experience
            score = max(0, 100 - gap * 20)
            return False, score
    
    def _calculate_location_score(
        self,
        worker_location: Optional[Tuple[float, float]],
        job_location: Optional[Tuple[float, float]],
    ) -> float:
        """Calculate location score based on distance."""
        
        if not worker_location or not job_location:
            return 50.0  # Neutral score
        
        distance = self._haversine_distance(
            worker_location[0], worker_location[1],
            job_location[0], job_location[1],
        )
        
        # Score based on distance thresholds
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
    
    def _haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """Calculate distance between two points in kilometers."""
        
        R = 6371  # Earth's radius in km
        
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
