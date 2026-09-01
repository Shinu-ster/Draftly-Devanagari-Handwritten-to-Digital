import numpy as np

def find_borders(image, thresh, bthresh=0.092):
    """Shared border-finder used by both word-level and char-level preprocessing."""
    shape = image.shape
    check = int(bthresh * shape[0])
    top, bottom = 0, shape[0] - 1

    bg = np.repeat(thresh, shape[1])
    count = 0
    for row in range(1, shape[0]):
        count = count + 1 if np.equal(bg, image[row]).any() else 0
        if count >= check:
            top = row - check
            break

    count = 0
    rows = np.arange(1, shape[0])
    for row in rows[::-1]:
        count = count + 1 if np.equal(bg, image[row]).any() else 0
        if count >= check:
            bottom = row + count
            break

    d1 = (top - 2) >= 0
    d2 = (bottom + 2) < shape[0]
    b = 2 if (d1 and d2) else 0
    return top, bottom, b
