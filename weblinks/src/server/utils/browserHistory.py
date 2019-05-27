from functools import reduce
import json
import tensorflow as tf
import os
from flask_socketio import emit

import utils.history_extractor as history_extractor
import utils.article_parser as article_parser
import utils.sentence_encoder as sentence_encoder
import utils.caption_generator as caption_generator
import utils.reinforce as reinforce


def browser_history(facebookLinks, socketio):
    # Chrome History
    histories = history_extractor.extract_chrome()

    # basic blocker of links that usually aren't shared
    EXCLUSIONS = ['google.com/search', 'mail.google.com',
                  'facebook.com', 'reddit.com', 'localhost', 'twitch.tv',
                  'accounts.google.com', 'accounts.youtube.com', 'pdf']
    newHistories = []
    for each in histories:
        excluded = reduce(lambda x, y: x or y, [e in each[0] for e in EXCLUSIONS])
        if excluded is False:
            newHistories.append(each)

    # Calculate embeddings
    messages = []
    for post in facebookLinks:
        if post == None:
            continue
        if 'message' in post:
            messages.append(post['message'])
        else:
            messages.append(post['name'])

    # Perform reinforce learning first
    if (os.path.isfile("data/reinforce_positive.txt") or
       os.path.isfile("data/reinforce_negative.txt")):
        model = reinforce.train()
        if (os.path.isfile("data/reinforce_positive.txt")):
            os.remove("data/reinforce_positive.txt")
        if os.path.isfile("data/reinforce_negative.txt"):
            os.remove("data/reinforce_negative.txt")
    model = reinforce.load_or_create_model()

    with tf.Graph().as_default():
        print("Log: Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        output = embed(message_placeholder)

        with tf.Session() as session:
            # Actual generation
            session.run([tf.global_variables_initializer(),
                        tf.tables_initializer()])
            caption_model = caption_generator.load_model(session)
            messages = session.run(output, feed_dict={
                message_placeholder: messages
            })

            # Send url data
            visited = set()
            for each in newHistories:
                if each[0] in visited:
                    continue
                visited.add(each[0])
                # print("Log: " + each[0])
                result = article_parser.parse(each[0])
                # print("Log: " + str(result), flush=True)
                result["url"] = each[0]
                result["suggest?"] = not result["utility"]

                if len(result['text']) > 0:
                    text_embed = session.run(output, feed_dict={
                        message_placeholder: [result['text']]
                    })
                    text_embed = text_embed[0]

                    caption_predict = caption_generator.predict([text_embed], caption_model, session, result['text'])
                    result["caption"] = caption_predict

                    contentSimilarity = []
                    blacklistSimilarity = []
                    for msg in messages:
                        contentSimilarity.append(
                            sentence_encoder.lstm_compare(msg, text_embed))
                    result["contentSimilarity"] = \
                        sum(contentSimilarity) / len(contentSimilarity)
                    result["reinforceProb"] = model.generate_action([text_embed])[0].tolist()
                else:
                    result["contentSimilarity"] = 0
                    result["reinforceProb"] = [0, 0]

                json_result = json.dumps(result)
                print(json_result, flush=True)
                socketio.emit('suggest', json_result)

            # print("Log: END", flush=True)
