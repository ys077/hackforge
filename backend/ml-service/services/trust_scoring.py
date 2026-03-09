from typing import List, Dict, Any, Optional
from functools import lru_cache


class TrustScoreCalculator:
    """Calculate trust score for workers."""
    
    TRUST_LEVELS = {
        'unverified': (0, 25),
        'basic': (25, 50),
        'verified': (50, 75),
        'trusted': (75, 90),
        'premium': (90, 100),
    }
    
    WEIGHTS = {
        'profile_completeness': 0.20,
        'document_verification': 0.35,
        'employment_history': 0.15,
        'skills': 0.10,
        'activity': 0.20,
    }
    
    def calculate(
        self,
        profile_completeness: float,
        documents: List[Dict[str, Any]],
        applications: int,
        interviews: int,
        activity_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculate comprehensive trust score."""
        
        # Profile completeness score (0-100)
        profile_score = min(100, max(0, profile_completeness))
        
        # Document verification score
        doc_score = self._calculate_document_score(documents)
        
        # Employment history score (based on applications and interviews)
        employment_score = self._calculate_employment_score(applications, interviews)
        
        # Skills score (based on profile completeness)
        skills_score = profile_score * 0.8  # Derived from profile
        
        # Activity score
        activity_score = self._calculate_activity_score(activity_history, applications, interviews)
        
        # Calculate weighted overall score
        overall_score = (
            profile_score * self.WEIGHTS['profile_completeness'] +
            doc_score * self.WEIGHTS['document_verification'] +
            employment_score * self.WEIGHTS['employment_history'] +
            skills_score * self.WEIGHTS['skills'] +
            activity_score * self.WEIGHTS['activity']
        )
        
        # Determine trust level
        trust_level = self._get_trust_level(overall_score)
        
        # Generate factors and suggestions
        positive_factors = self._get_positive_factors(
            profile_score, doc_score, employment_score, activity_score
        )
        negative_factors = self._get_negative_factors(
            profile_score, doc_score, employment_score, activity_score
        )
        suggestions = self._get_improvement_suggestions(
            profile_score, doc_score, employment_score, activity_score
        )
        
        return {
            'overall_score': round(overall_score, 2),
            'profile_completeness_score': round(profile_score, 2),
            'document_verification_score': round(doc_score, 2),
            'employment_history_score': round(employment_score, 2),
            'skills_score': round(skills_score, 2),
            'activity_score': round(activity_score, 2),
            'trust_level': trust_level,
            'positive_factors': positive_factors,
            'negative_factors': negative_factors,
            'improvement_suggestions': suggestions,
        }
    
    def _calculate_document_score(self, documents: List[Dict[str, Any]]) -> float:
        """Calculate document verification score."""
        
        if not documents:
            return 0.0
        
        verified_count = sum(1 for d in documents if d.get('verified'))
        total_count = len(documents)
        
        # Base score from verification ratio
        base_score = (verified_count / total_count) * 100 if total_count > 0 else 0
        
        # Bonus for specific document types
        important_docs = {'aadhar', 'pan', 'voter_id', 'driving_license'}
        verified_important = sum(
            1 for d in documents 
            if d.get('verified') and d.get('type', '').lower() in important_docs
        )
        
        bonus = min(20, verified_important * 10)
        
        return min(100, base_score + bonus)
    
    def _calculate_employment_score(self, applications: int, interviews: int) -> float:
        """Calculate employment history score."""
        
        if applications == 0 and interviews == 0:
            return 0.0
        
        # Score based on activity
        application_score = min(50, applications * 5)
        interview_score = min(50, interviews * 10)
        
        return application_score + interview_score
    
    def _calculate_activity_score(
        self,
        activity_history: List[Dict[str, Any]],
        applications: int,
        interviews: int,
    ) -> float:
        """Calculate activity score."""
        
        base_score = 20  # Minimum for being on platform
        
        # Add points for applications
        base_score += min(30, applications * 3)
        
        # Add points for interviews
        base_score += min(30, interviews * 6)
        
        # Add points for recent activity
        recent_activities = len([
            a for a in activity_history 
            if a.get('recent', True)
        ])
        base_score += min(20, recent_activities * 5)
        
        return min(100, base_score)
    
    def _get_trust_level(self, score: float) -> str:
        """Determine trust level from score."""
        
        for level, (min_score, max_score) in self.TRUST_LEVELS.items():
            if min_score <= score < max_score:
                return level
        
        return 'premium' if score >= 90 else 'unverified'
    
    def _get_positive_factors(
        self,
        profile_score: float,
        doc_score: float,
        employment_score: float,
        activity_score: float,
    ) -> List[str]:
        """Get positive factors contributing to trust score."""
        
        factors = []
        
        if profile_score >= 80:
            factors.append("Complete and detailed profile")
        elif profile_score >= 60:
            factors.append("Well-maintained profile")
        
        if doc_score >= 80:
            factors.append("Multiple verified documents")
        elif doc_score >= 50:
            factors.append("Documents verified")
        
        if employment_score >= 70:
            factors.append("Active job seeker")
        
        if activity_score >= 70:
            factors.append("Regular platform activity")
        
        return factors
    
    def _get_negative_factors(
        self,
        profile_score: float,
        doc_score: float,
        employment_score: float,
        activity_score: float,
    ) -> List[str]:
        """Get negative factors affecting trust score."""
        
        factors = []
        
        if profile_score < 30:
            factors.append("Incomplete profile")
        
        if doc_score < 30:
            factors.append("No verified documents")
        
        if activity_score < 30:
            factors.append("Low platform activity")
        
        return factors
    
    def _get_improvement_suggestions(
        self,
        profile_score: float,
        doc_score: float,
        employment_score: float,
        activity_score: float,
    ) -> List[str]:
        """Get suggestions to improve trust score."""
        
        suggestions = []
        
        if profile_score < 80:
            suggestions.append("Complete all profile sections")
            if profile_score < 50:
                suggestions.append("Add your skills and experience")
        
        if doc_score < 80:
            suggestions.append("Upload and verify more documents")
            if doc_score < 30:
                suggestions.append("Start by verifying your Aadhar card")
        
        if employment_score < 50:
            suggestions.append("Apply to more jobs matching your skills")
        
        if activity_score < 50:
            suggestions.append("Stay active on the platform regularly")
        
        return suggestions


@lru_cache(maxsize=1)
def get_trust_calculator() -> TrustScoreCalculator:
    """Get cached TrustScoreCalculator instance."""
    return TrustScoreCalculator()
