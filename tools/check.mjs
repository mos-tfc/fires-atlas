// Fires Atlas content check. Run from the repository root:  node tools/check.mjs
// Loads the content block of src/FiresAtlas.jsx (data only, no React) and checks it.
// Exit code 1 if any check fails, so agents and people can rely on it before a commit.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/FiresAtlas.jsx', import.meta.url), 'utf8');
const L = src.split('\n');
const start = L.findIndex((l) => l.includes('CONTENT BLOCK')) - 1;
const lessons = L.findIndex((l) => l.startsWith('const LESSONS'));
let end = lessons; while (!L[end].startsWith('// =====')) end++;
const block = L.slice(start, end).join('\n');
// The equipment-name matcher lives in the app code, outside the content block.
const a = src.indexOf('const KIT_STOP'), b = src.indexOf('function TermScope');
const kitCode = src.slice(a, b);

const D = new Function(block + '\n' + kitCode + `
return { CONTENT, CHANGELOG, TOPICS, APP_DATA, GLOSSARY, LESSONS, DEVELOPMENTS, EQUIPMENT_LINKS, EQUIPMENT_SPECS,
  VIDEO_LINKS, VIDEO_META, RANGE_DATA, KILL_CHAINS, EXERCISES, kitAliases };`)();

const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const asList = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const ids = new Set(D.APP_DATA.map((e) => e.id));
const topics = new Set(D.TOPICS.map((t) => t.key));

// Entries
const seen = new Set();
for (const e of D.APP_DATA) {
  if (seen.has(e.id)) fail('Duplicate entry id: ' + e.id); seen.add(e.id);
  if (!topics.has(e.topic)) fail(`${e.id}: unknown topic ${e.topic}`);
  if (!['Confirmed', 'Reported', 'Analysis'].includes(e.confidence)) fail(`${e.id}: bad confidence ${e.confidence}`);
  for (const r of asList(e.relatedIds)) if (!ids.has(r)) fail(`${e.id}: relatedId ${r} does not exist`);
  for (const s of asList(e.sources)) {
    if (s.url && !/^https?:\/\//.test(s.url)) fail(`${e.id}: source URL is not a web address: ${s.url}`);
    else if (s.url && s.url.startsWith('http:')) warn(`${e.id}: source uses http (no secure version): ${s.url}`);
    if (s.url && /armypubs\.army\.mil\/epubs\/DR_pubs\/DR_a\/ARN\d+/i.test(s.url)) warn(`${e.id}: armypubs link, check the title matches (IDs are reused)`);
  }
  if (!asList(e.sources).some((s) => s.url) && e.confidence !== 'Analysis') warn(`${e.id}: ${e.confidence} with no linked source`);
}
// Lessons
let exercises = 0;
for (const l of D.LESSONS) {
  for (const id of l.entryIds) if (!ids.has(id)) fail(`Lesson ${l.id}: entry ${id} does not exist`);
  for (const x of asList(l.exercises)) {
    exercises++;
    if (x.entryId && !ids.has(x.entryId)) fail(`Lesson ${l.id}: exercise entry ${x.entryId} missing`);
    if (x.options && !(x.answer >= 0 && x.answer < x.options.length)) fail(`Lesson ${l.id}: exercise answer out of range: ${x.q}`);
  }
}
// Developments
for (const it of D.DEVELOPMENTS.items) for (const r of asList(it.relatedIds)) if (!ids.has(r)) fail(`${it.id}: relatedId ${r} missing`);
// Ranges and kill chains point at real entries
for (const r of D.RANGE_DATA) if (!ids.has(r.id)) fail(`Range ${r.n}: entry ${r.id} missing`);
{ const seenC = new Set(); for (const c of D.KILL_CHAINS) { if (seenC.has(c.c)) fail(`Kill chain: more than one chain for ${c.c}; keep one general chain per army (L30)`); seenC.add(c.c); } }
for (const c of D.KILL_CHAINS) for (const s of c.steps) if (s.id && !ids.has(s.id)) fail(`Kill chain ${c.c}: step entry ${s.id} missing`);

// Exercises: entries exist, armies are armies in the app, every exercise has a linked source
const armies = new Set(D.APP_DATA.map((e) => e.country));
for (const x of asList(D.EXERCISES)) {
  for (const id of asList(x.entryIds)) if (!ids.has(id)) fail(`Exercise ${x.id}: entry ${id} missing`);
  for (const c of asList(x.armies)) if (!armies.has(c)) fail(`Exercise ${x.id}: "${c}" is not an army in the app (put it under "others")`);
  if (!asList(x.sources).some((s) => s.url)) fail(`Exercise ${x.id}: no linked source`);
}

// Equipment: every listed system must open from its card's title or text
const kits = new Map();
const kitIn = (kit, lines, where) => {
  const byAlias = {};
  asList(kit).forEach((k) => D.kitAliases(k.n).concat(asList(k.a)).forEach((x) => { if (!byAlias[x]) byAlias[x] = k; }));
  const names = Object.keys(byAlias).sort((x, y) => y.length - x.length);
  if (!names.length) return;
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const re = new RegExp('((?<![\\w/-])(?:' + names.map(esc).join('|') + '))(?=(?:s|’s|\'s)?(?![\\w/]))');
  const hit = new Set();
  lines.forEach((l) => String(l).split(re).forEach((c, i) => { if (i % 2 === 1 && byAlias[c]) hit.add(byAlias[c].n); }));
  asList(kit).forEach((k) => { kits.set(k.n, k); if (!hit.has(k.n)) warn(`${where}: equipment "${k.n}" not linked from title or text (add a short form in "a")`); });
};
for (const [id, kit] of Object.entries(D.EQUIPMENT_LINKS)) {
  const e = D.APP_DATA.find((x) => x.id === id);
  if (!e) { fail('EQUIPMENT_LINKS key with no entry: ' + id); continue; }
  kitIn(kit, [e.title, ...asList(e.what), ...asList(e.how), ...asList(e.why)], id);
}
for (const it of D.DEVELOPMENTS.items) if (asList(it.equipment).length) kitIn(it.equipment, [it.headline, ...asList(it.what), ...asList(it.soWhat)], it.id);
// Older items moved to 'Earlier developments' keep their equipment cards (and videos).
for (const it of asList(D.DEVELOPMENTS.archive)) if (asList(it.equipment).length) asList(it.equipment).forEach((k) => kits.set(k.n, k));

// Videos
const main = ['United States', 'Russia', 'South Korea', 'Ukraine', 'China', 'Japan', 'Australia', 'North Korea', 'Indonesia', 'Malaysia', 'Singapore', 'India'];
let clips = 0, live = 0;
const vids = new Set();
for (const [n, list] of Object.entries(D.VIDEO_LINKS)) {
  if (list.length > 2) fail(`Videos: ${n} has ${list.length} clips; keep at most two per equipment`);
  for (const c of list) if (c.lang && !c.en) fail(`Videos: ${n} clip ${c.v} is marked ${c.lang} but has no English title (en)`);
  if (!kits.has(n)) fail(`VIDEO_LINKS key "${n}" is not an equipment name`);
  for (const c of list) {
    clips++; if (c.ok) live++;
    if (!/^[\w-]{11}$/.test(c.v)) fail(`Video ${n}: bad YouTube id ${c.v}`);
    if (vids.has(n + c.v)) fail(`Video ${n}: duplicate ${c.v}`); vids.add(n + c.v);
    if (!c.t || !c.ch) fail(`Video ${n} ${c.v}: missing title or channel`);
  }
}
for (const n of kits.keys()) {
  const m = D.VIDEO_META[n];
  if (!m) { fail(`VIDEO_META missing for "${n}" (country, type, origin)`); continue; }
  if (!m.k || !m.o || !asList(m.c).length) fail(`VIDEO_META "${n}" incomplete`);
  if (asList(m.c).includes('Others')) fail(`VIDEO_META "${n}": name the country instead of "Others"`);
}
// Glossary
const terms = new Set();
for (const g of D.GLOSSARY) { if (terms.has(g.term)) fail('Duplicate glossary term: ' + g.term); terms.add(g.term); if (!g.plain) warn('Glossary term without a plain definition: ' + g.term); }

// Style: no own-force material, no intensifiers in entry text
const allText = D.APP_DATA.map((e) => [e.title, ...asList(e.what), ...asList(e.how), ...asList(e.why)].join(' ')).join('\n');
const hasSG = D.APP_DATA.some((e) => e.country === 'Singapore');
if (!hasSG && /\bSAF\b|Singapore Armed Forces|SAFTI|\bSAR\s?21\b|\bSingapore\b/.test(allText)) warn('Singapore reference before the Singapore module is loaded: hold it back until the owner’s open-source report is in (L18)');
for (const w of ['devastating', 'massive', 'incredibly', 'absolutely', 'game-chang']) if (new RegExp('\\b' + w, 'i').test(allText)) warn('Intensifier in entry text: ' + w);


// New-army research prompt must cover every data set in the content block (ops/research/PROMPT_COVERAGE.json).
{
  const cov = JSON.parse(fs.readFileSync(new URL('../ops/research/PROMPT_COVERAGE.json', import.meta.url), 'utf8'));
  for (const m of block.matchAll(/^const ([A-Z][A-Z_]+)\s*=/gm)) if (!cov[m[1]]) fail(`Data set ${m[1]} is not in ops/research/PROMPT_COVERAGE.json: add a part to tools/new_country_prompt.mjs that asks for it, then list it there`);
}

console.log(`Content ${D.CONTENT.version}: ${D.APP_DATA.length} entries, ${D.GLOSSARY.length} terms, ${D.LESSONS.length} lessons, ${exercises} exercises, ${D.TOPICS.length} topics`);
console.log(`Equipment ${kits.size} systems; videos ${clips} clips (${live} live, ${clips - live} pending)`);
warns.forEach((w) => console.log('WARN ' + w));
fails.forEach((f) => console.log('FAIL ' + f));
console.log(fails.length ? `${fails.length} failure(s)` : 'All checks passed' + (warns.length ? ` (${warns.length} warning(s))` : ''));
process.exit(fails.length ? 1 : 0);
