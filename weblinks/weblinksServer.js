const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const exec = require('child_process').exec;

app.use(express.static('style'));
app.use(express.static('assets'));
app.use(express.static('utils'));

app.listen(5000, () => console.log('App started at localhost://5000'))

app.get('/analyzeHistory', (req, res) => {
  var view = {}
  var child = exec('cd utils && mv ~/Downloads/TimelineLinks.csv . && python browserHistory.py');
  child.on('data', data => {
    console.log(data);
    // Note: We don't actually currently do any analysis on the browser history to find a suitable article
    // This is a fairly significant challenge because a lot of links in one's browsing history are not really shareable,
    // either because they're like a personalized Newsfeed page that wouldn't look right if another person visited without
    // logging in, or etc. So I just feed a fake one forward here. But in theory browserHistory would return some kind of 
    // article or multiple articles to share. See the photos demo for one simple possible example of how to organize results
    view = {
      username: 'Philip Hinch',
      source: 'NYTimes',
      link: 'https://www.nytimes.com/2018/02/27/travel/montgomery-alabama-history-race.html',
      linkMainText: 'In Montgomery, A City Embedded With Pain, Finding Progress',
      linkSubText: 'The Alabama city has a complicated history, heavy with racial tensions. But it\'s also a powerful place, and a friendly one for travelers.',
    };
  })
  child.on('close', () => {
    view = {
      username: 'Philip Hinch',
      source: 'NYTimes',
      link: 'https://www.nytimes.com/2018/02/27/travel/montgomery-alabama-history-race.html',
      linkMainText: 'In Montgomery, A City Embedded With Pain, Finding Progress',
      linkSubText: 'The Alabama city has a complicated history, heavy with racial tensions. But it\'s also a powerful place, and a friendly one for travelers.',
    };
    res.send(view);
  })
});
