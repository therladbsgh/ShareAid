# ShareAid/Photos

ShareAid/Photos is currently the most developed portion of the ShareAid project. The current implementation of the system takes in an Instagram account's photos and captions and a camera roll from Google Photos and recommends captioned photos from the camera roll "in the style of" the account. 

## Required Setup

ShareAid/Photos makes use of [Attend2U](https://github.com/cesc-park/attend2u), a photo captioning system. For local use, we use a heavily edited and trimmed-down version of the system. Download and unzip [our version](https://drive.google.com/open?id=1W-5_NmoYEG7owN7FYdV4EKNnaRlLbUUg) into the photos directory. **You must download this version -- do not clone the repo above!** The scripts in it are carefully calibrated to integrate with the rest of the demo, and we have included the bare minimum of files in order to keep it streamlined for personal computer use.

The system also uses [Triage](http://phototriage.cs.princeton.edu/paper/Chang2016APT.pdf), a system that helps to select objectively well-taken photos. Download and unzip [our folder of Triage scripts](https://drive.google.com/open?id=1W-5_NmoYEG7owN7FYdV4EKNnaRlLbUUg) into the photos directory. **Again, you must use our version of scripts.** To set up Triage, you must also install [Caffe](http://caffe.berkeleyvision.org/), a computer vision library that Triage uses. I (Philip) tried very hard to install Caffe on my Mac and failed, so I can't really help with that, but good luck! lol

## Semi-Optional Setup

**If you wish to skip this step, you can use my photos and my Instagram account to play around with the demo. These files are provided [here](https://drive.google.com/open?id=1W-5_NmoYEG7owN7FYdV4EKNnaRlLbUUg) to download and unzip into the photos directory. If you wish to set up ShareAid/Photos with your own Instagram account and/or your own photos, please follow the instructions below.**

Unfortunately, there is currently significant work required to set up a new account for ShareAid photos. To get a new camera roll, the user must first download the Google Photos app on their phone and choose to sync their photos to Google. (If the user has an Android, this may happen automatically - I'm almost certain it happens automatically with a Pixel.) After doing this, the user needs to go to Google Drive > Settings and check the box that says "Automatically put your Google Photos into a folder in My Drive." 

After doing this, a folder will be created with Google Photos - access it and get the ID of the folder (e.g. the ID of https://drive.google.com/drive/folders/1UY9mrTRT1XD1OeKZJmUrlrZ0KU_iXe9D is 1UY9mrTRT1XD1OeKZJmUrlrZ0KU_iXe9D). Use this ID in the `google-drive-backup/drive.py` script, taken from another repository. (TODO: Port that folder into this folder) This will download all of the photos from the user's camera roll to a specified location on the local system. 

To get Instagram data, change the `USERNAME` constant on line 4 of `instagramPhantomScraper.js` and run it with `node instagramPhantomScraper.js` to generate a JSON of the user's Instagram posts. This is not a 100% working script, because headless browser scraping is finnicky, so you might have to run it a few times to get all the posts.

Once you have a JSON of the Instagram account and a folder with camera roll folders, you are ready to run the ShareAid script.

## Running

Run `yarn dev` in this directory to start the server. The photo analysis and organization will begin and the app should open up on `http://localhost:3000`. Once the system has finished (which could take somewhere around 10 minutes), the recommendations will load on the screen.

At this time, we are unable to post to Instagram because of an extreme overhaul Instagram is doing to its API; read more [here] (https://developers.facebook.com/blog/post/2018/01/30/instagram-graph-api-updates/). According to that post, permissions for standard users (i.e. non-business accounts) will begin to be supported in early 2019, so we expected to be able to start posting to Instagram around that time. 

## Other Notes

FYI: ShareAid/Photos uses a number of third-party machine-learning softwares, including, at different points in time, the Clarifai API, [Triage](http://phototriage.cs.princeton.edu/paper/Chang2016APT.pdf), [Attend2U](https://github.com/cesc-park/attend2u), and possibly others in the course of changing developments and experimentation. These systems are black-box, so we are not able to precisely answer questions of "why" a certain photo was selected or "how" the machine creates certain captions.

Also because of reduced API capabilities, we use a custom-made headless web scraper to gather Instagram posts. It kinda sucks. The photos the Instagram scraper gets right now are of very low quality. I think increasing the quality could lead to dramatically better captions because I'm worried that they're just too low quality for scene recognition right now.

##

If you have any questions, please email me at [philip_hinch@brown.edu](mailto:philip_hinch@brown.edu).
