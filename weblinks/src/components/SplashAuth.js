import React, { Component } from 'react';
import '../assets/index.css';
import '../assets/App.css';

const { ipcRenderer } = window.require("electron");

class App extends Component {
  constructor(props) {
    super(props);

    this.startGraphCall = this.startGraphCall.bind(this);
  }

  startGraphCall() {
    const self = this;
    this.props.ipcRenderer.send("fb-authenticate");

    this.props.ipcRenderer.on('fb_authenticate', (event, data) => {
      console.log('FB authenticated!');
      this.props.updateAuthStatus(true);
    });
  }

  render() {
    return (
      <div className="buttonWrapper">
        <div className="facebookGraph" onClick={() => this.startGraphCall()}>
          <p className="facebookGraphText">Login to Facebook</p>
        </div>
      </div>
    );
  }
}

export default App;
