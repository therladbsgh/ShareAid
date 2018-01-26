#!/usr/bin/env python
# -*- coding: utf-8 -*-
from InstagramAPI import InstagramAPI
import os
import csv
import getpass
import json
import hashlib
import csv
import datetime
import sys

def hash_password(password):
    # uuid is used to generate a random number
    salt = ""
    return hashlib.sha1(salt.encode() + password.encode()).hexdigest() + ':' + salt

username = raw_input('Enter your Instagram username.\n')
password = getpass.getpass(
        'Enter your password (characters will not be displayed): ')

InstagramAPI = InstagramAPI(username, password)
InstagramAPI.login() # login

userid = InstagramAPI.username_id

itemlist = []

#parsing the json, goes onto next "page" of JSON when there are more pictures
#and makes another request 
morepicturesbool = True 
maximumid = ''
while (morepicturesbool):
	InstagramAPI.getUserFeed(userid, maxid = maximumid)
	userjson = InstagramAPI.LastJson
	itemlist.append(userjson['items'])
	morepicturesbool = userjson["more_available"]
	if not (morepicturesbool):
		break
	else:
		maximumid = userjson["next_max_id"]

allphotos = [item for sublist in itemlist for item in sublist]


csvlist = []
mediaidlist = []

# get a list of the mediaids 
for photo in allphotos:
	mediaid = photo['id'] 
	mediaidlist.append(mediaid)
	unixtime = photo["taken_at"]
	time = str(datetime.datetime.fromtimestamp(int(unixtime)).strftime('%Y-%m-%d %H:%M:%S'))
	#do stuff with comments here, there's a "has_more_comments" field that will tell you whether there are more comments
	sentbool = "sent"
	allcaption = photo["caption"]
	caption = allcaption["text"] if allcaption else ""
	#tuple of picture, and person who uploaded
	participants = str([mediaid, userid])
	row = [time, sentbool, caption.encode('utf-8'), photo['image_versions2']['candidates'][0]['url']]
	csvlist.append(row)
  
''' 
#now have to handle the comments
for eachid in mediaidlist:
	InstagramAPI.getMediaComments(eachid)
	allcommentjson = InstagramAPI.LastJson
	if allcommentjson["comments"]:
		# this means that it is a comment
		comments = allcommentjson["comments"]
		for comment in comments:
			#sentbool
			if comment["user_id"] == userid:
				sentbool = "sent"
			else:
				sentbool = "recieved"
			unixtime = comment["created_at"]
			time = str(datetime.datetime.fromtimestamp(int(unixtime)).strftime('%Y-%m-%d %H:%M:%S'))
			caption = comment["text"]
			participants = str([mediaid, comment["user_id"]])
			row = [time, sentbool, caption.encode('utf-8'), participants]
			csvlist.append(row)
	else: pass
		 '''


csvlist.sort(key=lambda x: x[0])

csvpath = os.path.expanduser('./')
filepath = sys.argv[1] + "_instagramMetadata.csv"
csvwriter = csv.writer(open(csvpath + '/' + filepath, 'w'))

for message in csvlist: 
	csvwriter.writerow(message)
