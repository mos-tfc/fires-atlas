// Builds the monthly update prompts: one per region, at most 5 armies each, every army from its own "researched up to" date.
// Usage (repository root):  node tools/mass_prompt.mjs
// Writes ops/research/prompts/update-<n>-<region>.md (old update files are replaced) and lists them.
// Regions and dates: ops/research/LAST_UPDATED.json. Used by Signaller. Per-army gap prompts come from tools/gap_prompt.mjs.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/FiresAtlas.jsx', import.meta.url), 'utf8').split('\n');
const st = src.findIndex((l) => l.includes('CONTENT BLOCK')) - 1;
const li = src.findIndex((l) => l.startsWith('const LESSONS'));
let end = li; while (!src[end].startsWith('// =====')) end++;
const D = new Function(src.slice(st, end).join('\n') + '\nreturn { TOPICS, APP_DATA, EQUIPMENT_LINKS, EQUIPMENT_SPECS, EXERCISES, DEVELOPMENTS };')();
const LEDGER = JSON.parse(fs.readFileSync(new URL('../ops/research/LAST_UPDATED.json', import.meta.url), 'utf8'));

const AREA = { liaison: 'Liaison and Fire Support Integration', 'cannon-artillery': 'Guns, Howitzers and Mortars', 'rocket-missile-artillery': 'Rocket and Missile Artillery',
  'loitering-munitions': 'Loitering Munitions and Armed Drones', 'ammunition-effects': 'Ammunition and Effects', 'target-acquisition': 'Target Acquisition',
  'technical-fire-direction': 'Technical Fire Direction and Gunnery', 'digital-fires-c2': 'Digital Fires and Targeting', 'counterfire-survivability': 'Counter-Fire and Force Protection', sustainment: 'Sustainment' };
const areas = D.TOPICS.filter((t) => t.part !== 5);
// Window start: the army's researched-up-to date, but never less than one month back, so late-reported items are caught.
const todayISO = new Date().toISOString().slice(0, 10);
const monthAgo = (() => { const t = new Date(); t.setUTCMonth(t.getUTCMonth() - 1); return t.toISOString().slice(0, 10); })();
const startOf = (c) => (LEDGER[c] < monthAgo ? LEDGER[c] : monthAgo);
const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MAX = 5;
const all = Object.keys(LEDGER).filter((k) => !k.startsWith('_'));
const G = Object.fromEntries(Object.entries(LEDGER._groups || {}).filter(([k]) => !k.startsWith('_')));
const placed = new Set(Object.values(G).flat());
const missing = Object.values(G).flat().filter((c) => !all.includes(c));
if (missing.length) { console.error('In a region but with no date: ' + missing.join(', ')); process.exit(1); }
const rest = all.filter((c) => !placed.has(c));
if (rest.length) G['Other armies'] = rest;
const batches = [];
for (const [region, list] of Object.entries(G)) {
  const parts = Math.ceil(list.length / MAX);
  for (let p = 0; p < parts; p++) {
    const size = Math.ceil(list.length / parts);
    batches.push({ region: parts > 1 ? `${region} (${p + 1} of ${parts})` : region, armies: list.slice(p * size, (p + 1) * size) });
  }
}
const dir = new URL('../ops/research/prompts/', import.meta.url);
for (const f of fs.readdirSync(dir)) if (/^(update-|mass-update)/.test(f)) fs.unlinkSync(new URL(f, dir));
batches.forEach(({ region, armies }, bi) => {

const out = [];
out.push('You are researching artillery and fire support for a learning reference used by military professionals. Use open sources only. Do not use classified, restricted, export-controlled or leaked material.', '');
out.push(`UPDATE ${bi + 1} of ${batches.length}: ${region}. This prompt covers ${armies.length} ${armies.length === 1 ? 'army' : 'armies'}: ${armies.join(', ')}.`, '');
out.push(`Today’s date is ${fmt(todayISO)}. Use it as the end of every period below.`, '');
out.push(`RESEARCH PLAN. Build your plan with one step per army (${armies.join(', ')}), each searching all six headings for that army’s own period, then a final step to check every source link. Do not merge armies into one step or drop any heading.`, '');
out.push(`Each army has its own start date: report only what is new or changed between that date and today. Work through the armies in the order given, under one heading per army, and give each the same depth. If you run short of space, finish the army you are on and write "STOPPED AT: <army>" so the rest can be done in a second pass. Do not shorten later armies to fit.`, '');
out.push('SOURCE RULES (read first)', '- Every source must be a real page you opened. Give the exact page title, the publisher, the date and the full URL.',
  '- Do not build or guess URLs. If you cannot find a working link, give the title and publisher and write "No link found".',
  '- Prefer official government and armed forces pages, parliamentary and audit reports, recognised research institutes and established defence press. Mark manufacturer, state-media and single-source claims "Reported".',
  '- If sources disagree, give each figure with its own source. Never fill a gap with another army’s practice; write "No change found" or "Not found in open sources".', '');
out.push('FOR EACH ARMY, cover these six headings in this order. Under each, list items newest first with date, one to three factual sentences, and source. Write "No change found" where nothing happened.',
  '1. Equipment: orders, deliveries, first firings, upgrades, retirements (give quantities and values where stated)',
  '2. Organisation: units formed, merged, re-equipped or renamed',
  '3. Doctrine, training and schools: new publications, courses, methods',
  '4. Exercises with a fires element: name, dates, place, every participating nation, what was fired',
  '5. Operations and lessons: combat use, published lessons or reviews',
  '6. Corrections: anything already recorded (listed below) that is now wrong or out of date, with the source',
  'After the six headings, add "Entry impact": for each item, name the existing entry it updates (by title) or write "New entry".', '');
out.push('SEARCH BEFORE ANSWERING. For every army, search each of the six headings before you write "No change found". Under any heading where you found nothing, list the searches you ran (search words, and the sites or outlets you checked). A heading without either items or a list of searches is incomplete.', '');
out.push('Only report what has happened or been officially confirmed. Skip plans, rumours and speculation unless an official source confirms them.', '');

for (const c of armies) {
  const E = D.APP_DATA.filter((e) => e.country === c);
  const news = (D.DEVELOPMENTS?.items || []).filter((d) => d.country === c);
  const ex = (D.EXERCISES || []).filter((x) => x.armies.includes(c)).map((x) => x.name);
  const kits = [...new Set(Object.entries(D.EQUIPMENT_LINKS).filter(([id]) => E.some((e) => e.id === id)).flatMap(([, k]) => k.map((x) => x.n)))];
  const thin = areas.filter((t) => E.filter((e) => e.topic === t.key).length === 0).map((t) => AREA[t.key] || t.name);
  out.push(`=== ${c.toUpperCase()} — changes from ${fmt(startOf(c))} to ${fmt(todayISO)} ===`);
  out.push(`Already recorded (${E.length} entries; do not repeat): ` + E.map((e) => e.title).join('; ') + '.');
  if (kits.length) out.push('Systems already covered: ' + kits.join(', ') + '.');
  if (ex.length) out.push('Exercises already covered: ' + ex.join('; ') + '.');
  if (news.length) out.push('News already recorded: ' + news.map((d) => d.date + ' ' + d.headline).join('; ') + '.');
  if (thin.length) out.push('If you find anything in these empty areas, include it with extra care: ' + thin.join(', ') + '.');
  out.push('');
}
out.push('FORMAT. Plain, factual UK English. Short sentences. No intensifiers such as "highly", "massive", "devastating" or "unprecedented". Start a line with "Reported:" when it rests on press or vendor claims. Keep official names in their own spelling. End with one table: Army | Items found | Newest item date | Stopped early (yes/no).');
const slug = region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = `update-${bi + 1}-${slug}.md`;
  fs.writeFileSync(new URL(file, dir), out.join('\n') + '\n');
  console.log(`${file}\t${armies.join(', ')}`);
});
