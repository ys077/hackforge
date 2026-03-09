"""
Enhanced Trust Score Calculator — Integrates document verification results
with user activity to compute comprehensive trust scores.
"""

from typing import List, Dict, Any, Optional
from functools import lru_cache

from config import settings


class TrustScoreCalculator:
    """Enhanced trust score calculation integrating document verification."""

    TRUST_LEVELS = {
        'unverified': (0, 20),
        'basic': (20, 40),
        'verified': (40, 65),
        'trusted': (65, 85),
        'premium': (85, 101),
    }

    DOCUMENT_WEIGHTS = {
        'aadhaar': 25,
        'pan': 20,
        'voter_id': 15,
        'passbook': 10,
        'driving_license': 10,
        'certificate': 8,
        'employment_letter': 8,
        'trade_license': 8,
        'passport': 15,
    }

    def calculate(
        self,
        profile_completeness: float,
        documents: List[Dict[str, Any]],
        applications: int = 0,
        interviews: int = 0,
        activity_history: List[Dict[str, Any]] = None,
        verification_results: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Calculate comprehensive trust score with doc verification integration."""

        if activity_history is None:
            activity_history = []

        # Profile completeness score (0-100)
        profile_score = min(100, max(0, profile_completeness))

        # Document verification score (primary signal)
        doc_score = self._calculate_document_score(documents, verification_results)

        # Cross-document consistency score
        consistency_score = self._calculate_consistency_score(verification_results)

        # Document authenticity score (from tampering analysis)
        authenticity_score = self._calculate_authenticity_score(verification_results)

        # Employment verification score
        employment_score = self._calculate_employment_score(
            applications, interviews, verification_results
        )

        # Activity score
        activity_score = self._calculate_activity_score(
            activity_history, applications, interviews
        )

        # Calculate weighted overall score using configured weights
        overall_score = (
            doc_score * settings.trust_score_doc_weight +
            consistency_score * settings.trust_score_consistency_weight +
            authenticity_score * settings.trust_score_authenticity_weight +
            employment_score * settings.trust_score_employment_weight
        )

        # Profile completeness bonus (up to 10 extra points)
        overall_score += (profile_score / 100) * 10

        # Activity bonus (up to 5 extra points)
        overall_score += (activity_score / 100) * 5

        overall_score = min(100, max(0, overall_score))

        # Determine trust level
        trust_level = self._get_trust_level(overall_score)

        # Determine eligibility flags
        eligibility_flags = self._get_eligibility_flags(overall_score, doc_score)

        # Generate factors and suggestions
        positive_factors = self._get_positive_factors(
            profile_score, doc_score, consistency_score,
            authenticity_score, employment_score, activity_score,
        )
        negative_factors = self._get_negative_factors(
            profile_score, doc_score, consistency_score,
            authenticity_score, employment_score, activity_score,
        )
        suggestions = self._get_improvement_suggestions(
            profile_score, doc_score, consistency_score,
            authenticity_score, employment_score, activity_score,
        )

        return {
            'overall_score': round(overall_score, 2),
            'trust_level': trust_level,
            'profile_completeness_score': round(profile_score, 2),
            'document_verification_score': round(doc_score, 2),
            'consistency_score': round(consistency_score, 2),
            'authenticity_score': round(authenticity_score, 2),
            'employment_history_score': round(employment_score, 2),
            'skills_score': round(profile_score * 0.8, 2),
            'activity_score': round(activity_score, 2),
            'eligibility_flags': eligibility_flags,
            'positive_factors': positive_factors,
            'negative_factors': negative_factors,
            'improvement_suggestions': suggestions,
        }

    def _calculate_document_score(
        self,
        documents: List[Dict[str, Any]],
        verification_results: Optional[List[Dict[str, Any]]],
    ) -> float:
        """Calculate document verification score based on verified docs and weights."""

        if not documents:
            return 0.0

        total_weight = 0
        earned_weight = 0

        for doc in documents:
            doc_type = doc.get('type', '').lower()
            weight = self.DOCUMENT_WEIGHTS.get(doc_type, 5)
            total_weight += weight

            if doc.get('verified'):
                earned_weight += weight

        # Include AI verification results
        if verification_results:
            ai_verified = sum(
                1 for r in verification_results
                if r.get('verification_status') == 'verified'
            )
            ai_total = len(verification_results)
            if ai_total > 0:
                ai_ratio = ai_verified / ai_total
                earned_weight += total_weight * ai_ratio * 0.3  # 30% weight from AI

        base_score = (earned_weight / total_weight * 100) if total_weight > 0 else 0

        # Bonus for important documents
        important_docs = {'aadhaar', 'pan', 'voter_id'}
        verified_important = sum(
            1 for d in documents
            if d.get('verified') and d.get('type', '').lower() in important_docs
        )
        bonus = min(20, verified_important * 8)

        return min(100, base_score + bonus)

    def _calculate_consistency_score(
        self,
        verification_results: Optional[List[Dict[str, Any]]],
    ) -> float:
        """Calculate cross-document consistency score."""

        if not verification_results or len(verification_results) < 2:
            return 50.0  # Neutral

        consistent_count = 0
        total_checks = 0

        for result in verification_results:
            consistency = result.get('consistency_check', {})
            matches = len(consistency.get('matches', []))
            mismatches = len(consistency.get('mismatches', []))

            consistent_count += matches
            total_checks += matches + mismatches

        if total_checks == 0:
            return 50.0

        return (consistent_count / total_checks) * 100

    def _calculate_authenticity_score(
        self,
        verification_results: Optional[List[Dict[str, Any]]],
    ) -> float:
        """Calculate document authenticity score from tampering analysis."""

        if not verification_results:
            return 50.0  # Neutral

        scores = []
        for result in verification_results:
            tampering = result.get('tampering_analysis', {})
            if tampering.get('tampering_detected'):
                confidence = tampering.get('confidence', 50)
                scores.append(max(0, 100 - confidence))
            else:
                scores.append(90)

        return sum(scores) / len(scores) if scores else 50.0

    def _calculate_employment_score(
        self,
        applications: int,
        interviews: int,
        verification_results: Optional[List[Dict[str, Any]]],
    ) -> float:
        """Calculate employment history score."""

        score = 0.0

        # Application activity
        score += min(30, applications * 3)

        # Interview success
        score += min(40, interviews * 8)

        # Employment letter verification
        if verification_results:
            emp_verified = any(
                r.get('document_type') == 'employment_letter' and r.get('verified')
                for r in verification_results
            )
            if emp_verified:
                score += 30

        return min(100, score)

    def _calculate_activity_score(
        self,
        activity_history: List[Dict[str, Any]],
        applications: int,
        interviews: int,
    ) -> float:
        """Calculate platform activity score."""

        base_score = 15  # Minimum for being on platform

        base_score += min(25, applications * 2.5)
        base_score += min(30, interviews * 6)

        recent_activities = len([
            a for a in activity_history
            if a.get('recent', True)
        ])
        base_score += min(30, recent_activities * 5)

        return min(100, base_score)

    def _get_trust_level(self, score: float) -> str:
        """Determine trust level from score."""
        for level, (min_score, max_score) in self.TRUST_LEVELS.items():
            if min_score <= score < max_score:
                return level
        return 'premium' if score >= 85 else 'unverified'

    def _get_eligibility_flags(self, overall: float, doc_score: float) -> Dict[str, bool]:
        """Determine eligibility based on trust score."""
        return {
            'eligible_for_jobs': overall >= 40,
            'eligible_for_loans': overall >= 65 and doc_score >= 60,
            'eligible_for_schemes': overall >= 30,
            'priority_listing': overall >= 80,
            'verified_badge': overall >= 70 and doc_score >= 70,
        }

    def _get_positive_factors(self, *scores) -> List[str]:
        """Get positive factors contributing to trust score."""
        profile, doc, consistency, authenticity, employment, activity = scores
        factors = []

        if profile >= 80:
            factors.append("✅ Complete and detailed profile")
        elif profile >= 60:
            factors.append("✅ Well-maintained profile")

        if doc >= 80:
            factors.append("✅ Multiple verified identity documents")
        elif doc >= 50:
            factors.append("✅ Key documents verified")

        if consistency >= 80:
            factors.append("✅ Consistent information across documents")

        if authenticity >= 80:
            factors.append("✅ Documents pass authenticity checks")

        if employment >= 70:
            factors.append("✅ Active job seeker with interview history")

        if activity >= 70:
            factors.append("✅ Regular platform activity")

        return factors

    def _get_negative_factors(self, *scores) -> List[str]:
        """Get negative factors affecting trust score."""
        profile, doc, consistency, authenticity, employment, activity = scores
        factors = []

        if profile < 30:
            factors.append("❌ Incomplete profile")
        if doc < 30:
            factors.append("❌ No verified documents")
        if consistency < 40:
            factors.append("❌ Inconsistent information across documents")
        if authenticity < 40:
            factors.append("⚠️ Document authenticity concerns detected")
        if activity < 30:
            factors.append("❌ Low platform activity")

        return factors

    def _get_improvement_suggestions(self, *scores) -> List[str]:
        """Get suggestions to improve trust score."""
        profile, doc, consistency, authenticity, employment, activity = scores
        suggestions = []

        if doc < 80:
            suggestions.append("📄 Upload and verify more documents (Aadhaar, PAN, Voter ID)")
            if doc < 30:
                suggestions.append("🔑 Start by verifying your Aadhaar card — it has the highest impact")

        if profile < 80:
            suggestions.append("📝 Complete all profile sections including skills and experience")

        if consistency < 60 and doc >= 30:
            suggestions.append("🔗 Ensure your name and details match across all uploaded documents")

        if employment < 50:
            suggestions.append("💼 Apply to more jobs matching your skills to build employment history")

        if activity < 50:
            suggestions.append("📱 Stay active on the platform regularly")

        return suggestions


@lru_cache(maxsize=1)
def get_trust_calculator() -> TrustScoreCalculator:
    """Get cached TrustScoreCalculator instance."""
    return TrustScoreCalculator()
