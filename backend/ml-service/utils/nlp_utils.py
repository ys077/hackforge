"""
NLP Utilities — Shared NLP engine for text embedding, similarity, keyword extraction.
Used by all 4 AI models in the HackForge ML service.
"""

import re
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from loguru import logger


class NLPEngine:
    """Shared NLP engine for text processing across all models."""

    # Skill category mappings for job classification
    SKILL_CATEGORIES = {
        'technology': [
            'python', 'java', 'javascript', 'html', 'css', 'react', 'node',
            'sql', 'mongodb', 'aws', 'docker', 'kubernetes', 'machine learning',
            'data science', 'ai', 'cloud', 'devops', 'git', 'linux', 'api',
            'typescript', 'angular', 'vue', 'flutter', 'android', 'ios',
        ],
        'construction': [
            'masonry', 'carpentry', 'plumbing', 'electrical', 'welding',
            'painting', 'tiling', 'roofing', 'concrete', 'scaffolding',
            'blueprint reading', 'construction safety', 'hvac',
        ],
        'manufacturing': [
            'machine operation', 'quality control', 'assembly', 'packaging',
            'cnc', 'lathe', 'welding', 'soldering', 'inventory management',
            'forklift', 'warehouse', 'logistics',
        ],
        'healthcare': [
            'nursing', 'patient care', 'first aid', 'cpr', 'phlebotomy',
            'medical records', 'pharmacy', 'lab technician', 'x-ray',
            'physiotherapy', 'caregiving', 'asha worker',
        ],
        'agriculture': [
            'farming', 'irrigation', 'crop management', 'soil testing',
            'pesticide application', 'organic farming', 'dairy farming',
            'poultry', 'fishery', 'horticulture', 'sericulture',
        ],
        'services': [
            'cooking', 'cleaning', 'driving', 'delivery', 'tailoring',
            'beautician', 'barber', 'security guard', 'housekeeping',
            'customer service', 'retail', 'cashier', 'sales',
        ],
        'skilled_trades': [
            'electrician', 'plumber', 'mechanic', 'auto repair', 'ac repair',
            'mobile repair', 'computer repair', 'appliance repair',
            'woodworking', 'blacksmith', 'pottery',
        ],
    }

    # Common stop words for Indian context
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these',
        'those', 'it', 'its', 'not', 'no', 'nor', 'so', 'if', 'then',
        'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again',
        'all', 'also', 'am', 'any', 'as', 'because', 'before', 'between',
        'both', 'each', 'few', 'from', 'further', 'here', 'how', 'into',
        'more', 'most', 'other', 'our', 'out', 'own', 'same', 'she', 'he',
        'some', 'such', 'there', 'their', 'them', 'they', 'through', 'under',
        'until', 'up', 'we', 'what', 'when', 'where', 'which', 'while', 'who',
        'whom', 'why', 'you', 'your', 'scheme', 'government', 'india',
    }

    def __init__(self):
        self.tfidf = TfidfVectorizer(
            lowercase=True,
            stop_words='english',
            ngram_range=(1, 2),
            max_features=5000,
        )
        self._embeddings_cache: Dict[str, np.ndarray] = {}
        logger.info("NLP Engine initialized")

    def compute_text_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts using TF-IDF."""
        if not text1 or not text2:
            return 0.0

        try:
            tfidf_matrix = self.tfidf.fit_transform([text1.lower(), text2.lower()])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(similarity)
        except Exception as e:
            logger.warning(f"Text similarity failed: {e}")
            return 0.0

    def compute_skill_similarity(
        self,
        skills1: List[str],
        skills2: List[str],
    ) -> Tuple[float, List[str], List[str]]:
        """Compute skill overlap and similarity.
        
        Returns:
            (similarity_score, matched_skills, missing_skills)
        """
        if not skills2:
            return 1.0, [], []
        if not skills1:
            return 0.0, [], list(skills2)

        set1 = set(s.lower().strip() for s in skills1)
        set2 = set(s.lower().strip() for s in skills2)

        # Direct match
        matched = set1.intersection(set2)
        missing = set2 - set1

        # Fuzzy matching for partial overlaps
        fuzzy_matched = set()
        remaining_missing = set()
        for skill in missing:
            found = False
            for user_skill in set1:
                if skill in user_skill or user_skill in skill:
                    fuzzy_matched.add(skill)
                    found = True
                    break
            if not found:
                remaining_missing.add(skill)

        total_matched = len(matched) + len(fuzzy_matched) * 0.7
        direct_score = total_matched / len(set2) if set2 else 0.0

        # TF-IDF similarity for semantic matching
        tfidf_score = self.compute_text_similarity(
            ' '.join(skills1), ' '.join(skills2)
        )

        # Combined score (60% direct + 40% semantic)
        combined = direct_score * 0.6 + tfidf_score * 0.4
        return min(1.0, combined), list(matched | fuzzy_matched), list(remaining_missing)

    def extract_keywords(self, text: str, top_n: int = 20) -> List[str]:
        """Extract important keywords from text."""
        if not text:
            return []

        # Clean text
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = text.split()

        # Remove stop words
        words = [w for w in words if w not in self.STOP_WORDS and len(w) > 2]

        # Count frequency
        freq: Dict[str, int] = {}
        for word in words:
            freq[word] = freq.get(word, 0) + 1

        # Sort by frequency
        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:top_n]]

    def map_skills_to_categories(self, skills: List[str]) -> Dict[str, List[str]]:
        """Map user skills to job categories."""
        result: Dict[str, List[str]] = {}

        for skill in skills:
            skill_lower = skill.lower().strip()
            for category, category_skills in self.SKILL_CATEGORIES.items():
                if any(cs in skill_lower or skill_lower in cs for cs in category_skills):
                    if category not in result:
                        result[category] = []
                    result[category].append(skill)
                    break

        return result

    def deduplicate_skills(self, skills: List[str]) -> List[str]:
        """Remove duplicate skills, keeping the best-formatted version."""
        seen: Dict[str, str] = {}
        for skill in skills:
            key = skill.lower().strip()
            if key not in seen or len(skill) > len(seen[key]):
                seen[key] = skill.strip()
        return list(seen.values())

    def generate_profile_text(self, profile: Dict[str, Any]) -> str:
        """Convert a user profile dict to a text representation for NLP matching."""
        parts = []

        if profile.get('occupation'):
            parts.append(f"Occupation: {profile['occupation']}")
        if profile.get('education'):
            parts.append(f"Education: {profile['education']}")
        if profile.get('skills'):
            skills = profile['skills'] if isinstance(profile['skills'], list) else [profile['skills']]
            parts.append(f"Skills: {', '.join(skills)}")
        if profile.get('experience_years'):
            parts.append(f"Experience: {profile['experience_years']} years")
        if profile.get('state'):
            parts.append(f"Location: {profile['state']}")
        if profile.get('income'):
            parts.append(f"Annual income: {profile['income']}")
        if profile.get('age'):
            parts.append(f"Age: {profile['age']}")
        if profile.get('gender'):
            parts.append(f"Gender: {profile['gender']}")

        return '. '.join(parts)

    def parse_income_limit(self, text: str) -> Optional[float]:
        """Extract income limit from eligibility text."""
        patterns = [
            r'(?:income|earning|annual).*?(?:below|less than|under|up to|upto|not exceeding)\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|l|lacs)?',
            r'(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|l|lacs)?.*?(?:income|earning|annual)',
            r'(?:bpl|below poverty line)',
        ]

        text_lower = text.lower()

        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                if 'bpl' in text_lower:
                    return 100000.0  # BPL threshold approx
                try:
                    amount = float(match.group(1).replace(',', ''))
                    if 'lakh' in text_lower or 'lac' in text_lower or 'l' in match.group(0):
                        amount *= 100000
                    return amount
                except (ValueError, IndexError):
                    pass

        return None

    def parse_age_range(self, text: str) -> Tuple[Optional[int], Optional[int]]:
        """Extract age range from eligibility text."""
        text_lower = text.lower()

        # Age between X and Y
        match = re.search(r'age.*?(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})', text_lower)
        if match:
            return int(match.group(1)), int(match.group(2))

        # Minimum age
        match = re.search(r'(?:minimum|min|above|at least)\s*(?:age)?\s*(\d{1,2})', text_lower)
        min_age = int(match.group(1)) if match else None

        # Maximum age
        match = re.search(r'(?:maximum|max|below|under|up to)\s*(?:age)?\s*(\d{1,2})', text_lower)
        max_age = int(match.group(1)) if match else None

        return min_age, max_age


@lru_cache(maxsize=1)
def get_nlp_engine() -> NLPEngine:
    """Get cached NLP engine instance."""
    return NLPEngine()
