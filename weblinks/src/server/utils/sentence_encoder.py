"""
Uses the Universal Sentence Encoder from here:
https://tfhub.dev/google/universal-sentence-encoder-large/3

Read more about language models in general here:
https://medium.com/huggingface/universal-word-sentence-embeddings-ce48ddc8fc3a
"""

import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.spatial.distance import cosine
from utils.article_parser import parse


def load_lstm_analyzer():
    return hub.Module("https://tfhub.dev/google/universal-sentence-encoder-large/3")


def lstm_embedding(embed, sentence):
    with tf.Session() as session:
        session.run([tf.global_variables_initializer(),
                    tf.tables_initializer()])
        embeddings = session.run(embed([sentence]))
        return embeddings[0]


def lstm_compare(s1, s2):
    return np.inner(s1, s2)


def tf_idf_generate(documents):
    sklearn_tfidf = TfidfVectorizer()
    corpus = []
    with open('data/train.txt') as f:
        for line in f:
            corpus.append(line)
    corpus.extend(documents)
    sklearn_tfidf.fit(corpus)
    return sklearn_tfidf


def tf_idf_transform(vectorizers, doc):
    return vectorizers.transform([doc])


def tf_idf_compare(doc1, doc2):
    if np.sum(doc1) == 0 or np.sum(doc2) == 0:
        return 0
    else:
        return 1 - cosine(doc1.toarray(), doc2.toarray())


# load_lstm_analyzer()
