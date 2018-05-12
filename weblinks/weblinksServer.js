const fs = require('fs');
const http = require('http');
const express = require('express')
const app = express()
const path = require('path');
const util = require('util');
const Mustache = require('mustache');
const moment = require('moment');
const bodyParser = require('body-parser')

const exec = require('child_process').exec;

app.use(express.static('style'));
app.use(express.static('assets'));
app.use(express.static('utils'));

app.use(bodyParser.json())

app.get('/', (req, res) => {
  var template = fs.readFileSync('weblinksUI.html', {encoding:'utf-8'});
  var output = Mustache.render(template, {});
  res.send(output);
})

app.listen(3000, () => console.log('App started at localhost://3000'))

app.post('/analyzeHistory', (req, res) => {
  var view = {}
  var child = exec('cd utils && python browserHistory.py');
  child.on('data', data => {
    console.log(data);
    view = {
      username: 'Philip Hinch',
      source: 'generic news website',
      link: 'https://www.nytimes.com/2018/02/27/travel/montgomery-alabama-history-race.html',
      linkMainText: 'In Montgomery, A City Embedded With Pain, Finding Progress',
      linkSubText: 'TODO: Most shared articles have a provided one-sentence summary of some sort.',
    };
  })
  child.on('close', () => {
    var template = fs.readFileSync('weblinksUI.html', {encoding:'utf-8'});
    var output = Mustache.render(template, view);
    res.send(output);
  })
})
