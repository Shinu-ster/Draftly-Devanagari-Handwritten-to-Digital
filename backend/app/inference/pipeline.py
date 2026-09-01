import cv2
from app.segmentation.preprocessing import word_preprocess, char_preprocess
from app.segmentation.word_segmentation import word_segmentation
from app.segmentation.siro_rekha import siro_rekha_finder
from app.segmentation.char_split import split_characters, find_low_level
from app.segmentation.character_segmentation import character_segmentation
from app.inference.recognizer import Recognizer

def process_word(word_img, is_last_word, recognizer):
    prepimg, tb, lr = char_preprocess(word_img)
    shape = prepimg.shape

    if is_last_word and not (shape[1] > int(1.2 * shape[0])):
        recognizer.fc_recognition(prepimg)
        return

    width = int((100 * shape[1]) / shape[0])
    height = 100
    resized = cv2.resize(prepimg, (width, height), interpolation=cv2.INTER_AREA)
    resized = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    main_img = resized.copy()  # replaces the old "resized.jpg" disk write/read

    siro_rekha = siro_rekha_finder(resized)

    if siro_rekha == 0:
        recognizer.d_recognition(prepimg)
    else:
        bordered = resized.copy()
        segments = split_characters(bordered, siro_rekha, width, main_img)
        low_level, lowest_level, average_low = find_low_level(segments)
        character_segmentation(segments, siro_rekha, low_level, lowest_level, average_low, recognizer)


def process_image(img: "np.ndarray") -> str:
    """Full pipeline entry point: grayscale image in, Unicode text out."""
    recognizer = Recognizer()
    prepimg, tb, lr = word_preprocess(img)
    words, num = word_segmentation(prepimg)

    for count, word_img in enumerate(words):
        is_last = (count == num - 1)
        process_word(word_img, is_last, recognizer)
        if not is_last:
            recognizer.output.append(' ')

    return recognizer.get_text()
