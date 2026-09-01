import numpy as np
from app.segmentation.half_letter import half_letter_segmentation

def character_segmentation(segments, siro_rekha, low_level, lowest_level, average_low, recognizer):
    """
    segments: in-memory character crops from split_characters() — used directly
    instead of re-reading temp_{i}.jpg from disk as the original script did.
    """
    i = 0
    if siro_rekha <= 15:
        for simg in segments:
            shape = simg.shape
            if low_level[i] > average_low + 15:
                window0 = simg[0:lowest_level, 0:shape[1]]
                half_letter_segmentation(window0, recognizer)
                window1 = simg[lowest_level:shape[0], 0:shape[1]]
                recognizer.lm_recognition(window1)
            else:
                window0 = simg[0:low_level[i], 0:shape[1]]
                half_letter_segmentation(window0, recognizer)
            i += 1
    else:
        for simg in segments:
            shape = simg.shape
            a = 0
            for column in range(1, shape[1]):
                if simg[int(siro_rekha / 2)][column] == 255:
                    a += 1
            touching_points = []

            if low_level[i] > average_low + 15:
                if a > 0:
                    window0 = simg[siro_rekha - 5:lowest_level, 0:shape[1]]
                    half_letter_segmentation(window0, recognizer)
                    window1 = simg[lowest_level:shape[0], 0:shape[1]]
                    window2 = simg[0:siro_rekha - 3, 0:shape[1]]
                    recognizer.lm_recognition(window1)
                    recognizer.u1_recognition(window2)
                else:
                    window0 = simg[siro_rekha - 5:lowest_level + 3, 0:shape[1]]
                    half_letter_segmentation(window0, recognizer)
                    window1 = simg[lowest_level:shape[0], 0:shape[1]]
                    recognizer.lm_recognition(window1)
            else:
                if a > 0:
                    for column in range(1, shape[1]):
                        if simg[siro_rekha - 8][column] == 255:
                            touching_points.append(column)
                    if len(touching_points) == 1:
                        touching_points.append(touching_points[0] + 1)

                    front_tp = touching_points[1] if len(touching_points) > 1 else touching_points[0]
                    back_tp = touching_points[-1]
                    max_diff = np.diff(touching_points).max()
                    x, y = touching_points[0], touching_points[-1]
                    for num in range(0, len(touching_points) - 1):
                        if (touching_points[num + 1] - touching_points[num]) == max_diff:
                            x = touching_points[num]
                            y = touching_points[num + 1]

                    tcs = []
                    if max_diff >= 15:  # double touching → ि or ी
                        for sub in range(2, 12):
                            t = 0
                            for row in range(siro_rekha + 13, lowest_level):
                                if simg[row][y - sub] == 255:
                                    t += 1
                            tcs.append(t)
                        test, rem = 1, 0
                        for num in range(10):
                            if tcs[num] == 0:
                                test = 0
                                rem = num
                        if test == 1:
                            window0 = simg[siro_rekha:low_level[i], x + 5:shape[1]]
                            half_letter_segmentation(window0, recognizer)
                            recognizer.rule_based_matra('ि')
                        else:
                            window0 = simg[siro_rekha - 5:low_level[i], 0:y - rem - 2]
                            half_letter_segmentation(window0, recognizer)
                            recognizer.rule_based_matra('ी')
                    else:  # single touching → े / ो etc.
                        for sub in range(2, 12):
                            t = 0
                            for row in range(siro_rekha + 13, lowest_level):
                                if simg[row][front_tp - sub] == 255:
                                    t += 1
                            tcs.append(t)
                        test, rem = 1, 0
                        for num in range(10):
                            if tcs[num] == 0:
                                test = 0
                                rem = num
                        if test == 1:
                            window0 = simg[siro_rekha - 5:low_level[i], 0:shape[1]]
                            half_letter_segmentation(window0, recognizer)
                            window1 = simg[0:siro_rekha - 3, 0:shape[1]]
                            recognizer.u1_recognition(window1)
                        else:
                            window0 = simg[siro_rekha - 5:low_level[i], 0:front_tp - rem - 2]
                            half_letter_segmentation(window0, recognizer)
                            window1 = simg[0:lowest_level, 0:back_tp + 10]
                            window1[siro_rekha + 8:lowest_level, 0:front_tp - rem - 2] = 0
                            window1 = window1[0:lowest_level, int(shape[1] / 3):back_tp + 10]
                            recognizer.u2_recognition(window1)
                else:
                    window0 = simg[siro_rekha - 10:low_level[i], 0:shape[1]]
                    half_letter_segmentation(window0, recognizer)
            i += 1
