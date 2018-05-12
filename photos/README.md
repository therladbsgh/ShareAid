# ShareAid/Photos

ShareAid/Photos is currently the most developed portion of the ShareAid project. The current implementation of the system takes in an Instagram account's photos and captions and a camera roll from Google Photos and recommends captioned photos from the camera roll "in the style of" the account. 

## Setup

(If you wish to skip this step, you can use my photos and my Instagram account to play around with the demo. These files are provided (TODO - maybe will have to zip the photos or something). If you wish to set up ShareAid/Photos with your own Instagram account and/or your own photos, please follow the instructions below.)

Unfortunately, there is currently significant work required to set up a new account for ShareAid photos. (Hopefully, I can make progress on automating this in the summer -Philip) To get a new camera roll, the user must first download the Google Photos app on their phone and choose to sync their photos to Google. (If the user has an Android, this may happen automatically - I'm almost certain it happens automatically with a Pixel.) After doing this, the user needs to go to Google Drive > Settings and check the box that says "Automatically put your Google Photos into a folder in My Drive." 

After doing this, a folder will be created with Google Photos - access it and get the ID of the folder (e.g. the ID of https://drive.google.com/drive/folders/1UY9mrTRT1XD1OeKZJmUrlrZ0KU_iXe9D is 1UY9mrTRT1XD1OeKZJmUrlrZ0KU_iXe9D). Use this ID in the `google-drive-backup/drive.py` script, taken from another repository. (TODO: Port that folder into this folder) This will download all of the photos from the user's camera roll to a specified location on the local system. 

To get Instagram data, change the `USERNAME` constant on line 4 of `instagramPhantomScraper.js` and run it with `node instagramPhantomScraper.js` to generate a JSON of the user's Instagram posts. This is not a 100% working script, because headless browser scraping is finnicky, so you might have to run it a few times to get all the posts... :p

Once you have a JSON of the Instagram account and a folder with camera roll folders, you are ready to run the ShareAid script.

## Running

Run `node photoSelect.js` in this directory to start the server. The photo analysis and organization will begin. Depending on how many photos there are, this currently may take upwards of an hour. However, we have a database that stores our photo classifications at `photoDatabase.json` (TODO), so any photo that has been analyzed before will be skipped, speeding up the process for future runs. Once the message `photos sorted; ready` is printed in the console, navigate to `http://localhost:3000` to see your recommendations and captions.

At this time, we are unable to post to Instagram because of an extreme overhaul Instagram is doing to its API; read more [here] (https://developers.facebook.com/blog/post/2018/01/30/instagram-graph-api-updates/). According to that post, permissions for standard users (i.e. non-business accounts) will begin to be supported in early 2019, so we expected to be able to start posting to Instagram around that time. 

## Other Notes

FYI: ShareAid/Photos uses a number of third-party machine-learning softwares, including, at different points in time, the Clarifai API, [Triage](http://phototriage.cs.princeton.edu/paper/Chang2016APT.pdf), [Attend2U](https://github.com/cesc-park/attend2u), and possibly others. These systems are black-box, so we are not able to precisely answer questions of "why" a certain photo was selected or "how" the machine knew to create certain captions. 

##

If you have any questions, please email [philip_hinch@brown.edu](mailto:philip_hinch@brown.edu).


