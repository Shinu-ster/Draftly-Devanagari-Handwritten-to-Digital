import numpy as np

def siro_rekha_finder(resized):
    """Detects the horizontal headline (siro rekha) row index. Returns 0 if absent (digit)."""
    shape = resized.shape
    number = []
    for row in range(1, int(0.6 * shape[0])):
        count = 0
        for column in range(1, shape[1]):
            if resized[row][column] == 255:
                count += 1
        number.append(count)

    siro_rekha = np.argmax(number) + 2
    if number[siro_rekha - 2] < int(0.4 * shape[1]):
        return 0
    return siro_rekha
