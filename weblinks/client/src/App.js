import React, { Component } from 'react';
import axios from 'axios';
import openSocket from 'socket.io-client';
import './style/index.css';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      response: '',
      status: 'not started',
      socket: openSocket('http://localhost:1337'),
      suggestions: [],
      urlSet: new Set(),
      counter: 0,
      facebookData: '',
    }

    this.state.socket.on('suggest', data => {
      if (!this.state.urlSet.has(data.url)) {
        this.state.urlSet.add(data.url);
        const suggestions = this.state.suggestions;
        suggestions.push(data);
        this.setState({
          suggestions,
        });
      }
    });

    this.incrementCounter = this.incrementCounter.bind(this);
  }

  incrementCounter() {
    const counter = (this.state.counter + 1) % this.state.suggestions.length;
    this.setState({ counter });
  }

  startGraphCall() {
    this.setState({status: 'fetching'});
    window.graphCall(this, (component, data) => {
      component.setState({status: 'awaiting download', facebookData: data});
    });
  }

  renderInitial() {
    return (
      <div className="buttonWrapper">
        <div className="facebookGraph" onClick={() => this.startGraphCall()}>
          <p className="facebookGraphText">Call the Graph API</p>
        </div>
      </div>
    );
  }

  renderFetching() {
    return (
      <div className="loadingWrapper">
        <p className="loadingText graph">Retrieving the links you've shared on Facebook...</p>
      </div>
    );
  }

  downloadFacebookData(data) {
    return "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  }

  analyzeHistory() {
    this.setState({status: 'analyzing'});
    this.state.socket.emit('analyze', this.state.facebookData);
  }

  renderAwaitDownload() {
    return (
      <div className="buttonWrapper">
        <a className="facebookDownload" href={this.downloadFacebookData(this.state.facebookData)} download="TimelineLinks.csv">
          <div className="facebookGraph">
            <p className="facebookGraphText">Download Facebook Shares</p>
          </div>
        </a>
        <div className="facebookDownload">
          <div className="facebookGraph" onClick={() => this.analyzeHistory()}>
            <p className="facebookGraphText">Analyze history</p>
          </div>
        </div>
      </div>
    );
  }

  renderAnalyzing() {
    return (
      <div className="loadingWrapper">
        <p className="loadingText history">Finding a link to share from your history...</p>
      </div>
    );
  }

  renderFinished() {
    const suggest = this.state.suggestions[this.state.counter];
    return (
      <div className="afterGraph">
        <div className="facebookPost">
          <div className="facebookHeader">
            <img src="philip_thumbnail.jpg" alt="profile pic" className="profilePicture" />
            <div className="headerTextWrapper">
              <p className="headerMainText"><a className="usernameText">{"Test"}</a> shared a <a href={suggest.url}>link</a>.</p>
              <p className="headerSubText">Just now · {"Source here"}</p>
            </div>
          </div>
          <a href={suggest.url} className="linkWrapper">
            <div className="bodyWrapper">
              <div className="photo">
                <img src={suggest.image} alt="link" className="linkImage"/>
              </div>
              <div className="linkTextWrapper">
                <p className="linkMainText">{suggest.title}</p>
                <p className="linkSubText">{suggest.subtext}</p>
                <p className="linkBaseURL">{"Source here"}</p>
              </div>
            </div>
          </a>
          <img className="icons" src="icons.png" alt="icons" />
        </div>
        <br/>
        <div className="buttonWrapper">
          <div className="facebookShare">
            <p className="facebookShareText">Share to Facebook</p>
          </div>
          <div className="getNewLink" onClick={this.incrementCounter}>
            <p className="getNewLinkText">Try a New Link</p>
          </div>
        </div>
      </div>
    );
  }



  render() {
    if (this.state.suggestions.length > 0) {
      return this.renderFinished();
    } else {
      return (
        <div>
          {this.state.status === 'not started' &&
            this.renderInitial()
          }
          {this.state.status === 'fetching' &&
            this.renderFetching()
          }
          {this.state.status === 'awaiting download' &&
            this.renderAwaitDownload()
          }
          {this.state.status === 'analyzing' &&
            this.renderAnalyzing()
          }
        </div>
      );
    }
  }
}

export default App;
