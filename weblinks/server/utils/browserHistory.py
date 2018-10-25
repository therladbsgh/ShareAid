from functools import reduce
import ast
import sys
import json

import history_extractor
import article_parser

# Chrome History
histories = history_extractor.extract_chrome()
# print(histories)

# Facebook Shares
# If a list of Facebook links are provided as arguments, then that is used.
# Otherwise, we fetch from TimelineLinks.csv.
if (len(sys.argv) == 2):
    facebookLinks = sys.argv[1].split(',')
else:
    facebookLinksPath = './TimelineLinks.csv'
    with open(facebookLinksPath, 'r') as f:
        sharedLinks = ast.literal_eval(f.read())
    # print(sharedLinks)

# basic blocker of links that usually aren't shared
EXCLUSIONS = ['google.com/search', 'mail.google.com',
              'facebook.com', 'reddit.com', 'localhost']
newHistories = []
for each in histories:
    excluded = reduce(lambda x, y: x or y, [e in each[0] for e in EXCLUSIONS])
    if excluded is False:
        newHistories.append(each)

for each in newHistories:
    result = article_parser.parse(each[0])
    result["url"] = each[0]
    result["suggest?"] = not result["utility"]
    json_result = json.dumps(result)
    print(json_result)
    sys.stdout.flush()
