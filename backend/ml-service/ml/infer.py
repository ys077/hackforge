"""Inference helper: load saved model and predict a single image's document type."""
import os
import sys
from PIL import Image

# optional OCR for heuristic classification
try:
    import pytesseract
except ImportError:
    pytesseract = None

# machine learning imports are optional; heuristic used by default
try:
    import torch
    from torchvision import transforms, models
except ImportError:
    torch = None
    transforms = None
    models = None

# optional import for PDF handling
try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

# fallback with PyMuPDF (fitz) if pdf2image fails or is unavailable
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# We can still load a trained model if present, but the service now uses
# a simple OCR/keyword heuristic by default so training is not required.
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pth")

classes = []
model = None
transform = None

if torch is not None and os.path.exists(MODEL_PATH):
    try:
        checkpoint = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
        classes = checkpoint['classes']
        num_classes = len(classes)
        model = models.resnet18(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ])
    except Exception:
        # ignore and fall back to heuristic
        model = None


def predict(image_path: str):
    # open or convert the input into a PIL image
    try:
        if image_path.lower().endswith('.pdf'):
            # first try PyMuPDF, which doesn't require external binaries
            if fitz is not None:
                try:
                    doc = fitz.open(image_path)
                    page = doc.load_page(0)
                    pix = page.get_pixmap()
                    img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                except Exception as e:
                    img = None
                    fitz_err = e
                else:
                    fitz_err = None
            else:
                img = None
                fitz_err = None

            # if PyMuPDF failed or isn't installed, fall back to pdf2image
            if img is None and convert_from_path is not None:
                try:
                    pages = convert_from_path(image_path, first_page=1, last_page=1)
                    if pages:
                        img = pages[0].convert('RGB')
                    else:
                        raise RuntimeError('PDF conversion produced no pages')
                except Exception as e:
                    pdf2err = e
                else:
                    pdf2err = None
            else:
                pdf2err = None

            if img is None:
                # both methods failed or none available
                if fitz_err is not None:
                    raise RuntimeError(f'PDF conversion failed (pymupdf): {fitz_err}')
                if pdf2err is not None:
                    raise RuntimeError(f'PDF conversion failed (pdf2image): {pdf2err}')
                raise RuntimeError('PDF conversion not available (install pymupdf or pdf2image+poppler)')
        else:
            img = Image.open(image_path).convert('RGB')
    except Exception as e:
        # rethrow with clearer message for the web server
        raise RuntimeError(f'could not open file as image: {e}')

    inp = transform(img).unsqueeze(0)
    with torch.no_grad():
        outputs = model(inp)
        _, pred = outputs.max(1)
    return classes[pred.item()]

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python infer.py <path-to-image>')
        sys.exit(1)
    img_path = sys.argv[1]
    print('Prediction:', predict(img_path))
