from functools import reduce
import json

import history_extractor
import article_parser
import sentence_encoder

# Chrome History
histories = history_extractor.extract_chrome()

# Facebook Shares
facebookLinksPath = './data/facebookPosts.txt'
with open(facebookLinksPath, 'r') as f:
    facebookLinks = json.loads(f.read())

# basic blocker of links that usually aren't shared
EXCLUSIONS = ['google.com/search', 'mail.google.com',
              'facebook.com', 'reddit.com', 'localhost',
              'accounts.google.com', 'accounts.youtube.com', 'pdf']
newHistories = []
for each in histories:
    excluded = reduce(lambda x, y: x or y, [e in each[0] for e in EXCLUSIONS])
    if excluded is False:
        newHistories.append(each)

# Calculate embeddings
messages = []
for post in facebookLinks:
    if 'message' in post:
        messages.append(post['message'])
    else:
        messages.append(post['name'])

blacklist_text = []
with open('data/blacklist.txt') as f:
    for line in f:
        line = line.split()
        data = article_parser.parse(line[0])
        blacklist_text.append(data["text"])

total_text = []
total_text.extend(messages)
total_text.extend(blacklist_text)
vectorizer = sentence_encoder.tf_idf_generate(total_text)
for i in range(len(messages)):
    messages[i] = sentence_encoder.tf_idf_transform(vectorizer, messages[i])
for i in range(len(blacklist_text)):
    blacklist_text[i] = sentence_encoder.tf_idf_transform(vectorizer,
                                                          blacklist_text[i])

# Send url data
visited = set()
for each in newHistories:
    if each[0] in visited:
        continue
    visited.add(each[0])
    result = article_parser.parse(each[0])
    # print("Log: " + str(result), flush=True)
    result["url"] = each[0]
    result["suggest?"] = not result["utility"]

    embed = sentence_encoder.tf_idf_transform(vectorizer, result['text'])
    contentSimilarity = []
    blacklistSimilarity = []
    for msg in messages:
        contentSimilarity.append(sentence_encoder.tf_idf_compare(msg, embed))
    for msg in blacklist_text:
        blacklistSimilarity.append(sentence_encoder.tf_idf_compare(msg, embed))
    result["contentSimilarity"] = \
        sum(contentSimilarity) / len(contentSimilarity)
    result["blacklistSimilarity"] = \
        sum(blacklistSimilarity) / len(blacklistSimilarity)

    json_result = json.dumps(result)
    print(json_result, flush=True)

# print("Log: END", flush=True)
