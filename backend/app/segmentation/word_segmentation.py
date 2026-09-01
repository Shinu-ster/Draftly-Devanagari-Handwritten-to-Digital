import cv2
import numpy as np

def word_segmentation(prepimg):
    """Splits a preprocessed line image into individual word crops."""
    shape = prepimg.shape
    width = int((150 * shape[1]) / shape[0])
    height = 150

    resized = cv2.resize(prepimg, (width, height), interpolation=cv2.INTER_AREA)
    resized = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    img1 = resized.T
    shape = img1.shape
    bg = np.repeat(0, shape[1])
    array = []
    for row in range(1, shape[0]):
        if np.equal(bg, img1[row]).all():
            array.append(row)

    l = len(array)
    if l > 0:
        array1 = [0, array[0]]
        for i in range(0, l - 2):
            if (array[i + 1] - array[i]) > 10:
                array1.append(array[i])
                array1.append(array[i + 1])
        array1.append(array[-1])
        array1.append(shape[0])

        segments = []
        leng = len(array1)
        shape2 = resized.shape
        x = 0
        while x < leng - 1:
            segment = resized[0:shape2[0], array1[x]:array1[x + 1]]
            segments.append(segment)
            x += 2
        return segments, int(leng / 2)
    else:
        return [resized], 1
