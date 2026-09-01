import cv2
import numpy as np
from app.segmentation.geometry import find_borders

def word_preprocess(bgr_img):
    """Word-level: BINARY_INV threshold, loose border tolerance."""
    blur = cv2.GaussianBlur(bgr_img, (5, 5), 0)
    th_img = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    bg_test = np.array([th_img[i][i] for i in range(5)])
    text_color = 255 if bg_test.all() == 0 else 0

    tb = find_borders(th_img, text_color, bthresh=0.01)
    lr = find_borders(th_img.T, text_color, bthresh=0.01)
    dummy = int(np.average((tb[2], lr[2]))) + 2
    template = th_img[tb[0]:tb[1] + int(dummy / 2), lr[0]:lr[1]]
    return template, tb, lr

def char_preprocess(bgr_img):
    """Character-level: plain BINARY threshold, tighter border tolerance."""
    blur = cv2.GaussianBlur(bgr_img, (5, 5), 0)
    th_img = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    bg_test = np.array([th_img[i][i] for i in range(5)])
    text_color = 255 if bg_test.all() == 0 else 0

    tb = find_borders(th_img, text_color, bthresh=0.092)
    lr = find_borders(th_img.T, text_color, bthresh=0.092)
    dummy = int(np.average((tb[2], lr[2]))) + 2
    template = th_img[tb[0]:tb[1] + int(dummy / 2), lr[0]:lr[1]]
    return template, tb, lr
