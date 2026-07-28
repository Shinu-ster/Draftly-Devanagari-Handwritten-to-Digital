import cv2
import numpy as np
from app.inference.model_loader import get_model
from app.segmentation.word_segmentation import segment_words
from app.segmentation.character_segmentation import segment_characters
from app.segmentation.zone_split import split_zones, prepare_img

def run_pipeline(image: np.ndarray) -> str:
    """
    image: single-channel binary word/line image, already thresholded once.
    Returns reconstructed Unicode string.
    """
    words = segment_words(image)
    output = []

    for word_img in words:
        chars = segment_characters(word_img)
        for char_crop in chars:
            zones = split_zones(char_crop)  # {main, upper, lower, half, digit, final}
            unicode_char = classify_zones(zones)
            output.append(unicode_char)
        output.append(" ")

    return "".join(output).strip()

def classify_zones(zones: dict) -> str:
    result = ""
    if zones.get("main") is not None:
        img = prepare_img(zones["main"])
        pred = get_model("imp").predict(img[None, ...], verbose=0)
        result += decode_main(pred)

    if zones.get("upper1") is not None:
        img = prepare_img(zones["upper1"])
        pred = get_model("u1").predict(img[None, ...], verbose=0)
        result += decode_u1(pred)

    # ... same pattern for u2, lm, hc, d, fi
    return result

# decode_* functions map class index -> Unicode codepoint
# keep a JSON/dict mapping per model, load once at startup
