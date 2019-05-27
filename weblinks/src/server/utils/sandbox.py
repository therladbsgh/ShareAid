TRAIN_EN = "./data/train.txt"
ENGLISH_WINDOW_SIZE = 50
STOP_TOKEN = "*STOP*"

# with open(TRAIN_EN, "r") as english_file:
#     text = []
#     for line in english_file:
#         text.append(line.split())
#     text.sort(key=len, reverse=True)
#     for each in text:
#         print(each)
#         print(len(each))

def pad_corpus(english_file_name):
    """
    arguments are files of French, English sentences.  Assumes maximum sentence
    lengths of 14 and 12 respectively.  Returns [french-sents, english-sents]. The
    English is given an initial "*STOP"*.  All sentences are padded with "*STOP*" at
    the end to make their lengths 14 and 13 respectively, e.g., "I am hungry ." becomes
    ["*STOP*,"I","am", "hungry", ".", "*STOP","*STOP","*STOP", "*STOP","*STOP","*STOP","*STOP", "*STOP"]

    :param french_file_name: string, a path to a french file
    :param english_file_name: string, a path to an english file

    :return: A tuple of: (list of padded sentences for French, list of padded sentences for English)
    """

    english_padded_sentences = []
    english_sentence_lengths = []
    with open(english_file_name, "rt") as english_file:
        for line in english_file:
            padded_english = line.split()[:ENGLISH_WINDOW_SIZE]
            english_sentence_lengths.append(len(padded_english))
            padded_english = ([STOP_TOKEN] + padded_english + [STOP_TOKEN] *
                              (ENGLISH_WINDOW_SIZE - len(padded_english)))
            english_padded_sentences.append(padded_english)

    return english_padded_sentences, english_sentence_lengths


a, b = pad_corpus(TRAIN_EN)
for each in a:
    print(len(each))
