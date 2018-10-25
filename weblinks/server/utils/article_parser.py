from io import StringIO

from functools import reduce
from newspaper import Article
import lxml.etree as etree


def parse(url):
    try:
        article = Article(url)
        article.download()

        parser = etree.HTMLParser()
        tree = etree.parse(StringIO(article.html), parser)
        for elem in tree.iter('div'):
            if 'class' in elem.attrib and 'footer' in elem.attrib['class']:
                elem.getparent().remove(elem)
        result = etree.tostring(tree.getroot(), method="html").decode("utf-8")
        article.html = result

        article.parse()
        article.nlp()

        result = {
            "image": article.top_image,
            "title": article.title,
            "subtext": article.text.split(".")[0] + "."
        }

        # print("---")
        # print(article.text)
        # print(article.html)
        # print(article.keywords)

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
            "utility": True
        }


# print(parse('https://github.com/nodejs/node/issues/12986'))
