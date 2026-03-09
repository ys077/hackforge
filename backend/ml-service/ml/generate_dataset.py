"""Synthetic dataset generator for document types.
Creates simple images with text labels to simulate documents like Aadhar, PAN, etc.

This module exposes `generate_dataset()` so other scripts can invoke it
directly; running the file from the command line still works too.
"""
import os
import random
from PIL import Image, ImageDraw, ImageFont

# document classes we want to recognize
CLASSES = [
    "aadhar",
    "pan",
    "passbook",
    "certificate",
    "employment_letter",
    "trade_license",
]

DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "dataset")
DEFAULT_NUM_SAMPLES_PER_CLASS = 1000
IMAGE_SIZE = (224, 224)

# try to pick a truetype font if available, else default
try:
    FONT = ImageFont.truetype("arial.ttf", 32)
except IOError:
    FONT = ImageFont.load_default()


def generate_dataset(output_dir: str = None, num_samples_per_class: int = None):
    """Generate synthetic dataset.

    Args:
        output_dir: base directory where class subfolders will be created.
                    Defaults to `ml/dataset`.
        num_samples_per_class: how many images per document class to make.
    """
    output_dir = output_dir or DEFAULT_OUTPUT_DIR
    num = num_samples_per_class or DEFAULT_NUM_SAMPLES_PER_CLASS

    os.makedirs(output_dir, exist_ok=True)

    for cls in CLASSES:
        cls_dir = os.path.join(output_dir, cls)
        os.makedirs(cls_dir, exist_ok=True)
        for i in range(num):
            img = Image.new("RGB", IMAGE_SIZE, color=(255, 255, 255))
            draw = ImageDraw.Draw(img)
            text = cls.replace("_", " ").title()

            # Pillow 12 removed draw.textsize; use font.getsize or textbbox
            try:
                w, h = FONT.getsize(text)
            except AttributeError:
                bbox = draw.textbbox((0, 0), text, font=FONT)
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]

            x = (IMAGE_SIZE[0] - w) / 2 + random.randint(-10, 10)
            y = (IMAGE_SIZE[1] - h) / 2 + random.randint(-10, 10)
            draw.text((x, y), text, fill=(0, 0, 0), font=FONT)

            # add random noise dots
            for _ in range(500):
                px = random.randint(0, IMAGE_SIZE[0] - 1)
                py = random.randint(0, IMAGE_SIZE[1] - 1)
                draw.point((px, py), fill=(random.randint(0, 255),) * 3)

            # random rotation
            angle = random.uniform(-15, 15)
            img = img.rotate(angle, expand=False, fillcolor=(255, 255, 255))

            img.save(os.path.join(cls_dir, f"{cls}_{i}.png"))

    print(f"Generated dataset in {output_dir} with {len(CLASSES)*num} images")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate synthetic document images")
    parser.add_argument("-n", "--num", type=int, default=None,
                        help="number of samples per class (overrides default)")
    parser.add_argument("-o", "--out", type=str, default=None,
                        help="output directory (defaults to ml/dataset)")
    args = parser.parse_args()
    generate_dataset(output_dir=args.out, num_samples_per_class=args.num)
