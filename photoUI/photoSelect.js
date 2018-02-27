const fs = require('fs');
const http = require('http');
const exiftool = require('node-exiftool')
const ep = new exiftool.ExiftoolProcess()
const express = require('express')
const app = express()
const path = require('path');
const util = require('util');
const Mustache = require('mustache');
const moment = require('moment');
const clarifai = require('clarifai');
const clarifaiApp = new Clarifai.App({
  apiKey: process.env.CLARIFAI_API_KEY
});
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('photoDatabase.json')
const photoDatabase = low(adapter)

PHOTO_LOCATION = "assets/phinch/allphotos/"
INSTAGRAM_PATH = "assets/phinch/phlippapippa"
USERNAME = "phlippapippa"

var selectedPhoto;
var photoData;

const readFile = util.promisify(fs.readFile);

//https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
function timeout(ms, func=null) {
  return new Promise(function(func){setTimeout(func, ms)});
}

function generateCaption(photo) {
  return '[ Placeholder caption for ' + photo['metadata']['SourceFile'] + ' ]'
}

//by-hand mapping
const clarifaiMapping = {
  'selfie': new Set(['woman', 'man', 'person']),
  'people': new Set(['people', 'group', 'couple']),
  'food': new Set(['food']),
  'fashion': new Set(['fashion']),
  'pets': new Set(['animal', 'pet']),
  'activity': new Set(['outdoors', 'travel', 'recreation', 'leisure', 'city']),
  'gadget': new Set(['watch', 'vehicle', 'technology', 'instrument']),
  'caption': new Set(['desktop', 'text', 'page', 'paper', 'portrait'])
}

apiRateCount = 0
async function classifyPhoto(photoPath, type) {
  apiRateCount += 1
  if (apiRateCount % 10 == 0) {
    console.log('resting api');
    await timeout(1000);
  }

  if (photoDatabase.get('photos').find({id:photoPath}).value()) {
    return photoDatabase.get('photos').find({id:photoPath}).value().photoType
  } else {
    if (type == 'bytes') {
      bytes = fs.readFileSync(photoPath)
      bytes = new Buffer(bytes).toString('base64');
      prediction = await clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, {base64: bytes})
      concepts = prediction.outputs[0].data.concepts;
    } else if (type == 'url') {
      prediction = await clarifaiApp.models.predict(Clarifai.GENERAL_MODEL, photoPath)
      concepts = prediction.outputs[0].data.concepts;
    }
    // Calculate the relative weights of each mapping
    // Each category gets a score based on the highest probability of one of its labels
    result = {
      'selfie': 0,
      'people': 0,
      'food': 0,
      'fashion': 0,
      'pets': 0,
      'activity': 0,
      'gadget': 0,
      'caption': 0
    }

    for (var i in concepts) {
      for (var m in clarifaiMapping) {
        if (clarifaiMapping[m].has(concepts[i].name)) {
          result[m] = Math.max(result[m], concepts[i].value);
        }
      }
    }

    photoDatabase.get('photos')
      .push({ id: photoPath, photoType: result })
      .write();

    return result;
  }
}

async function clusterInstagram(pathToInstagramData) {
  //Categories based on "What We Instagram"
  weights = {
    'selfie': 0,
    'food': 0,
    'people': 0,
    'gadget': 0,
    'caption': 0,
    'pets': 0,
    'activity': 0,
    'fashion': 0,
  }

  instagramData = JSON.parse(fs.readFileSync(pathToInstagramData, 'utf8'))
  for (var i = 0; i < instagramData.length; i++) {
    photoType = await classifyPhoto(instagramData[i]['media'], 'url')
    for (var r in photoType) {
      weights[r] += photoType[r];
    }
  }

  for (var weight in weights) {
    weights[weight] /= instagramData.length;
  }
  
  return weights;
}

//Experimental. 
async function clusterAndRankPhotos(photoData) {
  //TODO: Cluster a user based on their instagram photos; assign relative weights based on the incidence of each post
  userWeights = await clusterInstagram(INSTAGRAM_PATH)

  console.log(userWeights);

  //photos are already sorted at this point in reverse chronological order
  //photos with no given timestamp were given january 1 1970 - ignore these
  photoClusters = [];
  waitTime = 1800000;
  clusterTime = moment(new Date(0));
  currentCluster = []
  for (var i = 0; i < photoData.length; i++) {
    timestamp = photoData[i]['metadata']['CreateDate']
    if (timestamp.isSame(moment(new Date(0)))) continue;

    //Start new cluster
    if (timestamp.isAfter(clusterTime.add(waitTime, 'milliseconds'))) {
      clusterTime = timestamp
      if (currentCluster.length > 1) photoClusters.push({
        photos: currentCluster,
        weight: 0,
      });
      currentCluster = [photoData[i]]
    } else {
      currentCluster.push(photoData[i])
    }
  }

  for (var c = 0; c < photoClusters.length; c++) {
    cluster = photoClusters[c];
    for (var p = 0; p < cluster.photos.length; p++){
      photo = cluster.photos[p]
      photoType = await classifyPhoto(photo['metadata']['SourceFile'], 'bytes');
      weight = 0;
      for (var r in photoType) {
        weight += userWeights[r] * photoType[r]
      }
      photo['metadata']['weight'] = weight
      cluster.weight += 1
    }
  }

  //Return clusters sorted by weight.
  //(The fact that they're sorted by weight isn't currently relevant, but might be in the future)
  return photoClusters.sort((a, b) => {
    return b.weight - a.weight;
  })
}

function makeMomentFromGoogleTimestamp(googleDateString) {
  newString = '';
  newString += googleDateString.split(' ')[0].replace(/:/g, '-')
  newString += ' ' + googleDateString.split(' ')[1];
  return moment(new Date(newString));
}

fs.readdir(PHOTO_LOCATION, (err, files) => {
  ep
    .open()
    .then(async function() {
      console.log('reading in photos...');
      allPhotos = []
      for (var i = 3000; i < files.length; i++) {
        file = files[i];
        photoPath = PHOTO_LOCATION + file;
        metadata = await ep.readMetadata(photoPath, ['-File:all']);
        photo = await new Buffer(fs.readFileSync(photoPath)).toString('base64');
        // For now, if no metadata, do not consider, but we're not storing photo data (for now?)
        if (!metadata || !photo) continue;
        allPhotos.push({'metadata': metadata['data'][0]});
      }
      return allPhotos;
    })
    .then(async function(allPhotos) {
      photoData = allPhotos;
      for (var i = 0; i < photoData.length; i++) {
        photoData[i]['metadata']['CreateDate'] = 
          photoData[i]['metadata']['CreateDate'] ? 
            makeMomentFromGoogleTimestamp(photoData[i]['metadata']['CreateDate']) :
            moment(new Date(0));
        photoData[i]['metadata']['Caption'] = generateCaption(photoData[i]);
      }
      // Sort by date
      photoData.sort((a, b) => {
        return a['metadata']['CreateDate'] - b['metadata']['CreateDate'];
      })

      photoData = await clusterAndRankPhotos(photoData);
      console.log('photos sorted; ready');
    })
    .then(() => ep.close())
    .catch(console.error)
});

app.use(express.static('assets'))
app.use(express.static('style'));
app.use(express.static('client'));

app.get('/', (req, res) => {
  var template = fs.readFileSync('photoUI.html', {encoding:'utf-8'});
  var view = {
    username: USERNAME,
    caption: "",
  };
  var output = Mustache.render(template, view);
  res.send(output);
})

app.listen(3000, () => console.log('App started at localhost://3000'))

function weightedRandom(values, getWeight) {
  totalWeight = 0
  for (var i = 0; i < values.length; i ++) {
    totalWeight += getWeight(values[i])
  }
  randWeight = Math.floor(Math.random() * totalWeight)

  for (var i = 0; i < values.length; i++) {
    randWeight -= getWeight(values[i])
    if (randWeight <= 0) {
      return values[i]
    }
  }

  return values[i]
}

//Choose a (semi-) random photo
app.get('/loadPhoto', (req, res) => {
  console.log(photoData);
  cluster = weightedRandom(photoData, cluster => cluster['weight']);
  console.log(cluster, cluster.photos);
  photo = weightedRandom(cluster['photos'], photo => photo['metadata']['weight'])
  res.send(photo['metadata'])
});
