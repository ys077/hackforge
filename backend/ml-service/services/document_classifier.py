"""
Document Type Classifier — PyTorch ResNet-18 based classifier.
Uses a pre-trained model from ml/model.pth to classify uploaded document images
into one of 6 categories: aadhar, pan, passbook, certificate, employment_letter, trade_license.

Falls back to OCR-based heuristic classification when the model is unavailable.
"""

import os
import io
import base64
from typing import Optional, Tuple
from functools import lru_cache
from PIL import Image
from loguru import logger

# Machine learning imports (optional — heuristic fallback if missing)
try:
    import torch
    from torchvision import transforms, models
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available — document classifier will use OCR heuristic only")

# PDF handling (optional)
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "model.pth")

# Document type mapping from classifier labels to our internal types
LABEL_MAP = {
    "aadhar": "aadhaar",        # classifier uses "aadhar", our system uses "aadhaar"
    "pan": "pan",
    "passbook": "passbook",
    "certificate": "certificate",
    "employment_letter": "employment_letter",
    "trade_license": "trade_license",
}


class DocumentClassifier:
    """PyTorch-based document type classifier using ResNet-18."""

    def __init__(self):
        self.model = None
        self.classes = []
        self.transform = None
        self._load_model()

    def _load_model(self):
        """Load the pre-trained ResNet-18 model from checkpoint."""
        if not TORCH_AVAILABLE:
            logger.info("PyTorch not available — classifier disabled")
            return

        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Model file not found at {MODEL_PATH} — classifier disabled")
            return

        try:
            checkpoint = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
            self.classes = checkpoint['classes']
            num_classes = len(self.classes)

            self.model = models.resnet18(weights=None)
            self.model.fc = torch.nn.Linear(self.model.fc.in_features, num_classes)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()

            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406],
                                     [0.229, 0.224, 0.225])
            ])

            logger.info(f"Document classifier loaded with {num_classes} classes: {self.classes}")
        except Exception as e:
            logger.error(f"Failed to load document classifier: {e}")
            self.model = None

    @property
    def is_available(self) -> bool:
        """Check if the classifier model is loaded and ready."""
        return self.model is not None and self.transform is not None

    def _open_image(self, base64_image: str) -> Optional[Image.Image]:
        """Convert base64 string to PIL Image, handling PDFs."""
        try:
            image_data = base64.b64decode(base64_image)

            # Check if it's a PDF
            if image_data[:4] == b'%PDF':
                if fitz is not None:
                    doc = fitz.open(stream=image_data, filetype="pdf")
                    page = doc.load_page(0)
                    pix = page.get_pixmap()
                    img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                    return img
                else:
                    logger.warning("PDF document received but PyMuPDF not installed")
                    return None

            # Regular image
            img = Image.open(io.BytesIO(image_data)).convert('RGB')
            return img
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            return None

    def classify(self, base64_image: str) -> Tuple[str, float]:
        """Classify a document image and return (document_type, confidence).
        
        Returns:
            Tuple of (document_type, confidence_score).
            document_type uses our internal naming (e.g., 'aadhaar' not 'aadhar').
            confidence_score is between 0 and 1.
        """
        if not self.is_available:
            return ("unknown", 0.0)

        img = self._open_image(base64_image)
        if img is None:
            return ("unknown", 0.0)

        try:
            inp = self.transform(img).unsqueeze(0)
            with torch.no_grad():
                outputs = self.model(inp)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, pred = probabilities.max(1)

            raw_label = self.classes[pred.item()]
            mapped_label = LABEL_MAP.get(raw_label, raw_label)
            conf_score = confidence.item()

            logger.info(f"Classified document as '{mapped_label}' with confidence {conf_score:.3f}")
            return (mapped_label, conf_score)
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return ("unknown", 0.0)

    def classify_with_details(self, base64_image: str) -> dict:
        """Classify and return detailed results with all class probabilities."""
        if not self.is_available:
            return {
                "predicted_type": "unknown",
                "confidence": 0.0,
                "model_available": False,
                "all_scores": {},
            }

        img = self._open_image(base64_image)
        if img is None:
            return {
                "predicted_type": "unknown",
                "confidence": 0.0,
                "model_available": True,
                "error": "Could not open image",
                "all_scores": {},
            }

        try:
            inp = self.transform(img).unsqueeze(0)
            with torch.no_grad():
                outputs = self.model(inp)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]

            all_scores = {}
            for i, cls in enumerate(self.classes):
                mapped = LABEL_MAP.get(cls, cls)
                all_scores[mapped] = round(probabilities[i].item(), 4)

            predicted_idx = probabilities.argmax().item()
            raw_label = self.classes[predicted_idx]
            mapped_label = LABEL_MAP.get(raw_label, raw_label)

            return {
                "predicted_type": mapped_label,
                "confidence": round(probabilities[predicted_idx].item(), 4),
                "model_available": True,
                "all_scores": all_scores,
            }
        except Exception as e:
            logger.error(f"Detailed classification failed: {e}")
            return {
                "predicted_type": "unknown",
                "confidence": 0.0,
                "model_available": True,
                "error": str(e),
                "all_scores": {},
            }


@lru_cache(maxsize=1)
def get_document_classifier() -> DocumentClassifier:
    """Get cached DocumentClassifier instance."""
    return DocumentClassifier()
