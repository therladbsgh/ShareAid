from clarifai import rest
from clarifai.rest import ClarifaiApp
import os
from tinydb import TinyDB, Query

CLARIFAI_API_KEY = os.environ['CLARIFAI_API_KEY']

app = ClarifaiApp(api_key=CLARIFAI_API_KEY)
model = app.models.get("general-v1.3")

# In order to reduce the amount of API calls made (especially when testing), we'll store results in a simple database
# Basic schema idea: Id | annotater (in this case, always 'clarifai') | Clarifai labels
# Other image annotaters will use the same database, but contain different annotater strings.
# In the captioning stage, we can pull in data from all annotaters used using a logical or in our search

db = TinyDB('../data/instagram_database.json')
Post = Query()

def instagramClarifai(data):
  repeats = 0
  for post in data:
    if 'id' not in post:
      print 'Error: data must have post ids included. Skipping post'
      continue

    if 'media' not in post:
      continue

    id = post['id']
    annotater = 'clarifai'

    # If the post has already been classified by this annotater, skip in order to prevent needlessly making API calls
    if db.search((Post.id == id) & (Post.annotater == annotater)):
      repeats += 1
      continue

    result = model.predict_by_url(url=post['media'])

    if result['status']['code'] != 10000:
      print 'Error:', result['status']['description']
      continue

    concepts = result['outputs'][0]['data']['concepts']

    db.insert({'id': id, 'annotater': annotater, 'labels': concepts})

  print 'Found', repeats, 'repeats'
