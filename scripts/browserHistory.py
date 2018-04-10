# HOW TO USE:
# Before running this script, 

import os, StringIO, sqlite3, summarizer, requests, urllib2, html2text, csv, random

''' CHROME HISTORY '''

# Note for future: There's some weird issue where the actual History file is locked,
# so I needed to copy it to another location for it to work.
# TODO: Change this so that we can just create a copy within this script so we don't need to do it beforehand
# See https://stackoverflow.com/questions/30773243/database-file-locked-error-while-reading-chrome-history-c-sharp

# Chrome history is originally stored (on OS) at:
# C:\Users\(username)\AppData\Local\Google\Chrome\User Data\Default\local storage(or Bookmarks)

historyPath = '/Users/pjhinch/Desktop/History'

# Tables in History:
# [(u'meta',), (u'visits',), (u'visit_source',), (u'keyword_search_terms',), (u'downloads',), 
# (u'downloads_url_chains',), (u'segments',), (u'segment_usage',), (u'downloads_slices',), 
# (u'typed_url_sync_metadata',), (u'urls',), (u'sqlite_sequence',)]

c = sqlite3.connect(historyPath)
cursor = c.cursor()

#select_statement = "SELECT urls.url, urls.visit_count FROM urls, visits WHERE urls.id = visits.url;"
cursor.execute("SELECT urls.url, urls.visit_count FROM urls, visits WHERE urls.id = visits.url AND urls.visit_count < 4")

results = cursor.fetchall()

print len(results)

c.close()

''' FACEBOOK SHARES '''

# Use getSharedLinks.js for Facebook Graph API Links extraction. See that file for instructions. TODO: combine them with a node server
facebookLinksPath = './philipTimelineLinks.csv'
sharedLinks = []
with open(facebookLinksPath, 'r') as csvfile:
  reader = csv.reader(csvfile)
  for row in reader:
      sharedLinks += row

sharedLinks = set(sharedLinks)

''' LINK SELECTION 
    This section is still very WIP. We need a smart way of filtering out links that have no useful content.
    Right now, I did some basic filtering, but at the end it just chooses a random link. For me, it's usually really bad
'''

# basic blocker of links that usually aren't shared
EXCLUSIONS = set(['www.google.com', 'www.gmail.com', 'www.facebook.com'])

allSites = {}

for result in results:
  url = result[0]
  baseLink = url.split('://')[1].split('/')[0]
  if baseLink in EXCLUSIONS:
    continue
  if url in sharedLinks:
    continue
  if baseLink in allSites:
    allSites[baseLink].append(url)
  else:
    allSites[baseLink] = [url]

validSites = []

count = 0

for site in allSites:
  for url in allSites[site]:
    count += 1
    print len(results) - count
    try:
      html = urllib2.urlopen(url)
      if site in validSites:
        validSites[site].append(url)
      else:
        validSites[site] = [url]
    except:
      continue
    
chosenLink = None
maxSite = 0
for site in validSites:
  if len(validSites[site]) > maxSite:
    maxSite = len(validSites[site])
    chosenLink = validSites[site][random.randint(0, maxSite-1)]

print chosenLink

''' CONTENT EXTRACTION '''

html = urllib2.urlopen(chosenLink)
html = html.read()
content = html2text.html2text(html.decode('utf-8'))

print content

''' TEXT SUMMARY '''

summary = summarizer.summarize('ARTICLE TITLE', content, 5)
#print summary

