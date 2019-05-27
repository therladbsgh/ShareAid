import logging
import sys
import time
import json
from datetime import datetime
from multiprocessing import Process

import tensorflow as tf

from flask import Flask, jsonify

import utils.sentence_encoder as sentence_encoder
import utils.caption_generator as caption_generator
import utils.reinforce as reinforce
from utils.link_analyzer import (
    get_facebook_posts,
    link_analyzer
)
from utils.history_extractor import (
    extract_chrome_initial,
    get_browser_history_list,
    insert_analysis_result,
    get_analysis_result_list
)

# import eventlet
# eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
logging.basicConfig(stream=sys.stdout, level=logging.INFO)


@app.route('/run-analyzer-daemon', methods=['POST'])
def run_initial_setup():
    logging.info("Running analyzer daemon...")
    with open('src/env.json', 'r') as f:
        data = json.load(f)
        if data['initial_setup']:
            extract_chrome_initial()
    p = Process(target=weblinks_analyzer_daemon)
    p.start()
    return jsonify(result="success")


def weblinks_analyzer_daemon():
    history_list = get_browser_history_list()
    facebook_posts = get_facebook_posts()

    reinforce_model = reinforce.load_or_create_model()
    with tf.Graph().as_default():
        caption_session = tf.Session()
        caption_model = caption_generator.load_model(caption_session)

        logging.info("Loading LSTM analyzer...")
        embed = sentence_encoder.load_lstm_analyzer()
        message_placeholder = tf.placeholder(dtype=tf.string, shape=[None])
        use_model = embed(message_placeholder)
        use_session = tf.Session()
        use_session.run([tf.global_variables_initializer(),
                         tf.tables_initializer()])

        facebook_posts = use_session.run(use_model, feed_dict={
            message_placeholder: facebook_posts
        })

        then = datetime.now()
        while True:
            if len(history_list) > 0:
                link = history_list.pop()
                print(link)
                result = link_analyzer(
                    link[0], link[1], link[2], link[3],
                    facebook_posts, reinforce_model,
                    use_model, use_session,
                    message_placeholder,
                    caption_model, caption_session)
                print(result)
                insert_analysis_result(result)
                # time.sleep(5)
                now = datetime.now()
            else:
                logging.info("No new pages to analyze! Sleeping...")
                time.sleep(30)


@app.route('/fetch-data', methods=['GET'])
def fetch_data():
    logging.info("Fetching data...")
    data = get_analysis_result_list()
    return jsonify(data=data)


if __name__ == '__main__':
    app.run(port=1337)

