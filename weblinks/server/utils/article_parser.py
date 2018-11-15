from io import StringIO

from functools import reduce
from newspaper import Article
import lxml.etree as etree
import lxml.html


def parse(url):
    try:
        article = Article(url)
        article.download()
        parser = etree.HTMLParser()
        tree = etree.parse(StringIO(article.html), parser)
        for elem in tree.iter('div'):
            if 'class' in elem.attrib and 'footer' in elem.attrib['class']:
                elem.getparent().remove(elem)
        for elem in tree.iter('nav'):
            elem.getparent().remove(elem)
        result = etree.tostring(tree.getroot(), method="html").decode("utf-8")
        article.html = result

        article.parse()
        if len(article.text) > 0:
            article.nlp()

        result = {
            "image": article.top_image,
            "title": article.title
        }

        if len(article.summary) > 0:
            result["text"] = article.summary
        elif len(article.text) > 0:
            result["text"] = article.text.split(".")[0] + "."
        else:
            result["text"] = article.title

        titleCheck = reduce(lambda x, y: x or y,
                            [x in str.lower(article.text) for x in
                             ['sign in', 'sign up', 'privacy statement',
                              'privacy policy', 'terms of service',
                              'about us', 'contact', 'log in']])
        textCheck = reduce(lambda x, y: x or y,
                           [x in str.lower(article.title) for x in
                            ['sign in', 'sign up', 'privacy statement',
                             'privacy policy', 'terms of service',
                             'about us', 'contact', 'log in']])
        result["utility"] = titleCheck or textCheck
        return result
    except Exception as e:
        return {
            "image": "",
            "title": "",
            "subtext": "",
            "utility": True,
            "text": ""
        }

# url = 'https://groups.google.com/a/tensorflow.org/forum/#!topic/discuss/uSujHISg44U'
# print(parse(url))
