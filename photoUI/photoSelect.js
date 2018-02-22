const fs = require('fs');
const http = require('http');
const exiftool = require('node-exiftool')
const ep = new exiftool.ExiftoolProcess()
const express = require('express')
const app = express()
const path = require('path');
const util = require('util');
const Mustache = require('mustache');

PHOTO_LOCATION = "assets/phinch/allphotos/"
USERNAME = "phlippapippa"

var selectedPhoto;
var photoData;

const readFile = util.promisify(fs.readFile);

function generateCaption(photoData) {
  return '[ Placeholder caption for ' + photoData['metadata']['SourceFile'] + ' ]'
}

function makeDateFromGoogleTimestamp(googleDateString) {
  newString = '';
  newString += googleDateString.split(' ')[0].replace(/:/g, '-')
  newString += ' ' + googleDateString.split(' ')[1];
  return new Date(newString);
}

fs.readdir(PHOTO_LOCATION, (err, files) => {
  ep
    .open()
    // display pid
    .then(async function() {
      console.log('reading in photos...');
      allPhotos = []
      for (var i = 0; i < allPhotos.length; i++) {
        file = files[i];
        photoPath = PHOTO_LOCATION + file;
        allPhotos[file] = []
        metadata = await ep.readMetadata(photoPath, ['-File:all']);
        photo = await readFile(photoPath);
        // For now, if no metadata, do not consider, but we're not storing photo data (for now?)
        if (!metadata || !photo) continue;
        allPhotos.push({'metadata': metadata['data'][0]});
      }
      return allPhotos;
    })
    .then(allPhotos => {
      photoData = allPhotos;
      for (var i = 0; i < photoData.length; i++) {
        photoData[i]['metadata']['CreateDate'] = 
          photoData[i]['metadata']['CreateDate'] ? 
            makeDateFromGoogleTimestamp(photoData[i]['metadata']['CreateDate']) :
            new Date(0);
        photoData[i]['metadata']['Caption'] = generateCaption(photoData[i]);
      }
      // Sort by date
      photoData.sort((a, b) => {
        return b['metadata']['CreateDate'] - a['metadata']['CreateDate'];
      })
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

//Choose a random photo
app.get('/loadPhoto', (req, res) => {
  selectedPhoto = photoData[Math.floor(Math.random() * photoData.length)]
  res.send(selectedPhoto['metadata'])/* 
  res.writeHead(200, {'Content-Type': 'image/'+selectedPhoto['metadata']['SourceFile'].split('.')[1]});
  console.log(selectedPhoto['metadata']['SourceFile'].split('.')[1]);
  res.end(selectedPhoto['photo']);  */
});
