import React, { Component } from 'react';
import thumbnail from './assets/phinch_thumbnail.jpg';
import icons from './assets/icons.png';
import './style/RecommendedPost.css';

function getRotation(orientation) {
  if (!orientation || orientation == "Horizontal (normal)") {
    return 0
  }

  var orientation = orientation.split(' ');
  var degree = orientation[1];

  if (orientation[2] == 'CW') {
    return 90;
  } else if (orientation[2] == 'CCW') {
    return 270;
  } else if (!orientation[2]) {
    return degree;
  }
}


class RecommendedPost extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="RecommendedPost">
        <div className="instagramHeader">
          <img src={thumbnail} alt="profile pic" className="profilePicture" />
          <p className="username text">{this.props.username}</p>
        </div>
        <div className="photoWrapper">
          <img src={this.props.postData.photoPath} width="500px" alt="chosen photo" className="photo" style={{transform: "rotate("+getRotation(this.props.postData.orientation)+"deg)"}}/>
        </div>
        <div className="instagramFooter">
          <img src={icons}/>
          <p className="caption text">{this.props.postData.caption}</p>
        </div>
      </div>
    );
  }
}

export default RecommendedPost;
