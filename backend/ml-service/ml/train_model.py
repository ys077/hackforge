"""Training script for document type classifier using PyTorch.
Assumes synthetic dataset created by generate_dataset.py under ml/dataset/
"""
import os
import sys
import argparse
import shutil
from urllib.request import urlretrieve
import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

# configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), "dataset")
BATCH_SIZE = 32
NUM_EPOCHS = 5
LEARNING_RATE = 1e-3
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pth")

# allow overriding via CLI (epochs/batch size as before)
parser = argparse.ArgumentParser(description="Train document classifier")
parser.add_argument("--epochs", type=int, default=NUM_EPOCHS,
                    help="number of epochs to run")
parser.add_argument("--batch", type=int, default=BATCH_SIZE,
                    help="batch size for training")
parser.add_argument("--download-urls", type=str,
                    help="path to a text file containing image URLs to fetch"
                    )
args = parser.parse_args()
NUM_EPOCHS = args.epochs
BATCH_SIZE = args.batch


def download_images(url_file: str, output_dir: str):
    """Fetch images listed in a text file and place them under dataset dirs.

    The URL file should contain lines of the form `<class> <url>`.  This
    helper will create a subdirectory for each class and download the images
    there.  It is provided as an example of how you might augment the dataset
    with external resources; you can use any data-collection pipeline you
    prefer.
    """
    os.makedirs(output_dir, exist_ok=True)
    with open(url_file, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) != 2:
                continue
            cls, url = parts
            cls_dir = os.path.join(output_dir, cls)
            os.makedirs(cls_dir, exist_ok=True)
            filename = os.path.basename(url)
            dest = os.path.join(cls_dir, filename)
            try:
                print(f"Downloading {url} to {dest}...")
                urlretrieve(url, dest)
            except Exception as e:
                print(f"Failed to download {url}: {e}")

# if URL file provided, grab images before creating dataset
if args.download_urls:
    download_images(args.download_urls, DATA_DIR)

# ensure dataset exists and contains at least one image; if not, try to generate

def contains_images(path):
    """Return True if `path` or any subdirectory has an image file."""
    valid_exts = {'.jpg', '.jpeg', '.png', '.ppm', '.bmp', '.pgm', '.tif', '.tiff', '.webp'}
    for root, _, files in os.walk(path):
        for f in files:
            if os.path.splitext(f.lower())[1] in valid_exts:
                return True
    return False

if not os.path.isdir(DATA_DIR) or not contains_images(DATA_DIR):
    print(f"Dataset directory '{DATA_DIR}' missing or containing no images, attempting to create it...")
    # remove possibly empty directory tree to avoid partial state
    try:
        if os.path.isdir(DATA_DIR):
            import shutil
            shutil.rmtree(DATA_DIR)
    except Exception:
        pass
    try:
        from generate_dataset import generate_dataset
        generate_dataset(output_dir=DATA_DIR)
    except Exception as e:
        print("Failed to auto-generate dataset:", e)
        print("Please run 'python generate_dataset.py' manually and try again.")
        sys.exit(1)

# transforms: basic augmentation
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

train_dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

num_classes = len(train_dataset.classes)
model = models.resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, num_classes)
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)


def main():
    print(f"Classes: {train_dataset.classes}")

    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * inputs.size(0)
        epoch_loss = running_loss / len(train_loader.dataset)
        print(f"Epoch {epoch+1}/{NUM_EPOCHS}, loss: {epoch_loss:.4f}")
    # save checkpoint after each epoch in case of interruption
    torch.save({
        'model_state_dict': model.state_dict(),
        'classes': train_dataset.classes
    }, MODEL_PATH)
    print(f"Checkpoint saved to {MODEL_PATH}")

print(f"Training complete; final model at {MODEL_PATH}")
