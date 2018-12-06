import React, { Component } from 'react';
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
      console.log(data);
      if (!this.state.urlSet.has(data.url)) {
        this.state.urlSet.add(data.url);
        const suggestions = this.state.suggestions;
        suggestions.push(data);
        suggestions.sort((a, b) => {return (b.contentSimilarity * b.reinforceProb[0]) -
                                           (a.contentSimilarity * a.reinforceProb[0])});
        this.setState({
          suggestions,
        });
      }
    });

    this.blacklistLink = this.blacklistLink.bind(this);
    this.whitelistLink = this.whitelistLink.bind(this);
  }

  whitelistLink(post, url) {
    return () => {
      this.state.socket.emit('whitelist', url);
      post.feedback = true;
      this.setState({});
    }
  }

  blacklistLink(post, url) {
    return () => {
      this.state.socket.emit('blacklist', url);
      post.feedback = true;
      this.setState({});
    }
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
          <p className="facebookGraphText">Login to Facebook</p>
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
    return(
      <div className="main-body">
        { this.state.suggestions.map((each) => {
            return (
              <div className="afterGraph" key={each.url}>
                <div className="facebookPost">
                  <div className="facebookHeader">
                    <img src="philip_thumbnail.jpg" alt="profile pic" className="profilePicture" />
                    <div className="headerTextWrapper">
                      <p className="headerMainText"><a className="usernameText">{"Test"}</a> shared a <a href={each.url}>link</a>.</p>
                      <p className="headerSubText">Just now · Global</p>
                    </div>
                  </div>
                  <div className="facebookCaption">
                    {each.text}
                  </div>
                  <a href={each.url} className="linkWrapper">
                    <div className="bodyWrapper">
                      <div className="photo">
                        <img src={each.image} alt="link" className="linkImage"/>
                      </div>
                      <div className="linkTextWrapper">
                        <p className="linkMainText">{each.title}</p>
                        <p className="linkSubText">{each.subtext}</p>
                        <p className="linkBaseURL">{each.url}</p>
                      </div>
                    </div>
                  </a>
                  <img className="icons" src="icons.png" alt="icons" />
                </div>
                <br/>
                <div className="optionsWrapper">
                  <div className={`facebookShare ${each.feedback && "disabled"}`} onClick={this.whitelistLink(each, each.url)}>
                    <p className="facebookShareText">Share to Facebook</p>
                  </div>
                  <div className={`getNewLink ${each.feedback && "disabled"}`} onClick={this.blacklistLink(each, each.url)}>
                    <p className="getNewLinkText">Don't show this again</p>
                  </div>
                  <div>
                    <p>Content Similarity:</p>
                    <p>{each.contentSimilarity}</p>
                    <p>Reinforce Probability:</p>
                    <p>{each.reinforceProb[0]}</p>
                    <p>Total Similarity:</p>
                    <p>{Math.max(0, each.contentSimilarity * each.reinforceProb[0])}</p>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    );
  }



  render() {
    return (
      <div>
        <div className="header">
          <div className="header-left">
            Shareaid Weblinks
          </div>
        </div>
        {this.state.suggestions.length > 0 ?
          this.renderFinished() :
          <div className="main-body">
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
        }
      </div>
    );
  }
}

export default App;
