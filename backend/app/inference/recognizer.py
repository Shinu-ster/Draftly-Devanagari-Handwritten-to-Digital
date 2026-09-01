import cv2
import numpy as np
from tensorflow.keras.utils import img_to_array
from app.inference.model_loader import get_model
from app.inference.labels import (
    imp_characters, d_characters, u1_characters,
    u2_characters, l_characters, h_characters, fc_characters,
)

def prepare_img(window):
    shape1 = window.shape
    if shape1[0] > shape1[1]:
        width = int((28 * shape1[1]) / shape1[0])
        width = width if width % 2 == 0 else width + 1
        height = 28
        img = cv2.resize(window, (width, height))
        a = int((32 - width) / 2)
        return cv2.copyMakeBorder(img, 2, 2, a, a, cv2.BORDER_CONSTANT, value=0)
    else:
        height = int((28 * shape1[0]) / shape1[1])
        height = height if height % 2 == 0 else height + 1
        width = 28
        img = cv2.resize(window, (width, height))
        a = int((32 - height) / 2)
        return cv2.copyMakeBorder(img, a, a, 2, 2, cv2.BORDER_CONSTANT, value=0)


class Recognizer:
    """Per-request state holder: replaces the old global `string1`."""

    def __init__(self):
        self.output = []

    def _predict(self, model_name, window):
        img = prepare_img(window)
        X = img_to_array(img)
        X = np.expand_dims(X, axis=0)
        val = get_model(model_name).predict(X, verbose=0)
        position = int(np.argmax(val))
        confidence = float(np.max(val))
        return position, confidence

    def mc_recognition(self, window):
        position, conf = self._predict("imp", window)
        self.output.append(imp_characters[position])
        return imp_characters[position], conf

    def d_recognition(self, window):
        position, conf = self._predict("d", window)
        self.output.append(d_characters[position])
        return d_characters[position], conf

    def u1_recognition(self, window):
        position, conf = self._predict("u1", window)
        char = u1_characters[position]
        if position == 2:  # र् attaches before the consonant
            self.output.insert(-1, char)
        else:
            self.output.append(char)
        return char, conf

    def u2_recognition(self, window):
        position, conf = self._predict("u2", window)
        self.output.append(u2_characters[position])
        return u2_characters[position], conf

    def lm_recognition(self, window):
        position, conf = self._predict("lm", window)
        self.output.append(l_characters[position])
        return l_characters[position], conf

    def hc_recognition(self, window):
        position, conf = self._predict("hc", window)
        self.output.append(h_characters[position])
        return h_characters[position], conf

    def fc_recognition(self, window):
        position, conf = self._predict("fi", window)
        self.output.append(fc_characters[position])
        return fc_characters[position], conf

    def rule_based_matra(self, symbol):
        """For ा and other purely geometric detections with no model call."""
        self.output.append(symbol)

    def get_text(self):
        return "".join(self.output)
