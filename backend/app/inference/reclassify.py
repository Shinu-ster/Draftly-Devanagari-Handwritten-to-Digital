import cv2
import numpy as np
from tensorflow.keras.utils import img_to_array
from app.inference.model_loader import get_model
from app.inference.recognizer import prepare_img
from app.inference.labels import (
    imp_characters, d_characters, u1_characters,
    u2_characters, l_characters, h_characters, fc_characters,
)

# maps a "zone" selected on the frontend -> (model name, label list)
ZONE_MAP = {
    "main":   ("imp", imp_characters),
    "upper1": ("u1", u1_characters),
    "upper2": ("u2", u2_characters),
    "lower":  ("lm", l_characters),
    "half":   ("hc", h_characters),
    "digit":  ("d", d_characters),
    "final":  ("fi", fc_characters),
}

def predict_zone_char(zone: str, raw_img: np.ndarray):
    if zone not in ZONE_MAP:
        raise ValueError(f"Unknown zone: {zone}")
    model_name, labels = ZONE_MAP[zone]

    # scratchpad drawing needs the same binarization your segmentation pipeline
    # produces before it ever reaches prepare_img
    _, binary = cv2.threshold(raw_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    img = prepare_img(binary)
    X = img_to_array(img)
    X = np.expand_dims(X, axis=0)
    val = get_model(model_name).predict(X, verbose=0)
    position = int(np.argmax(val))
    confidence = float(np.max(val))
    return labels[position], confidence
