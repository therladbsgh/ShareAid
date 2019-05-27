import twint
import geocoder

g = geocoder.ip('me')
c = twint.Config()

c.Search = ".com"
c.Since = "2015-01-01"
c.Geo = f"{g.latlng[0]},{g.latlng[1]},1000km"
c.Store_csv = True
# CSV Fieldnames
c.Custom = ["username", "tweet", "date", "location", "likes", "retweets", "mentions", "link"]
c.Output = "twitter_data/dotcom_search.csv"

twint.run.Search(c)
