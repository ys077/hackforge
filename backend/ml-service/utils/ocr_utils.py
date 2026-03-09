"""
OCR Utilities — Shared OCR engine for document text extraction and image processing.
Used by Document Verifier and Certificate Parser.
"""

import base64
import io
import re
from typing import Dict, Any, Optional, List
from functools import lru_cache
from loguru import logger

try:
    from PIL import Image, ImageFilter, ImageEnhance
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("Pillow not available — image processing disabled")

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract not available — OCR disabled")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV not available — image analysis disabled")


class OCREngine:
    """Shared OCR engine for text extraction and image preprocessing."""

    # Indian document number patterns
    DOCUMENT_PATTERNS = {
        'aadhaar': {
            'pattern': r'\b\d{4}\s?\d{4}\s?\d{4}\b',
            'description': '12-digit Aadhaar number',
            'format': 'XXXX XXXX XXXX',
        },
        'pan': {
            'pattern': r'\b[A-Z]{5}\d{4}[A-Z]\b',
            'description': '10-char PAN (ABCDE1234F)',
            'format': 'XXXXX0000X',
        },
        'voter_id': {
            'pattern': r'\b[A-Z]{3}\d{7}\b',
            'description': 'Voter ID (ABC1234567)',
            'format': 'XXX0000000',
        },
        'driving_license': {
            'pattern': r'\b[A-Z]{2}\d{2}\s?\d{11}\b',
            'description': 'Driving License number',
            'format': 'XX00 00000000000',
        },
        'passport': {
            'pattern': r'\b[A-Z]\d{7}\b',
            'description': 'Passport number',
            'format': 'X0000000',
        },
        'bank_account': {
            'pattern': r'\b\d{9,18}\b',
            'description': 'Bank account number (9-18 digits)',
            'format': 'XXXXXXXXX',
        },
        'ifsc': {
            'pattern': r'\b[A-Z]{4}0[A-Z0-9]{6}\b',
            'description': 'IFSC code',
            'format': 'XXXX0XXXXXX',
        },
    }

    # Common names/words on Indian documents
    DOCUMENT_KEYWORDS = {
        'aadhaar': ['aadhaar', 'uidai', 'unique identification', 'enrolment', 'vid'],
        'pan': ['permanent account number', 'income tax', 'pan card'],
        'voter_id': ['election commission', 'voter', 'electoral', 'epic'],
        'passbook': ['savings', 'current account', 'balance', 'transaction', 'bank'],
        'certificate': ['certificate', 'certify', 'awarded', 'completion', 'training'],
        'employment_letter': ['employment', 'appointment', 'hereby', 'designation', 'salary'],
        'trade_license': ['trade license', 'municipal', 'corporation', 'registration'],
    }

    def __init__(self, tesseract_path: Optional[str] = None):
        if tesseract_path and TESSERACT_AVAILABLE:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"OCR Engine initialized (tesseract={TESSERACT_AVAILABLE}, cv2={CV2_AVAILABLE})")

    def decode_base64_image(self, base64_string: str) -> Optional[Any]:
        """Decode base64 string to PIL Image."""
        if not PIL_AVAILABLE:
            return None

        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]

            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))
            return image
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None

    def preprocess_image(self, image: Any) -> Any:
        """Preprocess image for better OCR accuracy."""
        if not PIL_AVAILABLE:
            return image

        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)

            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(2.0)

            # Convert to grayscale
            image = image.convert('L')

            # Apply threshold for binarization
            image = image.point(lambda x: 0 if x < 128 else 255)

            return image
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image

    def extract_text(self, image: Any, lang: str = 'eng') -> str:
        """Extract text from image using Tesseract OCR."""
        if not TESSERACT_AVAILABLE:
            logger.warning("Tesseract not available, returning empty text")
            return ""

        try:
            # Preprocess image
            processed = self.preprocess_image(image)

            # Extract text with config for best accuracy
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(processed, lang=lang, config=custom_config)

            return text.strip()
        except Exception as e:
            logger.error(f"OCR text extraction failed: {e}")
            return ""

    def extract_text_from_base64(self, base64_string: str, lang: str = 'eng') -> str:
        """Extract text from base64 encoded image."""
        image = self.decode_base64_image(base64_string)
        if image is None:
            return ""
        return self.extract_text(image, lang)

    def detect_document_type(self, text: str) -> str:
        """Detect document type from extracted text."""
        text_lower = text.lower()
        scores: Dict[str, int] = {}

        for doc_type, keywords in self.DOCUMENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[doc_type] = score

        # Also check for document number patterns
        for doc_type, pattern_info in self.DOCUMENT_PATTERNS.items():
            if re.search(pattern_info['pattern'], text):
                scores[doc_type] = scores.get(doc_type, 0) + 3

        if not scores:
            return 'unknown'

        return max(scores, key=scores.get)

    def extract_document_number(self, text: str, doc_type: str) -> Optional[str]:
        """Extract document number based on document type."""
        if doc_type not in self.DOCUMENT_PATTERNS:
            return None

        pattern = self.DOCUMENT_PATTERNS[doc_type]['pattern']
        match = re.search(pattern, text)
        return match.group(0) if match else None

    def extract_name(self, text: str) -> Optional[str]:
        """Extract person name from document text."""
        patterns = [
            r'(?:name|naam)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,40})',
            r'(?:mr\.?|mrs\.?|ms\.?|shri|smt)\s+([A-Z][a-zA-Z\s]{2,40})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean name — remove trailing common words
                name = re.sub(r'\b(son|daughter|wife|husband|father|mother|of)\b.*', '', name, flags=re.IGNORECASE)
                return name.strip()

        return None

    def extract_dob(self, text: str) -> Optional[str]:
        """Extract date of birth from document text."""
        patterns = [
            r'(?:dob|date of birth|birth date|d\.o\.b)\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    def extract_address(self, text: str) -> Optional[str]:
        """Extract address from document text."""
        patterns = [
            r'(?:address|add|addr)\s*[:\-]?\s*(.{10,200}?)(?:\n|$)',
            r'(?:s/o|d/o|w/o|c/o)\s+.{2,50}\s*,?\s*(.{10,200}?)(?:\n|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def analyze_image_for_tampering(self, base64_string: str) -> Dict[str, Any]:
        """Analyze image for signs of tampering/forgery using CV techniques."""
        result = {
            'tampering_detected': False,
            'confidence': 0.0,
            'issues': [],
            'checks_performed': [],
        }

        if not CV2_AVAILABLE or not PIL_AVAILABLE:
            result['issues'].append('Image analysis libraries not available')
            return result

        try:
            # Decode image
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            image_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                result['issues'].append('Could not decode image')
                return result

            tampering_score = 0.0
            total_checks = 0

            # Check 1: Error Level Analysis (ELA)
            ela_score = self._error_level_analysis(img)
            result['checks_performed'].append(f'ELA analysis: score={ela_score:.2f}')
            if ela_score > 0.6:
                result['issues'].append('Potential image editing detected (ELA)')
                tampering_score += ela_score * 30
            total_checks += 30

            # Check 2: Edge consistency
            edge_score = self._edge_consistency_check(img)
            result['checks_performed'].append(f'Edge consistency: score={edge_score:.2f}')
            if edge_score > 0.5:
                result['issues'].append('Inconsistent edge patterns detected')
                tampering_score += edge_score * 20
            total_checks += 20

            # Check 3: Resolution consistency
            res_score = self._resolution_consistency(img)
            result['checks_performed'].append(f'Resolution check: score={res_score:.2f}')
            if res_score > 0.5:
                result['issues'].append('Resolution inconsistency detected')
                tampering_score += res_score * 15
            total_checks += 15

            # Check 4: Noise analysis
            noise_score = self._noise_analysis(img)
            result['checks_performed'].append(f'Noise analysis: score={noise_score:.2f}')
            if noise_score > 0.6:
                result['issues'].append('Unusual noise patterns detected')
                tampering_score += noise_score * 15
            total_checks += 15

            # Check 5: Color consistency
            color_score = self._color_consistency(img)
            result['checks_performed'].append(f'Color consistency: score={color_score:.2f}')
            if color_score > 0.5:
                result['issues'].append('Color distribution anomaly detected')
                tampering_score += color_score * 20
            total_checks += 20

            # Calculate overall tampering confidence
            tampering_confidence = tampering_score / total_checks if total_checks > 0 else 0
            result['confidence'] = round(tampering_confidence * 100, 2)
            result['tampering_detected'] = tampering_confidence > 0.3

        except Exception as e:
            logger.error(f"Tampering analysis failed: {e}")
            result['issues'].append(f'Analysis error: {str(e)}')

        return result

    def _error_level_analysis(self, img: Any) -> float:
        """Perform Error Level Analysis to detect editing."""
        try:
            # Compress and compare
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
            _, encoded = cv2.imencode('.jpg', img, encode_param)
            compressed = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

            # Calculate difference
            diff = cv2.absdiff(img, compressed)
            diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

            # Analyze variance in difference — high variance indicates editing
            mean_diff = np.mean(diff_gray)
            std_diff = np.std(diff_gray)

            # Normalize score (0-1)
            ela_score = min(1.0, (std_diff / 30.0))
            return float(ela_score)
        except Exception:
            return 0.0

    def _edge_consistency_check(self, img: Any) -> float:
        """Check edge consistency across the image."""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)

            # Divide image into quadrants and compare edge density
            h, w = edges.shape
            quadrants = [
                edges[0:h//2, 0:w//2],
                edges[0:h//2, w//2:w],
                edges[h//2:h, 0:w//2],
                edges[h//2:h, w//2:w],
            ]

            densities = [np.mean(q) for q in quadrants]
            if max(densities) == 0:
                return 0.0

            # High variance in edge density could indicate splicing
            std_density = np.std(densities)
            mean_density = np.mean(densities)
            cv = std_density / mean_density if mean_density > 0 else 0

            return min(1.0, cv / 2.0)
        except Exception:
            return 0.0

    def _resolution_consistency(self, img: Any) -> float:
        """Check for resolution inconsistencies (different regions at different resolutions)."""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape

            # Compute local sharpness using Laplacian
            block_size = max(32, min(h, w) // 8)
            sharpness_values = []

            for y in range(0, h - block_size, block_size):
                for x in range(0, w - block_size, block_size):
                    block = gray[y:y+block_size, x:x+block_size]
                    laplacian = cv2.Laplacian(block, cv2.CV_64F)
                    sharpness_values.append(np.var(laplacian))

            if not sharpness_values:
                return 0.0

            std_sharpness = np.std(sharpness_values)
            mean_sharpness = np.mean(sharpness_values)
            cv = std_sharpness / mean_sharpness if mean_sharpness > 0 else 0

            return min(1.0, cv / 3.0)
        except Exception:
            return 0.0

    def _noise_analysis(self, img: Any) -> float:
        """Analyze noise patterns for inconsistencies."""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)

            # Apply median filter and compare
            denoised = cv2.medianBlur(gray.astype(np.uint8), 3).astype(np.float64)
            noise = gray - denoised

            # Analyze noise distribution
            h, w = noise.shape
            half_h = h // 2

            top_noise_std = np.std(noise[:half_h, :])
            bottom_noise_std = np.std(noise[half_h:, :])

            if max(top_noise_std, bottom_noise_std) == 0:
                return 0.0

            # Significant difference in noise levels could indicate tampering
            diff = abs(top_noise_std - bottom_noise_std) / max(top_noise_std, bottom_noise_std)
            return min(1.0, diff * 2)
        except Exception:
            return 0.0

    def _color_consistency(self, img: Any) -> float:
        """Analyze color distribution consistency."""
        try:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            h, w, _ = hsv.shape

            # Compare color histograms of different regions
            regions = [
                hsv[0:h//2, 0:w//2],
                hsv[0:h//2, w//2:w],
                hsv[h//2:h, 0:w//2],
                hsv[h//2:h, w//2:w],
            ]

            histograms = []
            for region in regions:
                hist = cv2.calcHist([region], [0], None, [50], [0, 180])
                hist = cv2.normalize(hist, hist).flatten()
                histograms.append(hist)

            # Compare all pairs
            inconsistencies = 0
            pairs = 0
            for i in range(len(histograms)):
                for j in range(i+1, len(histograms)):
                    corr = cv2.compareHist(histograms[i], histograms[j], cv2.HISTCMP_CORREL)
                    if corr < 0.5:
                        inconsistencies += 1
                    pairs += 1

            return inconsistencies / pairs if pairs > 0 else 0.0
        except Exception:
            return 0.0

    def validate_document_number(self, number: str, doc_type: str) -> bool:
        """Validate document number format."""
        if doc_type not in self.DOCUMENT_PATTERNS:
            return False

        pattern = self.DOCUMENT_PATTERNS[doc_type]['pattern']
        cleaned = number.replace(' ', '')
        return bool(re.match(pattern, cleaned))


@lru_cache(maxsize=1)
def get_ocr_engine(tesseract_path: Optional[str] = None) -> OCREngine:
    """Get cached OCR engine instance."""
    return OCREngine(tesseract_path)
