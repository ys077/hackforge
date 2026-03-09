from typing import List, Dict, Any, Optional
from functools import lru_cache
from loguru import logger
import re


class ResumeGenerator:
    """AI Resume Generator with templates and enhancement."""
    
    TEMPLATES = {
        'basic': {
            'sections': ['summary', 'skills', 'experience', 'education'],
            'style': 'simple',
        },
        'professional': {
            'sections': ['summary', 'experience', 'skills', 'education', 'certifications'],
            'style': 'formal',
        },
        'creative': {
            'sections': ['summary', 'skills', 'projects', 'experience', 'education'],
            'style': 'modern',
        },
    }
    
    SUMMARY_TEMPLATES = {
        'en': {
            'basic': "Experienced {occupation} with {experience_years} years of expertise. Skilled in {skills}. Based in {location}.",
            'detailed': "{occupation} professional with {experience_years} years of hands-on experience. Proficient in {skills_detailed}. Seeking opportunities to leverage my expertise in {industry}. Known for {strengths}.",
        },
        'hi': {
            'basic': "{experience_years} वर्षों के अनुभव के साथ अनुभवी {occupation}। {skills} में कुशल। {location} में स्थित।",
        },
    }
    
    def generate(
        self,
        profile: Dict[str, Any],
        options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate resume content from profile."""
        
        template = options.get('template', 'basic')
        language = options.get('language', 'en')
        
        # Generate summary
        summary = self._generate_summary(profile, language)
        
        # Format skills
        skills = self._format_skills(profile.get('skills', []))
        
        # Generate work experience
        work_experience = self._generate_work_experience(profile)
        
        # Generate education section
        education = self._generate_education(profile)
        
        # Build content
        content = {
            'template': template,
            'language': language,
            'personal_info': {
                'name': profile.get('name'),
                'phone': profile.get('phone'),
                'email': profile.get('email'),
                'location': f"{profile.get('city', '')}, {profile.get('state', '')}".strip(', '),
            },
            'sections': self.TEMPLATES.get(template, self.TEMPLATES['basic'])['sections'],
        }
        
        return {
            'content': content,
            'summary': summary,
            'work_experience': work_experience,
            'education': education,
            'skills': skills,
        }
    
    def _generate_summary(
        self,
        profile: Dict[str, Any],
        language: str,
    ) -> str:
        """Generate professional summary."""
        
        templates = self.SUMMARY_TEMPLATES.get(language, self.SUMMARY_TEMPLATES['en'])
        template = templates.get('basic', '')
        
        occupation = profile.get('occupation', 'Professional')
        experience_years = profile.get('experience_years', 0)
        skills = profile.get('skills', [])
        city = profile.get('city', '')
        state = profile.get('state', '')
        
        # Format skills list
        if skills:
            skills_str = ', '.join(skills[:5])
            if len(skills) > 5:
                skills_str += f' and {len(skills) - 5} more'
        else:
            skills_str = 'various relevant skills'
        
        location = f"{city}, {state}".strip(', ') or 'India'
        
        return template.format(
            occupation=occupation,
            experience_years=experience_years,
            skills=skills_str,
            location=location,
        )
    
    def _format_skills(self, skills: List[str]) -> List[str]:
        """Format and categorize skills."""
        # Capitalize and clean skills
        return [s.strip().title() for s in skills if s.strip()]
    
    def _generate_work_experience(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate work experience section."""
        
        experience_years = profile.get('experience_years', 0)
        occupation = profile.get('occupation', '')
        
        if experience_years <= 0:
            return []
        
        # Generate placeholder experience based on profile
        experience = {
            'title': occupation or 'Worker',
            'years': experience_years,
            'description': f"Worked in {occupation.lower() if occupation else 'various'} roles with demonstrated skills and reliability.",
            'achievements': [
                'Maintained consistent work performance',
                'Demonstrated reliability and punctuality',
                'Collaborated effectively with team members',
            ],
        }
        
        return [experience]
    
    def _generate_education(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate education section."""
        
        education = profile.get('education', '')
        
        education_display = {
            'none': None,
            'primary': 'Primary School',
            'secondary': 'Secondary School (10th)',
            'higher_secondary': 'Higher Secondary (12th)',
            'diploma': 'Diploma',
            'graduate': "Bachelor's Degree",
            'post_graduate': "Master's Degree",
        }
        
        display_name = education_display.get(education.lower() if education else 'none')
        
        if not display_name:
            return []
        
        return [{
            'level': display_name,
            'completed': True,
        }]


class ResumeAnalyzer:
    """Analyze resume for ATS compatibility and scoring."""
    
    IMPORTANT_SECTIONS = ['summary', 'experience', 'skills', 'education', 'contact']
    
    ATS_KEYWORDS = [
        'experience', 'skills', 'education', 'achievements', 'responsibilities',
        'projects', 'certifications', 'languages', 'contact', 'summary',
        'years', 'managed', 'developed', 'increased', 'improved', 'led',
    ]
    
    def analyze(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze resume and return ATS score with feedback."""
        
        text_lower = resume_text.lower()
        
        # Calculate section scores
        sections_found = {}
        section_score = 0
        
        for section in self.IMPORTANT_SECTIONS:
            found = section in text_lower or section + ':' in text_lower
            sections_found[section] = found
            if found:
                section_score += 20
        
        # Calculate keyword score
        keyword_count = sum(1 for kw in self.ATS_KEYWORDS if kw in text_lower)
        keyword_score = min(100, keyword_count * 5)
        
        # Calculate length score
        word_count = len(resume_text.split())
        if word_count < 100:
            length_score = 50
        elif word_count < 200:
            length_score = 70
        elif word_count < 500:
            length_score = 100
        else:
            length_score = 80  # Too long
        
        # Calculate job match if description provided
        keyword_match = None
        if job_description:
            keyword_match = self._calculate_keyword_match(resume_text, job_description)
        
        # Calculate overall ATS score
        ats_score = (section_score * 0.4 + keyword_score * 0.4 + length_score * 0.2)
        
        # Generate feedback
        feedback = self._generate_feedback(sections_found, word_count, keyword_count)
        suggestions = self._generate_suggestions(sections_found, word_count)
        
        return {
            'ats_score': round(ats_score, 2),
            'feedback': feedback,
            'suggestions': suggestions,
            'keyword_match': keyword_match,
            'sections_analysis': {
                'found': sections_found,
                'score': section_score,
                'word_count': word_count,
            },
        }
    
    def _calculate_keyword_match(
        self,
        resume_text: str,
        job_description: str,
    ) -> float:
        """Calculate keyword match with job description."""
        
        resume_words = set(re.findall(r'\b\w+\b', resume_text.lower()))
        job_words = set(re.findall(r'\b\w+\b', job_description.lower()))
        
        # Remove common words
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        job_words -= common_words
        resume_words -= common_words
        
        if not job_words:
            return 0.0
        
        matched = resume_words.intersection(job_words)
        return round(len(matched) / len(job_words) * 100, 2)
    
    def _generate_feedback(
        self,
        sections_found: Dict[str, bool],
        word_count: int,
        keyword_count: int,
    ) -> List[str]:
        """Generate feedback based on analysis."""
        
        feedback = []
        
        missing_sections = [s for s, found in sections_found.items() if not found]
        if missing_sections:
            feedback.append(f"Missing sections: {', '.join(missing_sections)}")
        
        if word_count < 100:
            feedback.append("Resume is too short. Add more details about your experience.")
        elif word_count > 600:
            feedback.append("Resume is quite long. Consider condensing to key points.")
        else:
            feedback.append("Resume length is appropriate.")
        
        if keyword_count < 5:
            feedback.append("Add more action words and industry keywords.")
        
        return feedback
    
    def _generate_suggestions(
        self,
        sections_found: Dict[str, bool],
        word_count: int,
    ) -> List[str]:
        """Generate improvement suggestions."""
        
        suggestions = []
        
        if not sections_found.get('summary'):
            suggestions.append("Add a professional summary at the top")
        
        if not sections_found.get('skills'):
            suggestions.append("Include a dedicated skills section")
        
        if not sections_found.get('contact'):
            suggestions.append("Ensure contact information is clearly visible")
        
        if word_count < 150:
            suggestions.append("Expand on your work experience with specific achievements")
            suggestions.append("Add quantifiable results where possible")
        
        suggestions.append("Use bullet points for better readability")
        suggestions.append("Include relevant keywords from job descriptions")
        
        return suggestions


@lru_cache(maxsize=1)
def get_resume_generator() -> ResumeGenerator:
    """Get cached ResumeGenerator instance."""
    return ResumeGenerator()


@lru_cache(maxsize=1)
def get_resume_analyzer() -> ResumeAnalyzer:
    """Get cached ResumeAnalyzer instance."""
    return ResumeAnalyzer()
