import numpy as np

def split_characters(bordered, siro_rekha, width, main_img):
    """
    Splits a word image into per-character crops.
    main_img: the unmodified resized word image (bordered is mutated in-place with siro
    rekha blanked out, purely to find gaps — crops always come from main_img).
    """
    img = bordered
    if siro_rekha > 15:
        img[siro_rekha - 8:siro_rekha + 10, 0:width] = 0
    else:
        img[0:siro_rekha + 13, 0:width] = 0
    image = img.T
    shape = image.shape

    bg = np.repeat(0, shape[1])
    array = [0]
    for row in range(1, shape[0]):
        if np.equal(bg, image[row]).all():
            array.append(row)

    l1 = len(array)
    if l1 == 0:
        return [main_img]

    array1 = []
    for i in range(0, l1 - 2):
        if (array[i + 1] - array[i]) >= 6:
            array1.append(array[i])
            array1.append(array[i + 1])

    l2 = len(array1)
    for i in range(0, l2 - 2):
        if (array1[i + 1] - array1[i]) <= 2:
            array1[i] = -1
            array1[i + 1] = -1

    array2 = [v for v in array1 if v != -1]
    if not array2:
        return [main_img]
    array2[-1] = array2[-1] + 5
    if len(array2) % 2 != 0:
        array2.pop(1)

    segments = []
    leng = len(array2)
    shape2 = main_img.shape
    x = 0
    while x < leng - 1:
        if (array2[x + 1] - array2[x]) < 20:
            segment = main_img[0:shape2[0], array2[x] - 5:array2[x + 1] + 5]
        else:
            segment = main_img[0:shape2[0], array2[x]:array2[x + 1] + 3]
        segments.append(segment)
        x += 2
    return segments


def find_low_level(segments):
    """Per-character lower boundary. average_low uses the FIX: max if tight range, else mean."""
    thresh = 255
    low_level = []
    for simg in segments:
        shape = simg.shape
        check = int(0.1 * shape[0])
        bottom = shape[0] - 1
        bg = np.repeat(thresh, shape[1])
        count = 0
        rows = np.arange(1, shape[0])
        for row in rows[::-1]:
            count = count + 1 if np.equal(bg, simg[row]).any() else 0
            if count >= check:
                bottom = row + count
                break
        low_level.append(bottom)

    lowest_level = np.min(low_level)
    range_lp = np.max(low_level) - lowest_level
    average_low = np.max(low_level) if range_lp < 12 else int(np.average(low_level))
    return low_level, lowest_level, average_low
