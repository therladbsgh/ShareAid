import React, { Component } from 'react';
import RecommendedPost from './RecommendedPost.js';
import NextPostButton from './NextPostButton.js';
import './style/App.css';

function timeout(ms, func=null) {
  return new Promise(function(func){setTimeout(func, ms)});
}

function formatTime(dateString) {
  //haha javascript Dates suck
  var dateObject = new Date(dateString);
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return months[dateObject.getMonth()] + " " + dateObject.getDate() + ", " + dateObject.getFullYear()
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: "",
      postInfo: null,
      currPost: null,
    };
    this.accept = this.accept.bind(this);
    this.reject = this.reject.bind(this);
  }

  componentDidMount() {
    // Check every 5 seconds if we can get the postInfo yet
    // There's definitely a better way to do this with routing (maybe react-router?)

    this.callApi()
      .then(postInfo => {
        console.log(postInfo);
        if (postInfo === null) {
          return;
        } else {
          this.setState({ postInfo: postInfo, username: postInfo.username, currPost: postInfo.photos[0] })
        }
      }).catch(err => console.log(err));
    
/*     var testInfo = {
      username: "phlippapippa",
      numPhotos: 100,
      numClusters: 2,
      startTime: "July 22, 2017",
      endTime: "July 21, 2018",
      photos: [
        {
          photoPath: "/philip/IMG_1453.JPG",
          caption: "This is my first test caption",
          numPhotos: 25,
          startTime: "July 22, 2017, 8:00am",
          endTime: "July 22, 2017, 8:15am",
        },
        {
          photoPath: "/philip/IMG_1463.JPG",
          caption: "luv tis pl8ce!",
          numPhotos: 18,
          startTime: "July 22, 2017, 8:30am",
          endTime: "July 22, 2017, 8:45am",
        },
      ]
    };
    this.setState({ 
      postInfo: testInfo,
      username: testInfo.username,
      currPost: testInfo.photos[0],
    }); */
  }

  callApi = async () => {
    var response = await fetch('/getPhotos');
    var body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    while (body === null) {
      await timeout(5000);
      console.log('trying again');
      response = await fetch('/getPhotos');
      body = await response.json();
    }

    return body;
  };

  updateCurrPost() {
    for (var photo in this.state.postInfo.photos) {
      if (this.state.postInfo.photos[photo].photoPath === this.state.currPost.photoPath) {
        this.setState({ 
          currPost: this.state.postInfo.photos[(parseInt(photo) + 1) % this.state.postInfo.photos.length],
        });
        break;
      }
    }
  }

  reject() {
    this.updateCurrPost();
  }

  accept() {
    // ADD CODE TO POST TO INSTAGRAM OR SOMETHING SIMILAR HERE
    this.updateCurrPost();
  }

  render() {
    return (
      <div>
        <div className="headerWrapper">
          <h1 className="title">{"Welcome to ShareAid/Photos" + (this.state.username ? ", " + this.state.username : "")}</h1>
          <div className="generalInfo">{
            this.state.postInfo ? 
              "I analyzed " + this.state.postInfo.numPhotos + " photos from " + formatTime(this.state.postInfo.startTime) + " to " + 
              formatTime(this.state.postInfo.endTime) + " and identified " + this.state.postInfo.numClusters +
              " unique, interesting photos. Use the buttons below to view each one." :
              "I'm scanning your photos for good matches. This may take a few minutes..."
          }</div>
          <hr />
        </div>
        {this.state.currPost ? <RecommendedPost postData={this.state.currPost} username={this.state.username}/> : null}
        {this.state.currPost ? 
          <div className="buttonsWrapper">
            <NextPostButton type="reject" onClick={this.reject} />
            <NextPostButton type="accept" onClick={this.accept} />
          </div> :
          null
        }
      </div>
    );
  }
}

export default App;
