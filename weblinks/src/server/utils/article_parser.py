from io import StringIO
import time
# import eventlet

from functools import reduce
from splinter import Browser
from newspaper import Article
import lxml.etree as etree

# requests_html = eventlet.import_patched('requests_html')


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
    # return
    with Browser('firefox', headless=True) as b:
        b.driver.set_page_load_timeout(10)
        b.visit(url)
        time.sleep(5)
        return b.html

    # session = requests_html.HTMLSession()
    # r = session.get(url)
    # r.html.render(sleep=5)
    # return r.html.html


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
    EXCLUSIONS = ['google.com/search', 'mail.google.com',
                  'facebook.com', 'reddit.com', 'localhost',
                  'accounts.google.com', 'accounts.youtube.com', 'pdf',
                  'maple', 'jpg', 'png']
    excluded = reduce(lambda x, y: x or y, [e in url for e in EXCLUSIONS])
    if excluded:
        return {
            "url": url,
            "image": "",
            "title": "",
            "utility": True,
            "text": "",
            "success": False
        }

    try:
        article = Article(url)
        article.download_state = 2
        article.html = get_html_from_headless_browser(url)
        article.html = remove_headers_and_footers(article.html)

        article.parse()
        # if len(article.text) > 0:
        #     article.nlp()

        result = {
            "url": url,
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
        print(e)
        return {
            "url": url,
            "image": "",
            "title": "",
            "utility": True,
            "text": "",
            "success": False
        }


# if __name__ == "__main__":
#     # url = 'https://arxiv.org/pdf/1801.00209.pdf'
#     url = 'https://groups.google.com/a/tensorflow.org/forum/#!topic/discuss/uSujHISg44U'
#     # url = 'https://blankmediagames.com/TownOfSalem/'
#     print(parse(url))

