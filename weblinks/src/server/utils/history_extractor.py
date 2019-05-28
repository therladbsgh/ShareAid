from sys import platform
import sqlite3
import os
import json
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
                                   'google-chrome/Default/ChromeHistory')
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
    copyfile(historyPath, 'data/ChromeHistory.db')
    conn = sqlite3.connect('data/ChromeHistory.db')
    c = conn.cursor()
    c.execute("SELECT urls.url, urls.title, visits.visit_duration, visits.visit_time FROM urls, visits WHERE urls.id = visits.url ORDER BY visits.visit_time DESC;")
    results = c.fetchall()
    print(len(results))
    c.close()
    conn.close()
    os.remove('data/ChromeHistory.db')

    if os.path.isfile('data/BrowserHistory.db'):
        os.remove('data/BrowserHistory.db')
    conn = sqlite3.connect('data/BrowserHistory.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE browser_history
             (url text, title text, visit_duration integer, visit_time integer)''')
    for result in results:
        print(result)
        c.execute("INSERT INTO browser_history VALUES (?, ?, ?, ?);", result)
    conn.commit()
    c.close()
    conn.close()
    return results


def extract_chrome_initial():
    """
    Extracts all history from the Chrome Browser. Currently supports
    Linux and OS X systems. Chromium not supported.

    Paths and database format from here:
    https://www.forensicswiki.org/wiki/Google_Chrome
    """
    if platform == "linux" or platform == "linux2":
        # Linux browser history
        historyPath = os.path.join(Path.home(), '.config/' +
                                   'google-chrome/Default/ChromeHistory')
    elif platform == "darwin":
        # OS X browser history
        historyPath = (os.path.join(Path.home(), 'Library/Application Support/' +
                                    'Google/Chrome/Default/History'))
    elif platform == "win32":
        # Windows browser history
        raise ValueError('OS not supported')
    else:
        raise ValueError('OS not supported')

    # Connects via SQLite
    Path('src/files/').mkdir(parents=True, exist_ok=True)
    copyfile(historyPath, 'src/files/ChromeHistory.db')
    conn = sqlite3.connect('src/files/ChromeHistory.db')
    c = conn.cursor()
    c.execute("SELECT urls.url, urls.title, visits.visit_duration, visits.visit_time FROM urls, visits WHERE urls.id = visits.url ORDER BY visits.visit_time DESC;")
    results = c.fetchall()
    c.close()
    conn.close()
    os.remove('src/files/ChromeHistory.db')

    if os.path.isfile('src/files/BrowserHistory.db'):
        os.remove('src/files/BrowserHistory.db')
    conn = sqlite3.connect('src/files/BrowserHistory.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE browser_history
             (url text, title text, visit_duration integer, visit_time integer)''')
    c.execute('''CREATE TABLE history_result
             (url text PRIMARY KEY, title text, visit_duration integer,
             visit_time integer, image text, caption text, utility boolean,
             content_similarity text, reinforce_prob text)''')
    for result in results:
        c.execute("INSERT INTO browser_history VALUES (?, ?, ?, ?);", result)
    conn.commit()
    c.close()
    conn.close()

    return results


def get_browser_history_list():
    conn = sqlite3.connect('src/files/BrowserHistory.db')
    c = conn.cursor()
    c.execute('''SELECT url, title, visit_duration, visit_time FROM browser_history
              ORDER BY visit_time ASC''')
    results = c.fetchall()
    c.close()
    conn.close()
    return results


def insert_analysis_result(result):
    conn = sqlite3.connect('src/files/BrowserHistory.db')
    c = conn.cursor()
    if result['suggest?']:
        c.execute('''INSERT OR REPLACE INTO history_result
                  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);''',
                  (result['url'], result['title'], result['visit_duration'],
                   result['visit_time'], result['image'], result['caption'],
                   result['utility'], str(result['content_similarity']),
                   str(result['reinforce_prob'])))
    c.execute('''DELETE FROM browser_history WHERE url = ? and visit_time = ?;''',
              (result['url'], result['visit_time']))
    conn.commit()
    c.close()
    conn.close()

    rewrite = False
    with open('src/env.json', 'r') as f:
        data = json.load(f)
        if data['initial_setup']:
            rewrite = True
            data['initial_setup'] = False

    if rewrite:
        with open('src/env.json', 'w') as f:
            json.dump(data, f, sort_keys=True, indent=4)


def get_analysis_result_list():
    conn = sqlite3.connect('src/files/BrowserHistory.db')
    c = conn.cursor()
    c.execute("SELECT * FROM history_result ORDER BY visit_time DESC;")
    results = c.fetchall()
    c.close()
    conn.close()

    final_data = []
    for each in results:
        data = {}
        data['url'], data['title'], data['visit_duration'], data['visit_time'], \
        data['image'], data['caption'], data['utility'], data['content_similarity'], \
        data['reinforce_prob'] = each
        data['content_similarity'], data['reinforce_prob'] = \
            float(data['content_similarity']), float(data['reinforce_prob'])
        final_data.append(data)
    return final_data


# aa = extract_chrome()
# for each in aa:
#     print(each)
