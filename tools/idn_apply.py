"""Insert Indonesia into src/FiresAtlas.jsx. Run from the scratchpad folder:  python3 fa/tools/idn_apply.py
Uses fa/tools/idn_data.py (entries, glossary, kit, ranges, chain, news), idn_lessons.json (Instructor),
idn_armourer.json (Armourer: specs, videos, country data) and idn_sources.json (Sentry: source verdicts).
"""
import json, re, sys, os
sys.path.insert(0, 'fa/tools')
import idn_data as D

P = 'repo/src/FiresAtlas.jsx'
s = open(P, encoding='utf8').read()
J = lambda o: json.dumps(o, ensure_ascii=False)
log = []

# --- Sentry verdicts: drop sources shown to be wrong or dead
verdict = {}
if os.path.exists('idn_sources.json'):
    for r in json.load(open('idn_sources.json')):
        verdict[r['url'].rstrip('/')] = r.get('verdict', '')
BAD = {'WRONG', 'DEAD'}
def keep(src):
    v = verdict.get(src['url'].rstrip('/'), 'UNCHECKED')
    if any(b in v for b in BAD):
        log.append(f"dropped {v}: {src['title']}")
        return False
    return True
for e in D.E:
    before = len(e['sources'])
    e['sources'] = [x for x in e['sources'] if keep(x)]
    if not e['sources']:
        log.append(f"NO SOURCE LEFT: {e['id']} (downgraded to Analysis)")
        e['confidence'] = 'Analysis'
for d in D.DEV:
    d['sources'] = [x for x in d['sources'] if keep(x)]

def insert_before_close(name, items_js):
    """Append items to a multi-line array `const NAME = [ ... \n];`"""
    global s
    i = s.index('const ' + name + ' = [')
    j = s.index('\n];', i)
    s = s[:j] + ',\n' + ',\n'.join(items_js) + s[j:]

def json_const(name):
    m = re.search(r'const ' + name + r' = (\{.*?\}|\[.*?\]);\n', s)
    return m, json.loads(m.group(1))
def set_json_const(m, obj):
    global s
    s = s[:m.start(1)] + J(obj) + s[m.end(1):]

# --- topic, entries, glossary, lessons
les = json.load(open('idn_lessons.json'))
topic = les['topic']
assert 'const TOPICS = [' in s
insert_before_close('TOPICS', ['  ' + J(topic)])
insert_before_close('APP_DATA', ['  ' + J(e) for e in D.E])
gl_m = None
existing_terms = set(re.findall(r'\{ term: \'([^\']+)\'', s)) | set(re.findall(r'"term": "([^"]+)"', s))
new_terms = [g for g in D.GLOSSARY if g['term'] not in existing_terms]
for g in D.GLOSSARY:
    if g['term'] in existing_terms: log.append('glossary term exists, skipped: ' + g['term'])
insert_before_close('GLOSSARY', ['  ' + J(g) for g in new_terms])
for l in les['lessons']: l['addedIn'] = '2026.12'
insert_before_close('LESSONS', ['  ' + J(l) for l in les['lessons']])

# --- developments
i = s.index('const DEVELOPMENTS = {'); j = s.index('"items": [', i) + len('"items": [')
s = s[:j] + '\n' + ',\n'.join('    ' + J(d) for d in D.DEV) + ',' + s[j:]

# --- equipment links (with short forms), specs, videos, country data
arm = json.load(open('idn_armourer.json')) if os.path.exists('idn_armourer.json') else {}
arm = {D.ARMOURER_NAME.get(k, k): v for k, v in arm.items()}
m, EL = json_const('EQUIPMENT_LINKS')
for eid, kit in D.KIT.items():
    EL[eid] = [dict(n=k[0], q=k[1], **({'a': k[2]} if len(k) > 2 else {})) for k in kit]
set_json_const(m, EL)
m, SP = json_const('EQUIPMENT_SPECS')
m2, VL = json_const('VIDEO_LINKS')
m3, VM = json_const('VIDEO_META')
names = {k[0] for kit in D.KIT.values() for k in kit}
for n in sorted(names):
    a = arm.get(n, {})
    if n == 'CAESAR':
        VM[n]['c'] = sorted(set(VM[n]['c']) | {'Indonesia'}, key=lambda c: (c == 'Bulgaria', c))
        continue
    if n == 'ASTROS II Mk6' and not a: a = arm.get('ASTROS II Mk6', {})
    if a.get('t'):
        spec = {'t': a['t'], 'r': a.get('r') or []}
        if a.get('w'): spec['w'] = a['w']
        SP[n] = spec
    else:
        log.append('no spec from Armourer: ' + n)
    meta = a.get('meta') or {'c': ['Indonesia'], 'k': 'Command and Control', 'o': 'Indonesia'}
    meta['c'] = ['Indonesia']
    VM[n] = {'c': meta['c'], 'k': meta['k'], 'o': meta['o']}
    vids = [dict(v=v['v'], t=v['t'], ch=v['ch'], ok=False) for v in (a.get('videos') or [])]
    if vids: VL[n] = vids
# AV-UCF etc. from the agent may use other keys; report leftovers
for k in arm:
    if k not in names: log.append('Armourer system not in KIT (ignored): ' + k)
set_json_const(m3, VM)
# VIDEO_LINKS and EQUIPMENT_SPECS positions shift after VIDEO_META edit; re-find
m2, _ = json_const('VIDEO_LINKS'); set_json_const(m2, VL)
m, _ = json_const('EQUIPMENT_SPECS'); set_json_const(m, SP)

# --- ranges, kill chain, colour
m, RD = json_const('RANGE_DATA'); RD += D.RANGES; set_json_const(m, RD)
m, KC = json_const('KILL_CHAINS'); KC.append(D.CHAIN); set_json_const(m, KC)
s = s.replace("'North Korea': '#84cc16' };", "'North Korea': '#84cc16', Indonesia: '#f43f5e' };", 1)

# --- changelog
cl_i = s.index("const CHANGELOG = [")
ch_i = s.index("changes: [", cl_i) + len("changes: [")
rows = [f"      {{ kind: 'new', entryId: {J(e['id'])}, topic: \"indonesia\", summary: {J('New entry: ' + e['title'] + '.')} }}," for e in D.E]
s = s[:ch_i] + '\n' + '\n'.join(rows) + s[ch_i:]
s = s.replace("and seven other armies (Russia, South Korea, Ukraine, China, Japan, Australia, North Korea)",
              "and eight other armies (Russia, South Korea, Ukraine, China, Japan, Australia, North Korea, Indonesia)", 1)

open(P, 'w', encoding='utf8').write(s)
print('\n'.join(log) or 'no notes')
print(f"entries {len(D.E)}, glossary {len(new_terms)}, lessons {len(les['lessons'])}, news {len(D.DEV)}, kit systems {len(names)}")
