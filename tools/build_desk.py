"""Rebuild the owner's Research Desk page from ops/research/DESK.json.
Usage (repository root): python3 tools/build_desk.py  ->  ops/research/research-desk.html
Only open prompts are shown; when a report is loaded, remove its prompt from DESK.json and rebuild."""
import json, html, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: os.path.join(R, *p)
d = json.load(open(J('ops/research/DESK.json')))
head = open(J('ops/research/desk_template_head.html')).read()
script = open(J('ops/research/desk_template_script.html')).read()
out = [head, '<div class="wrap">', '  <header>', '    <h1>Research Desk</h1>',
       '    <p class="lead">Your open research prompts, at most three a week. When a report comes back and is loaded into the app, its prompt is removed here and the next one moves up.</p>',
       '  </header>', f'  <div class="limit"><span class="dot"></span>{html.escape(d["status"])}</div>',
       '  <section class="return"><h3>Before you click Start research</h3><p>Gemini shows a research plan first. Check it has one step per army (or per Part or Task), that each step covers everything the prompt asks, and that its dates run from the start date in the prompt to today. If a step is missing, merged or dated wrong, click Edit plan and ask for it to be added. Then start.</p></section>']
if not d['active']:
    out.append('  <section class="return"><h3>Nothing open</h3><p>All prompts are done. New ones appear here when they are due.</p></section>')
for k, a in enumerate(d['active']):
    txt = open(J(a['prompt'])).read()
    n = txt.rstrip('\n').count('\n') + 1
    out.append(f'''  <article class="card">
  <div class="card-head"><div><div class="eyebrow">{html.escape(a["label"])}</div><h2>{html.escape(a["title"])}</h2></div><button class="copy" data-target="p{k}" type="button">Copy prompt</button></div>
  <p class="why">{html.escape(a["why"])}</p>
  <details><summary>Show the prompt ({n} lines)</summary><pre id="p{k}">{html.escape(txt)}</pre></details>
</article>''')
out.append('  <section class="return"><h3>When a report is ready</h3><p>Upload the PDF in the Claude session. Every source is checked before anything goes into the app.</p></section>')
if d.get('next'):
    li = ''.join(f'<li><span class="day">{html.escape(x["when"])}</span><span class="who">{html.escape(x["who"])}</span><span class="note">{html.escape(x["note"])}</span></li>' for x in d['next'])
    out.append(f'  <section class="queue"><h3>Coming next</h3><ul>{li}</ul></section>')
out.append('</div>\n<div class="toast" id="toast" hidden>Copied</div>')
out.append(script)
open(J('ops/research/research-desk.html'), 'w').write('\n'.join(out))
print('desk:', len(d['active']), 'open prompts,', len(d.get('next', [])), 'coming next')
