"""
Scheme Eligibility Engine — NLP-powered matching of users to government schemes.
Provides top-5 recommendations with explainability.
"""

from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache
from loguru import logger

from utils.nlp_utils import get_nlp_engine
from config import settings


class SchemeEligibilityChecker:
    """AI-powered scheme eligibility checker with NLP matching and explainability."""

    EDUCATION_ORDER = {
        'none': 0, 'primary': 1, 'secondary': 2, 'higher_secondary': 3,
        'diploma': 3.5, 'graduate': 4, 'post_graduate': 5, 'doctorate': 6,
    }

    EDUCATION_DISPLAY = {
        'none': 'No formal education',
        'primary': 'Primary School (5th)',
        'secondary': 'Secondary School (10th)',
        'higher_secondary': 'Higher Secondary (12th)',
        'diploma': 'Diploma',
        'graduate': "Bachelor's Degree",
        'post_graduate': "Master's Degree",
        'doctorate': 'Doctorate',
    }

    def check_eligibility(
        self,
        worker: Dict[str, Any],
        scheme: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check if worker is eligible for a single scheme with explainability."""

        matched_criteria = []
        missing_criteria = []
        reasons = []

        # Age check
        age_result = self._check_age(
            worker.get('age'),
            scheme.get('min_age'),
            scheme.get('max_age'),
        )
        if age_result['matched']:
            if age_result['criterion']:
                matched_criteria.append(age_result['criterion'])
                reasons.append(age_result['reason'])
        elif age_result['criterion']:
            missing_criteria.append(age_result['criterion'])

        # Gender check
        gender_result = self._check_gender(
            worker.get('gender'),
            scheme.get('gender_eligibility', scheme.get('target_gender', 'all')),
        )
        if gender_result['matched']:
            if gender_result['criterion']:
                matched_criteria.append(gender_result['criterion'])
                reasons.append(gender_result['reason'])
        elif gender_result['criterion']:
            missing_criteria.append(gender_result['criterion'])

        # Education check
        edu_result = self._check_education(
            worker.get('education'),
            scheme.get('education_required'),
        )
        if edu_result['matched']:
            if edu_result['criterion']:
                matched_criteria.append(edu_result['criterion'])
                reasons.append(edu_result['reason'])
        elif edu_result['criterion']:
            missing_criteria.append(edu_result['criterion'])

        # Income check
        income_result = self._check_income(
            worker.get('income'),
            scheme.get('income_limit'),
        )
        if income_result['matched']:
            if income_result['criterion']:
                matched_criteria.append(income_result['criterion'])
                reasons.append(income_result['reason'])
        elif income_result['criterion']:
            missing_criteria.append(income_result['criterion'])

        # State check
        state_result = self._check_state(
            worker.get('state'),
            scheme.get('states', scheme.get('eligibility_rules', {}).get('state')),
        )
        if state_result['matched']:
            if state_result['criterion']:
                matched_criteria.append(state_result['criterion'])
                reasons.append(state_result['reason'])
        elif state_result['criterion']:
            missing_criteria.append(state_result['criterion'])

        # Document check
        worker_docs = set(d.lower() for d in worker.get('documents', []))
        required_docs = set(d.lower() for d in scheme.get('required_documents', []))
        missing_docs = required_docs - worker_docs

        if not missing_docs and required_docs:
            matched_criteria.append("All required documents available")
            reasons.append(f"User has all required documents: {', '.join(required_docs)}")
        elif missing_docs:
            missing_criteria.append(f"Missing documents: {', '.join(missing_docs)}")

        # NLP-based eligibility text matching
        nlp = get_nlp_engine()
        profile_text = nlp.generate_profile_text(worker)
        eligibility_text = scheme.get('eligibility_text', '')
        if eligibility_text and profile_text:
            nlp_score = nlp.compute_text_similarity(profile_text, eligibility_text)
            if nlp_score > 0.3:
                matched_criteria.append(f"Profile matches eligibility criteria (NLP: {nlp_score:.0%})")
                reasons.append(f"NLP analysis shows {nlp_score:.0%} match with scheme eligibility text")

        # Calculate eligibility score
        total_criteria = len(matched_criteria) + len(missing_criteria)
        eligibility_score = (
            len(matched_criteria) / total_criteria * 100 if total_criteria > 0 else 0
        )

        eligible = len(missing_criteria) == 0 and len(matched_criteria) > 0

        # Generate comprehensive recommendations
        recommendations = self._generate_recommendations(
            missing_criteria, missing_docs, eligibility_score
        )

        return {
            'eligible': eligible,
            'eligibility_score': round(eligibility_score, 2),
            'matched_criteria': matched_criteria,
            'missing_criteria': missing_criteria,
            'required_documents': list(required_docs),
            'recommendations': recommendations,
            'explanation': ' | '.join(reasons) if reasons else 'Insufficient data for eligibility determination.',
        }

    def recommend_schemes(
        self,
        worker: Dict[str, Any],
        schemes: List[Dict[str, Any]],
        top_n: int = None,
    ) -> List[Dict[str, Any]]:
        """Recommend top-N schemes for a worker with scoring and explainability."""

        if top_n is None:
            top_n = settings.scheme_top_n

        recommendations = []

        for scheme in schemes:
            try:
                result = self.check_eligibility(worker, scheme)

                recommendation = {
                    'scheme_name': scheme.get('name', 'Unknown'),
                    'scheme_id': scheme.get('id', ''),
                    'eligibility_score': result['eligibility_score'],
                    'eligible': result['eligible'],
                    'required_documents': scheme.get('required_documents', []),
                    'benefits': scheme.get('benefits', ''),
                    'application_link': scheme.get('application_link', ''),
                    'category': scheme.get('category', 'general'),
                    'matched_criteria': result['matched_criteria'],
                    'missing_criteria': result['missing_criteria'],
                    'explanation': result['explanation'],
                    'recommendations': result['recommendations'],
                }
                recommendations.append(recommendation)

            except Exception as e:
                logger.warning(f"Error checking scheme {scheme.get('name')}: {e}")

        # Sort by eligibility score (highest first), then by eligible status
        recommendations.sort(
            key=lambda x: (x['eligible'], x['eligibility_score']),
            reverse=True,
        )

        return recommendations[:top_n]

    def _check_age(
        self,
        worker_age: Optional[int],
        min_age: Optional[int],
        max_age: Optional[int],
    ) -> Dict[str, Any]:
        """Check age eligibility with explanation."""

        if min_age is None and max_age is None:
            return {'matched': True, 'criterion': None, 'reason': ''}

        if worker_age is None:
            return {
                'matched': False,
                'criterion': 'Age information required',
                'reason': '',
            }

        if min_age and worker_age < min_age:
            return {
                'matched': False,
                'criterion': f'Minimum age: {min_age} years (user is {worker_age})',
                'reason': '',
            }

        if max_age and worker_age > max_age:
            return {
                'matched': False,
                'criterion': f'Maximum age: {max_age} years (user is {worker_age})',
                'reason': '',
            }

        age_desc = []
        if min_age:
            age_desc.append(f"age >= {min_age}")
        if max_age:
            age_desc.append(f"age <= {max_age}")

        return {
            'matched': True,
            'criterion': 'Age requirement met',
            'reason': f"User age {worker_age} satisfies requirement ({' and '.join(age_desc)})",
        }

    def _check_gender(
        self,
        worker_gender: Optional[str],
        required_gender: str,
    ) -> Dict[str, Any]:
        """Check gender eligibility."""

        if not required_gender or required_gender.lower() == 'all':
            return {'matched': True, 'criterion': None, 'reason': ''}

        if not worker_gender:
            return {
                'matched': False,
                'criterion': 'Gender information required',
                'reason': '',
            }

        if worker_gender.lower() == required_gender.lower():
            return {
                'matched': True,
                'criterion': 'Gender requirement met',
                'reason': f'Scheme targeted for {required_gender} — user qualifies',
            }

        return {
            'matched': False,
            'criterion': f'Restricted to {required_gender} only',
            'reason': '',
        }

    def _check_education(
        self,
        worker_education: Optional[str],
        required_education: Optional[str],
    ) -> Dict[str, Any]:
        """Check education eligibility."""

        if not required_education or required_education.lower() == 'none':
            return {'matched': True, 'criterion': None, 'reason': ''}

        if not worker_education:
            return {
                'matched': False,
                'criterion': 'Education information required',
                'reason': '',
            }

        worker_level = self.EDUCATION_ORDER.get(worker_education.lower(), 0)
        required_level = self.EDUCATION_ORDER.get(required_education.lower(), 0)

        worker_display = self.EDUCATION_DISPLAY.get(worker_education.lower(), worker_education)
        required_display = self.EDUCATION_DISPLAY.get(required_education.lower(), required_education)

        if worker_level >= required_level:
            return {
                'matched': True,
                'criterion': 'Education requirement met',
                'reason': f"User education ({worker_display}) meets minimum requirement ({required_display})",
            }
        else:
            return {
                'matched': False,
                'criterion': f'Minimum education: {required_display}',
                'reason': '',
            }

    def _check_income(
        self,
        worker_income: Optional[float],
        income_limit: Optional[float],
    ) -> Dict[str, Any]:
        """Check income eligibility."""

        if income_limit is None:
            return {'matched': True, 'criterion': None, 'reason': ''}

        if worker_income is None:
            return {
                'matched': False,
                'criterion': 'Income information required',
                'reason': '',
            }

        income_limit_lakhs = income_limit / 100000

        if worker_income <= income_limit:
            return {
                'matched': True,
                'criterion': 'Income requirement met',
                'reason': f"User income (₹{worker_income:,.0f}) is below limit (₹{income_limit:,.0f} / ₹{income_limit_lakhs:.1f}L)",
            }
        else:
            return {
                'matched': False,
                'criterion': f'Annual income must be below ₹{income_limit:,.0f} (₹{income_limit_lakhs:.1f}L)',
                'reason': '',
            }

    def _check_state(
        self,
        worker_state: Optional[str],
        required_states: Any,
    ) -> Dict[str, Any]:
        """Check state eligibility."""

        if not required_states:
            return {'matched': True, 'criterion': None, 'reason': ''}

        if isinstance(required_states, str):
            required_states = [required_states]

        if not required_states or len(required_states) == 0:
            return {'matched': True, 'criterion': None, 'reason': ''}

        if not worker_state:
            return {
                'matched': False,
                'criterion': 'State information required',
                'reason': '',
            }

        if worker_state.lower() in [s.lower() for s in required_states]:
            return {
                'matched': True,
                'criterion': 'State requirement met',
                'reason': f'User state ({worker_state}) is in eligible states',
            }

        return {
            'matched': False,
            'criterion': f'Restricted to: {", ".join(required_states)}',
            'reason': '',
        }

    def _generate_recommendations(
        self,
        missing_criteria: List[str],
        missing_docs: set,
        eligibility_score: float,
    ) -> List[str]:
        """Generate actionable recommendations."""

        recommendations = []

        if eligibility_score >= 80:
            recommendations.append("✅ You are likely eligible — apply now!")
        elif eligibility_score >= 50:
            recommendations.append("⚠️ You may be eligible with some updates to your profile")
        else:
            recommendations.append("❌ Review the eligibility criteria — you may not qualify currently")

        if missing_docs:
            recommendations.append(f"📄 Upload these documents: {', '.join(missing_docs)}")

        for criterion in missing_criteria[:3]:
            if 'age' in criterion.lower():
                recommendations.append("🔍 Check for similar schemes with different age requirements")
            elif 'education' in criterion.lower():
                recommendations.append("📚 Look for skill-based schemes that don't require formal education")
            elif 'income' in criterion.lower():
                recommendations.append("💰 Check if your income qualifies after accounting for deductions")

        return recommendations


@lru_cache(maxsize=1)
def get_scheme_checker() -> SchemeEligibilityChecker:
    """Get cached SchemeEligibilityChecker instance."""
    return SchemeEligibilityChecker()
