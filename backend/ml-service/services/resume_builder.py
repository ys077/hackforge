"""
AI Resume Builder — Full ATS resume generator with LinkedIn integration,
certificate parsing, PDF generation, and JSON resume output.
"""

import io
import re
import json
import base64
from typing import List, Dict, Any, Optional
from functools import lru_cache
from loguru import logger
from datetime import datetime

from utils.nlp_utils import get_nlp_engine

try:
    from fpdf import FPDF
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False
    logger.warning("fpdf2 not available — PDF generation disabled")


class ATSResumePDF(FPDF if FPDF_AVAILABLE else object):
    """ATS-friendly PDF resume generator."""

    def __init__(self):
        if FPDF_AVAILABLE:
            super().__init__()
            self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        pass  # No header for ATS

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

    def add_section_title(self, title: str):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(30, 30, 30)
        self.cell(0, 8, title.upper(), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(60, 60, 60)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)

    def add_text(self, text: str, bold: bool = False, size: int = 10):
        self.set_font('Helvetica', 'B' if bold else '', size)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def add_bullet(self, text: str):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(50, 50, 50)
        self.cell(5, 5, chr(8226))  # Bullet point
        self.multi_cell(0, 5, f'  {text}')


class BlueMinimalistResumePDF(ATSResumePDF if FPDF_AVAILABLE else object):
    """Blue Neutral Simple Minimalist Professional resume style."""

    def __init__(self):
        if FPDF_AVAILABLE:
            super().__init__()
            self.set_auto_page_break(auto=True, margin=15)
            self.header_color = (41, 128, 185)  # Professional Blue
            self.text_color = (60, 60, 60)
            self.light_text = (100, 100, 100)

    def header(self):
        pass

    def add_section_title(self, title: str):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.header_color)
        self.cell(0, 8, title.upper(), new_x="LMARGIN", new_y="NEXT")
        # Add a subtle blue line under the title
        self.set_draw_color(*self.header_color)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def add_text(self, text: str, bold: bool = False, size: int = 10):
        self.set_font('Helvetica', 'B' if bold else '', size)
        self.set_text_color(*self.text_color)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def add_bullet(self, text: str):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*self.text_color)
        self.cell(5, 5, chr(149))  # Minimalist bullet
        self.multi_cell(0, 5, f'  {text}')


class ResumeGenerator:
    """AI Resume Generator with ATS optimization, PDF output, and JSON export."""

    TEMPLATES = {
        'basic': {
            'sections': ['summary', 'skills', 'experience', 'education'],
            'style': 'simple',
        },
        'professional': {
            'sections': ['summary', 'experience', 'skills', 'education', 'certifications'],
            'style': 'formal',
        },
        'ats_optimized': {
            'sections': ['summary', 'skills', 'certifications', 'experience', 'education', 'achievements'],
            'style': 'ats',
        },
        'blue_minimalist': {
            'sections': ['summary', 'skills', 'experience', 'education', 'certifications'],
            'style': 'blue_minimalist',
        },
    }

    def __init__(self):
        self.nlp = get_nlp_engine()
        logger.info("Resume Generator initialized")

    def generate(
        self,
        profile: Dict[str, Any],
        options: Dict[str, Any],
        linkedin_data: Optional[Dict[str, Any]] = None,
        certificates: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate a comprehensive ATS resume from all data sources."""

        template = options.get('template', 'ats_optimized')
        language = options.get('language', 'en')

        # Merge data from all sources
        merged = self._merge_profile_data(profile, linkedin_data, certificates)

        # Deduplicate skills
        merged['skills'] = self.nlp.deduplicate_skills(merged.get('skills', []))

        # Prioritize verified certificate skills
        if certificates:
            verified_skills = []
            for cert in certificates:
                if cert.get('success') and cert.get('skills_extracted'):
                    verified_skills.extend(cert['skills_extracted'])
            merged['verified_skills'] = self.nlp.deduplicate_skills(verified_skills)

        # Generate summary
        summary = self._generate_summary(merged, language)

        # Format skills
        skills = self._format_skills(merged.get('skills', []))

        # Generate work experience
        work_experience = self._generate_work_experience(merged)

        # Generate education section
        education = self._generate_education(merged)

        # Generate certifications section
        certifications_section = self._generate_certifications(certificates or [])

        # Generate achievements
        achievements = self._generate_achievements(merged)

        # Map skills to categories for job matching
        skill_categories = self.nlp.map_skills_to_categories(skills)

        # Build content
        content = {
            'template': template,
            'language': language,
            'personal_info': {
                'name': merged.get('name', ''),
                'phone': merged.get('phone', ''),
                'email': merged.get('email', ''),
                'location': self._format_location(merged),
                'linkedin': merged.get('linkedin_url', ''),
            },
            'sections': self.TEMPLATES.get(template, self.TEMPLATES['ats_optimized'])['sections'],
            'skill_categories': skill_categories,
        }

        # Build JSON resume format
        json_resume = {
            'basics': content['personal_info'],
            'summary': summary,
            'skills': skills,
            'certifications': certifications_section,
            'work': work_experience,
            'education': education,
            'achievements': achievements,
            'generated_at': datetime.utcnow().isoformat(),
        }

        return {
            'content': content,
            'summary': summary,
            'work_experience': work_experience,
            'education': education,
            'skills': skills,
            'certifications': certifications_section,
            'achievements': achievements,
            'json_resume': json_resume,
        }

    def generate_pdf(
        self,
        profile: Dict[str, Any],
        options: Dict[str, Any],
        linkedin_data: Optional[Dict[str, Any]] = None,
        certificates: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[str]:
        """Generate ATS-friendly PDF resume and return as base64."""

        if not FPDF_AVAILABLE:
            logger.warning("PDF generation not available — fpdf2 not installed")
            return None

        resume_data = self.generate(profile, options, linkedin_data, certificates)

        try:
            template_name = options.get('template', 'ats_optimized')
            if template_name == 'blue_minimalist':
                pdf = BlueMinimalistResumePDF()
            else:
                pdf = ATSResumePDF()
            
            pdf.add_page()

            # Personal Info Header
            name = profile.get('name', 'Your Name')
            pdf.set_font('Helvetica', 'B', 24 if template_name == 'blue_minimalist' else 22)
            
            if template_name == 'blue_minimalist':
                pdf.set_text_color(*pdf.header_color)
            else:
                pdf.set_text_color(30, 30, 30)
                
            pdf.cell(0, 12, name, new_x="LMARGIN", new_y="NEXT", align='C')

            # Contact line
            contact_parts = []
            if profile.get('phone'):
                contact_parts.append(profile['phone'])
            if profile.get('email'):
                contact_parts.append(profile['email'])
            location = self._format_location(profile)
            if location:
                contact_parts.append(location)

            if contact_parts:
                pdf.set_font('Helvetica', '', 10)
                pdf.set_text_color(80, 80, 80)
                pdf.cell(0, 6, ' | '.join(contact_parts), new_x="LMARGIN", new_y="NEXT", align='C')

            if profile.get('linkedin_url'):
                pdf.set_font('Helvetica', '', 9)
                pdf.set_text_color(40, 80, 160)
                pdf.cell(0, 5, profile['linkedin_url'], new_x="LMARGIN", new_y="NEXT", align='C')

            pdf.ln(5)

            # Profile Summary
            if resume_data.get('summary'):
                pdf.add_section_title('Professional Summary')
                pdf.add_text(resume_data['summary'])
                pdf.ln(3)

            # Skills
            if resume_data.get('skills'):
                pdf.add_section_title('Skills')
                skills_text = ' | '.join(resume_data['skills'][:20])
                pdf.add_text(skills_text)
                pdf.ln(3)

            # Certifications
            if resume_data.get('certifications'):
                pdf.add_section_title('Certifications')
                for cert in resume_data['certifications']:
                    cert_text = cert.get('name', '')
                    if cert.get('issuer'):
                        cert_text += f" — {cert['issuer']}"
                    if cert.get('year'):
                        cert_text += f" ({cert['year']})"
                    pdf.add_bullet(cert_text)
                pdf.ln(3)

            # Work Experience
            if resume_data.get('work_experience'):
                pdf.add_section_title('Work Experience')
                for exp in resume_data['work_experience']:
                    title_line = exp.get('title', 'Worker')
                    if exp.get('company'):
                        title_line += f" — {exp['company']}"
                    pdf.add_text(title_line, bold=True, size=11)

                    if exp.get('duration') or exp.get('years'):
                        duration = exp.get('duration', f"{exp.get('years', 0)} years")
                        pdf.add_text(str(duration), size=9)

                    if exp.get('description'):
                        pdf.add_text(exp['description'])

                    for achievement in exp.get('achievements', []):
                        pdf.add_bullet(achievement)

                    pdf.ln(2)

            # Education
            if resume_data.get('education'):
                pdf.add_section_title('Education')
                for edu in resume_data['education']:
                    edu_text = edu.get('degree', edu.get('level', ''))
                    if edu.get('institution'):
                        edu_text += f" — {edu['institution']}"
                    pdf.add_text(edu_text, bold=True)
                pdf.ln(3)

            # Achievements
            if resume_data.get('achievements'):
                pdf.add_section_title('Achievements')
                for ach in resume_data['achievements']:
                    pdf.add_bullet(ach)

            # Convert to base64
            pdf_bytes = pdf.output()
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            return pdf_base64

        except Exception as e:
            logger.error(f"PDF generation failed: {e}")
            return None

    def _merge_profile_data(
        self,
        profile: Dict[str, Any],
        linkedin_data: Optional[Dict[str, Any]],
        certificates: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        """Merge profile data from all sources, prioritizing verified data."""

        merged = {**profile}

        # Merge LinkedIn data
        if linkedin_data and linkedin_data.get('success'):
            if linkedin_data.get('name') and not merged.get('name'):
                merged['name'] = linkedin_data['name']
            if linkedin_data.get('headline') and not merged.get('occupation'):
                merged['occupation'] = linkedin_data['headline']
            if linkedin_data.get('summary') and not merged.get('bio'):
                merged['bio'] = linkedin_data['summary']
            if linkedin_data.get('location') and not merged.get('city'):
                merged['city'] = linkedin_data['location']

            # Merge skills
            existing_skills = set(s.lower() for s in merged.get('skills', []))
            for skill in linkedin_data.get('skills', []):
                if skill.lower() not in existing_skills:
                    merged.setdefault('skills', []).append(skill)
                    existing_skills.add(skill.lower())

            # Merge experience
            if linkedin_data.get('experience'):
                merged['linkedin_experience'] = linkedin_data['experience']

            # Merge education
            if linkedin_data.get('education'):
                merged['linkedin_education'] = linkedin_data['education']

        # Merge certificate skills
        if certificates:
            existing_skills = set(s.lower() for s in merged.get('skills', []))
            for cert in certificates:
                if cert.get('success'):
                    for skill in cert.get('skills_extracted', []):
                        if skill.lower() not in existing_skills:
                            merged.setdefault('skills', []).append(skill)
                            existing_skills.add(skill.lower())

        return merged

    def _generate_summary(self, profile: Dict[str, Any], language: str) -> str:
        """Generate professional summary using NLP."""

        occupation = profile.get('occupation', profile.get('headline', 'Professional'))
        experience_years = profile.get('experience_years', 0)
        skills = profile.get('skills', [])
        bio = profile.get('bio', '')

        if bio and len(bio) > 50:
            return bio[:300]

        parts = []

        if experience_years and experience_years > 0:
            parts.append(
                f"Dedicated {occupation} with {experience_years}+ years of hands-on experience"
            )
        else:
            parts.append(f"Motivated {occupation} seeking opportunities for professional growth")

        if skills:
            top_skills = skills[:5]
            parts.append(f"proficient in {', '.join(top_skills)}")
            if len(skills) > 5:
                parts.append(f"and {len(skills) - 5} additional skills")

        # Add location
        location = self._format_location(profile)
        if location:
            parts.append(f"based in {location}")

        summary = '. '.join(['. '.join(parts[:2])] + parts[2:]) + '.'
        return summary.replace('..', '.')

    def _format_skills(self, skills: List[str]) -> List[str]:
        """Format and clean skills list."""
        return [s.strip().title() for s in skills if s.strip()][:25]

    def _format_location(self, profile: Dict[str, Any]) -> str:
        """Format location from profile."""
        parts = []
        if profile.get('city'):
            parts.append(profile['city'])
        if profile.get('state'):
            parts.append(profile['state'])
        return ', '.join(parts) if parts else ''

    def _generate_work_experience(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate work experience section from all sources."""

        experiences = []

        # From LinkedIn data
        for exp in profile.get('linkedin_experience', []):
            experiences.append({
                'title': exp.get('title', ''),
                'company': exp.get('company', ''),
                'duration': exp.get('duration', ''),
                'description': exp.get('description', ''),
                'achievements': exp.get('achievements', []),
            })

        # From profile data
        experience_years = profile.get('experience_years', 0)
        occupation = profile.get('occupation', '')

        if not experiences and experience_years > 0:
            achievements = [
                'Maintained consistent work performance and quality standards',
                'Demonstrated reliability, punctuality, and professional conduct',
                'Collaborated effectively with team members and stakeholders',
            ]

            if profile.get('skills'):
                achievements.append(
                    f"Applied skills in {", ".join(profile["skills"][:3])} to deliver results"
                )

            experiences.append({
                'title': occupation or 'Professional Worker',
                'years': experience_years,
                'description': f"Experienced {occupation.lower() if occupation else 'professional'} with demonstrated expertise across {experience_years} years.",
                'achievements': achievements,
            })

        return experiences

    def _generate_education(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate education section from all sources."""

        education = []

        # From LinkedIn education
        for edu in profile.get('linkedin_education', []):
            education.append({
                'degree': edu.get('degree', ''),
                'institution': edu.get('institution', edu.get('school', '')),
                'completed': True,
            })

        # From profile education level
        if not education:
            edu_level = profile.get('education', '')
            education_display = {
                'none': None,
                'primary': 'Primary School (5th)',
                'secondary': 'Secondary School (10th)',
                'higher_secondary': 'Higher Secondary (12th)',
                'diploma': 'Diploma',
                'graduate': "Bachelor's Degree",
                'post_graduate': "Master's Degree",
                'doctorate': 'Doctorate',
            }

            display_name = education_display.get(edu_level.lower() if edu_level else 'none')
            if display_name:
                education.append({
                    'level': display_name,
                    'completed': True,
                })

        return education

    def _generate_certifications(self, certificates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate certifications section from parsed certificates."""

        certs = []
        for cert in certificates:
            if cert.get('success') and (cert.get('skill_name') or cert.get('issuing_organization')):
                certs.append({
                    'name': cert.get('skill_name', 'Certificate'),
                    'issuer': cert.get('issuing_organization', ''),
                    'year': cert.get('certification_year'),
                    'skills': cert.get('skills_extracted', []),
                })

        return certs

    def _generate_achievements(self, profile: Dict[str, Any]) -> List[str]:
        """Generate achievements based on profile data."""

        achievements = []

        skills_count = len(profile.get('skills', []))
        if skills_count > 10:
            achievements.append(f"Proficient in {skills_count}+ professional skills across multiple domains")

        experience_years = profile.get('experience_years', 0)
        if experience_years > 5:
            achievements.append(f"Over {experience_years} years of consistent professional experience")

        if profile.get('verified_skills'):
            achievements.append(
                f"Holds {len(profile['verified_skills'])} verified skill certifications"
            )

        languages = profile.get('languages_known', profile.get('languages', []))
        if len(languages) > 1:
            achievements.append(f"Multilingual: fluent in {', '.join(languages)}")

        return achievements


class ResumeAnalyzer:
    """Analyze resume for ATS compatibility and scoring."""

    IMPORTANT_SECTIONS = ['summary', 'experience', 'skills', 'education', 'contact']

    ATS_KEYWORDS = [
        'experience', 'skills', 'education', 'achievements', 'responsibilities',
        'projects', 'certifications', 'languages', 'contact', 'summary',
        'years', 'managed', 'developed', 'increased', 'improved', 'led',
        'implemented', 'created', 'designed', 'trained', 'collaborated',
        'proficient', 'expertise', 'demonstrated', 'results', 'performance',
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
        keyword_score = min(100, keyword_count * 4)

        # Calculate length score
        word_count = len(resume_text.split())
        if word_count < 100:
            length_score = 40
        elif word_count < 200:
            length_score = 65
        elif word_count < 400:
            length_score = 90
        elif word_count < 600:
            length_score = 100
        else:
            length_score = 75  # Too long

        # Calculate job match if description provided
        keyword_match = None
        if job_description:
            keyword_match = self._calculate_keyword_match(resume_text, job_description)

        # Calculate overall ATS score
        ats_score = (section_score * 0.4 + keyword_score * 0.35 + length_score * 0.25)

        # Boost if job match is provided
        if keyword_match is not None:
            ats_score = ats_score * 0.7 + keyword_match * 0.3

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

        common_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be',
            'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'can', 'this', 'that',
        }
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
        else:
            feedback.append("✅ All important sections are present")

        if word_count < 100:
            feedback.append("❌ Resume is too short. Add more details about your experience.")
        elif word_count > 600:
            feedback.append("⚠️ Resume is quite long. Consider condensing to key points.")
        else:
            feedback.append("✅ Resume length is appropriate.")

        if keyword_count < 5:
            feedback.append("❌ Add more action words and industry keywords.")
        elif keyword_count >= 12:
            feedback.append("✅ Good use of professional keywords.")

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
            suggestions.append("Include a dedicated skills section with relevant keywords")

        if not sections_found.get('contact'):
            suggestions.append("Ensure contact information is clearly visible")

        if word_count < 150:
            suggestions.append("Expand on your work experience with specific achievements")
            suggestions.append("Add quantifiable results (e.g., 'Increased productivity by 20%')")

        suggestions.append("Use bullet points for better ATS readability")
        suggestions.append("Include relevant keywords from job descriptions you're targeting")
        suggestions.append("Add certifications and verified skills for higher credibility")

        return suggestions


@lru_cache(maxsize=1)
def get_resume_generator() -> ResumeGenerator:
    """Get cached ResumeGenerator instance."""
    return ResumeGenerator()


@lru_cache(maxsize=1)
def get_resume_analyzer() -> ResumeAnalyzer:
    """Get cached ResumeAnalyzer instance."""
    return ResumeAnalyzer()
