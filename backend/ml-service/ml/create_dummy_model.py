"""Quick way to create a placeholder model file without training."""
import os
import torch
from torchvision import models

DATA_DIR = os.path.join(os.path.dirname(__file__), "dataset")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pth")

# discover classes from dataset directories
classes = sorted([d.name for d in os.scandir(DATA_DIR) if d.is_dir()])
num_classes = len(classes)

# build model with random weights
model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, num_classes)

# save
torch.save({
    'model_state_dict': model.state_dict(),
    'classes': classes
}, MODEL_PATH)
print(f"Saved dummy model to {MODEL_PATH} with classes {classes}")