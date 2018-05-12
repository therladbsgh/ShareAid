const phantom = require('phantom');
const fs = require('fs');

const USERNAME = 'phlippapippa';
const USER_ID = 1238710579;
const INSTAGRAM_PAGE = 'https://www.instagram.com/'+USERNAME+'/';
const SCROLL_TIMES = 15
const CAPTION_LIMIT = 50

//https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
function timeout(ms, func=null) {
  return new Promise(function(func){setTimeout(func, ms)});
}

var scrollDown = function() {
  window.scrollTo(0,document.body.scrollHeight);
}

var getPosts = function() {
  var images = document.querySelectorAll('._2di5p');
  //in each img, the alt attr is the caption
  //srcset attr has the links: .getAttribute('srcset').split(',')[XXX].split(' ')[0]
  //changing xxx above changes the size of the image. in testing, there are 5 sizes stores, with [4] being the largest
  var imageData = []
  for (var i = 0; i < images.length; i++) {
    var image = images[i];
    var caption = image.getAttribute('alt');
    var link = image.getAttribute('src');
    imageData.push([caption, link]);
  }
  return imageData;
}

async function getInstagramPosts(url, page) {
  const status = await page.open(url);

  var postData = [];
  var captions = new Set(); //To exclude duplicates

  await timeout(15000);

  for (var i = 0; i < SCROLL_TIMES; i++) {
    await page.evaluate(scrollDown);
    await timeout(5000);
    posts = await page.evaluate(getPosts);
    for (var p in posts) {
      if (captions.has(posts[p][0])) continue;
      if (posts[p][0].split(' ').length > CAPTION_LIMIT) continue;
      captions.add(posts[p][0]);
      postData.push(posts[p]);
    }
  }

  console.log('done scrolling');
  console.log('got', postData.length, 'items', postData);
  return postData;
}

function formatPostData(postData) {
  var postJSON = [];

  for (var p in postData) {
    var post = postData[p];

    var tags = [];
    var split = post[0].split(' ');
    for (var w in split) {
      if (split[w].indexOf('#') === 0) {
        tags.push(split[w].slice(1));
      }
    }

    postJSON.push({
      tags,
      'caption': post[0],
      'l_url': post[1],
      'user': {
        'username': USERNAME,
        'u_id': USER_ID,
        's_url': post[1],
      }
    })
  }

  return postJSON;
}

async function scrape(url, userBracket) {
  const instance = await phantom.create();
  const page = await instance.createPage();

  instagramPosts = await getInstagramPosts(INSTAGRAM_PAGE, page);

  formattedJSON = JSON.stringify(formatPostData(instagramPosts));

  fs.writeFile(USERNAME+'.json', formattedJSON, 'utf8', () => {console.log('wrote to', USERNAME+'.json')});

  console.log('instance exiting');
  await instance.exit();
}

scrape();
