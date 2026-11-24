// Builds an up-to-date gap-fill research prompt for one army from the app's current content.
// Usage (repository root):  node tools/gap_prompt.mjs "South Korea" > ops/research/prompts/south-korea.md
// Used by the Signaller agent; rerun before handing a prompt to the owner so it reflects the latest entries.
import fs from 'node:fs';

const country = process.argv[2];
// Changes since the last update normally come from the monthly mass update (tools/mass_prompt.mjs).
// Add --with-changes to put them in this army's prompt too (e.g. when only one army needs an update).
const withChanges = process.argv.includes('--with-changes');
const LEDGER = JSON.parse(fs.readFileSync(new URL('../ops/research/LAST_UPDATED.json', import.meta.url), 'utf8'));
if (!country) { console.error('Give a country name, e.g. "South Korea"'); process.exit(1); }
const src = fs.readFileSync(new URL('../src/FiresAtlas.jsx', import.meta.url), 'utf8').split('\n');
const st = src.findIndex((l) => l.includes('CONTENT BLOCK')) - 1;
const li = src.findIndex((l) => l.startsWith('const LESSONS'));
let end = li; while (!src[end].startsWith('// =====')) end++;
const D = new Function(src.slice(st, end).join('\n') + '\nreturn { TOPICS, APP_DATA, EQUIPMENT_LINKS, EQUIPMENT_SPECS, VIDEO_LINKS, EXERCISES, DEVELOPMENTS };')();

const E = D.APP_DATA.filter((e) => e.country === country);
if (!E.length) { console.error('No entries for ' + country); process.exit(1); }
const areas = D.TOPICS.filter((t) => t.part !== 5).sort((a, b) => a.order - b.order);
const AREA = { liaison: 'Liaison and Fire Support Integration', 'cannon-artillery': 'Guns, Howitzers and Mortars', 'rocket-missile-artillery': 'Rocket and Missile Artillery',
  'loitering-munitions': 'Loitering Munitions and Armed Drones', 'ammunition-effects': 'Ammunition and Effects', 'target-acquisition': 'Target Acquisition',
  'technical-fire-direction': 'Technical Fire Direction and Gunnery', 'digital-fires-c2': 'Digital Fires and Targeting', 'counterfire-survivability': 'Counter-Fire and Force Protection', sustainment: 'Sustainment' };
const gaps = areas.map((t) => ({ name: AREA[t.key] || t.name, n: E.filter((e) => e.topic === t.key).length })).filter((g) => g.n <= 1);
const weak = E.filter((e) => e.confidence === 'Analysis' || !(e.sources || []).some((s) => s.url));
const training = E.filter((e) => e.module === 'Training').length;
const lessons = E.filter((e) => e.module === 'Lessons').length;
const kits = [...new Set(Object.entries(D.EQUIPMENT_LINKS).filter(([id]) => E.some((e) => e.id === id)).flatMap(([, k]) => k.map((x) => x.n)))];
const noSpec = kits.filter((n) => !D.EQUIPMENT_SPECS[n] || !(D.EQUIPMENT_SPECS[n].r || []).length);
const ex = (D.EXERCISES || []).filter((x) => x.armies.includes(country)).map((x) => x.name);
const since = LEDGER[country];
if (!since) { console.error('No "researched up to" date for ' + country + ' in ops/research/LAST_UPDATED.json'); process.exit(1); }
const sinceText = new Date(since + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const news = (D.DEVELOPMENTS?.items || []).filter((d) => d.country === country).map((d) => d.date + ' ' + d.headline);

const out = [];
out.push(`You are researching artillery and fire support for a learning reference used by military professionals. Use open sources only. Do not use classified, restricted, export-controlled or leaked material.`, '');
out.push(`Country: ${country}`, withChanges
  ? `Research period: ${sinceText} to today. The reference is already current to ${sinceText}. TASK A asks only for what is new or changed since then. The other tasks are standing gaps with no date limit; use the best source of any date for them.`
  : 'This prompt fills standing gaps in the reference; there is no date limit, so use the best source of any date. Recent news is collected separately.', '');
out.push('SOURCE RULES (read first)', '- Every source must be a real page you opened. Give the exact page title, the publisher, the year and the full URL.',
  '- Do not build or guess URLs. If you cannot find a working link, give the title and publisher and write "No link found".',
  '- Prefer official government and armed forces pages, parliamentary and audit reports, recognised research institutes and established defence press. Mark manufacturer, state-media and single-source claims "Reported".',
  '- If sources disagree, give each figure with its own source. Do not fill gaps with another army’s doctrine; write "Not found in open sources: ..." instead.', '');
out.push(`The reference already holds these ${E.length} entries for ${country}. Do not repeat them. If one is wrong or out of date, list it under "Corrections" at the end with the entry title, what is wrong and the source.`);
E.forEach((e) => out.push(`- ${AREA[e.topic] || e.topic} — ${e.title}`));
out.push('');
let task = 'A';
if (withChanges) {
out.push(`TASK A: What changed since ${sinceText}. List each item with its date and source, newest first:`,
  '- New or changed equipment: orders, deliveries, first firings, retirements, upgrades',
  '- Organisation: units formed, merged, re-equipped or renamed',
  '- Doctrine, training and schools: new publications, courses or methods',
  '- Exercises with a fires element: name, dates, participants, what was fired',
  '- Operations or combat use, and any published lessons',
  'For each, say which existing entry it updates (by title) or whether it needs a new entry. If nothing changed in an area, write "No change found". Write only what has happened; skip announcements of future plans unless officially confirmed.');
if (news.length) out.push(`Already recorded as news (do not repeat): ${news.join('; ')}.`);
out.push('');
task = 'B';
}
if (gaps.length) {
  out.push(`TASK ${task}: Fill the gaps. Write 1 or 2 entries for each of these areas:`);
  gaps.forEach((g) => out.push(`- ${g.name}: ${g.n === 0 ? 'MISSING' : 'THIN (1 entry)'}`));
  out.push('');
  task = String.fromCharCode(task.charCodeAt(0) + 1);
}
if (training < 2) { out.push(`TASK ${task}: Training. Write 1 or 2 entries on how ${country} trains its gunners, observers and fire planners: schools, courses and major exercises, with dates.`, ''); task = String.fromCharCode(task.charCodeAt(0) + 1); }
if (lessons < 2) { out.push(`TASK ${task}: Lessons. Write 1 or 2 entries on what ${country}’s artillery has learned, or is reported to have learned, from operations, exercises or recent conflicts.`, ''); task = String.fromCharCode(task.charCodeAt(0) + 1); }
if (weak.length) {
  out.push(`TASK ${task}: Strengthen the evidence. These entries rest on assessment or have no linked source. For each, find an official or established source that confirms or corrects it, or write "No public source found":`);
  weak.forEach((e) => out.push(`- ${e.title}`));
  out.push('');
  task = String.fromCharCode(task.charCodeAt(0) + 1);
}
if (noSpec.length) {
  out.push(`TASK ${task}: Key figures. For each system, give: type, calibre, combat weight, crew, range by round type, rate of fire, mobility and time into and out of action. Mark press and vendor figures "Reported"; write "Not stated" where sources give nothing.`);
  out.push('Systems: ' + noSpec.join(', '), '');
  task = String.fromCharCode(task.charCodeAt(0) + 1);
}
if (!ex.length) { out.push(`TASK ${task}: Joint and combined exercises. List the exercises with a fires element that ${country} held with other armies in the last two years: name, dates, host and place, every participating nation, and what fires were practised, each with a source.`, ''); task = String.fromCharCode(task.charCodeAt(0) + 1); }
out.push('ENTRY FORMAT. Use exactly these numbered fields for every entry:',
  '1. Title: in title case', '2. Area: one of the ten areas above', '3. Section: Forces, TTPs, Equipment, Training or Lessons', '4. Force: the service or branch',
  '5. Echelon: Company, Battery, Battalion, Regiment, Brigade, Division, Corps or Theatre', '6. What: 1 or 2 sentences', '7. How: 3 to 5 numbered points',
  '8. Why: 1 or 2 sentences', '9. Compare with the US: one factual sentence',
  '10. Confidence: Confirmed (official or primary source), Reported (press, vendor or a single unverified source) or Analysis (assessment)',
  '11. As of: month and year', '12. Sources: title, publisher, year and full URL for each', '');
out.push('FOR LEARNERS. Each entry teaches one point a reader can remember and compare. Keep each line short and concrete. Prefer one strong official source over several weak ones.', '');
out.push('STYLE. Plain, factual UK English. Short sentences. No intensifiers such as "highly", "massive", "devastating", "absolutely" or "incredibly". Start a line with "Reported:" when that line rests on press or vendor claims, even inside a Confirmed entry. Keep official names in their own spelling.');
console.log(out.join('\n'));
