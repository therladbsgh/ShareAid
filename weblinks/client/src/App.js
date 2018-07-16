import React, { Component } from 'react';
import './style/index.css';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      response: '',
      status: 'not started',
      facebookData: '',
    }
  }

  downloadFacebookData(data) {
    return "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  }

  processFacebookData(component, data) {
    console.log(data)
    component.setState({status: 'awaiting download', facebookData: data});
  }

  startGraphCall() {
    this.setState({status: 'fetching'});
    window.graphCall(this, this.processFacebookData);
  }

  analyzeHistory() {
    this.setState({status: 'analyzing'});
    this.callApi()
      .then(postInfo => {
        console.log(postInfo);
        if (postInfo === null) {
          return;
        } else {
          this.setState({ response: postInfo, status: 'finished' })
        }
      }).catch(err => console.log(err));
  }

  callApi = async () => {
    const response = await fetch('/analyzeHistory');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    //Bless This Mess 
    //(I'm sorry I got lazy)
    return (
      <div>
        {this.state.status === 'not started' ? 
          <div className="buttonWrapper">
            <div className="facebookGraph" onClick={() => this.startGraphCall()}>
              <p className="facebookGraphText">Call the Graph API</p>
            </div>
          </div>
          : 
            (this.state.status === 'fetching' ?
              <div className="loadingWrapper">
                <p className="loadingText graph">Retrieving the links you've shared on Facebook...</p>
              </div>
              :
              (this.state.status === 'awaiting download' ?
              <div className="buttonWrapper">
                <a className="facebookDownload" href={this.downloadFacebookData(this.state.facebookData)} download="TimelineLinks.csv">
                  <div className="facebookGraph" onClick={() => this.analyzeHistory()}>
                    <p className="facebookGraphText">Download Facebook Shares</p>
                  </div>
                </a>
              </div>
              :
              (this.state.status === 'analyzing' ?
              <div className="loadingWrapper">
                <p className="loadingText history">Finding a link to share from your history...</p>
              </div>
              :
              <div className="afterGraph">
                <div className="facebookPost">
                  <div className="facebookHeader">
                    <img src="philip_thumbnail.jpg" alt="profile pic" className="profilePicture" />
                    <div className="headerTextWrapper">
                      <p className="headerMainText"><a className="usernameText">{this.state.response.username}</a> shared a <a href={this.state.response.link}>link</a>.</p>
                      <p className="headerSubText">Just now · {this.state.response.source}</p>
                    </div>
                  </div>
                  <div className="bodyWrapper">
                    <div className="caption">{this.state.response.caption}</div>
                    <div className="photo">
                      <img src="sample_image.jpg" alt="link photo" className="linkImage"/>
                    </div>
                    <div className="linkTextWrapper">
                      <p className="linkMainText">{this.state.response.linkMainText}</p>
                      <p className="linkSubText">{this.state.response.linkSubText}</p>
                      <p className="linkBaseURL">{this.state.response.source}</p>
                    </div>
                  </div>
                  <img className="icons" src="icons.png" />
                </div>
                <br/>
                <div className="buttonWrapper">
                  <div className="facebookShare">
                    <p className="facebookShareText">Share to Facebook</p>
                  </div>
                  <div className="getNewLink">
                    <p className="getNewLinkText">Try a New Link</p>
                  </div>
                </div>
              </div>
              ) 
              )
            )
          }
      </div>
    );
  }
}

export default App;
