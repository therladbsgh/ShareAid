from io import StringIO
import time

from functools import reduce
from splinter import Browser
from newspaper import Article
import lxml.etree as etree


def get_html_from_headless_browser(url):
    """
    Gets the full HTML given a URL, using a Headless Browser
    (from the splinter library). The benefit is that it will process all
    javascript within visiting the page, allowing scraping HTML for
    dynamically loade pages or PDF pages. The downside is that it is
    very slow.

    Params:
    - url : The URL in question
    Returns:
    - The HTML of the page
    """

    #TODO: Handle special cases of PDF, PPTX, etc.
    with Browser('firefox', headless=True) as b:
        b.visit(url)
        time.sleep(5)
        return b.html


def remove_headers_and_footers(html):
    parser = etree.HTMLParser()
    tree = etree.parse(StringIO(html), parser)
    for elem in tree.iter('div'):
        if 'class' in elem.attrib and 'footer' in elem.attrib['class']:
            elem.getparent().remove(elem)
    for elem in tree.iter('nav'):
        elem.getparent().remove(elem)
    return etree.tostring(tree.getroot(), method="html").decode("utf-8")


def parse(url):
    """
    Parses the page, and gets relevant information
    """
    try:
        article = Article(url)
        article.download_state = 2
        article.html = get_html_from_headless_browser(url)
        article.html = remove_headers_and_footers(article.html)

        article.parse()
        # if len(article.text) > 0:
        #     article.nlp()

        result = {
            "image": article.top_image,
            "title": article.title
        }

        if len(article.text) > 0:
            result["text"] = ' '.join(article.text.split())
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
            "text": "",
            "success": False
        }


# url = 'https://arxiv.org/pdf/1801.00209.pdf'
# url = 'https://groups.google.com/a/tensorflow.org/forum/#!topic/discuss/uSujHISg44U'
# print(parse(url))
# aa = get_html_from_headless_browser(url)
# from bs4 import BeautifulSoup

# soup = BeautifulSoup(aa, 'lxml')
# print(soup.text)
