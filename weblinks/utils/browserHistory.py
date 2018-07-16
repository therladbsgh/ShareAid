import os, StringIO, sqlite3, summarizer, requests, urllib2, html2text, csv, random, sys

# Note: There's a lot of junk in this file, basically to show different stubs of what we think should happen eventually.
# Link Selection, Content Extraction, and Content Summary don't work right now; this file currently only exists as a
# proof of concept for extracting Chrome History links. 

''' CHROME HISTORY '''

historyPath = './History'
c = sqlite3.connect(historyPath)
cursor = c.cursor()

#To see and print all table names:
""" res = cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
for name in res:
  print name[0] """

cursor.execute("SELECT * FROM urls")
results = cursor.fetchall()
print len(results)

c.close()

''' FACEBOOK SHARES '''

facebookLinksPath = './TimelineLinks.csv'
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

# Some experimental stuff with separating sites based on their base url (e.g. putting all 'youtube.com' links into one dictionary array)
# Ignoring for now
'''
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

for site in allSites:
  for url in allSites[site]:
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
'''

chosenLink = 'https://www.nytimes.com/2018/02/27/travel/montgomery-alabama-history-race.html'#results[random.randint(0, len(results)-1)][0]
print chosenLink
sys.stdout.flush()

''' CONTENT EXTRACTION '''

""" html = urllib2.urlopen(chosenLink)
html = html.read()
content = html2text.html2text(html.decode('utf-8')) """

#print content

''' TEXT SUMMARY '''

""" summary = summarizer.summarize('ARTICLE TITLE', content, 5)
print summary[0]
sys.stdout.flush() """
