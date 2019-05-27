import React, { Component } from 'react';
import '../assets/index.css';
import '../assets/App.css';

const { ipcRenderer } = window.require("electron");

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      settingUpChecked: false,
      settingUp: true,
      data: [],
    };

    this.renderInitialSetupPage = this.renderInitialSetupPage.bind(this);
    this.renderSuggestions = this.renderSuggestions.bind(this);
    this.blacklistLink = this.blacklistLink.bind(this);
    this.whitelistLink = this.whitelistLink.bind(this);
  }

  componentDidMount() {
    const self = this;
    this.props.ipcRenderer.send("check-initial-setup");
    this.props.ipcRenderer.send("run-analysis-daemon");

    this.props.ipcRenderer.on('check-initial-setup-result', (event, data) => {
      this.setState({
        settingUp: data.result,
        settingUpChecked: true
      });

      if (!data.result) {
        this.props.ipcRenderer.send("fetch-data");
      }
    });

    this.props.ipcRenderer.on('fetch-data-result', (event, data) => {
      console.log(data);
      data.data.sort((a, b) => {return (b.content_similarity * b.reinforce_prob) -
                                  (a.content_similarity * a.reinforce_prob)});
      this.setState({
        settingUp: false,
        data: data.data,
      });
    });

    this.props.ipcRenderer.on('refresh-data', (event) => {
      this.props.ipcRenderer.send("fetch-data");
    });
  }

  whitelistLink(post, url) {
    return () => {
      post.feedback = true;
      this.setState({});
    }
  }

  blacklistLink(post, url) {
    return () => {
      post.feedback = true;
      this.setState({});
    }
  }

  renderInitialSetupPage() {
    return (
       <div>
        This is your first time setting up! We are finding pages to suggest; check back later.
      </div>
    );
  }

  renderSuggestions() {
    if (this.state.data.length === 0) {
      return (
         <div>
          Loading data...
        </div>
      );
    } else {
      return (
        <div className="main-body">
        { this.state.data.map((each) => {
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
                  {each.caption}
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
                  <p>{each.content_similarity}</p>
                  <p>Reinforce Probability:</p>
                  <p>{each.reinforce_prob}</p>
                  <p>Total Similarity:</p>
                  <p>{Math.max(0, each.content_similarity * each.reinforce_prob)}</p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      );
    }
  }

  render() {
    if (this.state.settingUpChecked) {
      return (
        <div className="buttonWrapper">
          { this.state.settingUp ? this.renderInitialSetupPage() : this.renderSuggestions() }
        </div>
      );
    } else {
      return (
        <div className="buttonWrapper"></div>
      );
    }
  }
}

export default App;
