# ShareAid/Weblinks

The goal of the weblinks piece of ShareAid is to find shareable links from a user's browsing history based on the things they've shared in the past. Google Chrome stores history in a database on the local machine, and we can use the Facebook Graph API to get a list of all links shared by the user, with captions, so in theory we can use these two pieces of data to begin making recommendations. 

## How to Use

Weblinks is a simple app written in React with a Node.js (Express) backend. A Python 2.7 script is also used.

In this folder, run `npm install` and `pip install -r requirements.txt` in order to get all the dependencies needed for this project. TODO: requirements.txt

The Weblinks demo runs through a Node server, currently hosted offline. To run it, use `run_weblinks.sh`, and navigate to localhost://3000 (a window should open automatically). To access your graph data, Facebook requests permissions, which will open in a popup window. If you prefer, you can deny access for the app to be able to post to Facebook for you - the recommendation system will work without that access. 

## Known Issues

The FB API says it will stop working from http pages (non-https) sometime in September or so. That's something to be aware of. I'm honestly not sure what the appropriate solution is.

Depending on your version of OSX (or Windows, or Ubuntu, or whatever), it's likely that your History database that Chrome stores locally is in a different place than mine. To get this working with your own history, find where it's located and substitute it into line 3 of `run_weblinks.sh`. For now, that line has been commented out and I have provided a copy of my own History in the appropriate location. On top of that, if Chrome reorganizes their database, which I think has happened while I've been working on this, you may need to change the query in `browserHistory.sh`.

Major project points still to come: smart link selection, content extraction, and content summarization that is fine-tuned to the user's speech style.

##

Any questions can be directed to [philip_hinch@brown.edu](mailto:philip_hinch@brown.edu).
