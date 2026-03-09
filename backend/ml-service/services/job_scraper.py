"""
Job Scraper — Scrapes job listings from job portals like Indeed India.
Extracts job details and converts descriptions into feature vectors for matching.
"""

import re
import time
from typing import List, Dict, Any, Optional
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

from config import settings
from utils.nlp_utils import get_nlp_engine


class JobScraper:
    """Job portal scraper for Indeed India and similar platforms."""

    # Built-in job listings for demo and fallback
    BUILTIN_JOBS = [
        {
            'id': 'job_001',
            'title': 'Construction Site Supervisor',
            'company': 'L&T Construction',
            'location': 'Mumbai, Maharashtra',
            'skills_required': ['construction safety', 'blueprint reading', 'team management', 'masonry', 'concrete'],
            'education_required': 'diploma',
            'experience_min': 3,
            'experience_max': 8,
            'salary': '₹25,000 - ₹40,000/month',
            'job_type': 'full_time',
            'description': 'Looking for an experienced construction site supervisor to manage daily operations, ensure safety compliance, and coordinate with workers and engineers.',
            'application_link': 'https://in.indeed.com/jobs?q=construction+supervisor&l=Mumbai',
            'posted_date': '2026-03-01',
        },
        {
            'id': 'job_002',
            'title': 'Electrician - Residential & Commercial',
            'company': 'Havells India',
            'location': 'Delhi NCR',
            'skills_required': ['electrical wiring', 'electrician', 'circuit installation', 'safety protocols', 'troubleshooting'],
            'education_required': 'secondary',
            'experience_min': 1,
            'experience_max': 5,
            'salary': '₹18,000 - ₹30,000/month',
            'job_type': 'full_time',
            'description': 'Certified electrician needed for residential and commercial electrical installations, maintenance, and repairs. ITI/diploma preferred.',
            'application_link': 'https://in.indeed.com/jobs?q=electrician&l=Delhi',
            'posted_date': '2026-03-02',
        },
        {
            'id': 'job_003',
            'title': 'Delivery Executive',
            'company': 'Zomato / Swiggy',
            'location': 'Bangalore, Karnataka',
            'skills_required': ['driving', 'delivery', 'navigation', 'customer service', 'time management'],
            'education_required': 'secondary',
            'experience_min': 0,
            'experience_max': None,
            'salary': '₹15,000 - ₹25,000/month',
            'job_type': 'full_time',
            'description': 'Delivery executives needed for food delivery platform. Must have own two-wheeler and valid driving license. Flexible working hours.',
            'application_link': 'https://in.indeed.com/jobs?q=delivery+executive&l=Bangalore',
            'posted_date': '2026-03-03',
        },
        {
            'id': 'job_004',
            'title': 'Tailoring Master',
            'company': 'Raymond Tailoring',
            'location': 'Chennai, Tamil Nadu',
            'skills_required': ['tailoring', 'stitching', 'measurement', 'pattern making', 'fabric knowledge'],
            'education_required': 'none',
            'experience_min': 2,
            'experience_max': 10,
            'salary': '₹15,000 - ₹25,000/month',
            'job_type': 'full_time',
            'description': 'Experienced tailor needed for men\'s formal and casual wear. Knowledge of suit stitching and alterations preferred.',
            'application_link': 'https://in.indeed.com/jobs?q=tailor&l=Chennai',
            'posted_date': '2026-03-01',
        },
        {
            'id': 'job_005',
            'title': 'Plumber - Maintenance',
            'company': 'UrbanClap (Urban Company)',
            'location': 'Hyderabad, Telangana',
            'skills_required': ['plumbing', 'pipe fitting', 'water system', 'repair', 'maintenance'],
            'education_required': 'none',
            'experience_min': 1,
            'experience_max': None,
            'salary': '₹12,000 - ₹22,000/month',
            'job_type': 'full_time',
            'description': 'Service partner for plumbing services. Install, repair, and maintain plumbing systems. Training provided for platform usage.',
            'application_link': 'https://in.indeed.com/jobs?q=plumber&l=Hyderabad',
            'posted_date': '2026-03-02',
        },
        {
            'id': 'job_006',
            'title': 'Data Entry Operator',
            'company': 'TCS (IT Services)',
            'location': 'Pune, Maharashtra',
            'skills_required': ['typing', 'data entry', 'ms excel', 'computer basics', 'english'],
            'education_required': 'higher_secondary',
            'experience_min': 0,
            'experience_max': 3,
            'salary': '₹12,000 - ₹18,000/month',
            'job_type': 'full_time',
            'description': 'Data entry operator needed for backend operations. Minimum typing speed 35 WPM. Knowledge of MS Excel required.',
            'application_link': 'https://in.indeed.com/jobs?q=data+entry&l=Pune',
            'posted_date': '2026-03-03',
        },
        {
            'id': 'job_007',
            'title': 'Security Guard',
            'company': 'G4S Security',
            'location': 'Kolkata, West Bengal',
            'skills_required': ['security guard', 'vigilance', 'communication', 'first aid', 'physical fitness'],
            'education_required': 'secondary',
            'experience_min': 0,
            'experience_max': None,
            'salary': '₹10,000 - ₹15,000/month',
            'job_type': 'full_time',
            'description': 'Security guards needed for commercial complexes and residential societies. Shifts available: day and night.',
            'application_link': 'https://in.indeed.com/jobs?q=security+guard&l=Kolkata',
            'posted_date': '2026-03-01',
        },
        {
            'id': 'job_008',
            'title': 'AC Technician',
            'company': 'Voltas Service Center',
            'location': 'Ahmedabad, Gujarat',
            'skills_required': ['ac repair', 'hvac', 'refrigeration', 'electrical', 'troubleshooting'],
            'education_required': 'secondary',
            'experience_min': 1,
            'experience_max': 6,
            'salary': '₹15,000 - ₹28,000/month',
            'job_type': 'full_time',
            'description': 'AC technician needed for installation, repair, and servicing of air conditioners. ITI/diploma in AC & Refrigeration preferred.',
            'application_link': 'https://in.indeed.com/jobs?q=ac+technician&l=Ahmedabad',
            'posted_date': '2026-03-02',
        },
        {
            'id': 'job_009',
            'title': 'Beautician / Salon Artist',
            'company': 'Lakme Salon',
            'location': 'Jaipur, Rajasthan',
            'skills_required': ['beautician', 'hair styling', 'makeup', 'skin care', 'customer service'],
            'education_required': 'none',
            'experience_min': 1,
            'experience_max': 5,
            'salary': '₹12,000 - ₹25,000/month',
            'job_type': 'full_time',
            'description': 'Beautician/salon artist needed. Must have training in hair care, makeup, and skin treatments. Certification from recognized institute preferred.',
            'application_link': 'https://in.indeed.com/jobs?q=beautician&l=Jaipur',
            'posted_date': '2026-03-01',
        },
        {
            'id': 'job_010',
            'title': 'House Painting Contractor',
            'company': 'Asian Paints (Contract)',
            'location': 'Lucknow, Uttar Pradesh',
            'skills_required': ['painting', 'wall painting', 'waterproofing', 'colour consultation', 'surface preparation'],
            'education_required': 'none',
            'experience_min': 2,
            'experience_max': None,
            'salary': '₹500 - ₹800/day',
            'job_type': 'contract',
            'description': 'Experienced painters needed for residential and commercial painting projects. Knowledge of Asian Paints products preferred.',
            'application_link': 'https://in.indeed.com/jobs?q=house+painter&l=Lucknow',
            'posted_date': '2026-03-03',
        },
        {
            'id': 'job_011',
            'title': 'Mobile Phone Repair Technician',
            'company': 'Cashify Service Center',
            'location': 'Noida, Uttar Pradesh',
            'skills_required': ['mobile repair', 'soldering', 'troubleshooting', 'customer service', 'electronics'],
            'education_required': 'secondary',
            'experience_min': 1,
            'experience_max': 5,
            'salary': '₹14,000 - ₹22,000/month',
            'job_type': 'full_time',
            'description': 'Mobile repair technician for software troubleshooting, hardware repair, screen replacement, and board-level repair.',
            'application_link': 'https://in.indeed.com/jobs?q=mobile+repair&l=Noida',
            'posted_date': '2026-03-02',
        },
        {
            'id': 'job_012',
            'title': 'Warehouse Helper / Packer',
            'company': 'Amazon Fulfillment Center',
            'location': 'Bhiwandi, Maharashtra',
            'skills_required': ['packaging', 'warehouse', 'inventory management', 'physical fitness', 'sorting'],
            'education_required': 'primary',
            'experience_min': 0,
            'experience_max': None,
            'salary': '₹13,000 - ₹18,000/month',
            'job_type': 'full_time',
            'description': 'Warehouse associates needed for order fulfillment, packing, sorting, and inventory management. PF and ESI benefits included.',
            'application_link': 'https://in.indeed.com/jobs?q=warehouse+helper&l=Mumbai',
            'posted_date': '2026-03-03',
        },
        {
            'id': 'job_013',
            'title': 'Auto Rickshaw / Cab Driver',
            'company': 'Ola / Uber',
            'location': 'Pune, Maharashtra',
            'skills_required': ['driving', 'navigation', 'customer service', 'vehicle maintenance'],
            'education_required': 'none',
            'experience_min': 0,
            'experience_max': None,
            'salary': '₹20,000 - ₹35,000/month',
            'job_type': 'full_time',
            'description': 'Driver partners needed. Must have valid commercial driving license. Own vehicle or company vehicle options available.',
            'application_link': 'https://in.indeed.com/jobs?q=cab+driver&l=Pune',
            'posted_date': '2026-03-01',
        },
        {
            'id': 'job_014',
            'title': 'Kitchen Helper / Cook',
            'company': 'Zomato Kitchen',
            'location': 'Gurgaon, Haryana',
            'skills_required': ['cooking', 'food preparation', 'hygiene', 'kitchen management', 'teamwork'],
            'education_required': 'none',
            'experience_min': 0,
            'experience_max': 5,
            'salary': '₹12,000 - ₹20,000/month',
            'job_type': 'full_time',
            'description': 'Kitchen helpers and cooks needed for cloud kitchen operations. FSSAI training provided. Multiple shifts available.',
            'application_link': 'https://in.indeed.com/jobs?q=cook&l=Gurgaon',
            'posted_date': '2026-03-02',
        },
        {
            'id': 'job_015',
            'title': 'Retail Sales Associate',
            'company': 'Reliance Retail',
            'location': 'Multiple Locations',
            'skills_required': ['sales', 'customer service', 'billing', 'inventory', 'communication'],
            'education_required': 'higher_secondary',
            'experience_min': 0,
            'experience_max': 3,
            'salary': '₹12,000 - ₹20,000/month',
            'job_type': 'full_time',
            'description': 'Sales associates for retail stores. Customer interaction, billing, stock management. PF, ESI, and incentives included.',
            'application_link': 'https://in.indeed.com/jobs?q=retail+sales&l=India',
            'posted_date': '2026-03-03',
        },
    ]

    def __init__(self):
        self.jobs: List[Dict[str, Any]] = []
        self.last_scrape_time: float = 0
        self.nlp = get_nlp_engine()
        self._load_builtin_jobs()
        logger.info(f"Job Scraper initialized with {len(self.jobs)} jobs")

    def _load_builtin_jobs(self):
        """Load built-in job listings."""
        self.jobs = [j.copy() for j in self.BUILTIN_JOBS]
        self.last_scrape_time = time.time()

    async def scrape_jobs(self, query: str = '', location: str = '') -> List[Dict[str, Any]]:
        """Scrape job listings from Indeed India portal."""

        if not HTTPX_AVAILABLE or not BS4_AVAILABLE:
            logger.warning("httpx or bs4 not available — using built-in job data")
            return self.jobs

        try:
            search_url = f"{settings.job_portal_base_url}/jobs"
            params = {}
            if query:
                params['q'] = query
            if location:
                params['l'] = location

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }

            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                # 1. Scrape Indeed
                response_indeed = await client.get(search_url, params=params, headers=headers)
                if response_indeed.status_code == 200:
                    soup_indeed = BeautifulSoup(response_indeed.text, 'lxml')
                    scraped_jobs_indeed = self._parse_indeed_page(soup_indeed)
    
                    if scraped_jobs_indeed:
                        existing_ids = {j['id'] for j in self.jobs}
                        for job in scraped_jobs_indeed:
                            if job['id'] not in existing_ids:
                                self.jobs.append(job)
                                existing_ids.add(job['id'])
                        logger.info(f"Scraped {len(scraped_jobs_indeed)} jobs from Indeed")

                # 2. Scrape Naukri Rural Jobs
                naukri_url = settings.naukri_base_url
                naukri_params = {}
                if query:
                    naukri_params['keyword'] = query
                if location:
                    naukri_params['location'] = location
                    
                response_naukri = await client.get(naukri_url, params=naukri_params, headers=headers)
                if response_naukri.status_code == 200:
                    soup_naukri = BeautifulSoup(response_naukri.text, 'lxml')
                    scraped_jobs_naukri = self._parse_naukri_page(soup_naukri)
                    
                    if scraped_jobs_naukri:
                        existing_ids = {j['id'] for j in self.jobs}
                        for job in scraped_jobs_naukri:
                            if job['id'] not in existing_ids:
                                self.jobs.append(job)
                                existing_ids.add(job['id'])
                        logger.info(f"Scraped {len(scraped_jobs_naukri)} jobs from Naukri")
                        
                logger.info(f"Total jobs after scrape: {len(self.jobs)}")

            self.last_scrape_time = time.time()

        except Exception as e:
            logger.error(f"Job scraping failed: {e}, using built-in data")

        return self.jobs

    def _parse_indeed_page(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Parse Indeed India search results page."""
        jobs = []

        try:
            # Try common Indeed selectors
            job_cards = soup.select('.job_seen_beacon, .jobsearch-ResultsList > li, .result')

            for card in job_cards[:30]:
                title_el = card.find(class_=re.compile(r'jobTitle|job-title'))
                company_el = card.find(class_=re.compile(r'company|companyName'))
                location_el = card.find(class_=re.compile(r'companyLocation|job-location'))
                salary_el = card.find(class_=re.compile(r'salary|salaryText'))
                link_el = card.find('a', href=True)

                if title_el:
                    title = title_el.get_text(strip=True)
                    job_id = re.sub(r'[^a-z0-9]', '_', title.lower())[:25]

                    job = {
                        'id': f'scraped_{job_id}',
                        'title': title,
                        'company': company_el.get_text(strip=True) if company_el else '',
                        'location': location_el.get_text(strip=True) if location_el else '',
                        'salary': salary_el.get_text(strip=True) if salary_el else '',
                        'skills_required': [],
                        'education_required': 'none',
                        'experience_min': 0,
                        'experience_max': None,
                        'job_type': 'full_time',
                        'description': title,
                        'application_link': f"{settings.job_portal_base_url}{link_el['href']}" if link_el else '',
                        'posted_date': '',
                    }
                    jobs.append(job)

        except Exception as e:
            logger.error(f"Indeed parsing error: {e}")

        return jobs

    def _parse_naukri_page(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Parse Naukri search results page."""
        jobs = []

        try:
            job_cards = soup.select('.srp-jobtuple-wrapper, .jobTuple, article.jobTuple')

            for card in job_cards[:30]:
                title_el = card.find(class_=re.compile(r'title|job-title'))
                company_el = card.find(class_=re.compile(r'companyInfo|company'))
                location_el = card.find(class_=re.compile(r'locWdth|location'))
                salary_el = card.find(class_=re.compile(r'salary|sal'))
                exp_el = card.find(class_=re.compile(r'exp|experience'))
                link_el = title_el if title_el and title_el.name == 'a' else card.find('a', class_=re.compile(r'title'))

                if title_el:
                    title = title_el.get_text(strip=True)
                    job_id = re.sub(r'[^a-z0-9]', '_', title.lower())[:25]
                    
                    exp_min = 0
                    exp_max = None
                    if exp_el:
                        exp_text = exp_el.get_text(strip=True)
                        exp_match = re.findall(r'\d+', exp_text)
                        if len(exp_match) >= 1:
                            exp_min = float(exp_match[0])
                        if len(exp_match) >= 2:
                            exp_max = float(exp_match[1])

                    job = {
                        'id': f'naukri_{job_id}',
                        'title': title,
                        'company': company_el.get_text(strip=True) if company_el else '',
                        'location': location_el.get_text(strip=True) if location_el else '',
                        'salary': salary_el.get_text(strip=True) if salary_el else '',
                        'skills_required': [],
                        'education_required': 'none',
                        'experience_min': exp_min,
                        'experience_max': exp_max,
                        'job_type': 'full_time',
                        'description': title,
                        'application_link': link_el['href'] if link_el and link_el.has_attr('href') else '',
                        'posted_date': '',
                    }
                    jobs.append(job)

        except Exception as e:
            logger.error(f"Naukri parsing error: {e}")

        return jobs

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        """Get all cached jobs."""
        if not self.jobs:
            self._load_builtin_jobs()
        return self.jobs

    def needs_refresh(self) -> bool:
        """Check if job data needs refreshing."""
        return (time.time() - self.last_scrape_time) > settings.job_cache_ttl_seconds

    def search_jobs(self, query: str) -> List[Dict[str, Any]]:
        """Search jobs by text query."""
        if not query:
            return self.jobs

        results = []
        for job in self.jobs:
            text = f"{job['title']} {job.get('description', '')} {job.get('company', '')} {' '.join(job.get('skills_required', []))}"
            score = self.nlp.compute_text_similarity(query, text)
            results.append({**job, '_search_score': score})

        results.sort(key=lambda x: x['_search_score'], reverse=True)
        return results

    def get_jobs_by_location(self, location: str) -> List[Dict[str, Any]]:
        """Filter jobs by location."""
        location_lower = location.lower()
        return [
            j for j in self.jobs
            if location_lower in j.get('location', '').lower()
        ]


@lru_cache(maxsize=1)
def get_job_scraper() -> JobScraper:
    """Get cached JobScraper instance."""
    return JobScraper()
