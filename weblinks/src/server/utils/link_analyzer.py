from functools import reduce
import json
import tensorflow as tf
import os

import utils.history_extractor as history_extractor
import utils.article_parser as article_parser
import utils.sentence_encoder as sentence_encoder
import utils.caption_generator as caption_generator
import utils.reinforce as reinforce


def get_facebook_posts():
    with open('src/files/facebookPosts.txt') as f:
        data = json.load(f)
        messages = []
        for post in data:
            if post is None:
                continue
            if 'message' in post:
                messages.append(post['message'])
            else:
                messages.append(post['name'])
        return messages


def link_analyzer(url, title, visit_duration, visit_time,
                  facebook_posts, reinforce_model,
                  use_model, use_model_session,
                  use_model_placeholder,
                  caption_model, caption_model_session):
    result = article_parser.parse(url)
    result["visit_duration"] = visit_duration
    result["visit_time"] = visit_time
    result["suggest?"] = not result["utility"]

    if len(result['text']) > 0:
        text_embed = use_model_session.run(use_model, feed_dict={
            use_model_placeholder: [result['text']]
        })

        result['caption'] = \
            caption_generator.predict(text_embed, caption_model,
                                      caption_model_session, result['text'])

        contentSimilarity = []
        for post in facebook_posts:
            contentSimilarity.append(
                sentence_encoder.lstm_compare(post, text_embed))
            result["content_similarity"] = \
                sum(contentSimilarity) / len(contentSimilarity)
            result["content_similarity"] = result["content_similarity"][0]
            result["reinforce_prob"] = reinforce_model.generate_action(text_embed)[0][0]
    else:
        result['caption'] = ""
        result["content_similarity"] = 0
        result["reinforce_prob"] = 0

    return result
