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
const exec = require('child_process').exec;

//philip
PHOTO_LOCATION = "philip/"
INSTAGRAM_PATH = "assets/phinch/phlippapippa.json"
USERNAME = "phlippapippa"
USER_ID = '1238710579';

//To allow the client to access photos, app.use the photos folder here:
app.use('/philip', express.static('philip'))

const USE_TRIAGE = false;

var selectedPhoto;
var photoData;
var finished = false;

const readFile = util.promisify(fs.readFile);

//https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
function timeout(ms, func=null) {
  return new Promise(function(func){setTimeout(func, ms)});
}

const EXCLUDETYPES = new Set(['.mov', '.mp4', '.heic', '']);
function isValidPhotoType(photoPath) {
  ending = photoPath.substring(photoPath.lastIndexOf('.'), photoPath.length)
  if (EXCLUDETYPES.has(ending.toLowerCase())) return false;
  return true;
}

//TODO: A note about this function:
// We used to use Clarifai to classify the user's Instagram photos based on scene attributes.
// This information was used to learn on a user's Instagram and recommend photos that were similar to those Instagram photos.
// (See old versions of the code for this on Github)
// However, I found Clarifai to be an unsatisfactory way of doing this.
// Clarifai is very good at identifying scene attributes, but not good at telling the user which ones are important
// e.g. if a photo has people in the background, but the photo itself is clearly more of a travel photo, Clarifai will 
// label the photo as having both "people" and "leisure," so it's unclear what type of photo it is
// I still think we should use computer vision to better learn on the user's Instagram, but I took out Clarifai
// because I felt it was completely unsatisfactory.
async function clusterPhotos(photoData) {
  console.log('clustering and classifying camera roll');

  //photos are already sorted at this point in reverse chronological order
  //photos with no given timestamp were given january 1 1970 - ignore these
  //Also ignore photos that were taken more than 3 months before the last photo taken
  //Note: photos that are not clustered will also not be classified.
  noPhotosBeforeDate = moment(photoData[photoData.length - 1]['metadata']['CreateDate']).subtract(3, 'months');

  //photo "clusters" are formed when the user takes continuous photos without a gap of more than 15 minutes. 
  //i.e. a cluster can span an infinite amount of time if the user takes a photo every 14 minutes.
  //more realistically, clusters are hopefully formed around specific events 
  //TODO: there's undoubtedly a smarter way to do this
  photoClusters = [];
  waitTime = 900000; //15 minutes
  clusterTime = moment(new Date(0));
  currentCluster = []
  for (var i = 0; i < photoData.length; i++) {
    timestamp = photoData[i]['metadata']['CreateDate']
    if (timestamp.isSame(moment(new Date(0)))) continue; // some photos have no timestamp when they're from an old camera(?) or saved from the Internet; eliminate those
    if (timestamp.isBefore(noPhotosBeforeDate)) continue;

    //Start new cluster
    clusterTime.add(waitTime, 'milliseconds');
    if (timestamp.isAfter(clusterTime)) {
      if (currentCluster.length > 1) {
        photoClusters.push(currentCluster);
      }
      currentCluster = [photoData[i]]
    } else {
      clusterTime.subtract(waitTime, 'milliseconds');
      currentCluster.push(photoData[i])
    }
    clusterTime = timestamp;
  }

  console.log(photoClusters.length);
  console.log('done clustering and classifying camera roll');
  //Return clusters sorted by weight.
  //(The fact that they're sorted by weight isn't currently relevant, but might be in the future)
  return photoClusters;
}

function makeMomentFromGoogleTimestamp(googleDateString) {
  newString = '';
  newString += googleDateString.split(' ')[0].replace(/:/g, '-')
  newString += ' ' + googleDateString.split(' ')[1];
  return moment(new Date(newString));
}

function getTimePeriod(cluster) {
  // Given a cluster of photos, return a string showing the date and time of the first and last photos
  // (Assumes photos are sorted by time)
  // Example return: "June 8, 2018"
}

async function run() {
  fs.readdir(PHOTO_LOCATION, async function(err, files) {
    //First convert any HEIC photos to JPG
    //(HEIC photos are iOS's "live photos" feature, which is difficult to work with and non-standard)
    //Sometimes this fails, which is logged in the console; I'm not sure why, but it's a relatively small percentage
    //(The program continues running even if one conversion fails)
    //The system later skips over any remaining HEIC files, so failure is pretty silent
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
        // Read in metadata of all photos
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
        // Set timestamps for all photos
        for (var i = 0; i < photoData.length; i++) {
          photoData[i]['metadata']['CreateDate'] = 
            photoData[i]['metadata']['CreateDate'] ? 
              makeMomentFromGoogleTimestamp(photoData[i]['metadata']['CreateDate']) :
              moment(new Date(0));
        }
        // Sort by date
        photoData.sort((a, b) => {
          return a['metadata']['CreateDate'] - b['metadata']['CreateDate'];
        })

        photoClusters = await clusterPhotos(photoData);

        if (USE_TRIAGE) {
          for (var cluster in photoClusters) {
            photos_to_caption = []
            //Note: I wasn't able to get Caffe working, so this is untested code - but i'm pretty sure this is how it works
            //Essentially, we want to get all the filenames of photos in the cluster and send them to the pick_photo.py
            //e.g. pick_photo.py IMG1.jpg IMG2.jpg IMG3.jpg ...
            //the script will return (via stdout) the name of the best file
            //we add this to our list of photos to caption 
            //i'm sorry i wasn't able to fully debug/test this - please ping me (philip) if you think i can help explain anything
            cmd = "./triage/pick_photo.py ";
            for (var photo in photoClusters[cluster]) {
              cmd += photoClusters[cluster][photo]['metadata']['SourceFile']
            }
            var child = await exec(cmd); //not sure if this works lol
            child.stdout.on('data', function(chosenPhotoId) {
              photos_to_caption.push({
                "tags": [],
                "caption": "placeholder caption",
                "l_url": "////"+chosenPhotoId, //hacked url to get right filepaths in attend2u; sorry
                "user": {"username":"phlippapippa","u_id":1238710579,"s_url": ""},
              });
            });
          }
        } else {
          //just pick a random photo from each cluster
          photos_to_caption = []
          idString = "";
          for (var cluster in photoClusters) {
            splitId = photoClusters[cluster][Math.floor(Math.random() * Math.floor(photoClusters[cluster].length))]['metadata']['SourceFile'].split("/");
            idString += splitId[splitId.length-1] + " "
            photos_to_caption.push({
              "tags": [],
              "caption": "placeholder caption",
              "l_url": "////"+splitId[splitId.length-1], //hacked url to get right filepaths in attend2u; sorry
              "user": {"username":"phlippapippa","u_id":1238710579,"s_url": ""},
            });
          }
        }

        //1. create a JSON file resembling phlippapippa.json that will be passed to attend2u (captions are blank; "urls" are in a hacked-up form)
        photos_to_caption_string = JSON.stringify(photos_to_caption);
        fs.writeFile(USERNAME+'_to_caption.json', photos_to_caption_string, 'utf8', () => {
          console.log('wrote to file');
          cmd = "./run_attend2u_local.sh " + USERNAME + " " + USER_ID + " /Users/pjhinch/Documents/FourthYear/research/ShareAid/photos/philip/ " + idString;
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
            finished = true;
          });
        });
      })
      .then(() => ep.close())
      .catch(console.error)
  });
}

const port = process.env.PORT || 5000;
app.listen(5000, () => console.log('App started at localhost://5000'))
run();

app.get('/getPhotos', (req, res) => {
  console.log('checking');
  // if not finished yet, make client wait
  // TODO: sorry, i know there's a much better way to do this (possibly using react-router?) but i'm not gonna do it rn
  if (!finished) {
    res.send('null');
  } else {
    console.log('sending results to front');
    //using photoClusters and [username]_caption_results.json, pass foward:
    //a photo filepath
    //a suggested caption
    //data about the cluster (date, time, possibly number of photos, etc.)
    //for each photo in [username]_caption_results.json, i.e. most likely one per cluster
    fs.readFile(USERNAME+"_caption_results.json", 'utf8', function (err, data) {
      if (err) throw err;
      captions = JSON.parse(data);
      filenames = new Set();
      for (var c in captions) {
        filename = c.split("_@_")[1].split(".npy")[0]
        captions[filename] = captions[c]
        filenames.add(filename);
      }

      var postInfo = {
        "username": USERNAME,
        "numPhotos": photoData.length,
        "numClusters": photoClusters.length,
        "startTime": photoClusters[0][0]['metadata']['CreateDate'],
        "endTime": photoData[photoData.length-1]['metadata']['CreateDate'],
        "photos": [],
      }

      for (var c in photoClusters) {
        cluster = photoClusters[c];
        for (var p in cluster) {
          //see if file name matches anything in the filenames Set
          splitname = cluster[p]['metadata']['SourceFile'].split("/");
          filename = splitname[splitname.length-1];
          if (filenames.has(filename)) {
            photoPath = cluster[p]['metadata']['SourceFile'];
            caption = captions[filename];
            postInfo.photos.push({
              photoPath,
              "orientation": cluster[p]['metadata']['Orientation'], //for uprighting the photo
              caption,
            });
            break;
          }
        }
      }

      res.send(postInfo)
    });
  }
});
