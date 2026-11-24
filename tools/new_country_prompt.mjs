// Builds the research prompt for adding a NEW army, from the app as it is today.
// Usage (repository root):  node tools/new_country_prompt.mjs "India" > ops/research/prompts/new-india.md
// Owner of the prompt: Recce. Signaller hands it to the owner (it counts as one of that week's three prompts).
// Areas, echelons, existing armies and existing exercises are read from the app, so the prompt follows it.
// ops/research/PROMPT_COVERAGE.json maps every app data set to a part below; tools/check.mjs enforces it.
import fs from 'node:fs';

const country = process.argv[2];
if (!country) { console.error('Give a country name, e.g. "India"'); process.exit(1); }
const src = fs.readFileSync(new URL('../src/FiresAtlas.jsx', import.meta.url), 'utf8');
const L = src.split('\n');
const st = L.findIndex((l) => l.includes('CONTENT BLOCK')) - 1;
const li = L.findIndex((l) => l.startsWith('const LESSONS'));
let end = li; while (!L[end].startsWith('// =====')) end++;
const D = new Function(L.slice(st, end).join('\n') + '\nreturn { TOPICS, APP_DATA, EXERCISES, VIDEO_META, KILL_CHAINS };')();
const ech = src.slice(src.indexOf('const ECHELON_LEVELS'), src.indexOf('const ECHELON_ORDER'));
const ECHELONS = [...ech.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
const LEDGER = JSON.parse(fs.readFileSync(new URL('../ops/research/LAST_UPDATED.json', import.meta.url), 'utf8'));

const armies = [...new Set(D.APP_DATA.map((e) => e.country))].sort((a, b) => (b === 'United States') - (a === 'United States') || a.localeCompare(b));
if (armies.includes(country)) { console.error(country + ' is already in the app; use tools/gap_prompt.mjs or tools/mass_prompt.mjs'); process.exit(1); }
const AREAS = D.TOPICS.filter((t) => t.part !== 5).sort((a, b) => a.order - b.order).map((t) => t.name);
const exIn = (D.EXERCISES || []).filter((x) => (x.others || []).includes(country));
const kitsUsed = Object.entries(D.VIDEO_META || {}).filter(([, m]) => (m.c || []).includes(country) || m.o === country).map(([n]) => n);
const kinds = [...new Set(Object.values(D.VIDEO_META || {}).map((m) => m.k))].sort();
const regions = Object.keys(LEDGER._groups || {}).filter((k) => !k.startsWith('_'));
const today = new Date().toISOString().slice(0, 10);

const o = [];
const p = (...x) => o.push(...x);
p('You are researching artillery and fire support for a learning reference used by military professionals. Use open sources only. Do not use classified, restricted, export-controlled or leaked material.', '');
p(`Country: ${country}`, `Research date: ${today}. Describe the position as of today. Include history only where it explains today’s practice. Give every date you can as day, month and year.`, '');
p('RESEARCH PLAN. Build your plan with one step for each Part below (A to I), then a final step to check every source link. Do not drop any Part.', '');
p('SOURCE RULES (read first)',
  '- Every source must be a real page you opened. Give the exact title as it appears on the page, the publisher, the date and the full URL.',
  '- Do not build or guess URLs (for example by changing an ID number in a link). If you cannot find a working link, give the title and publisher and write "No link found".',
  '- Prefer, in order: official government, defence ministry and armed forces pages and publications; parliamentary and audit reports; recognised research institutes; established defence press; manufacturer pages (mark figures from these "Reported").',
  '- When a claim rests on a named outlet (for example a defence magazine or think tank), link that outlet’s own article, not a page that repeats it.',
  '- If sources disagree, give each figure with its own source. Do not average them.',
  '- Do not fill gaps with doctrine or figures from other armies. Write "Not found in open sources: ..." instead.',
  '- Do not use personal social-media accounts as sources for organisation or order of battle.', '');

p('PART A: OVERVIEW',
  `1. Army name: the one name the reference should use for ${country}’s land force (for example "Indonesian Army"). Name other services only where they own artillery, rockets or fire support.`,
  '2. Theme: one line under 12 words for the country’s fire support, for example "Massed Fires, Missiles and the Russia Link".',
  '3. Description: 3 or 4 sentences on how the country organises and uses fire support, and what makes it distinct.',
  '4. Order of battle: artillery formations and units by echelon, with their main systems and the date the information applies to.',
  `5. Region: which group this army is researched with each month (${regions.join('; ')}; or name a new region).`, '');

p('PART B: ENTRIES',
  'Write 20 to 30 entries covering every Area below; aim for 2 or 3 per Area. Where an Area has nothing in open sources, write one line "Not found in open sources: ..." under it.',
  'Areas: ' + AREAS.join('; ') + '.',
  'Include among them:',
  '- at least 2 Training entries: schools, courses and major exercises, with dates;',
  '- at least 2 Lessons entries: what the country has learned, or is reported to have learned, from its own operations, exercises or recent conflicts;',
  '- 1 Forces entry giving the organisation overview from Part A.',
  'Each entry teaches one point a learner can remember and compare. Keep each line short and concrete.', '',
  'ENTRY FORMAT. Use exactly these numbered fields for every entry:',
  '1. Title: in title case', '2. Area: one of the Areas above', '3. Section: Forces, TTPs, Equipment, Training or Lessons',
  '4. Force: the army name from Part A, or the other service by its official name',
  `5. Echelon: one or more of ${ECHELONS.join(', ')} (use the army’s own term, e.g. Regiment or Brigade)`,
  '6. What: 1 or 2 sentences', '7. How: 3 to 5 numbered points', '8. Why: 1 or 2 sentences',
  '9. Compare with the US: one factual sentence',
  '10. Confidence: Confirmed (official or primary source), Reported (press, vendor or a single unverified source) or Analysis (assessment)',
  '11. As of: month and year', '12. Sources: title, publisher, date and full URL for each', '');

p('PART C: SYSTEMS',
  'For every weapon, sensor and command system named in Part B, give one table row with:',
  '- Name: official designation plus common name, and the name in the country’s own language and script where different',
  `- Type: one of ${kinds.join(', ')}`,
  '- Designed in: the country that designed it (say "licence-built in ..." where relevant), and other armies known to use it',
  '- Key figures: calibre, combat weight, crew, rate of fire (burst and sustained), mobility, time into and out of action',
  '- Range by round type: one figure per round (for example HE, base bleed, rocket-assisted, guided), each with its source',
  '- Main weapon: mark the one system that best represents this army’s artillery today',
  'Mark manufacturer and press figures "Reported". Write "Not stated" where sources give nothing; do not estimate.');
if (kitsUsed.length) p(`The reference already holds these systems this army uses or designed; give figures only where they differ for ${country}: ${kitsUsed.join(', ')}.`);
p('');

p('PART D: KILL CHAIN',
  'Describe one typical chain from finding a target to striking it, as this army practises it. If it also runs a second, different chain (for example drone-cued strikes besides radar counter-fire), describe that too; no more than two.',
  'For each chain give:',
  '- Name: a short title, for example "Radar Counter-Fire" or "Drone to Rocket Strike"',
  '- Nodes: Sensor, Command or fire direction node, Shooter (gun or launcher). The last node is always called "Target".',
  '- 4 to 6 steps in order. For each: Action (Find, Report, Decide, Designate, Task, Fire, Move or Assess), one sentence, the time it takes if a source states one (otherwise leave blank), and the title of the Part B entry that supports it.',
  'Mark claimed timings "Reported" and give the source.', '');

p('PART E: EXERCISES AND PARTNERSHIPS',
  'List the exercises with a fires element this army held with other armies in the last two years. For each: name; latest dates; host country and place; every participating nation; what fires were practised (live firing, rockets, joint targeting, observers); sources.',
  `Note especially exercises with these armies, which are already in the reference: ${armies.join(', ')}.`);
if (exIn.length) p(`The reference already records ${country} taking part in: ${exIn.map((x) => x.name).join('; ')}. Confirm or correct its role in each.`);
p('Then list alliances, partnerships and standing defence arrangements that shape its fire support (for example co-production, training agreements), each with a source.', '');

p('PART F: GLOSSARY',
  'List 10 to 20 terms, abbreviations and system names a reader needs for this army. For each: Term; Full form; Plain meaning (one sentence); Context (the force or programme it belongs to). Flag any abbreviation that means something different in the US Army.', '');

p('PART G: RECENT DEVELOPMENTS',
  'List up to 6 notable fire support developments from the last six months: contracts, deliveries, unit changes, exercises, tests, combat use. For each: date (day, month and year; never the year alone), headline, What (1 or 2 sentences), So What for fire support (1 sentence), Confidence, and the source with full URL.', '');

p('PART H: VIDEO SOURCES',
  'Do not give video links. Instead list: the army’s and defence ministry’s official YouTube or video channels (exact channel names); and for each main system, the search words a local viewer would use in the country’s own language and script.', '');

p('PART I: OPEN QUESTIONS AND CONFLICTS',
  'List points where sources conflict or the picture is unclear, with the sources on each side.', '');

p('STYLE. Plain, factual UK English. Short sentences. No intensifiers such as "highly", "massive", "devastating", "absolutely" or "incredibly". Start a line with "Reported:" when it rests on press or vendor claims, even inside a Confirmed entry. Keep official programme and system names in their own spelling.');
console.log(o.join('\n'));
