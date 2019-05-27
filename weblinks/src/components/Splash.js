import React, { Component } from 'react';
import '../assets/index.css';
import '../assets/App.css';

const { ipcRenderer } = window.require("electron");

class App extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const self = this;
    this.props.ipcRenderer.send("fb-check-auth");

    this.props.ipcRenderer.on('fb-check-auth-result', (event, data) => {
      this.props.updateAuthStatus(data.result);
    });
  }

  render() {
    return (
      <div className="buttonWrapper">
        ShareAid
        Loading...
      </div>
    );
  }
}

export default App;
