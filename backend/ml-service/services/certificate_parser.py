"""
Certificate Parser — OCR-based extraction of skill certificates.
Extracts skill name, issuing organization, certification year, and maps to job categories.
"""

import re
from typing import Dict, Any, Optional, List
from functools import lru_cache
from loguru import logger

from utils.ocr_utils import get_ocr_engine
from utils.nlp_utils import get_nlp_engine


class CertificateParser:
    """Parse skill certificates using OCR and NLP to extract structured data."""

    # Known certification issuers for validation
    KNOWN_ISSUERS = {
        # Government
        'nsdc': 'National Skill Development Corporation',
        'ncvt': 'National Council for Vocational Training',
        'nielit': 'NIELIT',
        'ignou': 'IGNOU',
        'iti': 'Industrial Training Institute',
        'pmkvy': 'PMKVY',
        'nios': 'National Institute of Open Schooling',
        # Private / International
        'google': 'Google',
        'microsoft': 'Microsoft',
        'aws': 'Amazon Web Services',
        'coursera': 'Coursera',
        'udemy': 'Udemy',
        'linkedin': 'LinkedIn Learning',
        'cisco': 'Cisco',
        'oracle': 'Oracle',
        'ibm': 'IBM',
        'adobe': 'Adobe',
        'meta': 'Meta',
        'hubspot': 'HubSpot',
        'salesforce': 'Salesforce',
        'comptia': 'CompTIA',
    }

    def __init__(self):
        self.ocr = get_ocr_engine()
        self.nlp = get_nlp_engine()
        logger.info("Certificate Parser initialized")

    def parse_certificate(self, base64_image: str) -> Dict[str, Any]:
        """Parse a certificate image and extract structured information."""

        result = {
            'success': False,
            'skill_name': '',
            'issuing_organization': '',
            'certification_year': None,
            'holder_name': '',
            'certificate_number': '',
            'skills_extracted': [],
            'category': '',
            'raw_text': '',
            'confidence': 0.0,
        }

        # Extract text using OCR
        text = self.ocr.extract_text_from_base64(base64_image)
        if not text:
            result['error'] = 'Could not extract text from image. Please upload a clearer image.'
            return result

        result['raw_text'] = text
        result['success'] = True

        # Extract certificate title / skill name
        result['skill_name'] = self._extract_certificate_title(text)

        # Extract issuing organization
        result['issuing_organization'] = self._extract_issuer(text)

        # Extract year
        result['certification_year'] = self._extract_year(text)

        # Extract holder name
        result['holder_name'] = self.ocr.extract_name(text) or ''

        # Extract certificate/registration number
        result['certificate_number'] = self._extract_cert_number(text)

        # Extract skills from certificate text
        result['skills_extracted'] = self._extract_skills_from_text(text)

        # Map to job category
        all_skills = result['skills_extracted'] + ([result['skill_name']] if result['skill_name'] else [])
        if all_skills:
            categories = self.nlp.map_skills_to_categories(all_skills)
            if categories:
                result['category'] = max(categories, key=lambda k: len(categories[k]))

        # Calculate confidence based on extracted fields
        fields_found = sum(1 for v in [
            result['skill_name'], result['issuing_organization'],
            result['certification_year'], result['holder_name'],
        ] if v)
        result['confidence'] = round(fields_found / 4 * 100, 2)

        return result

    def parse_multiple_certificates(self, certificates: List[str]) -> Dict[str, Any]:
        """Parse multiple certificate images and aggregate results."""

        all_skills = []
        all_certs = []
        categories_found = {}

        for i, cert_image in enumerate(certificates):
            result = self.parse_certificate(cert_image)
            all_certs.append(result)

            if result['success']:
                all_skills.extend(result['skills_extracted'])
                if result['skill_name']:
                    all_skills.append(result['skill_name'])
                if result['category']:
                    categories_found[result['category']] = (
                        categories_found.get(result['category'], 0) + 1
                    )

        # Deduplicate skills
        unique_skills = self.nlp.deduplicate_skills(all_skills)

        return {
            'total_certificates': len(certificates),
            'successfully_parsed': sum(1 for c in all_certs if c['success']),
            'certificates': all_certs,
            'all_skills': unique_skills,
            'skill_categories': categories_found,
            'primary_category': max(categories_found, key=categories_found.get) if categories_found else '',
        }

    def _extract_certificate_title(self, text: str) -> str:
        """Extract the certificate title / skill name."""

        patterns = [
            r'(?:certificate|certification)\s+(?:of|in|for)\s+(.{5,80})',
            r'(?:course|program|programme|training)\s+(?:on|in|for)\s+(.{5,80})',
            r'(?:completed|awarded)\s+(?:the)?\s*(.{5,80}?)(?:\s+course|\s+program|\s+training)',
            r'(?:certified|qualify|qualified)\s+(?:as|in)\s+(.{5,80})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                # Clean up the title
                title = re.sub(r'\s+', ' ', title)
                title = title.rstrip('.')
                return title[:100]  # Limit length

        # Fallback: try to find a prominent line (likely the title)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines[:5]:  # Check first 5 lines
            if 10 < len(line) < 100 and not any(
                kw in line.lower() for kw in ['date', 'name', 'address', 'phone', 'email', 'this is']
            ):
                return line

        return ''

    def _extract_issuer(self, text: str) -> str:
        """Extract issuing organization."""

        text_lower = text.lower()

        # Check known issuers
        for key, name in self.KNOWN_ISSUERS.items():
            if key in text_lower:
                return name

        # Pattern matching
        patterns = [
            r'(?:issued|awarded|granted|certified)\s+by\s+(.{5,80})',
            r'(?:organization|institution|institute|university|academy)\s*[:\-]?\s*(.{5,80})',
            r'(?:from)\s+(.{5,60}(?:institute|university|academy|college|school|center|centre))',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                issuer = match.group(1).strip()
                return re.sub(r'\s+', ' ', issuer)[:100]

        return ''

    def _extract_year(self, text: str) -> Optional[int]:
        """Extract certification year."""

        # Date patterns
        patterns = [
            r'(?:date|issued|awarded|year)\s*[:\-]?\s*.*?(\d{4})',
            r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})',
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})',
        ]

        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    year = int(match[-1])
                else:
                    year = int(match)

                if 1990 <= year <= 2030:
                    years.append(year)

        return max(years) if years else None

    def _extract_cert_number(self, text: str) -> str:
        """Extract certificate/registration number."""

        patterns = [
            r'(?:certificate|cert|registration|ref|serial)\s*(?:no|number|#|id)\s*[:\-.]?\s*([\w\-/]{5,30})',
            r'(?:no|number|#)\s*[:\-.]?\s*([\w\-/]{5,30})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ''

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skill keywords from certificate text using NLP."""

        # Extract keywords
        keywords = self.nlp.extract_keywords(text, top_n=15)

        # Filter to likely skill-related keywords
        skill_indicators = set()
        for category_skills in self.nlp.SKILL_CATEGORIES.values():
            skill_indicators.update(s.lower() for s in category_skills)

        skills = []
        for keyword in keywords:
            if keyword.lower() in skill_indicators:
                skills.append(keyword.title())
            elif len(keyword) > 3 and keyword.isalpha():
                # Check if it's a technical term
                for cat_skills in self.nlp.SKILL_CATEGORIES.values():
                    if any(keyword.lower() in cs or cs in keyword.lower() for cs in cat_skills):
                        skills.append(keyword.title())
                        break

        return self.nlp.deduplicate_skills(skills)


@lru_cache(maxsize=1)
def get_certificate_parser() -> CertificateParser:
    """Get cached CertificateParser instance."""
    return CertificateParser()
