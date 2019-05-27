from twitterscraper import query_tweets

list_of_tweets = query_tweets("https://", 1000000)
for tweet in list_of_tweets:
    print(tweet.text)
