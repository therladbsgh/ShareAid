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
const exec = require('child_process').exec;

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
  console.log(photo['metadata']);
  var child = exec('cd im2txt && sh gen_cap.sh');
  var caption = [];
  child.stdout.on('data', function(data) {
    if (data.split(' ')[0] === 'Captions') {
      caption = data.split('\n')[1].split('0) ')[1].split('(')[0].split(' .')[0]
      photo['metadata']['caption'] = caption;
      console.log(caption);
    }
  });
  child.stderr.on('data', function(data) {
    console.log('stdout: ' + data);
  });
  child.on('close', function(code) {
      console.log('closing code: ' + code);
      //continue with stuff
  });
}

//by-hand mapping
const clarifaiMapping = {
  'selfie': new Set(['woman', 'man', 'person']),
  'people': new Set(['people', 'group', 'couple']),
  'food': new Set(['food', 'breakfast']),
  'fashion': new Set(['fashion']),
  'pets': new Set(['animal', 'pet']),
  'activity': new Set(['outdoors', 'travel', 'recreation', 'leisure', 'city']),
  'gadget': new Set(['watch', 'vehicle', 'technology', 'instrument']),
  'caption': new Set(['desktop', 'text', 'page', 'paper', 'portrait'])
}

apiRateCount = 0

disallowedTypes = new Set(['.mov', '.mp4', '.heic'])
function isValidPhotoType(photoPath) {
  ending = photoPath.substring(photoPath.lastIndexOf('.'), photoPath.length)
  if (disallowedTypes.has(ending.toLowerCase())) return false;
  return true;
}

async function classifyPhoto(photoPath, type) {
  if (photoDatabase.get('photos').find({id:photoPath}).value()) {
    return photoDatabase.get('photos').find({id:photoPath}).value().photoType
  } else {

    if (!isValidPhotoType(photoPath)) return null;

    apiRateCount += 1
    if (apiRateCount % 10 == 0) {
      console.log('resting api');
      await timeout(1000);
    }
    console.log(photoPath);
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
    if (!photoType) continue;
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
      if (!photoType) continue;
      weight = 0;
      for (var r in photoType) {
        weight += userWeights[r] * photoType[r]
      }
      photo['metadata']['weight'] = weight
      cluster.weight += 1
    }
  }

  console.log(photoClusters.length);
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

//First convert any HEIC photos to JPG


fs.readdir(PHOTO_LOCATION, (err, files) => {
  //First convert any HEIC photos to JPG
  var convertTimeout = 0;
  for (var f in files) {
    photoPath = PHOTO_LOCATION + files[f];
    ending = photoPath.substring(photoPath.lastIndexOf('.'), photoPath.length)
    if (ending.toLowerCase() === '.heic') {
      convertTimeout += 500
      exec('cd tifig/build && ./tifig ../../'+photoPath+' ../../'+photoPath.slice(0, -5)+'.jpg && rm ../../'+photoPath, (err, stdout, stderr) => {
        if (err) console.log(err);
      });
      files[f] = files[f].slice(0, -5)+'.jpg';
    }
  }
  console.log(convertTimeout);
  setTimeout(() => {
    ep
      .open()
      .then(async function() {
        console.log('reading in photos...');
        allPhotos = []
        for (var i = 0; i < files.length; i++) {
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
          //generateCaption(photoData[i]);
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
    }, convertTimeout)
});

app.use(express.static('assets'))
app.use(express.static('style'));
app.use(express.static('client'));
app.use(express.static('im2txt'));

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
var timesRun = 0
app.get('/loadPhoto', (req, res) => {
  //At least for purposes of pilot study:
  //Assemble the "top ten" photos (i.e. from the top ten clusters, the best of each one)
  //depending on the number of time being run, display one
  //clusters were already sorted by weight above
  timesRun = timesRun % 10;
  cluster = photoData[timesRun];
  photo = cluster.photos.sort((a, b) => b.metadata.weight - a.metadata.weight)[0];
  timesRun += 1
  /* 
  console.log(photoData.length +' clusters');
  cluster = weightedRandom(photoData, cluster => cluster['weight']);
  console.log(cluster.photos.length + ' photos in selected cluster');
  photo = weightedRandom(cluster['photos'], photo => photo['metadata']['weight']) */
  var child = exec('cd im2txt && sh gen_cap.sh '+ '/Users/pjhinch/Documents/FourthYear/research/ShareAid/photoUI/'+photo['metadata']['SourceFile']);
  var caption = [];
  child.stdout.on('data', function(data) {
    if (data.split(' ')[0] === 'Captions') {
      caption = data.split('\n')[1].split('0) ')[1].split('(')[0].split(' .')[0]
      photo['metadata']['Caption'] = caption;
      console.log(caption);
    }
  });
  child.stderr.on('data', function(data) {
    //console.log('stdout: ' + data);
  });
  child.on('close', function(code) {
      console.log('closing code: ' + code);
      console.log(photo['metadata']);
      res.send(photo['metadata'])
  });
});
