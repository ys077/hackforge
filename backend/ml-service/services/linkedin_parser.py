"""
LinkedIn Profile Parser — Extracts structured data from LinkedIn profiles
for resume generation. Uses web scraping for public profiles.
"""

import re
from typing import Dict, Any, Optional, List
from functools import lru_cache
from loguru import logger

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False


class LinkedInParser:
    """Parse LinkedIn profiles to extract structured resume data."""

    def __init__(self):
        logger.info("LinkedIn Parser initialized")

    async def parse_profile(self, linkedin_url: str) -> Dict[str, Any]:
        """Parse a LinkedIn profile URL and extract structured data.
        
        Attempts web scraping of public profile. Falls back to URL-based
        extraction if scraping is blocked.
        """

        result = {
            'success': False,
            'source': 'linkedin',
            'profile_url': linkedin_url,
            'name': '',
            'headline': '',
            'location': '',
            'summary': '',
            'skills': [],
            'experience': [],
            'education': [],
            'certifications': [],
            'projects': [],
            'languages': [],
        }

        # Validate LinkedIn URL
        if not self._is_valid_linkedin_url(linkedin_url):
            result['error'] = 'Invalid LinkedIn URL. Please provide a URL like: https://www.linkedin.com/in/username'
            return result

        # Extract username from URL
        username = self._extract_username(linkedin_url)
        if username:
            result['username'] = username

        # Attempt to scrape public profile
        scraped = await self._scrape_public_profile(linkedin_url)
        if scraped and scraped.get('name'):
            result.update(scraped)
            result['success'] = True
            result['source'] = 'linkedin_scrape'
            logger.info(f"Successfully scraped LinkedIn profile: {username}")
        else:
            # Fallback: extract what we can from URL
            result['name'] = self._format_name_from_username(username) if username else ''
            result['success'] = True
            result['source'] = 'linkedin_url_parse'
            result['note'] = 'Could not scrape full profile — LinkedIn may have blocked access. Please provide additional details manually.'
            logger.info(f"Using URL-based extraction for: {username}")

        return result

    def parse_manual_input(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse manually provided LinkedIn-style profile data."""
        return {
            'success': True,
            'source': 'manual_input',
            'name': data.get('name', ''),
            'headline': data.get('headline', data.get('occupation', '')),
            'location': data.get('location', ''),
            'summary': data.get('summary', data.get('bio', '')),
            'skills': data.get('skills', []),
            'experience': self._format_experience(data.get('experience', [])),
            'education': self._format_education(data.get('education', [])),
            'certifications': data.get('certifications', []),
            'projects': data.get('projects', []),
            'languages': data.get('languages', data.get('languages_known', [])),
        }

    async def _scrape_public_profile(self, url: str) -> Optional[Dict[str, Any]]:
        """Attempt to scrape public LinkedIn profile."""

        if not HTTPX_AVAILABLE or not BS4_AVAILABLE:
            return None

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            }

            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers=headers,
            ) as client:
                response = await client.get(url)
                
                if response.status_code != 200:
                    logger.warning(f"LinkedIn returned {response.status_code}")
                    return None

                soup = BeautifulSoup(response.text, 'lxml')
                return self._extract_from_html(soup)

        except Exception as e:
            logger.warning(f"LinkedIn scraping failed: {e}")
            return None

    def _extract_from_html(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract profile data from LinkedIn HTML."""
        data = {}

        # Name
        name_el = soup.find('h1') or soup.find(class_=re.compile(r'top-card.*name|profile.*name'))
        if name_el:
            data['name'] = name_el.get_text(strip=True)

        # Headline
        headline_el = soup.find(class_=re.compile(r'headline|top-card.*subline'))
        if headline_el:
            data['headline'] = headline_el.get_text(strip=True)

        # Location
        location_el = soup.find(class_=re.compile(r'location|top-card.*location'))
        if location_el:
            data['location'] = location_el.get_text(strip=True)

        # Summary / About
        summary_el = soup.find(class_=re.compile(r'summary|about'))
        if summary_el:
            data['summary'] = summary_el.get_text(strip=True)[:500]

        # Skills
        skills = []
        skill_els = soup.find_all(class_=re.compile(r'skill.*name|pv-skill'))
        for el in skill_els[:20]:
            skill_text = el.get_text(strip=True)
            if skill_text and len(skill_text) > 1:
                skills.append(skill_text)
        if skills:
            data['skills'] = skills

        # Experience
        experience = []
        exp_sections = soup.find_all(class_=re.compile(r'experience.*section|pv-position'))
        for section in exp_sections[:10]:
            title_el = section.find(class_=re.compile(r'title|position'))
            company_el = section.find(class_=re.compile(r'company|subtitle'))
            duration_el = section.find(class_=re.compile(r'date|duration'))

            exp = {}
            if title_el:
                exp['title'] = title_el.get_text(strip=True)
            if company_el:
                exp['company'] = company_el.get_text(strip=True)
            if duration_el:
                exp['duration'] = duration_el.get_text(strip=True)
            if exp:
                experience.append(exp)

        if experience:
            data['experience'] = experience

        # Education
        education = []
        edu_sections = soup.find_all(class_=re.compile(r'education.*section|pv-education'))
        for section in edu_sections[:5]:
            school_el = section.find(class_=re.compile(r'school|institution'))
            degree_el = section.find(class_=re.compile(r'degree|field'))

            edu = {}
            if school_el:
                edu['institution'] = school_el.get_text(strip=True)
            if degree_el:
                edu['degree'] = degree_el.get_text(strip=True)
            if edu:
                education.append(edu)

        if education:
            data['education'] = education

        return data

    def _is_valid_linkedin_url(self, url: str) -> bool:
        """Validate LinkedIn URL format."""
        patterns = [
            r'https?://(?:www\.)?linkedin\.com/in/[\w\-]+',
            r'https?://(?:www\.)?linkedin\.com/pub/[\w\-]+',
        ]
        return any(re.match(p, url) for p in patterns)

    def _extract_username(self, url: str) -> Optional[str]:
        """Extract username from LinkedIn URL."""
        match = re.search(r'linkedin\.com/in/([\w\-]+)', url)
        if match:
            return match.group(1)

        match = re.search(r'linkedin\.com/pub/([\w\-]+)', url)
        if match:
            return match.group(1)

        return None

    def _format_name_from_username(self, username: str) -> str:
        """Convert LinkedIn username to a display name."""
        name = username.replace('-', ' ').replace('_', ' ')
        return name.title()

    def _format_experience(self, experience: Any) -> List[Dict[str, Any]]:
        """Format experience data into structured format."""
        if not experience:
            return []
        if isinstance(experience, list):
            return experience
        return [experience]

    def _format_education(self, education: Any) -> List[Dict[str, Any]]:
        """Format education data into structured format."""
        if not education:
            return []
        if isinstance(education, list):
            return education
        return [education]


@lru_cache(maxsize=1)
def get_linkedin_parser() -> LinkedInParser:
    """Get cached LinkedIn parser instance."""
    return LinkedInParser()
