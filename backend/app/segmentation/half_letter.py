import numpy as np

def half_letter_segmentation(window, recognizer):
    shape1 = window.shape

    if shape1[1] >= int(1.6 * shape1[0]):
        with_character = []
        for column in range(int(0.3 * shape1[1]), int(shape1[1] - 0.3 * shape1[1])):
            k = 0
            for row in range(int(0.2 * shape1[0]), shape1[0]):
                if window[row][column] == 255:
                    k += 1
            with_character.append(k)

        l = len(with_character)
        test = []
        for g in range(l - 10):
            f = (with_character[g+9] + with_character[g+8] + with_character[g+7]
                 + with_character[g+6] + with_character[g+5]
                 - with_character[g+4] - with_character[g+3] - with_character[g+2]
                 - with_character[g+1] - with_character[g])
            test.append(f)
        p = np.argmax(test)

        window_x = window[0:shape1[0], 0:int(p + 0.3 * shape1[1] + 3)]
        window_y = window[0:shape1[0], int(p + 0.3 * shape1[1] + 3):shape1[1]]

        recognizer.hc_recognition(window_x)
        recognizer.mc_recognition(window_y)
        return window_x, window_y

    elif shape1[1] < int(0.45 * shape1[0]):
        recognizer.rule_based_matra('ा')
        return window

    else:
        recognizer.mc_recognition(window)
        return window
