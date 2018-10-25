import codecs
import json
from collections import Counter

total_urls = []

with codecs.open('twitter_data/test.json', 'r', 'utf-8') as f:
    tweets = json.load(f, encoding='utf-8')
    for each in tweets:
        urls = []
        # print(each)
        html = each['html']
        url_start = html.find('data-expanded-url')

        new_html = html
        i = 0
        while url_start != -1:
            url_start = url_start + len('data-expanded-url') + 2
            url_end = new_html[url_start:].find("\"") + url_start
            urls.append(new_html[url_start:url_end])

            new_html = new_html[url_end:]
            url_start = new_html.find('data-expanded-url')
        # print(urls)
        total_urls.extend(urls)

domains = []
for each in total_urls:
    if 'https://' in each:
        stripped = each[8:]
    elif 'http://' in each:
        stripped = each[7:]
    domain = stripped.split('?')[0].split('/')[0]
    domains.append(domain)

domain_counter = Counter()
for domain in domains:
    domain_counter[domain] += 1
for each in domain_counter.most_common():
    print(each)
