import json

data = json.load(open('assets/brownu/brownu.json'))

newJson = []

for d in data:
  newJson.append({'id': d['l_url'].split('/')[4].encode('utf-8'), 'username': 'brownu', 'time': None, 'type': 'GraphImage', 'likes': 40, 'comments': 6, 'text': d['caption'].encode('utf-8'), 'media': d['l_url']})

with open('brownuInstagramTrain.json', 'w') as outfile:
  json.dump(newJson, outfile)
