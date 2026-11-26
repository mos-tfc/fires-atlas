"""Fires Atlas link check. Run from the repository root:  python3 tools/check_links.py [--sources] [--videos]

--videos  asks YouTube's oEmbed service about every clip: 200 = fine, 401/403 = embedding now blocked, 404 = removed.
--sources requests every source URL and prints status and page title. Many .mil sites answer 403 to scripts:
          a 403 from a .mil address is not proof the page is gone; confirm it by searching for its exact title.
Writes nothing; prints a report. Exit code 1 if a video is gone or blocked.
"""
import json, re, sys, concurrent.futures as cf
import requests

import glob
# App code plus the data files in src/content/ (the data no longer sits in FiresAtlas.jsx).
SRC = ''.join(open(p, encoding='utf8').read() + '\n' for p in ['src/FiresAtlas.jsx'] + sorted(glob.glob('src/content/*.js')))
H = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}

def videos():
    m = re.search(r'const VIDEO_LINKS = (\{.*?\});\n', SRC)
    V = json.loads(m.group(1))
    pairs = [(n, c['v']) for n, l in V.items() for c in l]
    def chk(p):
        try:
            r = requests.get('https://www.youtube.com/oembed', params={'url': 'https://www.youtube.com/watch?v=' + p[1], 'format': 'json'}, timeout=20)
            return p, r.status_code
        except Exception as e:
            return p, 'ERR'
    with cf.ThreadPoolExecutor(8) as ex:
        res = list(ex.map(chk, pairs))
    bad = [(p, s) for p, s in res if s != 200]
    print(f'Videos: {len(res)} checked, {len(bad)} not playable')
    for (n, v), s in bad:
        print(f'  {s}  {n}  https://www.youtube.com/watch?v={v}')
    return len(bad)

def sources():
    urls = sorted(set(re.findall(r'"url": "(https://[^"]+)"', SRC) + re.findall(r"url: '(https://[^']+)'", SRC)))
    def chk(u):
        try:
            r = requests.get(u, headers=H, timeout=30)
            t = ''
            if r.content[:4] == b'%PDF':
                t = '[PDF]'
            else:
                m = re.search(rb'<title[^>]*>(.*?)</title>', r.content, re.S | re.I)
                t = ' '.join(m.group(1).decode('utf8', 'ignore').split())[:90] if m else ''
            return u, r.status_code, t
        except Exception as e:
            return u, 'ERR', str(e)[:60]
    with cf.ThreadPoolExecutor(10) as ex:
        res = list(ex.map(chk, urls))
    print(f'Sources: {len(res)} checked')
    for u, s, t in res:
        if s != 200:
            note = ' (.mil blocks scripts: confirm by title search)' if s == 403 and '.mil' in u else ''
            print(f'  {s}  {u}  {t}{note}')
    return 0

if __name__ == '__main__':
    args = set(sys.argv[1:]) or {'--videos', '--sources'}
    bad = 0
    if '--videos' in args: bad += videos()
    if '--sources' in args: sources()
    sys.exit(1 if bad else 0)
