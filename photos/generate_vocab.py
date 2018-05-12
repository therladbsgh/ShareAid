import json
import re
from sets import Set

data = json.load(open('phlippapippa.json'))

allWords = Set([])

for i in range(0, len(data)):
  caption = data[i]['caption'].encode('utf-8').split(' ')
  for word in caption:
    allWords.add(re.sub(r'\W+', '', word))

allWords = list(allWords)

with open('phlippapippaRealVocab.vocab', 'w') as outfile:
  for word in allWords:
    outfile.write(word+'\n')
