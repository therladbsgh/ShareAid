import csv

links = []
with open('twitter_data/https_search.csv') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    for row in reader:
        msg = row[1].split(' ')
        for word in msg:
            if 'https://' in word and '…' not in word:
                links.append((word[8:], row[1], row[7]))
            elif 'http://' in word and '…' not in word:
                links.append((word[7:], row[1], row[7]))

tmp = []
for each in links:
    if each[0] != '':
        if each[0][:3] == 'www':
            tmp.append((each[0][4:], each[1], each[2]))
        else:
            tmp.append(each)
links = tmp

for each in links:
    print(each)
