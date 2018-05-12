# ShareAid/Weblinks

The goal of the weblinks piece of ShareAid is to find shareable links from a user's browsing history based on the things they've shared in the past. Google Chrome stores history in a database on the local machine, and we can use the Facebook Graph API to get a list of all links shared by the user, with captions, so in theory we can use these two pieces of data to begin making recommendations. 

## How to Use

In this folder, run `npm install` and `pip install -r requirements.txt` in order to get all the dependencies needed for this project. 

The Weblinks demo runs through a Node server, currently hosted offline. To run it, use `node weblinksServer.js` in this folder and then go to http://localhost:3000. To access your graph data, Facebook requests permissions, which will open in a popup window. If you prefer, you can deny access for the app to be able to post to Facebook for you - the recommendation system will work without that access. 

##

Any questions can be directed to [philip_hinch@brown.edu](mailto:philip_hinch@brown.edu).
