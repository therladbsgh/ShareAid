import React, { Component } from 'react';
import buttonImage from './assets/instagramLogo.png';
import './style/NextPostButton.css'

class NextPostButton extends Component {
  render() {
    return (
      <div className="nextPostButton" onClick={this.props.onClick}>
        <img 
          className={"buttonImage " + (this.props.type === "reject" ? "reject" : "accept")}
          src={this.props.type === "reject" ? buttonImage : buttonImage} 
          alt={this.props.type === "reject" ? "Reject Post" : "Accept Post"} 
        />
        <p>{this.props.type === "reject" ? "Don't Post" : "Post"}</p>
      </div>
    );
  }
}

export default NextPostButton;
