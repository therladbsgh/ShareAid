import sys
import json
import nltk
from nltk.corpus import wordnet as wn
from nltk.tag.stanford import StanfordPOSTagger
import random
from textblob import TextBlob, Word, wordnet
from tinydb import TinyDB, Query
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import urllib, cStringIO
# import run_places_custom as places
import run_clarifai 

db = TinyDB('../data/instagram_database.json')
Post = Query()

# Run annotaters on data
# Note: each annotater should make use of the database in order to prevent overusing its own API. 
def runAnnotation(data):
  print 'Labelling with Clarifai'
  run_clarifai.instagramClarifai(data)
  print 'Finished Clarifai labelling'

# places.instagramPlaces(data)

# POS are fed in by the POS Tagger in the form [(word, POS), ...]
# Parts of speech are labelled using the Penn tree bank: https://cs.nyu.edu/grishman/jet/guide/PennPOS.html
# We only care about a few - adjectives, nouns, adverbs, verbs
# We want to map from the Penn parts of speech to those recognized by WordNet
# Preserving the parts of speech is important for producing valid sentences later (I think?), so the return format is:
# [([synsets of word], original word, original Penn POS), ...]
posmap = {
  # 'JJ': wordnet.ADJ,
  # 'JJR': wordnet.ADJ,
  # 'JJS': wordnet.ADJ,
  'NN': wordnet.NOUN,
  'NNS': wordnet.NOUN,
  'NNP': wordnet.NOUN,
  'NNPS': wordnet.NOUN,
  # 'RB': wordnet.ADV,
  # 'RBR': wordnet.ADV,
  # 'RBS': wordnet.ADV,
  # 'WRB': wordnet.ADV,
  # 'VB': wordnet.VERB,
  # 'VBG': wordnet.VERB,
  # 'VBD': wordnet.VERB,
  # 'VBN': wordnet.VERB,
  # 'VBP': wordnet.VERB,
  # 'VBZ': wordnet.VERB,
}
def filterPos(posList):
  synsets = []
  for word in posList:
    if word[1] not in posmap:
      synsets.append((None, word[0], word[1]))
      continue

    synsets.append((Word(word[0]).get_synsets(pos=posmap[word[1]]), word[0], word[1]))
  return synsets

# TODO
# If we wish to extend the net further to contain more similar words, we can consider hypernyms and hyponyms
# e.g. hypernym of dog: canine, domestic animal; hyponym of dog: corgi, pug
# Given a synset, returns an array of synsets
def getSimilarWords(synset):
  pass

# adapted from http://nlpforhackers.io/convert-words-between-forms/
def convert(word, from_pos, to_pos):
  """ Transform words given from/to POS tags """
  conversion = {
    'n': wordnet.NOUN,
    'a': wordnet.ADJ,
    's': wordnet.ADJ,
    'r': wordnet.ADV,
    'v': wordnet.VERB
  }
  synsets = Word(word).get_synsets(pos=from_pos)
  # Word not found
  if not synsets:
    return [(word, 1)]

  # Get all lemmas of the word (consider 'a'and 's' equivalent)
  lemmas = [l for s in synsets
              for l in s.lemmas()
              if conversion[s.name().split('.')[1]] == from_pos]

  # Get related forms
  derivationally_related_forms = [(l, l.derivationally_related_forms()) for l in lemmas]

  # filter only the desired pos (consider 'a' and 's' equivalent)
  related_noun_lemmas = [l for drf in derivationally_related_forms
                          for l in drf[1] 
                            if conversion[l.synset().name().split('.')[1]] == to_pos]

  # Extract the words from the lemmas
  words = [l.name() for l in related_noun_lemmas]
  len_words = len(words)

  # Build the result in the form of a list containing tuples (word, probability)
  result = [(w, float(words.count(w))/len_words) for w in set(words)]
  result.sort(key=lambda w: -w[1])

  # return all the possibilities sorted by probability
  if len(result) == 0:
    return [(word, 1)]
  return result

def getCaptionTemplates(data):
  captionTemplates = []

  # From experimenting, it seems that the longer a caption is, the less reusable it is in the template method
  # Thus, any caption beyond than a certain length will be automatically disqualified 
  CAPTION_LENGTH_LIMIT = 10

  # Since different annotaters have different ways/styles of labelling, we may want to individually process annotaters' results
  annotaters = ['clarifai']
  for post in data:
    if 'id' not in post or 'text' not in post or 'media' not in post:
      continue

    if len(post['text'].split()) > CAPTION_LENGTH_LIMIT:
      continue

    pos = filterPos(nltk.pos_tag(post['text'].split()))

    # For getting metadata, refer to https://motherboard.vice.com/en_us/article/aekn58/hack-this-extra-image-metadata-using-python
    # Note, when running off of scraped instagram data, there is no useful metadata (at least from point testing I did)
    # However, it could be useful when this script is applied to photos directly from someone's phone, e.g.

    labelSynsets = {}
    allMatches = set()
    for annotater in annotaters:
      labels = db.search((Post.id == post['id']) & (Post.annotater == annotater))[0]['labels']

      # This code is currently Clarifai-specific; TODO make more generic to support multiple annotaters
      # Clarifai labels are nouns in the form: {name, id, app_id, value}. name and value are the important features, mostly name for now
      for label in labels:
        labelSynsets[label['name']] = [synset.lemma_names() for synset in Word(label['name']).get_synsets(pos=wordnet.NOUN)]
        labelSynsets[label['name']] = [item for sublist in labelSynsets[label['name']] for item in sublist]
        for word in labelSynsets[label['name']]:
          allMatches.add(word)

    # For each important word (adj, adv, v, n) in the sentence, we want to see if we have a match with any labels from the annotaters
    # Experimentally, it is fairly hard to generate a match, so we want to make the qualifications for matching as loose as possible
    
    # TODO: Eventually, words with matches should have different categories. For example, perhaps a word is descriptive, but doesn't 
    #  explicitly connect to the picture; e.g. a word like "amazing". We might want to note in the template that "amazing" should be 
    #  replaced by a random synonym, to add variety to captions.
    #  Other categories: words that are not related to the image but to the metadata, indicating we should use some metadata in the template
    # TODO: emoji support?
    template = []
    isValidTemplate = False
    for word in pos:
      # If the word is "non-important" (articles, prepositions, etc.) we just add it to the template without processing
      addedWord = False
      if not word[0]:
        template.append(word[1])
        continue

      # if proper noun
      if word[2] in ['NNPS', 'NNP']:
        template.append('[PROPER NOUN PLACEHOLDER]')
        continue

      for synset in word[0]:
        lemmas = synset.lemma_names()
        for lemma in lemmas:
          # If we do find a match, add ('PLACEHOLDER', lemma, original word, POS)
          lemma = convert(lemma, posmap[word[2]], wordnet.NOUN)[0][0]
          if lemma in allMatches:
            template.append(('PLACEHOLDER', lemma, word[1], word[2]))
            addedWord = True
            isValidTemplate = True
            break
        # TODO: clean
        if addedWord:
          break
      if not addedWord:
        if word[2] in ['NN', 'NNS']:
          template.append('NOUN_PLACEHOLDER')
        else:
          template.append(word[1])

    if isValidTemplate:
      captionTemplates.append(template)
      
  print 'Found', len(captionTemplates), 'caption templates out of', len(data), 'images'
  return captionTemplates

def getSimilarLabel(word, labels):
  minDistance = (1, '')
  word_synsets = wn.synsets(word)
  for label in labels:
    for synset in wn.synsets(label['name']):
      for wordsyn in word_synsets:
        similarity = wordsyn.path_similarity(synset)
        if similarity < minDistance[0]:
          minDistance = (similarity, label)

  return minDistance[1]['name']

def demoCaptions(data, templates, repeat = 10):
  # Generate captions
  # Although the captions are generated on images on which we learned, they should be noticeably different
  # However, overfitting may be a current concern

  # For demoing, pull out a few random images and generate captions for them
  # The (very basic) process: take a random caption template, substitute the blanks with random scene attributes

  for i in range(0, repeat):
    post = data[random.randint(0, len(data) - 1)]
    
    if 'id' not in post or 'text' not in post or 'media' not in post:
      continue

    labels = db.search((Post.id == post['id']) & (Post.annotater == 'clarifai'))[0]['labels']
    
    # TODO: Smarter 
    template = templates[random.randint(0, len(templates) - 1)]

    # Find placeholders and assign random attribute words
    # TODO: Not random words
    caption = []
    for w in template:
      if w[0] == 'PLACEHOLDER':
        label = getSimilarLabel(w[2], labels)
        if posmap[w[3]] != wordnet.NOUN:
          caption.append(convert(label, wordnet.NOUN, posmap[w[3]])[0][0])
        else:
          caption.append(label)
      else:
        caption.append(w)

    print 'Post:', post['media']
    print 'Template:', template
    print 'Generated caption:', ' '.join(caption)
    print 'Actual caption:', post['text']
    print

with open(sys.argv[1], 'rb') as f:
  data = json.loads(f.read())

# runAnnotation(data)
templates = getCaptionTemplates(data)
# print templates
demoCaptions(data, templates)
