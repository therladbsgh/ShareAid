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

const adapter = new FileSync('oldphotoDatabase.json')
const photoDatabase = low(adapter)

//philip
PHOTO_LOCATION = "philip/"
INSTAGRAM_PATH = "assets/phinch/phlippapippa.json"
USERNAME = "phlippapippa"
USER_ID = '1238710579';

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
  'selfie': new Set(['people']),
  'people': new Set(['people']),
  'food': new Set(['food', 'breakfast']),
  'fashion': new Set(['fashion']),
  'pets': new Set(['animal', 'pet']),
  'activity': new Set(['nature', 'travel', 'city', 'recreation']),
  'gadget': new Set(['watch', 'vehicle', 'technology', 'instrument']),
  'caption': new Set(['desktop', 'text', 'page', 'paper'])
}

apiRateCount = 0

disallowedTypes = new Set(['.mov', '.mp4', '.heic', ''])
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

    var matches = 0;
    var maxMatches = 2;
    for (var i in concepts) {
      for (var m in clarifaiMapping) {
        if (concepts[i].name === 'people') {
          if (new Set(concepts.map(c => c.name)).has('one')) {
            result['selfie'] += concepts[i].value;
          } else {
            result['people'] += concepts[i].value;
          }
        }
        if (clarifaiMapping[m].has(concepts[i].name)) {
          result[m] += concepts[i].value;
          matches += 1
        }
      }
      if (matches >= maxMatches) break
    }

    photoDatabase.get('photos')
      .push({ id: photoPath, photoType: result })
      .write();

    return result;
  }
}

// Returns the names of the top 2 weights
// However; if either of the categories is people/selfie/pets, return that one as all categories
// experimenting with mutual exclusivity 
// the logic being that photos in this category are primarily of this category and overrule other categories
function getTopCategories(photoWeights, num) {
  var arrayed = [];
  for (var w in photoWeights) {
    arrayed.push([w, photoWeights[w]]);
  }
  arrayed.sort((a, b) => b[1] - a[1]);
  list = [];
  for (var i = 0; i < num; i++) {
    list.push(arrayed[i][0]);
  }
  return list
}

async function clusterInstagram(pathToInstagramData) {
  //Categories based on "What We Instagram"
  console.log('classifying Instagram');
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
    photoType = await classifyPhoto(instagramData[i]['l_url'], 'url')
    if (!photoType) continue;
    topCategories = getTopCategories(photoType, 2);
    for (var r in topCategories) {
      var category = topCategories[r]
      //Note: Attempting to reduce the weights of "secondary" categories
      weights[category] += photoType[category]/((r+1)*(r+1));
    }
  }

  for (var weight in weights) {
    weights[weight] /= instagramData.length;
  }
  console.log('done classifying Instagram');
  return weights;
}

//Experimental. 
async function clusterAndRankPhotos(photoData) {
  console.log('clustering and classifying camera roll');
  //TODO: Cluster a user based on their instagram photos; assign relative weights based on the incidence of each post
  userWeights = await clusterInstagram(INSTAGRAM_PATH)

  console.log(userWeights);

  //photos are already sorted at this point in reverse chronological order
  //photos with no given timestamp were given january 1 1970 - ignore these
  //Also ignore photos that were taken more than X months ago
  //For now, we'll try 8 months (?) this is mostly to try to capture winter break, since I (philip) am writing this in April
  //Note: photos that are not clustered will also not be classified.
  noPhotosBeforeDate = moment().subtract(6, 'months');

  photoClusters = [];
  waitTime = 900000; //15 minutes
  clusterTime = moment(new Date(0));
  currentCluster = []
  for (var i = 0; i < photoData.length; i++) {
    timestamp = photoData[i]['metadata']['CreateDate']
    if (timestamp.isSame(moment(new Date(0)))) continue;
    if (timestamp.isBefore(noPhotosBeforeDate)) continue;

    //Start new cluster
    clusterTime.add(waitTime, 'milliseconds');
    if (timestamp.isAfter(clusterTime)) {
      if (currentCluster.length > 1) photoClusters.push({
        photos: currentCluster,
        weight: 0,
      });
      currentCluster = [photoData[i]]
    } else {
      clusterTime.subtract(waitTime, 'milliseconds');
      currentCluster.push(photoData[i])
    }
    clusterTime = timestamp;
  }

  var photos = []
  for (var c = 0; c < photoClusters.length; c++) {
    cluster = photoClusters[c];
    for (var p = 0; p < cluster.photos.length; p++){
      photo = cluster.photos[p]
      photoType = await classifyPhoto(photo['metadata']['SourceFile'], 'bytes');
      if (!photoType) continue;
      topCategories = getTopCategories(photoType, 2);
      weight = 0;
      for (var r in topCategories) {
        var category = topCategories[r];
        weight += userWeights[category] * photoType[category]
      }
      photo['metadata']['weight'] = weight
      photo['metadata']['categories'] = topCategories
      cluster.weight += weight
    }
    console.log(cluster.photos.length);
    for (var p = 0; p < cluster.photos.length; p++) {
      photo = cluster.photos[p]
      photo.metadata.clusterNumber = c
      photo.metadata.clusterWeight = photo.metadata.weight * cluster.weight
      if (!photo.metadata.weight) continue;
      photos.push(photo);
    }
  }

  console.log(photoClusters.length);
  console.log('done clustering and classifying camera roll');
  //Return clusters sorted by weight.
  //(The fact that they're sorted by weight isn't currently relevant, but might be in the future)
  return photos.sort((a, b) => {
    return b.metadata.clusterWeight - a.metadata.clusterWeight;
  })
}

function makeMomentFromGoogleTimestamp(googleDateString) {
  newString = '';
  newString += googleDateString.split(' ')[0].replace(/:/g, '-')
  newString += ' ' + googleDateString.split(' ')[1];
  return moment(new Date(newString));
}

async function run() {
  fs.readdir(PHOTO_LOCATION, async function(err, files) {
    //First convert any HEIC photos to JPG
    console.log('converting .heic files to .jpg');
    for (var f in files) {
      photoPath = PHOTO_LOCATION + files[f];
      ending = photoPath.substring(photoPath.lastIndexOf('.'), photoPath.length)
      if (ending.toLowerCase() === '.heic') {
        exec('cd tifig/build && ./tifig ../../'+photoPath+' ../../'+photoPath.slice(0, -5)+'.jpg && rm ../../'+photoPath, (err, stdout, stderr) => {
          if (err) {
            console.log(err);
          } else {
            files[f] = files[f].slice(0, -5)+'.jpg';
          }
        });
        await timeout(500);
      }
    }
    console.log('finished converting');

    ep
      .open()
      .then(async function() {
        console.log('reading in photos...');
        allPhotos = []
        console.log(files.length);
        for (var i = 0; i < files.length; i++) {
          file = files[i];
          photoPath = PHOTO_LOCATION + file;
          metadata = await ep.readMetadata(photoPath, ['-File:all']);
          photo = "await new Buffer(fs.readFileSync(photoPath)).toString('base64')";
          // For now, if no metadata, do not consider, but we're not storing photo data (for now?)
          if (!metadata || !photo) continue;
          allPhotos.push({'metadata': metadata['data'][0]});
        }
        return allPhotos;
      })
      .then(async function(allPhotos) {
        console.log('got metadata');
        photoData = allPhotos;
        /*
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
        */

        //photoData = await clusterAndRankPhotos(photoData);
        //console.log('photos sorted; ready');
        //getTopPhotos(photoData);
        //0. For testing, select 10 random photos (eventually replaced by triage TODO)
        //For triage:
        //1. cluster all photos by time from the last X months (set a default - perhaps eventaully let user choose a range)
        //2. filter out noise - non-clusters or other techniques to get rid of certain photos
        // (i'm ripping out clarifai for now but step 2 is probably where some kind of clarifai would come in)
        //3. for each cluster, feed into clarifai to get the "best" photo
        // (this is somewhat crude because triage is meant to be used on photos of the same _scene_: but...anyway)

        randomPhotoIndices = []
        photos_to_caption = []
        for (var i = 0; i < 10; i++) {
          randomPhotoIndices.push(Math.floor(Math.random() * Math.floor(photoData.length)))
          console.log(photoData[randomPhotoIndices[i]]['metadata']['SourceFile']);
          splitId = photoData[randomPhotoIndices[i]]['metadata']['SourceFile'].split("/");
          photos_to_caption.push({
            "tags": [],
            "caption": "placeholder caption",
            "l_url": "////"+splitId[splitId.length-1], //hacked url to get right filepaths in attend2u; sorry
            "user": {"username":"phlippapippa","u_id":1238710579,"s_url": ""},
          });
        }
        //1. create a JSON file resembling phlippapippa.json that will be passed to attend2u (captions are blank; "urls" are in a hacked-up form)
        photos_to_caption_string = JSON.stringify(photos_to_caption);
        fs.writeFile('phlippapippa_to_caption.json', photos_to_caption_string, 'utf8', () => {
          console.log('wrote to file');
          cmd = "./run_attend2u_local.sh phlippapippa 1238710579 /Users/pjhinch/Documents/FourthYear/research/ShareAid/photos/philip/ ";
          for (var i in photos_to_caption) {
            splitId = photoData[randomPhotoIndices[i]]['metadata']['SourceFile'].split("/");
            cmd += splitId[splitId.length-1] + " "
          }
          console.log(cmd);
          var child = exec(cmd);
          child.stdout.on('data', function(a) {
            console.log(a);
          })
          child.stderr.on('data', function(a) {
            console.log(a);
          })
          child.on('close', function(code) {
            console.log('closed', code);
            // pass values forward to update the UI
          });
        });
      })
      .then(() => ep.close())
      .catch(console.error)
  });
}

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
run();

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

async function getTopPhotos(photoData) {
  console.log('getting top photos');
  chosenClusters = new Set();
  var topPhotos = [];
  var i = 0;
  while (topPhotos.length < 10) {
    //cluster = photoData[i];
    //photo = cluster.photos.sort((a, b) => b.metadata.weight - a.metadata.weight)[0];
    if (i >= photoData.length) {
      break;
    }
    photo = photoData[i];
    if (chosenClusters.has(photo.metadata.clusterNumber)) {
      i ++;
      continue;
    }
    chosenClusters.add(photo.metadata.clusterNumber);
    i ++;
    console.log(i, photo.metadata.SourceFile, photo.metadata.weight, photo.metadata.clusterWeight, photo.metadata.categories)
    topPhotos.push({'id': photo.metadata.SourceFile.split('/')[3].split('.')[0], 'username': USERNAME, 'time': null, 'type': 'GraphImage', 'likes': 40, 'comments': 6, 'text': 'placeholder text', 'media': USER_ID+'_@_'+photo.metadata.SourceFile.split('/')[3].split('.')[0]+'_'+USER_ID})
  }
  //fs.writeFile(USERNAME+'TopPhotos.json', JSON.stringify(topPhotos), 'utf8', () => {console.log('wrote to', USERNAME+'TopPhotos.json')});
}

//Choose a photo when the page is loaded
var timesRun = 0
app.get('/loadPhoto', (req, res) => {
  console.log('loading photo and caption');
  //Assemble the "top ten" photos (i.e. from the top ten clusters, the best of each one)
  //depending on the number of time being run, display one
  //clusters were already sorted by weight above

  timesRun = (timesRun + 1) % 10;

  //im2txt
  //TODO: rip this out and replace with attend2u
  var child = exec('cd im2txt && sh gen_cap.sh '+ '/Users/pjhinch/Documents/FourthYear/research/ShareAid/photoUI/'+photo['metadata']['SourceFile']);
  var caption = [];
  child.stdout.on('data', function(data) {
    if (data.split(' ')[0] === 'Captions') {
      caption = data.split('\n')[1].split('0) ')[1].split('(')[0].split(' .')[0]
      photoData[timesRun]['metadata']['Caption'] = caption;
      console.log(caption);
    }
  });
  child.stderr.on('data', function(data) {
    //console.log('stdout: ' + data);
  });
  child.on('close', function(code) {
      console.log('closing code: ' + code);
      res.send(photoData[timesRun]['metadata'])
  });
});
