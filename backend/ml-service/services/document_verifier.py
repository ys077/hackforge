"""
Document Verifier — AI-powered document verification system for fraud prevention.
Uses OCR + Computer Vision + PyTorch classifier to analyze uploaded documents,
detect tampering, and classify document types.
"""

import re
from typing import Dict, Any, Optional, List
from functools import lru_cache
from loguru import logger

from utils.ocr_utils import get_ocr_engine
from config import settings
from services.document_classifier import get_document_classifier


class DocumentVerifier:
    """AI Document Verification Engine with OCR, tampering detection, and cross-validation."""

    # Expected fields per document type
    EXPECTED_FIELDS = {
        'aadhaar': ['name', 'dob', 'aadhaar_number', 'address'],
        'pan': ['name', 'pan_number', 'dob'],
        'voter_id': ['name', 'voter_id_number', 'address'],
        'passbook': ['name', 'account_number', 'ifsc'],
        'certificate': ['holder_name', 'certificate_title', 'issuer'],
        'employment_letter': ['name', 'designation', 'company'],
        'trade_license': ['name', 'license_number', 'trade_type'],
    }

    # Official format validators
    FORMAT_VALIDATORS = {
        'aadhaar': {
            'number_pattern': r'\b\d{4}\s?\d{4}\s?\d{4}\b',
            'checksum': True,
        },
        'pan': {
            'number_pattern': r'\b[A-Z]{5}\d{4}[A-Z]\b',
            'checksum': False,
        },
        'voter_id': {
            'number_pattern': r'\b[A-Z]{3}\d{7}\b',
            'checksum': False,
        },
    }

    def __init__(self):
        self.ocr = get_ocr_engine()
        self.classifier = get_document_classifier()
        logger.info(f"Document Verifier initialized (ML classifier available: {self.classifier.is_available})")

    def verify_document(
        self,
        base64_image: str,
        document_type: str,
        user_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Comprehensive document verification pipeline.
        
        1. OCR text extraction
        2. Tampering detection (ELA, edge, noise analysis)
        3. Document number format validation
        4. Cross-validation with user-provided data
        5. Fraud risk scoring
        """

        result = {
            'verified': False,
            'document_type': document_type,
            'confidence': 0.0,
            'trust_score': 0,
            'verification_status': 'pending',
            'extracted_data': {},
            'tampering_analysis': {},
            'format_validation': {},
            'consistency_check': {},
            'detected_issues': [],
            'checks_performed': [],
        }

        # Step 1: OCR Text Extraction
        text = self.ocr.extract_text_from_base64(base64_image)
        if not text:
            result['detected_issues'].append('Could not extract text — image may be too blurry or corrupt')
            result['verification_status'] = 'rejected'
            result['trust_score'] = 5
            return result

        result['checks_performed'].append('OCR text extraction')

        # Step 2: Auto-detect document type using ML classifier (with OCR fallback)
        if document_type == 'auto' or not document_type:
            if self.classifier.is_available:
                classification = self.classifier.classify_with_details(base64_image)
                document_type = classification['predicted_type']
                result['ml_classification'] = classification
                result['checks_performed'].append(
                    f'ML classifier detected type: {document_type} '
                    f'(confidence: {classification["confidence"]:.2%})'
                )
                # If ML confidence is low, fall back to OCR heuristic
                if classification['confidence'] < 0.5:
                    ocr_type = self.ocr.detect_document_type(text)
                    result['checks_performed'].append(
                        f'Low ML confidence — OCR fallback detected: {ocr_type}'
                    )
                    document_type = ocr_type
            else:
                document_type = self.ocr.detect_document_type(text)
                result['checks_performed'].append(
                    f'OCR heuristic detected document type: {document_type}'
                )
            result['document_type'] = document_type
        else:
            # Even when type is supplied, run classifier for validation
            if self.classifier.is_available:
                classification = self.classifier.classify_with_details(base64_image)
                result['ml_classification'] = classification
                if classification['predicted_type'] != document_type:
                    result['detected_issues'].append(
                        f'Stated type "{document_type}" differs from ML prediction '
                        f'"{classification["predicted_type"]}" '
                        f'(confidence: {classification["confidence"]:.2%})'
                    )

        # Step 3: Extract structured data
        extracted = self._extract_document_data(text, document_type)
        result['extracted_data'] = extracted
        result['checks_performed'].append('Structured data extraction')

        # Step 4: Tampering detection
        tampering = self.ocr.analyze_image_for_tampering(base64_image)
        result['tampering_analysis'] = tampering
        result['checks_performed'].append('Image tampering analysis')

        if tampering.get('tampering_detected'):
            result['detected_issues'].append('⚠️ Potential document tampering detected')

        # Step 5: Document number format validation
        format_result = self._validate_format(text, document_type)
        result['format_validation'] = format_result
        result['checks_performed'].append('Document number format validation')

        if not format_result.get('valid'):
            for issue in format_result.get('issues', []):
                result['detected_issues'].append(f'Format issue: {issue}')

        # Step 6: Cross-validation with user data
        if user_data:
            consistency = self._cross_validate(extracted, user_data)
            result['consistency_check'] = consistency
            result['checks_performed'].append('Cross-validation with user data')

            for issue in consistency.get('mismatches', []):
                result['detected_issues'].append(f'Consistency: {issue}')

        # Step 7: Calculate overall trust score and status
        trust_score = self._calculate_trust_score(result)
        result['trust_score'] = trust_score
        result['confidence'] = min(100, trust_score + 10)

        # Determine verification status
        if trust_score >= 70:
            result['verified'] = True
            result['verification_status'] = 'verified'
        elif trust_score >= 40:
            result['verified'] = False
            result['verification_status'] = 'suspicious'
        else:
            result['verified'] = False
            result['verification_status'] = 'rejected'

        return result

    def verify_multiple_documents(
        self,
        documents: List[Dict[str, Any]],
        user_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Verify multiple documents and perform cross-document validation."""

        results = []
        all_extracted_data = {}
        all_issues = []

        for doc in documents:
            doc_result = self.verify_document(
                base64_image=doc['image'],
                document_type=doc['type'],
                user_data=user_data,
            )
            results.append(doc_result)
            all_extracted_data[doc['type']] = doc_result['extracted_data']

        # Cross-document consistency check
        cross_doc_result = self._cross_document_validation(all_extracted_data)
        all_issues.extend(cross_doc_result.get('issues', []))

        # Calculate aggregate scores
        verified_count = sum(1 for r in results if r['verified'])
        total_count = len(results)
        avg_trust = sum(r['trust_score'] for r in results) / total_count if total_count > 0 else 0

        # Bonus for multiple verified documents
        multi_doc_bonus = min(15, verified_count * 5)
        # Penalty for cross-doc inconsistencies
        consistency_penalty = len(all_issues) * 8

        overall_trust = min(100, max(0, avg_trust + multi_doc_bonus - consistency_penalty))

        # Determine overall status
        if overall_trust >= 70 and verified_count >= total_count * 0.7:
            overall_status = 'verified'
        elif overall_trust >= 40:
            overall_status = 'suspicious'
        else:
            overall_status = 'rejected'

        return {
            'overall_trust_score': round(overall_trust, 2),
            'overall_status': overall_status,
            'verified_count': verified_count,
            'total_documents': total_count,
            'document_results': results,
            'cross_document_validation': cross_doc_result,
            'detected_issues': all_issues,
        }

    def _extract_document_data(self, text: str, doc_type: str) -> Dict[str, Any]:
        """Extract structured data from document text."""

        data = {
            'raw_text_length': len(text),
            'document_type_detected': self.ocr.detect_document_type(text),
        }

        # Extract common fields
        name = self.ocr.extract_name(text)
        if name:
            data['name'] = name

        dob = self.ocr.extract_dob(text)
        if dob:
            data['dob'] = dob

        address = self.ocr.extract_address(text)
        if address:
            data['address'] = address

        # Extract document-specific number
        doc_number = self.ocr.extract_document_number(text, doc_type)
        if doc_number:
            data[f'{doc_type}_number'] = doc_number

        # Extract additional fields based on document type
        if doc_type == 'passbook':
            ifsc = self.ocr.extract_document_number(text, 'ifsc')
            if ifsc:
                data['ifsc'] = ifsc
            account = self.ocr.extract_document_number(text, 'bank_account')
            if account:
                data['account_number'] = account

        elif doc_type == 'employment_letter':
            designation_match = re.search(
                r'(?:designation|position|role)\s*[:\-]?\s*(.{3,50})',
                text, re.IGNORECASE
            )
            if designation_match:
                data['designation'] = designation_match.group(1).strip()

            salary_match = re.search(
                r'(?:salary|ctc|compensation|pay)\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)',
                text, re.IGNORECASE
            )
            if salary_match:
                data['salary'] = salary_match.group(1).strip()

        elif doc_type == 'trade_license':
            license_match = re.search(
                r'(?:license|licence)\s*(?:no|number|#)\s*[:\-]?\s*([\w\-/]{5,30})',
                text, re.IGNORECASE
            )
            if license_match:
                data['license_number'] = license_match.group(1).strip()

        # Count important fields found
        expected = self.EXPECTED_FIELDS.get(doc_type, [])
        found = [f for f in expected if data.get(f) or data.get(f'{doc_type}_number')]
        data['fields_found'] = len(found)
        data['fields_expected'] = len(expected)

        return data

    def _validate_format(self, text: str, doc_type: str) -> Dict[str, Any]:
        """Validate document number format against official patterns."""

        result = {
            'valid': True,
            'checks': [],
            'issues': [],
        }

        if doc_type not in self.FORMAT_VALIDATORS:
            result['checks'].append(f'No format validator available for {doc_type}')
            return result

        validator = self.FORMAT_VALIDATORS[doc_type]

        # Check if document number exists and matches pattern
        doc_number = self.ocr.extract_document_number(text, doc_type)

        if doc_number:
            result['document_number'] = doc_number
            result['checks'].append(f'Found {doc_type} number: {doc_number}')

            if self.ocr.validate_document_number(doc_number, doc_type):
                result['checks'].append(f'{doc_type} number format is valid')
            else:
                result['valid'] = False
                result['issues'].append(f'{doc_type} number format is invalid')

            # Aadhaar Verhoeff checksum
            if doc_type == 'aadhaar' and validator.get('checksum'):
                digits = re.sub(r'\D', '', doc_number)
                if len(digits) == 12:
                    if not self._verhoeff_validate(digits):
                        result['issues'].append('Aadhaar checksum validation failed')
                        result['valid'] = False
        else:
            result['issues'].append(f'Could not find {doc_type} number in document')
            result['valid'] = False

        return result

    def _verhoeff_validate(self, number: str) -> bool:
        """Validate Aadhaar number using Verhoeff algorithm."""
        try:
            d = [
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
                [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
                [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
                [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
                [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
                [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
                [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
                [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
                [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            ]
            p = [
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
                [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
                [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
                [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
                [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
                [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
                [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
            ]

            c = 0
            for i, digit in enumerate(reversed(number)):
                c = d[c][p[i % 8][int(digit)]]
            return c == 0
        except Exception:
            return True  # Don't fail on checksum errors

    def _cross_validate(
        self,
        extracted: Dict[str, Any],
        user_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Cross-validate extracted data with user-provided data."""

        result = {
            'matches': [],
            'mismatches': [],
            'score': 100.0,
        }

        # Name check
        if extracted.get('name') and user_data.get('name'):
            ext_name = extracted['name'].lower().strip()
            user_name = user_data['name'].lower().strip()
            if ext_name in user_name or user_name in ext_name:
                result['matches'].append('Name matches')
            else:
                # Check partial match (first name or last name)
                ext_parts = set(ext_name.split())
                user_parts = set(user_name.split())
                if ext_parts.intersection(user_parts):
                    result['matches'].append('Partial name match')
                else:
                    result['mismatches'].append(f'Name mismatch: document="{extracted["name"]}", profile="{user_data["name"]}"')
                    result['score'] -= 25

        # DOB check
        if extracted.get('dob') and user_data.get('dob'):
            if extracted['dob'] == user_data['dob']:
                result['matches'].append('Date of birth matches')
            else:
                result['mismatches'].append('Date of birth mismatch')
                result['score'] -= 20

        # Address check (fuzzy)
        if extracted.get('address') and user_data.get('address'):
            ext_addr = extracted['address'].lower()
            user_addr = user_data['address'].lower()
            common_words = set(ext_addr.split()).intersection(set(user_addr.split()))
            if len(common_words) >= 2:
                result['matches'].append('Address partially matches')
            else:
                result['mismatches'].append('Address does not match')
                result['score'] -= 15

        result['score'] = max(0, result['score'])
        return result

    def _cross_document_validation(
        self,
        all_data: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Validate consistency across multiple documents."""

        result = {
            'consistent': True,
            'checks': [],
            'issues': [],
        }

        if len(all_data) < 2:
            result['checks'].append('Need at least 2 documents for cross-validation')
            return result

        # Collect all names across documents
        names = {}
        for doc_type, data in all_data.items():
            if data.get('name'):
                names[doc_type] = data['name'].lower().strip()

        # Check name consistency
        if len(names) >= 2:
            name_list = list(names.values())
            name_consistent = True
            for i in range(len(name_list)):
                for j in range(i + 1, len(name_list)):
                    parts_i = set(name_list[i].split())
                    parts_j = set(name_list[j].split())
                    if not parts_i.intersection(parts_j):
                        result['issues'].append(
                            f'Name mismatch between documents: {list(names.keys())[i]} vs {list(names.keys())[j]}'
                        )
                        name_consistent = False

            if name_consistent:
                result['checks'].append('Names consistent across all documents')
            else:
                result['consistent'] = False

        # Check DOB consistency
        dobs = {}
        for doc_type, data in all_data.items():
            if data.get('dob'):
                dobs[doc_type] = data['dob']

        if len(dobs) >= 2:
            dob_values = list(set(dobs.values()))
            if len(dob_values) == 1:
                result['checks'].append('Date of birth consistent across documents')
            else:
                result['issues'].append('Date of birth inconsistency across documents')
                result['consistent'] = False

        return result

    def _calculate_trust_score(self, result: Dict[str, Any]) -> int:
        """Calculate overall trust score (0-100) from all checks."""

        score = 50  # Base score

        # OCR quality (+/- 15)
        extracted = result.get('extracted_data', {})
        fields_found = extracted.get('fields_found', 0)
        fields_expected = extracted.get('fields_expected', 1)
        field_ratio = fields_found / fields_expected if fields_expected > 0 else 0
        score += int(field_ratio * 15)

        # Tampering analysis (+/- 20)
        tampering = result.get('tampering_analysis', {})
        if not tampering.get('tampering_detected'):
            score += 20
        else:
            tampering_confidence = tampering.get('confidence', 0)
            score -= int(tampering_confidence * 0.3)

        # Format validation (+/- 15)
        format_result = result.get('format_validation', {})
        if format_result.get('valid'):
            score += 15
        else:
            score -= 10

        # Consistency check (+/- 10)
        consistency = result.get('consistency_check', {})
        if consistency:
            consistency_score = consistency.get('score', 100)
            score += int((consistency_score / 100) * 10) - 5

        # Issue penalties
        issue_count = len(result.get('detected_issues', []))
        score -= issue_count * 5

        return max(0, min(100, score))


@lru_cache(maxsize=1)
def get_document_verifier() -> DocumentVerifier:
    """Get cached DocumentVerifier instance."""
    return DocumentVerifier()
