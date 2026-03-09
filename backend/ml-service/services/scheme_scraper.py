"""
Scheme Scraper — Scrapes Indian government welfare schemes from india.gov.in
and parses them into structured eligibility data for the recommendation engine.
"""

import re
import time
import json
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


class SchemeScraper:
    """Web scraper for Indian government schemes portal."""

    # Comprehensive built-in scheme database — used as fallback and primary source
    BUILTIN_SCHEMES = [
        {
            'id': 'pmjdy',
            'name': 'Pradhan Mantri Jan Dhan Yojana (PMJDY)',
            'description': 'Financial inclusion programme ensuring access to financial services like banking, savings, deposit accounts, remittance, credit, insurance, and pension for all citizens.',
            'eligibility_text': 'Any Indian citizen above age 10 years can open a bank account. No minimum balance required. For accounts of minors between 10-18, the account will be operated by natural guardian.',
            'benefits': 'Zero balance bank account, RuPay Debit Card, accidental insurance cover of Rs. 2 lakh, overdraft facility up to Rs. 10,000, Direct Benefit Transfer.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'financial_inclusion',
            'target_gender': 'all',
            'min_age': 10,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/spotlight/pradhan-mantri-jan-dhan-yojana',
        },
        {
            'id': 'pmay',
            'name': 'Pradhan Mantri Awas Yojana (PMAY)',
            'description': 'Housing for All mission providing affordable housing to urban and rural poor. Credit linked subsidy scheme for EWS/LIG/MIG categories.',
            'eligibility_text': 'Annual household income up to Rs 18 lakh. EWS: income up to Rs 3 lakh, LIG: Rs 3-6 lakh, MIG-I: Rs 6-12 lakh, MIG-II: Rs 12-18 lakh. The beneficiary family should not own a pucca house.',
            'benefits': 'Interest subsidy of 6.5% on housing loans for 20 years for EWS/LIG. Subsidy of Rs 2.67 lakh for EWS/LIG, Rs 2.35 lakh for MIG-I, Rs 2.30 lakh for MIG-II.',
            'required_documents': ['aadhaar', 'pan', 'voter_id'],
            'category': 'housing',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': 1800000,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://pmaymis.gov.in/',
        },
        {
            'id': 'pmkvy',
            'name': 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)',
            'description': 'Skill development initiative enabling Indian youth to take up industry-relevant skill training that will help them in securing a better livelihood.',
            'eligibility_text': 'Indian nationals who are school/college dropouts or unemployed. Age between 15-45 years. Class 10th or 12th passed or dropout candidates. Prior learning assessment for experienced workers.',
            'benefits': 'Free skill training, government certification, placement assistance, monetary reward of Rs 8,000 on average, training of 150-300 hours.',
            'required_documents': ['aadhaar'],
            'category': 'skill_development',
            'target_gender': 'all',
            'min_age': 15,
            'max_age': 45,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.pmkvyofficial.org/',
        },
        {
            'id': 'pmsby',
            'name': 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)',
            'description': 'Accident insurance scheme offering coverage for death or disability due to accident at very low premium.',
            'eligibility_text': 'Bank account holders aged 18-70 years. Premium of Rs 20 per annum. Auto-debit from bank account.',
            'benefits': 'Rs 2 lakh for accidental death, Rs 2 lakh for total permanent disability, Rs 1 lakh for partial permanent disability.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'insurance',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': 70,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/spotlight/pradhan-mantri-suraksha-bima-yojana',
        },
        {
            'id': 'pmjjby',
            'name': 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)',
            'description': 'Life insurance scheme offering coverage for death due to any reason at very affordable premium.',
            'eligibility_text': 'Bank account holders aged 18-50 years. Premium of Rs 436 per annum. Renewable annually.',
            'benefits': 'Rs 2 lakh life insurance coverage payable to nominee on death of insured due to any reason.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'insurance',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': 50,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/spotlight/pradhan-mantri-jeevan-jyoti-bima-yojana',
        },
        {
            'id': 'apy',
            'name': 'Atal Pension Yojana (APY)',
            'description': 'Pension scheme focused on unorganized sector workers, guaranteeing minimum pension of Rs 1,000 to Rs 5,000 per month after 60 years of age.',
            'eligibility_text': 'Indian citizens aged 18-40 years. Must have a savings bank account. Not a member of any statutory social security scheme. Not an income tax payer.',
            'benefits': 'Guaranteed monthly pension of Rs 1,000 to Rs 5,000 after age 60. Government co-contribution of 50% for 5 years for those who joined before Dec 2015.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'pension',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': 40,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/spotlight/atal-pension-yojana',
        },
        {
            'id': 'mudra',
            'name': 'Pradhan Mantri MUDRA Yojana',
            'description': 'Loans for micro and small enterprises. Three categories: Shishu (up to 50K), Kishore (50K-5L), Tarun (5L-10L) for non-corporate, non-farm small/micro enterprises.',
            'eligibility_text': 'Any Indian citizen with a business plan for non-farm income-generating activity. No collateral required. Manufacturing, trading, services sector eligible. Age 18 and above.',
            'benefits': 'Collateral-free loans: Shishu up to Rs 50,000, Kishore up to Rs 5 lakh, Tarun up to Rs 10 lakh. No processing fees. Flexible repayment period up to 5 years.',
            'required_documents': ['aadhaar', 'pan', 'voter_id'],
            'category': 'entrepreneurship',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.mudra.org.in/',
        },
        {
            'id': 'pmegp',
            'name': 'Prime Minister Employment Generation Programme (PMEGP)',
            'description': 'Credit-linked subsidy programme for generating self-employment opportunities through establishment of micro-enterprises in non-farm sector.',
            'eligibility_text': 'Age above 18 years. For manufacturing projects above Rs 10 lakh and service above Rs 5 lakh, minimum 8th pass. Self Help Groups, charitable trusts, and cooperative societies also eligible.',
            'benefits': 'Subsidy of 15-35% of project cost. Maximum project cost Rs 50 lakh for manufacturing, Rs 20 lakh for service sector.',
            'required_documents': ['aadhaar', 'pan', 'voter_id'],
            'category': 'entrepreneurship',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'primary',
            'states': [],
            'application_link': 'https://www.kviconline.gov.in/pmegpeportal/',
        },
        {
            'id': 'pmfby',
            'name': 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
            'description': 'Crop insurance scheme providing financial support to farmers suffering crop loss/damage arising out of natural calamities, pests and diseases.',
            'eligibility_text': 'All farmers including sharecroppers and tenant farmers growing notified crops. Coverage available for Kharif, Rabi and commercial/horticultural crops.',
            'benefits': 'Insurance coverage and financial support for crop loss. Premium rates: 2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops. Quick claim settlement.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'agriculture',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://pmfby.gov.in/',
        },
        {
            'id': 'ddugjy',
            'name': 'Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY)',
            'description': 'Skill development programme for rural youth from poor families. Part of National Rural Livelihood Mission focusing on placement-linked skills training.',
            'eligibility_text': 'Rural youth aged 15-35 years from poor families. For SC/ST/women/PwD, upper age limit is 45 years. Families covered under NRLM/SECC 2011. Must be willing to be trained and placed.',
            'benefits': 'Free skill training, boarding and lodging, uniform, transportation, post-placement support. Minimum 75% placement guarantee with minimum salary of Rs 6,000/month.',
            'required_documents': ['aadhaar', 'voter_id'],
            'category': 'skill_development',
            'target_gender': 'all',
            'min_age': 15,
            'max_age': 35,
            'income_limit': 300000,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://ddugky.gov.in/',
        },
        {
            'id': 'naps',
            'name': 'National Apprenticeship Promotion Scheme (NAPS)',
            'description': 'Promotes apprenticeship training by sharing 25% stipend with employers, up to Rs 1,500/month per apprentice for first 2 years.',
            'eligibility_text': 'Youth aged 14 and above (16 for hazardous industries). Must have passed Class 5 or higher depending on trade. Indian citizens. Registered on apprenticeship portal.',
            'benefits': 'Government shares 25% of prescribed stipend up to Rs 1,500/month. Industry-relevant on-the-job training. National certification recognized by government.',
            'required_documents': ['aadhaar'],
            'category': 'skill_development',
            'target_gender': 'all',
            'min_age': 14,
            'max_age': None,
            'income_limit': None,
            'education_required': 'primary',
            'states': [],
            'application_link': 'https://www.apprenticeshipindia.gov.in/',
        },
        {
            'id': 'pmsby_women',
            'name': 'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
            'description': 'Maternity benefit programme providing partial compensation for wage loss during childbirth and child care.',
            'eligibility_text': 'Pregnant women and lactating mothers for first living child. Age 19 years and above. Not applicable for government employees.',
            'benefits': 'Cash incentive of Rs 5,000 in three installments. First installment of Rs 1,000 on early registration, Rs 2,000 after 6 months of pregnancy, Rs 2,000 after child birth registration.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'women_welfare',
            'target_gender': 'female',
            'min_age': 19,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana',
        },
        {
            'id': 'stand_up_india',
            'name': 'Stand-Up India Scheme',
            'description': 'Facilitates bank loans between Rs 10 lakh and Rs 1 crore to at least one SC/ST borrower and one woman borrower per bank branch for setting up greenfield enterprises.',
            'eligibility_text': 'SC/ST and/or women entrepreneurs above 18 years for setting up greenfield enterprise in manufacturing, services, or trading sector. Should not be a defaulter. Enterprise should be new.',
            'benefits': 'Composite loan up to Rs 1 crore including term loan and working capital. Repayment in 7 years. Margin money 25% which can include convergence with eligible central/state schemes.',
            'required_documents': ['aadhaar', 'pan', 'voter_id'],
            'category': 'entrepreneurship',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.standupmitra.in/',
        },
        {
            'id': 'pmvvy',
            'name': 'Pradhan Mantri Vaya Vandana Yojana (PMVVY)',
            'description': 'Pension scheme for senior citizens providing assured return pension based on guaranteed rate of return on purchase price/subscription amount.',
            'eligibility_text': 'Indian citizens aged 60 years and above. Maximum purchase price of Rs 15 lakh per senior citizen. Pension payable monthly, quarterly, half-yearly, or annually.',
            'benefits': 'Guaranteed pension for 10 years. On maturity, purchase price along with final pension installment payable. Loan facility up to 75% of purchase price after 3 years.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'pension',
            'target_gender': 'all',
            'min_age': 60,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/spotlight/pradhan-mantri-vaya-vandana-yojana',
        },
        {
            'id': 'pmkisan',
            'name': 'PM-KISAN Samman Nidhi',
            'description': 'Income support of Rs 6,000 per year to all landholding farmer families to supplement their financial needs for procurement of various inputs.',
            'eligibility_text': 'All landholding farmer families with cultivable land. Institutional landholders, former and present constitutional post holders, government employees, taxpayers excluded.',
            'benefits': 'Rs 6,000 per year paid in three equal installments of Rs 2,000 directly to bank account. No middlemen involved.',
            'required_documents': ['aadhaar', 'pan'],
            'category': 'agriculture',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://pmkisan.gov.in/',
        },
        {
            'id': 'ayushman',
            'name': 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)',
            'description': 'Health insurance scheme providing coverage of Rs 5 lakh per family per year for secondary and tertiary care hospitalization to bottom 40% vulnerable families.',
            'eligibility_text': 'Families identified based on SECC 2011 data covering rural and urban areas. No cap on family size. Pre-existing conditions covered from day one. No enrollment fee.',
            'benefits': 'Health insurance cover of Rs 5 lakh per family per year. Cashless and paperless access at empaneled hospitals. Over 1,500 medical packages covered.',
            'required_documents': ['aadhaar', 'voter_id'],
            'category': 'health',
            'target_gender': 'all',
            'min_age': None,
            'max_age': None,
            'income_limit': 500000,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://pmjay.gov.in/',
        },
        {
            'id': 'svnidhi',
            'name': 'PM SVANidhi - Street Vendor Loan Scheme',
            'description': 'Micro credit facility providing working capital loan to street vendors to resume their livelihoods affected during COVID-19.',
            'eligibility_text': 'Street vendors possessing certificate of vending or identified in survey by ULB or letter of recommendation from ULB/TVC. Vendors who have been vending on or before March 24, 2020.',
            'benefits': 'Working capital loans: First loan Rs 10,000, Second Rs 20,000, Third Rs 50,000. Interest subsidy of 7%. Digital transaction incentive of Rs 1,200/year.',
            'required_documents': ['aadhaar'],
            'category': 'entrepreneurship',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://pmsvanidhi.mohua.gov.in/',
        },
        {
            'id': 'nsap',
            'name': 'National Social Assistance Programme (NSAP)',
            'description': 'Social security programme for BPL households. Includes old age pension, widow pension, disability pension for destitute persons.',
            'eligibility_text': 'Below Poverty Line households. Old age pension: 60+ years. Widow pension: 40-79 years. Disability pension: 18-79 with 80%+ disability.',
            'benefits': 'Monthly pension: Rs 200-500 for old age (60+), Rs 300-500 for widows, Rs 300-500 for disabled persons. Central assistance supplemented by states.',
            'required_documents': ['aadhaar', 'voter_id'],
            'category': 'social_security',
            'target_gender': 'all',
            'min_age': 18,
            'max_age': None,
            'income_limit': 100000,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://nsap.nic.in/',
        },
        {
            'id': 'ujjwala',
            'name': 'Pradhan Mantri Ujjwala Yojana (PMUY)',
            'description': 'Provides free LPG connections to women below poverty line, safeguarding health of women and children by providing clean cooking fuel.',
            'eligibility_text': 'Women belonging to BPL households. Age 18 years and above. Should not have existing LPG connection in household. Identified through SECC 2011 data.',
            'benefits': 'Free LPG connection with security deposit for cylinder. First refill free. EMI facility for purchasing stove. Rs 1,600 financial support per connection.',
            'required_documents': ['aadhaar', 'voter_id'],
            'category': 'women_welfare',
            'target_gender': 'female',
            'min_age': 18,
            'max_age': None,
            'income_limit': 200000,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.pmujjwalayojana.com/',
        },
        {
            'id': 'sukanya',
            'name': 'Sukanya Samriddhi Yojana',
            'description': 'Girl child savings scheme for parents to build a fund for education and marriage of girl child. Tax-free under Section 80C.',
            'eligibility_text': 'Girl child aged below 10 years. Only 2 accounts per family. Account can be opened by natural or legal guardian. Minimum annual deposit of Rs 250.',
            'benefits': 'High interest rate (currently 8.2%). Tax-free maturity amount. Account matures after 21 years from opening or after marriage of girl child after age 18.',
            'required_documents': ['aadhaar'],
            'category': 'women_welfare',
            'target_gender': 'female',
            'min_age': None,
            'max_age': 10,
            'income_limit': None,
            'education_required': 'none',
            'states': [],
            'application_link': 'https://www.india.gov.in/sukanya-samriddhi-yojna',
        },
    ]

    def __init__(self):
        self.schemes: List[Dict[str, Any]] = []
        self.last_scrape_time: float = 0
        self.nlp = get_nlp_engine()
        self._load_builtin_schemes()
        logger.info(f"Scheme Scraper initialized with {len(self.schemes)} schemes")

    def _load_builtin_schemes(self):
        """Load the built-in comprehensive scheme database."""
        self.schemes = [s.copy() for s in self.BUILTIN_SCHEMES]
        self.last_scrape_time = time.time()

    async def scrape_schemes(self) -> List[Dict[str, Any]]:
        """Scrape government schemes portal and merge with built-in data."""

        if not HTTPX_AVAILABLE or not BS4_AVAILABLE:
            logger.warning("httpx or bs4 not available — using built-in scheme data")
            return self.schemes

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(settings.scheme_portal_url, headers=headers)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, 'lxml')
                scraped_schemes = self._parse_portal_page(soup)

                if scraped_schemes:
                    # Merge scraped data with built-in data
                    existing_ids = {s['id'] for s in self.schemes}
                    for scheme in scraped_schemes:
                        if scheme['id'] not in existing_ids:
                            self.schemes.append(scheme)

                    logger.info(f"Scraped {len(scraped_schemes)} schemes from portal, total: {len(self.schemes)}")

            self.last_scrape_time = time.time()

        except Exception as e:
            logger.error(f"Scheme scraping failed: {e}, using built-in data")

        return self.schemes

    def _parse_portal_page(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Parse the government schemes portal HTML."""
        schemes = []

        try:
            # Try various CSS selectors for the schemes page
            selectors = [
                'div.view-content .views-row',
                '.view-schemes .views-row',
                'article.node-scheme',
                '.scheme-list li',
                '.field-content a',
            ]

            links = []
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    for el in elements:
                        link = el.find('a')
                        if link:
                            links.append({
                                'name': link.get_text(strip=True),
                                'url': link.get('href', ''),
                            })
                    break

            # If no structured content found, extract all links from the page
            if not links:
                for link in soup.find_all('a', href=True):
                    text = link.get_text(strip=True)
                    href = link['href']
                    if text and len(text) > 10 and ('scheme' in href.lower() or 'yojana' in text.lower()):
                        links.append({'name': text, 'url': href})

            for link_data in links[:50]:  # Limit to 50 schemes
                scheme_id = re.sub(r'[^a-z0-9]', '_', link_data['name'].lower())[:30]
                scheme = {
                    'id': scheme_id,
                    'name': link_data['name'],
                    'description': link_data['name'],
                    'eligibility_text': '',
                    'benefits': '',
                    'required_documents': ['aadhaar'],
                    'category': 'general',
                    'target_gender': 'all',
                    'min_age': None,
                    'max_age': None,
                    'income_limit': None,
                    'education_required': 'none',
                    'states': [],
                    'application_link': link_data['url'] if link_data['url'].startswith('http') else f"https://www.india.gov.in{link_data['url']}",
                }
                schemes.append(scheme)

        except Exception as e:
            logger.error(f"Portal parsing error: {e}")

        return schemes

    def get_all_schemes(self) -> List[Dict[str, Any]]:
        """Get all cached schemes."""
        if not self.schemes:
            self._load_builtin_schemes()
        return self.schemes

    def needs_refresh(self) -> bool:
        """Check if scheme data needs refreshing."""
        return (time.time() - self.last_scrape_time) > settings.scheme_cache_ttl_seconds

    def search_schemes(self, query: str) -> List[Dict[str, Any]]:
        """Search schemes by text query using NLP matching."""
        if not query:
            return self.schemes

        results = []
        for scheme in self.schemes:
            text = f"{scheme['name']} {scheme['description']} {scheme.get('eligibility_text', '')} {scheme.get('benefits', '')}"
            score = self.nlp.compute_text_similarity(query, text)
            results.append({**scheme, '_search_score': score})

        results.sort(key=lambda x: x['_search_score'], reverse=True)
        return results

    def get_schemes_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Filter schemes by category."""
        return [s for s in self.schemes if s.get('category') == category]


@lru_cache(maxsize=1)
def get_scheme_scraper() -> SchemeScraper:
    """Get cached SchemeScraper instance."""
    return SchemeScraper()
