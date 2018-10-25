from sys import platform
import sqlite3
import os
from pathlib import Path
from shutil import copyfile


def extract_chrome():
    """
    Extracts all history from the Chrome Browser. Currently supports
    Linux and OS X systems. Chromium not supported.

    Paths and database format from here:
    https://www.forensicswiki.org/wiki/Google_Chrome
    """
    if platform == "linux" or platform == "linux2":
        # Linux browser history
        historyPath = os.path.join(Path.home(), '.config/' +
                                   'google-chrome/Default/History')
    elif platform == "darwin":
        # OS X browser history
        historyPath = (os.path.join(Path.home(), 'Library/Application Support/' +
                                    'Google/Chrome/Default/Preferences'))
    elif platform == "win32":
        # Windows browser history
        raise ValueError('OS not supported')
    else:
        raise ValueError('OS not supported')

    # Connects via SQLite
    copyfile(historyPath, './ChromeHistory')
    conn = sqlite3.connect('./ChromeHistory')
    c = conn.cursor()
    c.execute("SELECT urls.url, urls.title FROM urls, visits WHERE urls.id = visits.url;")
    results = c.fetchall()
    c.close()
    return results
