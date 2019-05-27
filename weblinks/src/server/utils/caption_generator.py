import numpy as np
import tensorflow as tf
import pathlib
import pickle

import utils.sentence_encoder as sentence_encoder

TRAIN_EN = "./utils/data/train.txt"
TEST_EN = "./utils/data/test.txt"

BATCH_SIZE = 100  # Batch Size
ENGLISH_WINDOW_SIZE = 50
STOP_TOKEN = "*STOP*"
STOP_TOKEN_2 = "STOP"


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


class Model:
    """
        This is a seq2seq model.
    """

    def __init__(self, english_window_size, english_vocab_size):
        """
        Initialize a Vanilla Seq2Seq Model with the given data.

        :param french_window_size: max len of French padded sentence, integer
        :param english_window_size: max len of English padded sentence, integer
        :param french_vocab_size: Vocab size of french, integer
        :param english_vocab_size: Vocab size of english, integer
        """

        # Initialize Placeholders
        self.english_vocab_size = english_vocab_size
        self.embed_size, self.rnn_size = 256, 512

        self.encoder_state = tf.placeholder(tf.float32,
                                            shape=[None, 512],
                                            name='encoder_state')
        self.decoder_input = tf.placeholder(tf.int32,
                                            shape=[None, english_window_size],
                                            name='english_input')
        self.decoder_input_single = tf.placeholder(tf.int32,
                                            shape=[None, 1],
                                            name='english_input_single')
        self.decoder_input_length = tf.placeholder(tf.int32, shape=[None],
                                                   name='english_length')
        self.decoder_labels = tf.placeholder(tf.int64,
                                             shape=[None, english_window_size],
                                             name='english_labels')

        self.mask = tf.sequence_mask(self.decoder_input_length + 1,
                                     maxlen=english_window_size,
                                     dtype=tf.float32)

        # Please leave these variables
        self.logits = self.forward_pass()
        self.loss = self.loss_function()
        self.train = self.back_propagation()

    def forward_pass(self):
        """
        Calculates the logits for words in batch sentences

        :return: tensor, word prediction logits [bsz x seqlen x english vocab size]
        """
        initializer = tf.random_normal_initializer(stddev=0.1)

        # Embed Decoder Inputs
        E_english = tf.get_variable('english_embedding',
                                    shape=[self.english_vocab_size,
                                           self.embed_size],
                                    initializer=initializer)
        decoder_embeddings = tf.nn.embedding_lookup(E_english,
                                                    self.decoder_input)
        decoder_embeddings_s = tf.nn.embedding_lookup(E_english,
                                                      self.decoder_input_single)

        with tf.variable_scope("decoder"):
            dec_cell = tf.contrib.rnn.GRUCell(self.rnn_size)
            decoder_outputs, decoder_state = tf.nn.dynamic_rnn(
               dec_cell, decoder_embeddings,
               initial_state=self.encoder_state,
               sequence_length=self.decoder_input_length,
               dtype=tf.float32)
            self.decoder_outputs = decoder_outputs
            self.decoder_state = decoder_state

            decoder_outputs_s, decoder_state_s = tf.nn.dynamic_rnn(
               dec_cell, decoder_embeddings_s,
               initial_state=self.encoder_state,
               sequence_length=[1],
               dtype=tf.float32)
            self.decoder_outputs_s = decoder_outputs_s
            self.decoder_state_s = decoder_state_s


        # Final Mapping to logits
        W = tf.get_variable("hidden_weights",
                            shape=[self.rnn_size, self.english_vocab_size],
                            initializer=initializer)
        b = tf.get_variable("hidden_bias", shape=[self.english_vocab_size],
                            initializer=initializer)

        # Get Final Logits
        self.logits_s = tf.tensordot(decoder_outputs_s, W, axes=[[2], [0]]) + b
        self.softmax_s = tf.nn.softmax(self.logits_s)
        self.output_s = tf.argmax(self.logits_s)
        return tf.tensordot(decoder_outputs, W, axes=[[2], [0]]) + b

    def accuracy_function(self):
        """
         Computes the batch accuracy
        """
        decoded_symbols = tf.argmax(self.logits, axis=2)
        total_correct = tf.reduce_sum(
            tf.cast(tf.equal(decoded_symbols, self.decoder_labels),
                    dtype=tf.float32) * self.mask)
        return (total_correct /
                tf.cast(tf.reduce_sum(self.decoder_input_length),
                        dtype=tf.float32))

    def loss_function(self):
        """
        Calculates the model cross-entropy loss after one forward pass

        :return: the loss of the model as a tensor (averaged over batch)
        """
        return tf.contrib.seq2seq.sequence_loss(
            self.logits, self.decoder_labels, self.mask)

    def back_propagation(self):
        """
        Adds optimizer to computation graph

        :return: optimizer
        """
        return tf.train.AdamOptimizer().minimize(self.loss)


def build_vocab(english_file, stop_token="*STOP*"):
    with open(english_file, 'r+', encoding='latin') as file:
        english_tokens = file.read().split()

    english_vocab = {word: index for index, word
                     in enumerate(list(set([stop_token] + english_tokens)))}
    return english_vocab


def convert_to_id(vocab, sentences):
    return np.stack([[vocab[word] for word in sentence]
                    for sentence in sentences])


def load_model(session):
    with open('src/server/utils/data/english_vocab.pickle', 'rb') as handle:
        english_vocab = pickle.load(handle)
    model = Model(ENGLISH_WINDOW_SIZE, len(english_vocab))
    saver = tf.train.Saver()
    saver.restore(session, "src/server/utils/models/caption_gen.ckpt")
    return model


def predict(word_vector, model, session, text):
    with open('src/server/utils/data/english_vocab.pickle', 'rb') as handle:
        english_vocab = pickle.load(handle)
    english_vocab_reverse = {index: word for word, index in english_vocab.items()}

    first_word = text.split()[0]

    stop_id = english_vocab[STOP_TOKEN]
    stop_id_2 = english_vocab[STOP_TOKEN_2]
    final_words = [stop_id]
    current_vector = word_vector
    if first_word in english_vocab:
        current_word = english_vocab[first_word]
    else:
        current_word = english_vocab[STOP_TOKEN_2]
    current_word, current_vector = \
        session.run([model.softmax_s, model.decoder_state_s],
                    feed_dict={
                        model.encoder_state: current_vector,
                        model.decoder_input_single: [[current_word]]
                    })
    current_word = np.random.choice(np.shape(current_word)[2],
                                    p=current_word[0][0])
    final_words.append(current_word)
    while current_word not in [stop_id, stop_id_2] and len(final_words) < 50:
        current_word, current_vector = \
            session.run([model.softmax_s, model.decoder_state_s],
                        feed_dict={
                            model.encoder_state: current_vector,
                            model.decoder_input_single: [[current_word]]
                        })
        current_word = np.random.choice(np.shape(current_word)[2],
                                        p=current_word[0][0])
        final_words.append(current_word)
    final_words = [english_vocab_reverse[i] for i in final_words]
    return " ".join(final_words[1:-1])


def main():
    # Load padded corpus
    train_english_word, train_english_lengths = pad_corpus(TRAIN_EN)
    test_english_word, test_english_lengths = pad_corpus(TEST_EN)

    english_vocab = build_vocab(TRAIN_EN)

    with open('./utils/data/english_vocab.pickle', 'wb') as handle:
        pickle.dump(english_vocab, handle)

    train_english_id = convert_to_id(english_vocab, train_english_word)
    test_english_id = convert_to_id(english_vocab, test_english_word)

    with tf.Graph().as_default():
        print("Log: Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)
        model = Model(ENGLISH_WINDOW_SIZE, len(english_vocab))

        with tf.Session() as session:
            session.run([tf.global_variables_initializer(),
                        tf.tables_initializer()])

            NUM_EPOCHS = 1
            num_batches = int(len(train_english_word) / BATCH_SIZE)
            for i in range(NUM_EPOCHS):
                print("----- EPOCH " + str(i) + "-----")
                index = 0
                for start, end in zip(range(0, len(train_english_word), BATCH_SIZE),
                                      range(BATCH_SIZE, len(train_english_word), BATCH_SIZE)):
                    sentences = [' '.join(x) for x in train_english_word[start:end]]
                    encoder_states = session.run(output, feed_dict={
                        message_placeholder: sentences
                    })

                    loss, _ = session.run([model.loss, model.train], feed_dict={
                        model.encoder_state: encoder_states,
                        model.decoder_input: train_english_id[start:end, :-1],
                        model.decoder_labels: train_english_id[start:end, 1:],
                        model.decoder_input_length: train_english_lengths[start:end]
                    })
                    index += 1
                    print("Batch number %d of %d: Loss is %.3f" %
                          (index, num_batches, loss))

            pathlib.Path('utils/models/').mkdir(parents=True, exist_ok=True)
            saver = tf.train.Saver()
            saver.save(session, "utils/models/caption_gen.ckpt")

            test_batch_size = 20
            num_test_batches = int(len(test_english_word) / test_batch_size)
            print(len(test_english_word))
            print(num_test_batches)
            total_loss = counter = index = 0
            total_accuracy = 0
            # print(test_english_word)
            for start, end in zip(range(0, len(test_english_word), test_batch_size),
                                  range(test_batch_size, len(test_english_word),
                                        test_batch_size)):
                sentences = [' '.join(x) for x in test_english_word[start:end]]
                encoder_states = session.run(output, feed_dict={
                    message_placeholder: sentences
                })

                loss, accuracy, mask = session.run(
                    [model.loss, model.accuracy_function(), model.mask], feed_dict={
                        model.encoder_state: encoder_states,
                        model.decoder_input: test_english_id[start:end, :-1],
                        model.decoder_labels: test_english_id[start:end, 1:],
                        model.decoder_input_length: test_english_lengths[start:end]
                    })
                num_symbols = np.sum(mask)
                total_loss += loss * num_symbols
                total_accuracy += accuracy * num_symbols
                counter += num_symbols
                index += 1
                print("Batch number %d of %d: Loss is %.3f" %
                      (index, num_test_batches, loss))

            perplexity = np.exp(total_loss / counter)
            print("Testing perplexity: %.3f" % perplexity)
            print("Testing accuracy: %.3f" % (total_accuracy / counter))


def main_test():
    # Load padded corpus
    train_english_word, train_english_lengths = pad_corpus(TRAIN_EN)
    test_english_word, test_english_lengths = pad_corpus(TEST_EN)

    with open('./utils/data/english_vocab.pickle', 'rb') as handle:
        english_vocab = pickle.load(handle)
    test_english_id = convert_to_id(english_vocab, test_english_word)

    with tf.Graph().as_default():
        print("Log: Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)

        with tf.Session() as session:
            session.run([tf.global_variables_initializer(),
                        tf.tables_initializer()])
            model = load_model(session)

            test_batch_size = 20
            num_test_batches = int(len(test_english_word) / test_batch_size)
            print(len(test_english_word))
            print(num_test_batches)
            total_loss = counter = index = 0
            total_accuracy = 0
            # print(test_english_word)
            for start, end in zip(range(0, len(test_english_word), test_batch_size),
                                  range(test_batch_size, len(test_english_word),
                                        test_batch_size)):
                sentences = [' '.join(x) for x in test_english_word[start:end]]
                encoder_states = session.run(output, feed_dict={
                    message_placeholder: sentences
                })

                loss, accuracy, mask = session.run(
                    [model.loss, model.accuracy_function(), model.mask], feed_dict={
                        model.encoder_state: encoder_states,
                        model.decoder_input: test_english_id[start:end, :-1],
                        model.decoder_labels: test_english_id[start:end, 1:],
                        model.decoder_input_length: test_english_lengths[start:end]
                    })
                num_symbols = np.sum(mask)
                total_loss += loss * num_symbols
                total_accuracy += accuracy * num_symbols
                counter += num_symbols
                index += 1
                print("Batch number %d of %d: Loss is %.3f" %
                      (index, num_test_batches, loss))

            perplexity = np.exp(total_loss / counter)
            print("Testing perplexity: %.3f" % perplexity)
            print("Testing accuracy: %.3f" % (total_accuracy / counter))


def main_predict():
    with tf.Graph().as_default():
        print("Log: Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)

        with tf.Session() as session:
            session.run([tf.global_variables_initializer(),
                        tf.tables_initializer()])
            model = load_model(session)

            text = "-LRB- `` To be successful , a product can be any color *UNKER* , as long as it is *UNK-* red , '' says Charles E. *CUNK* , *CUNK* 's attorney . -RRB- STOP "

            encoder_states = session.run(output, feed_dict={
                message_placeholder: [text]
            })

            predicted_output = predict(encoder_states, model, session, text)
            print(predicted_output)


# if __name__ == '__main__':
    # main()
    # main_test()
    # main_predict()
