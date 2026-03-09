from typing import List, Dict, Any, Optional
from functools import lru_cache


class SchemeEligibilityChecker:
    """Check eligibility for government schemes."""
    
    EDUCATION_ORDER = [
        'none', 'primary', 'secondary', 'higher_secondary', 
        'diploma', 'graduate', 'post_graduate',
    ]
    
    def check_eligibility(
        self,
        worker: Dict[str, Any],
        scheme: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check if worker is eligible for a scheme."""
        
        matched_criteria = []
        missing_criteria = []
        
        # Age check
        age_result = self._check_age(
            worker.get('age'),
            scheme.get('min_age'),
            scheme.get('max_age'),
        )
        if age_result['matched']:
            matched_criteria.append(age_result['criterion'])
        elif age_result['criterion']:
            missing_criteria.append(age_result['criterion'])
        
        # Gender check
        gender_result = self._check_gender(
            worker.get('gender'),
            scheme.get('gender_eligibility', 'all'),
        )
        if gender_result['matched']:
            matched_criteria.append(gender_result['criterion'])
        elif gender_result['criterion']:
            missing_criteria.append(gender_result['criterion'])
        
        # Education check
        edu_result = self._check_education(
            worker.get('education'),
            scheme.get('education_required'),
        )
        if edu_result['matched']:
            matched_criteria.append(edu_result['criterion'])
        elif edu_result['criterion']:
            missing_criteria.append(edu_result['criterion'])
        
        # State check (for state-specific schemes)
        state_result = self._check_state(
            worker.get('state'),
            scheme.get('eligibility_rules', {}).get('state'),
        )
        if state_result['matched']:
            matched_criteria.append(state_result['criterion'])
        elif state_result['criterion']:
            missing_criteria.append(state_result['criterion'])
        
        # Document check
        worker_docs = set(worker.get('documents', []))
        required_docs = set(scheme.get('required_documents', []))
        missing_docs = required_docs - worker_docs
        
        if not missing_docs:
            matched_criteria.append("All required documents available")
        elif required_docs:
            missing_criteria.append(f"Missing documents: {', '.join(missing_docs)}")
        
        # Calculate eligibility score
        total_criteria = len(matched_criteria) + len(missing_criteria)
        eligibility_score = (
            len(matched_criteria) / total_criteria * 100 if total_criteria > 0 else 0
        )
        
        # Determine if eligible
        eligible = len(missing_criteria) == 0 and len(matched_criteria) > 0
        
        # Generate recommendations
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
        }
    
    def _check_age(
        self,
        worker_age: Optional[int],
        min_age: Optional[int],
        max_age: Optional[int],
    ) -> Dict[str, Any]:
        """Check age eligibility."""
        
        if min_age is None and max_age is None:
            return {'matched': True, 'criterion': None}
        
        if worker_age is None:
            return {'matched': False, 'criterion': 'Age information required'}
        
        if min_age and worker_age < min_age:
            return {'matched': False, 'criterion': f'Minimum age: {min_age} years'}
        
        if max_age and worker_age > max_age:
            return {'matched': False, 'criterion': f'Maximum age: {max_age} years'}
        
        return {'matched': True, 'criterion': 'Age requirement met'}
    
    def _check_gender(
        self,
        worker_gender: Optional[str],
        required_gender: str,
    ) -> Dict[str, Any]:
        """Check gender eligibility."""
        
        if required_gender == 'all':
            return {'matched': True, 'criterion': None}
        
        if not worker_gender:
            return {'matched': False, 'criterion': 'Gender information required'}
        
        if worker_gender.lower() == required_gender.lower():
            return {'matched': True, 'criterion': 'Gender requirement met'}
        
        return {'matched': False, 'criterion': f'For {required_gender} only'}
    
    def _check_education(
        self,
        worker_education: Optional[str],
        required_education: Optional[str],
    ) -> Dict[str, Any]:
        """Check education eligibility."""
        
        if not required_education or required_education.lower() == 'none':
            return {'matched': True, 'criterion': None}
        
        if not worker_education:
            return {'matched': False, 'criterion': 'Education information required'}
        
        try:
            worker_level = self.EDUCATION_ORDER.index(worker_education.lower())
            required_level = self.EDUCATION_ORDER.index(required_education.lower())
            
            if worker_level >= required_level:
                return {'matched': True, 'criterion': 'Education requirement met'}
            else:
                return {
                    'matched': False,
                    'criterion': f'Minimum education: {required_education}',
                }
        except ValueError:
            return {'matched': False, 'criterion': 'Education verification needed'}
    
    def _check_state(
        self,
        worker_state: Optional[str],
        required_state: Optional[str],
    ) -> Dict[str, Any]:
        """Check state eligibility."""
        
        if not required_state:
            return {'matched': True, 'criterion': None}
        
        if not worker_state:
            return {'matched': False, 'criterion': 'State information required'}
        
        if worker_state.lower() == required_state.lower():
            return {'matched': True, 'criterion': 'State requirement met'}
        
        return {'matched': False, 'criterion': f'Restricted to {required_state} residents'}
    
    def _generate_recommendations(
        self,
        missing_criteria: List[str],
        missing_docs: set,
        eligibility_score: float,
    ) -> List[str]:
        """Generate recommendations based on eligibility check."""
        
        recommendations = []
        
        if eligibility_score >= 80:
            recommendations.append("You are likely eligible. Apply now!")
        elif eligibility_score >= 50:
            recommendations.append("You may be eligible with some updates")
        else:
            recommendations.append("Review eligibility criteria carefully")
        
        if missing_docs:
            recommendations.append(f"Upload these documents: {', '.join(missing_docs)}")
        
        for criterion in missing_criteria[:2]:  # Top 2 missing
            if 'age' in criterion.lower():
                recommendations.append("Check age-related alternatives")
            elif 'education' in criterion.lower():
                recommendations.append("Look for schemes suited to your education level")
        
        return recommendations


@lru_cache(maxsize=1)
def get_scheme_checker() -> SchemeEligibilityChecker:
    """Get cached SchemeEligibilityChecker instance."""
    return SchemeEligibilityChecker()
