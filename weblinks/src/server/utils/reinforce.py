import tensorflow as tf
import numpy as np
import os
import pathlib

import utils.article_parser as article_parser
import utils.sentence_encoder as sentence_encoder


class PolicyGradient:
    def __init__(self):
        self.num_actions = 2
        self.state_size = 512

        self.state_input = tf.placeholder(tf.float32, [None, self.state_size])
        self.actions_input = tf.placeholder(tf.int32, [None])
        self.rewards_input = tf.placeholder(tf.float32, [None])

        self.actor_probs = self.actor()
        self.loss = self.loss_function()
        self.train_op = self.optimizer()
        self.session = tf.Session()

    def initialize_global_variables(self):
        self.session.run(tf.global_variables_initializer())

    def optimizer(self):
        return tf.train.AdamOptimizer(learning_rate=0.01).minimize(self.loss)

    def actor(self):
        hidden_size = 128

        W1 = tf.Variable(tf.random_normal([self.state_size, hidden_size],
                                          stddev=0.01), name="W1")
        b1 = tf.Variable(tf.random_normal([hidden_size], stddev=0.01), name="B1")

        logits = tf.nn.relu(tf.matmul(self.state_input, W1) + b1)

        W2 = tf.Variable(tf.random_normal([hidden_size, self.num_actions],
                                          stddev=0.01), name="W2")
        b2 = tf.Variable(tf.random_normal([self.num_actions], stddev=0.01), name="B2")

        return tf.nn.softmax(tf.matmul(logits, W2) + b2)

    def loss_function(self):
        output = self.actor_probs
        indicies = tf.range(0, tf.shape(output)[0]) * tf.shape(output)[1] + self.actions_input
        actProbs = tf.gather(tf.reshape(output, [-1]), indicies)

        actor_loss = -tf.reduce_mean(tf.log(actProbs) * self.rewards_input)
        return actor_loss

    def generate_action(self, states):
        action_probs = self.session.run(self.actor_probs, feed_dict={
            self.state_input: states
        })
        return action_probs

    def train(self, states, rewards):
        action_probs = self.generate_action(states)
        actions = []
        for each in action_probs:
            actions.append(np.random.choice(self.num_actions,
                                            p=each))

        rewards = np.logical_not(np.logical_xor(actions, rewards)).astype(float)
        loss, _ = self.session.run([self.loss, self.train_op], feed_dict={
            self.state_input: states,
            self.actions_input: actions,
            self.rewards_input: rewards
        })

    def save(self):
        pathlib.Path('utils/models/').mkdir(parents=True, exist_ok=True)
        saver = tf.train.Saver()
        saver.save(self.session, "utils/models/policy.ckpt")


def load_or_create_model():
    model = PolicyGradient()
    try:
        saver = tf.train.Saver()
        saver.restore(model.session, "src/server/utils/models/policy.ckpt")
        return model
    except Exception as e:
        model.initialize_global_variables()
        return model


def train():
    with tf.Graph().as_default():
        # print("Log: Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)

        with tf.Session() as session:
            session.run([tf.global_variables_initializer(),
                         tf.tables_initializer()])
            positives = []
            negatives = []
            if os.path.isfile("utils/data/reinforce_positive.txt"):
                with open('utils/data/reinforce_positive.txt') as f:
                    for line in f:
                        line = line.split()
                        data = article_parser.parse(line[0])
                        positives.append(data["text"])
                # os.remove("data/reinforce_positive.txt")
            if os.path.isfile("utils/data/reinforce_negative.txt"):
                with open('utils/data/reinforce_negative.txt') as f:
                    for line in f:
                        line = line.split()
                        data = article_parser.parse(line[0])
                        negatives.append(data["text"])
                # os.remove("data/reinforce_negative.txt")

            # print(positives)
            # print(negatives)
            if (len(positives) > 0):
                positives = session.run(output, feed_dict={
                    message_placeholder: positives
                })
            if (len(negatives) > 0):
                negatives = session.run(output, feed_dict={
                    message_placeholder: negatives
                })

    model = load_or_create_model()
    rewards = [0] * len(positives) + [1] * len(negatives)
    states = np.concatenate((positives, negatives))
    for i in range(10):
        model.train(states, rewards)
    model.save()
    return model


def predict(sentences):
    with tf.Graph().as_default():
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)

        with tf.Session() as session:
            session.run([tf.global_variables_initializer(),
                         tf.tables_initializer()])

            if len(sentences) > 0:
                sentences = session.run(output, feed_dict={
                    message_placeholder: sentences
                })
    model = load_or_create_model()
    acts = model.generate_action(sentences)
    return acts


# if __name__ == "__main__":
    # train()
    # print(predict(["HackPrinceton Fall 2018"]))



