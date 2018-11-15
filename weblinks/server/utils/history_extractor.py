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
    Path('data/').mkdir(parents=True, exist_ok=True)
    copyfile(historyPath, 'data/ChromeHistory')
    conn = sqlite3.connect('data/ChromeHistory')
    c = conn.cursor()
    c.execute("SELECT urls.url, urls.title, visits.visit_duration FROM urls, visits WHERE urls.id = visits.url ORDER BY visits.visit_time DESC;")
    results = c.fetchall()
    c.close()
    return results


# aa = extract_chrome()
# for each in aa:
#     print(each)
