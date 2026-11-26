import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import {
  Search, BookOpen, GraduationCap, MessageSquare, Settings, ChevronRight, ChevronLeft, ChevronDown,
  Bookmark, FileText, X, Send, CheckCircle2, Info, Lightbulb, Lock, Sun, Moon, RotateCcw, Star,
  ArrowRight, ArrowUp, ArrowDown, Check, Play, Copy, Trash2,
  Users, Crosshair, Rocket, Plane, Zap, Target, Calculator, Cpu, Shield, Truck, Flag, Share2
} from 'lucide-react';

// Data (content) now lives in src/content/, one file per data set; see src/content/index.js.
import {
  CONTENT, FEEDBACK_FORM_URL, APP_LINK, CHANGELOG, PARTS,
  TOPICS, DEVELOPMENTS, EQUIPMENT_LINKS, EQUIPMENT_SPECS, VIDEO_LINKS,
  VIDEO_META, RANGE_DATA, EXERCISES, KILL_CHAINS, APP_DATA,
  GLOSSARY, LEVELS, LESSONS
} from './content/index.js';

// ==========================================
// APP LOGIC (nothing below needs to change when content is added or updated)
// ==========================================

const SECTIONS = ['Forces', 'TTPs', 'Equipment', 'Training', 'Lessons'];
// Echelons from smallest to largest. Equivalent levels share one filter step: a battery is the artillery company;
// a regiment (Japan, North Korea, Indonesia) sits between battalion and division like a brigade; corps-sized "armies"
// (China's group armies, Russia's combined arms armies, Japan's regional armies) sit with corps; Theatre covers theatre
// and joint commands (China's theatre commands, Russia's military districts, Ukraine's operational commands).
const ECHELON_LEVELS = [
  { label: 'Company / Battery', values: ['Company', 'Battery'] },
  { label: 'Battalion', values: ['Battalion'] },
  { label: 'Regiment / Brigade', values: ['Regiment', 'Brigade'] },
  { label: 'Division', values: ['Division'] },
  { label: 'Corps / Army', values: ['Corps', 'Army'] },
  { label: 'Theatre', values: ['Theatre'] }
];
const ECHELON_ORDER = ECHELON_LEVELS.flatMap((l) => l.values);
const echelonRank = (x) => { const i = ECHELON_ORDER.indexOf(x); return i < 0 ? 99 : i; };
const sortEchelons = (list) => asList(list).slice().sort((a, b) => echelonRank(a) - echelonRank(b));
// True when an entry belongs to a filter step (a level label, or a single echelon name); "All" matches every step.
const inEchelon = (e, step) => {
  const lv = ECHELON_LEVELS.find((l) => l.label === step);
  const vals = lv ? lv.values : [step];
  return asList(e.echelon).some((x) => vals.includes(x) || x === 'All');
};
// Country order in every picker and filter: United States first (the worked example), then A to Z, Others last.
const byCountry = (a, b) => (b === 'United States') - (a === 'United States') || (a === 'Others') - (b === 'Others') || String(a).localeCompare(String(b));
const CONFIDENCES = ['Confirmed', 'Reported', 'Analysis'];
const PASS_MARK = 0.8;
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_STEPS = [1, 3, 7]; // days until a missed exercise comes back
const STALE_AFTER_DAYS = 35; // a copy older than this tells the learner to open the current link

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const uniq = (arr) => Array.from(new Set(arr));
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ENTRY_BY_ID = Object.create(null);
APP_DATA.forEach((e) => { ENTRY_BY_ID[e.id] = e; });
// Exercises newest first (by their latest date); undated ones last.
const EXERCISES_NEWEST = EXERCISES.slice().sort((x, y) => String(y.latest || '').localeCompare(String(x.latest || '')));
const LESSON_BY_ID = Object.create(null);
LESSONS.forEach((l) => { LESSON_BY_ID[l.id] = l; });
// Estimated time for a lesson: reading at about 180 words a minute plus about 45 seconds per question, rounded.
const wordCount = (x) => String(x || '').split(/\s+/).filter(Boolean).length;
const lessonMinutes = (l) => {
  let words = wordCount(l.intro) + wordCount(l.objective);
  for (const id of l.entryIds || []) { const e = ENTRY_BY_ID[id]; if (e) words += wordCount([e.title, ...asList(e.what), ...asList(e.how), ...asList(e.why)].join(' ')); }
  return Math.max(1, Math.round(words / 180 + (l.exercises || []).length * 0.75));
};

// Filters are built from the data, so a new country, force, echelon or topic needs no code change.
const ALL_FORCES = uniq(APP_DATA.map((e) => e.force)).filter((f) => f && f !== 'Multiple')
  .sort((a, b) => byCountry((APP_DATA.find((e) => e.force === a) || {}).country, (APP_DATA.find((e) => e.force === b) || {}).country));
// The country each named force belongs to, so entries marked Multiple stay with their own country.
const FORCE_COUNTRY = Object.create(null);
APP_DATA.forEach((e) => { if (e.force && e.force !== 'Multiple' && !FORCE_COUNTRY[e.force]) FORCE_COUNTRY[e.force] = e.country; });
const ALL_ECHELONS = (() => {
  const used = uniq(APP_DATA.flatMap((e) => asList(e.echelon))).filter((x) => x !== 'All' && x !== 'N/A');
  return ECHELON_LEVELS.filter((l) => l.values.some((v) => used.includes(v))).map((l) => l.label)
    .concat(used.filter((x) => !ECHELON_ORDER.includes(x)));
})();
const ALL_TOPICS = TOPICS.slice().sort((a, b) => a.order - b.order);
// Topics that hold Library entries (country topics hold lessons only; their entries sit in the functional topics).
const ENTRY_TOPICS = ALL_TOPICS.filter((x) => APP_DATA.some((e) => e.topic === x.key));
const ALL_COUNTRIES = uniq(APP_DATA.map((e) => e.country)).filter(Boolean).sort(byCountry);
// Country topics (Part 5) keep the country in its own field; outside Learn the name reads “Country: title”.
// One icon per topic; every country topic shares the flag.
const TOPIC_ICON = { liaison: Users, 'cannon-artillery': Crosshair, 'rocket-missile-artillery': Rocket, 'loitering-munitions': Plane,
  'ammunition-effects': Zap, 'target-acquisition': Target, 'technical-fire-direction': Calculator, 'digital-fires-c2': Cpu,
  'counterfire-survivability': Shield, sustainment: Truck };
const topicIcon = (topic) => (topic && (topic.country ? Flag : TOPIC_ICON[topic.key])) || BookOpen;
const topicName = (key) => { const x = TOPICS.find((y) => y.key === key); return x ? (x.country ? x.country + ': ' + x.name : x.name) : key; };

// Glossary lookup, including aliases (for example CFL and FSCL).
const TERMS = Object.create(null);
GLOSSARY.forEach((g) => {
  [g.term].concat(g.aliases || []).forEach((k) => { TERMS[k] = g; });
});
const TERM_PATTERN = new RegExp(
  '(\\b(?:' + Object.keys(TERMS).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|') + ')\\b)', 'g'
);

const lessonsOf = (topic) => LESSONS.filter((l) => l.topic === topic).sort((a, b) => a.level - b.level || a.order - b.order);
const lessonOfEntry = (id) => LESSONS.find((l) => l.entryIds.includes(id));
const entryText = (e) => [e.title, e.force, e.type].concat(asList(e.what), asList(e.how), asList(e.why)).join(' ').toLowerCase();

// Versions are 'YYYY.MM', so plain string comparison orders them.
const isNewer = (v, than) => !!v && (!than || v > than);
const entryChange = (e, seen) => (isNewer(e.updatedIn, seen) ? 'Updated' : isNewer(e.addedIn, seen) ? 'New' : null);
const changesSince = (seen) => CHANGELOG.filter((r) => isNewer(r.version, seen)).flatMap((r) => r.changes || []);
const contentAgeDays = () => Math.floor((Date.now() - new Date(CONTENT.released).getTime()) / DAY);
// The release before the current one. A browser with no record of the learner starts from
// here, so the latest changes still show as New after a move to a new share link.
const previousVersion = () => {
  const older = CHANGELOG.map((r) => r.version).filter((v) => v < CONTENT.version).sort();
  return older.length ? older[older.length - 1] : CONTENT.version;
};

// ---------- storage ----------
const STORE_KEY = 'fires_atlas_state_v1';
const DEFAULT_STATE = {
  dark: true, freeStudy: false, progress: {}, review: {}, bookmarks: [], notes: {},
  seenVersion: null, feedback: [], last: null, welcomed: false
};

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch (err) {
    return { ...DEFAULT_STATE };
  }
}

function useStore() {
  const [state, setState] = useState(loadState);
  const [storageOk, setStorageOk] = useState(true);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      setStorageOk(true);
    } catch (err) {
      setStorageOk(false);
    }
  }, [state]);
  const update = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  return [state, update, storageOk];
}

// FEEDBACK STORE. Local to this browser by default. To collect feedback from every
// learner in one place, replace these three functions with shared storage and keep
// the same record shape: { id, at, kind, where, text, version }.
const feedbackStore = {
  add: (update, record) => update((s) => ({ feedback: [record].concat(s.feedback || []) })),
  remove: (update, id) => update((s) => ({ feedback: (s.feedback || []).filter((f) => f.id !== id) })),
  list: (state) => state.feedback || []
};

// ---------- theme: classes are chosen in code so the toggle never depends on the device setting ----------
const theme = (dark) => (dark ? {
  dark: true,
  page: 'bg-slate-950 text-slate-100', card: 'bg-slate-900 border-slate-800', soft: 'bg-slate-800/60',
  border: 'border-slate-800', muted: 'text-slate-400', faint: 'text-slate-500',
  input: 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500',
  chip: 'bg-slate-900 text-slate-300 border-slate-700', chipOn: 'bg-teal-500 text-slate-950 border-teal-500',
  btn: 'bg-teal-500 hover:bg-teal-400 text-slate-950', btn2: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
  nav: 'bg-slate-950 border-slate-800', navOn: 'text-teal-400', link: 'text-teal-400',
  what: 'border-sky-500', whatT: 'text-sky-400', how: 'border-violet-500', howT: 'text-violet-400',
  why: 'border-amber-500', whyT: 'text-amber-400',
  good: 'bg-emerald-900/40 text-emerald-300 border-emerald-700', warn: 'bg-amber-900/30 text-amber-300 border-amber-700',
  bad: 'bg-rose-900/30 text-rose-300 border-rose-700', info: 'bg-sky-900/30 text-sky-300 border-sky-800',
  term: 'text-teal-300 decoration-teal-500', mark: 'bg-amber-500/30 text-inherit', country: 'text-orange-400'
} : {
  dark: false,
  page: 'bg-slate-50 text-slate-900', card: 'bg-white border-slate-200', soft: 'bg-slate-100',
  border: 'border-slate-200', muted: 'text-slate-600', faint: 'text-slate-400',
  input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
  chip: 'bg-white text-slate-700 border-slate-300', chipOn: 'bg-teal-600 text-white border-teal-600',
  btn: 'bg-teal-600 hover:bg-teal-700 text-white', btn2: 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300',
  nav: 'bg-white border-slate-200', navOn: 'text-teal-700', link: 'text-teal-700',
  what: 'border-sky-600', whatT: 'text-sky-700', how: 'border-violet-600', howT: 'text-violet-700',
  why: 'border-amber-500', whyT: 'text-amber-700',
  good: 'bg-emerald-50 text-emerald-800 border-emerald-300', warn: 'bg-amber-50 text-amber-800 border-amber-300',
  bad: 'bg-rose-50 text-rose-800 border-rose-300', info: 'bg-sky-50 text-sky-800 border-sky-200',
  term: 'text-teal-700 decoration-teal-600', mark: 'bg-amber-200 text-inherit', country: 'text-orange-700'
});

const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

// ---------- small building blocks ----------
function Btn({ children, onClick, kind, disabled, className, title }) {
  const { t } = useApp();
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-base font-semibold transition-colors disabled:opacity-40 ${kind === 'ghost' ? t.btn2 : t.btn} ${className || ''}`}>
      {children}
    </button>
  );
}

function Chip({ on, onClick, children }) {
  const { t } = useApp();
  return (
    <button type="button" onClick={onClick}
      className={`shrink-0 min-h-[36px] px-3 rounded-full border text-sm font-medium transition-colors ${on ? t.chipOn : t.chip}`}>
      {children}
    </button>
  );
}

function Tag({ children, tone }) {
  const { t } = useApp();
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${tone ? t[tone] : t.chip}`}>{children}</span>;
}

function ConfBadge({ value }) {
  if (value === 'Confirmed') return <Tag tone="good"><CheckCircle2 size={12} /> Confirmed</Tag>;
  if (value === 'Reported') return <Tag tone="warn"><Info size={12} /> Reported</Tag>;
  return <Tag tone="bad"><Lightbulb size={12} /> {value || 'Analysis'}</Tag>;
}

function Card({ children, className }) {
  const { t } = useApp();
  return <div className={`rounded-xl border p-4 sm:p-5 ${t.card} ${className || ''}`}>{children}</div>;
}

function Empty({ children }) {
  const { t } = useApp();
  return <div className={`text-center py-10 px-4 rounded-xl border border-dashed ${t.border} ${t.muted}`}>{children}</div>;
}

// Inside one card, only the first appearance of each glossary term is a link; repeats read as plain text.
// TermScope gives every card its own record of which term instance came first in this render.
// It also turns the card's equipment names into links that open the equipment card.
const TermScopeCtx = createContext(null);
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
// Names a system may appear under in text: the full name, each part of "A / B", the name without brackets,
// model codes (letters with digits: M142, 2S19, K9, TPQ-53), all-capitals names of 4+ letters (HIMARS) and
// capitalised proper names (Msta-S, Krasnopol, Lancet), but not common words such as Target or System.
const KIT_STOP = new Set(['Target', 'System', 'Systems', 'Vehicle', 'Fire', 'Fires', 'Support', 'Battery', 'Army', 'Joint', 'Radar',
  'Mortar', 'Mortars', 'Rocket', 'Rockets', 'Launcher', 'Howitzer', 'Drone', 'Drones', 'Gun', 'Guns', 'Missile', 'Missiles', 'Light',
  'Heavy', 'Wheeled', 'Tracked', 'Guided', 'Extended', 'Field', 'Artillery', 'Command', 'Team', 'Report', 'Hand-off', 'Projectile',
  'Counter', 'Mobile', 'Precision', 'Strike', 'Ammunition', 'Supply', 'Recovery', 'Truck', 'Aiming', 'Circle', 'Set', 'Kit', 'Lightweight',
  'Type', 'Model', 'Series', 'Block', 'Increment', 'Version']);
function kitAliases(n) {
  const out = new Set([n]);
  n.split(' / ').forEach((p) => out.add(p.trim()));
  out.add(n.replace(/\s*\([^)]*\)/g, '').trim());
  // A bare calibre (81mm, 240mm) is not a name.
  const code = (w) => /[A-Za-z]/.test(w) && /\d/.test(w) && w.length >= 2 && !/^\d+mm$/i.test(w);
  n.replace(/[()]/g, ' ').split(/\s+/).forEach((w) => {
    if (!w || w === '/') return;
    if (code(w)) out.add(w);
    if (w.includes('/')) w.split('/').forEach((q) => { if (code(q)) out.add(q); });
    else if (/^[A-Z]{4,}$/.test(w)) out.add(w);
    else if (/^[A-Z][a-z]{4,}(-[A-Za-z]+)?$|^[A-Z][a-z]+-[A-Z]{1,3}$/.test(w) && !KIT_STOP.has(w)) out.add(w);
  });
  return [...out].filter((x) => x.length >= 2);
}
function TermScope({ children, kit }) {
  const owners = new Map(); // term or "kit:<name>" -> key of the TermText part that shows it as a link
  const byAlias = Object.create(null);
  // A system may also list short forms the text uses (a: ['THS', 'Krab']).
  asList(kit).forEach((k) => kitAliases(k.n).concat(asList(k.a)).forEach((a) => { if (!byAlias[a]) byAlias[a] = k; }));
  const names = Object.keys(byAlias).sort((x, y) => y.length - x.length);
  // A name may be followed by a plural s (CAESARs) or a hyphenated suffix (Krasnopol-M2, Vulcano-derived).
  const kitRe = names.length ? new RegExp('((?<![\\w/-])(?:' + names.map(escRe).join('|') + '))(?=(?:s|\u2019s|\'s)?(?![\\w/]))') : null;
  return <TermScopeCtx.Provider value={{ owners, byAlias, kitRe }}>{children}</TermScopeCtx.Provider>;
}

// A card title: equipment names in it open the equipment card. The title comes first in the card,
// so it takes the link and later mentions in the text read as plain words.
function KitTitle({ text, query }) {
  const { t, go } = useApp();
  const scope = useContext(TermScopeCtx);
  const myId = useRef(Math.random().toString(36).slice(2));
  if (!scope || !scope.kitRe) return <Highlight text={text} query={query} />;
  const chunks = String(text).split(scope.kitRe);
  return <>{chunks.map((chunk, ci) => {
    const kit = ci % 2 === 1 && scope.byAlias[chunk];
    if (kit) {
      const name = 'kit:' + kit.n, key = myId.current + ':t' + ci;
      if (!scope.owners.has(name)) scope.owners.set(name, key);
      if (scope.owners.get(name) === key) {
        const open = (e) => { e.stopPropagation(); e.preventDefault(); go('kit', { n: kit.n, q: kit.q }); };
        return <span key={ci} role="link" tabIndex={0} title="Photo and key figures" onClick={open}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(e); }}
          className={`underline underline-offset-4 cursor-pointer ${t.link}`}>{chunk}</span>;
      }
    }
    return <Highlight key={ci} text={chunk} query={query} />;
  })}</>;
}

// Text with glossary terms. Tapping a term opens its definition directly under the line.
function TermText({ text, query }) {
  const { t, go } = useApp();
  const [open, setOpen] = useState(null);
  const scope = useContext(TermScopeCtx);
  const myId = useRef(Math.random().toString(36).slice(2));
  if (!text) return null;
  const g = open ? TERMS[open] : null;
  const claim = (name, key) => {
    if (!scope) return true;
    if (!scope.owners.has(name)) scope.owners.set(name, key);
    return scope.owners.get(name) === key;
  };
  // Equipment names first (they open the equipment card), then glossary terms in the rest.
  const chunks = scope && scope.kitRe ? String(text).split(scope.kitRe) : [String(text)];
  const out = [];
  chunks.forEach((chunk, ci) => {
    const kit = scope && scope.byAlias && scope.byAlias[chunk];
    if (kit && ci % 2 === 1) {
      if (claim('kit:' + kit.n, myId.current + ':k' + ci)) {
        out.push(<button key={'k' + ci} type="button" onClick={(e) => { e.stopPropagation(); go('kit', { n: kit.n, q: kit.q }); }}
          className={`font-semibold underline underline-offset-4 ${t.link}`} title="Photo and key figures">{chunk}</button>);
      } else out.push(<Highlight key={'k' + ci} text={chunk} query={query} />);
      return;
    }
    String(chunk).split(TERM_PATTERN).forEach((part, i) => {
      const key = ci + '-' + i;
      if (TERMS[part] && claim(part, myId.current + ':' + key)) {
        out.push(<button key={key} type="button" onClick={(e) => { e.stopPropagation(); setOpen(open === part ? null : part); }}
          className={`font-semibold underline decoration-dotted underline-offset-4 ${t.term}`}>{part}</button>);
      } else out.push(<Highlight key={key} text={part} query={query} />);
    });
  });
  return (
    <span>
      {out}
      {g && (
        <span className={`block mt-2 mb-1 p-3 rounded-lg border text-sm ${t.info}`}>
          <span className="font-bold">{g.term}</span> · {g.full}
          <span className="block mt-1 opacity-90">{g.plain || 'Definition not yet added.'}</span>
          {g.context && <span className="block mt-1 text-xs opacity-75">{g.context}</span>}
        </span>
      )}
    </span>
  );
}

function Highlight({ text, query }) {
  const { t } = useApp();
  if (!query || query.length < 2) return <>{text}</>;
  const parts = String(text).split(new RegExp('(' + escapeRegExp(query) + ')', 'ig'));
  return <>{parts.map((p, i) => (p.toLowerCase() === query.toLowerCase() ? <mark key={i} className={`rounded px-0.5 ${t.mark}`}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

// One What / How / Why block. The same colours are used in the library, lessons and review.
// Phones (under 640px wide) get shorter pages: How and Why fold until tapped.
const isNarrow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 639px)').matches;

function Block({ kind, lines, query, fold }) {
  const { t } = useApp();
  const label = { what: 'What', how: 'How', why: 'Why' }[kind];
  const list = asList(lines);
  const [shut, setShut] = useState(!!fold && !(query && list.some((l) => String(l).toLowerCase().includes(query))));
  if (shut) {
    return (
      <button type="button" onClick={() => setShut(false)} className={`w-full text-left pl-4 border-l-4 py-1 ${t[kind]}`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${t[kind + 'T']}`}>{label}</span>
        <span className={`ml-2 text-sm ${t.muted}`}>{list.length} point{list.length === 1 ? '' : 's'} · tap to read</span>
      </button>
    );
  }
  return (
    <div className={`pl-4 border-l-4 ${t[kind]}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t[kind + 'T']}`}>{label}</div>
      <ul className="space-y-2">
        {asList(lines).map((line, i) => (
          <li key={i} className="text-base leading-relaxed max-w-[70ch]"><TermText text={line} query={query} /></li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// LIBRARY: entry card, filters, compare, glossary
// ==========================================
function EntryCard({ entry, startOpen, query, onClose }) {
  const { t, state, update, go } = useApp();
  const [open, setOpen] = useState(!!startOpen);
  const [showSources, setShowSources] = useState(false);
  const [editing, setEditing] = useState(false);
  const note = state.notes[entry.id] || '';
  const [draft, setDraft] = useState(note);
  const saved = state.bookmarks.includes(entry.id);
  const change = entryChange(entry, state.seenVersion);
  const lesson = lessonOfEntry(entry.id);
  const narrow = isNarrow();

  const toggleSave = () => update((s) => ({
    bookmarks: saved ? s.bookmarks.filter((b) => b !== entry.id) : s.bookmarks.concat(entry.id)
  }));
  const saveNote = () => { update((s) => ({ notes: { ...s.notes, [entry.id]: draft.trim() } })); setEditing(false); };

  return (
    <TermScope kit={EQUIPMENT_LINKS[entry.id]}>
    <Card className={onClose ? 'relative' : ''}>
      {onClose && <CardCloseX onClose={onClose} />}
      <button type="button" onClick={() => setOpen(!open)} className={`w-full text-left ${onClose ? 'pr-12' : ''}`}>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {change && <Tag tone="info"><Star size={12} /> {change}</Tag>}
          {narrow && !open ? (
            <span className={`text-xs font-medium ${t.muted}`}>
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: countryColour(entry.country) }} />
              {entry.country} · {SECTION_LABELS[entry.module] || entry.module}
            </span>
          ) : (
            <>
              <Tag>{entry.force}</Tag>
              {sortEchelons(entry.echelon).filter((x) => x !== 'N/A').map((x) => <Tag key={x}>{x}</Tag>)}
              <Tag>{entry.module}</Tag>
            </>
          )}
          <ConfBadge value={entry.confidence} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold leading-snug"><KitTitle text={entry.title} query={query} /></h3>
          {!onClose && <ChevronDown size={20} className={`shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''} ${t.muted}`} />}
        </div>
        {!open && <p className={`mt-1.5 text-base leading-relaxed max-w-[70ch] line-clamp-2 sm:line-clamp-none ${t.muted}`}>{asList(entry.what)[0]}</p>}
        {!open && note && <p className={`mt-2 p-2 rounded-lg text-sm ${t.soft}`}><span className="font-bold">Your note: </span>{note}</p>}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {change && entry.changeNote && (
            <div className={`p-3 rounded-lg border text-sm ${t.info}`}>
              <span className="font-bold">What changed in {entry.updatedIn || entry.addedIn}:</span> {entry.changeNote}
            </div>
          )}
          <Block kind="what" lines={entry.what} query={query} />
          <Block kind="how" lines={entry.how} query={query} fold={narrow} />
          <Block kind="why" lines={entry.why} query={query} fold={narrow} />
          <KitLinks kit={EQUIPMENT_LINKS[entry.id]} />

          {note && !editing && (
            <div className={`p-3 rounded-lg text-sm ${t.soft}`}>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${t.muted}`}>Your note</div>
              {note}
            </div>
          )}
          {editing && (
            <div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                placeholder="Your own takeaway, comparison or question."
                className={`w-full rounded-lg border p-3 text-base ${t.input}`} />
              <div className="flex gap-2 mt-2">
                <Btn onClick={saveNote}>Save note</Btn>
                <Btn kind="ghost" onClick={() => { setDraft(note); setEditing(false); }}>Cancel</Btn>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Btn kind="ghost" onClick={toggleSave}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</Btn>
            <Btn kind="ghost" onClick={() => setEditing(!editing)}><FileText size={16} /> {note ? 'Edit note' : 'Add note'}</Btn>
            <Btn kind="ghost" onClick={() => go('feedback', { where: entry.id })}><MessageSquare size={16} /> Report an issue</Btn>
          </div>

          <div className={`pt-3 border-t text-sm space-y-2 ${t.border} ${t.muted}`}>
            {lesson && (
              <div>Taught in: <button type="button" className={`font-semibold ${t.link}`} onClick={() => go('lesson', lesson.id)}>{lesson.title}</button></div>
            )}
            {asList(entry.relatedIds).length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Related:</span>
                {entry.relatedIds.map((rid) => (ENTRY_BY_ID[rid] ? (
                  <button key={rid} type="button" className={`text-left underline underline-offset-2 ${t.link}`} onClick={() => go('entry', rid)}>{ENTRY_BY_ID[rid].title}</button>
                ) : <span key={rid} className={t.faint}>Not yet added</span>))}
              </div>
            )}
            <div>
              <button type="button" className="font-semibold inline-flex items-center gap-1" onClick={() => setShowSources(!showSources)}>
                Sources ({asList(entry.sources).length}) · as of {entry.asOf} <ChevronDown size={14} className={showSources ? 'rotate-180' : ''} />
              </button>
              {showSources && (
                <ul className="mt-1.5 space-y-1">
                  {asList(entry.sources).map((s, i) => (
                    <li key={i}>
                      {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className={`italic underline ${t.link}`}>{s.title}</a> : <span className="italic">{s.title}</span>}
                      {' '}({s.publisher}, {s.year})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {onClose && <CardCloseFoot onClose={onClose} />}
    </Card>
    </TermScope>
  );
}

// Compact entry card for the two-per-row Library grid; it opens the full entry on its own page.
function EntryTile({ entry, query }) {
  const { t, state, go } = useApp();
  const change = entryChange(entry, state.seenVersion);
  const saved = state.bookmarks.includes(entry.id);
  const note = state.notes[entry.id];
  const conf = entry.confidence;
  return (
    <button type="button" onClick={() => go('entry', entry.id)} className={`flex flex-col text-left rounded-xl border p-3 sm:p-4 min-w-0 ${t.card}`}>
      <div className={`flex items-center gap-1 text-xs font-medium mb-1 min-w-0 ${t.muted}`}>
        <span className="shrink-0 inline-block w-2 h-2 rounded-full" style={{ background: countryColour(entry.country) }} />
        <span className="truncate">{entry.country} · {SECTION_LABELS[entry.module] || entry.module}</span>
      </div>
      <div className="font-bold text-sm sm:text-base leading-snug"><Highlight text={entry.title} query={query} /></div>
      <div className={`mt-1 text-xs sm:text-sm line-clamp-3 ${t.muted}`}>{asList(entry.what)[0]}</div>
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-1">
        {change && <Tag tone="info"><Star size={11} /> {change}</Tag>}
        {conf !== 'Confirmed' && <Tag tone={conf === 'Reported' ? 'warn' : 'bad'}>{conf}</Tag>}
        {saved && <Bookmark size={13} fill="currentColor" className={t.link} />}
        {note && <FileText size={13} className={t.link} />}
      </div>
    </button>
  );
}

function Pick({ label, value, options, onChange, wide }) {
  const { t } = useApp();
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} aria-label={label}
      className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${wide ? 'w-full min-w-0' : ''} ${value ? t.chipOn : t.chip}`}>
      <option value="">{label}: all</option>
      {options.map((o) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

function Library() {
  const { t, lib, setLib, state } = useApp();
  const f = lib.filters;
  const q = lib.query.trim().toLowerCase();
  const setF = (k, v) => setLib({ ...lib, filters: { ...f, [k]: v } });
  const list = useMemo(() => APP_DATA.filter((e) =>
    (!f.topic || e.topic === f.topic) &&
    (!f.country || e.country === f.country) &&
    (!f.section || e.module === f.section) &&
    (!f.force || e.force === f.force || (e.force === 'Multiple' && e.country === FORCE_COUNTRY[f.force])) &&
    (!f.echelon || inEchelon(e, f.echelon)) &&
    (!f.conf || e.confidence === f.conf) &&
    (!f.changed || entryChange(e, state.seenVersion)) &&
    (!q || entryText(e).includes(q))
  ), [f, q, state.seenVersion]);
  const anyFilter = Object.values(f).some(Boolean) || q;
  // Coverage moved to More; send anyone who last left the Library on it back to Entries.
  useEffect(() => { if (lib.tab === 'Coverage') setLib({ ...lib, tab: 'Entries' }); }, [lib.tab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['Entries', 'Compare', 'Map', 'Ranges', 'Videos', 'Kill Chain', 'Glossary'].map((tab) => (
          <Chip key={tab} on={lib.tab === tab} onClick={() => setLib({ ...lib, tab })}>{tab}</Chip>
        ))}
      </div>

      {lib.tab === 'Entries' && (
        <>
          <div className="relative">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.faint}`} />
            <input type="search" value={lib.query} onChange={(e) => setLib({ ...lib, query: e.target.value })}
              placeholder="Search titles and text"
              className={`w-full min-h-[44px] rounded-lg border pl-10 pr-3 text-base ${t.input}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TOPICS.length > 1 && <Pick label="Topic" value={f.topic} onChange={(v) => setF('topic', v)} options={ENTRY_TOPICS.map((x) => ({ value: x.key, label: x.name }))} />}
            {ALL_COUNTRIES.length > 1 && <Pick label="Country" value={f.country} onChange={(v) => setF('country', v)} options={ALL_COUNTRIES} />}
            <Pick label="Section" value={f.section} onChange={(v) => setF('section', v)} options={SECTIONS} />
            <Pick label="Force" value={f.force} onChange={(v) => setF('force', v)} options={ALL_FORCES} />
            <Pick label="Echelon" value={f.echelon} onChange={(v) => setF('echelon', v)} options={ALL_ECHELONS} />
            <Pick label="Confidence" value={f.conf} onChange={(v) => setF('conf', v)} options={CONFIDENCES} />
            <Chip on={!!f.changed} onClick={() => setF('changed', f.changed ? null : true)}>New or updated</Chip>
          </div>
          <div className={`flex items-center justify-between text-sm ${t.muted}`}>
            <span>{list.length} of {APP_DATA.length} entries</span>
            {anyFilter && <button type="button" className={`font-semibold ${t.link}`} onClick={() => setLib({ ...lib, query: '', filters: {} })}>Clear filters</button>}
          </div>
          {list.length === 0 ? <Empty>No entry matches. Clear a filter or try another word.</Empty>
            : ALL_TOPICS.map((tp) => {
              const inTopic = list.filter((e) => e.topic === tp.key);
              if (!inTopic.length) return null;
              return (
                <div key={tp.key}>
                  <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-2 ${t.muted}`}>
                    {React.createElement(topicIcon(tp), { size: 14 })} {tp.name} · {inTopic.length}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {inTopic.map((e) => <EntryTile key={e.id} entry={e} query={q} />)}
                  </div>
                </div>
              );
            })}
        </>
      )}
      {lib.tab === 'Compare' && <Compare />}
      {lib.tab === 'Map' && <MilitaryMap />}
      {lib.tab === 'Ranges' && <RangeRings />}
      {(lib.tab === 'Kill Chain' || lib.tab === 'Sensor to Shooter') && <KillChain />}
      {lib.tab === 'Glossary' && <GlossaryList />}
      {lib.tab === 'Videos' && <VideoLibrary />}
    </div>
  );
}

// Compare sides: one per country and force, for example "United States · US Army".
// Entries marked Multiple cover several forces of one country, so they appear only on that country's sides.
const COMPARE_SIDES = (() => {
  const seen = [];
  APP_DATA.forEach((e) => {
    if (!e.force || e.force === 'Multiple') return;
    const key = (e.country || '') + ' · ' + e.force;
    if (!seen.includes(key)) seen.push(key);
  });
  const countriesWithForce = uniq(seen.map((k) => k.split(' · ')[0]));
  uniq(APP_DATA.map((e) => e.country)).filter((c) => c && !countriesWithForce.includes(c)).forEach((c) => seen.push(c + ' · Multiple'));
  // Stable sort: countries in picker order, forces within a country in the order they first appear.
  return seen.slice().sort((x, y) => byCountry(x.split(' · ')[0], y.split(' · ')[0]));
})();

const SECTION_LABELS = { Forces: 'Organisation', TTPs: 'Procedures', Equipment: 'Equipment', Training: 'Training', Lessons: 'Lessons' };

// Settings of the Compare, Ranges, Map and Kill Chain views, kept while the app is open so that
// opening an entry and pressing Back returns to the same armies, step and choices.
const VIEW_MEMORY = Object.create(null);
function useRemembered(key, init) {
  const [v, setV] = useState(() => (key in VIEW_MEMORY ? VIEW_MEMORY[key] : init));
  const set = (nv) => { VIEW_MEMORY[key] = nv; setV(nv); };
  return [v, set];
}

function Compare() {
  const { t, go } = useApp();
  const firstOther = COMPARE_SIDES.find((x) => !x.startsWith(COMPARE_SIDES[0].split(' · ')[0] + ' · ')) || COMPARE_SIDES[1] || COMPARE_SIDES[0];
  const [a, setA] = useRemembered('compare.a', COMPARE_SIDES[0]);
  const [b, setB] = useRemembered('compare.b', firstOther);
  const [section, setSection] = useRemembered('compare.section', 'Forces');
  const [ech, setEch] = useRemembered('compare.ech', null);
  const [topic, setTopic] = useRemembered('compare.topic', null);
  const [view, setView] = useRemembered('compare.view', 'side');
  const [full, setFull] = useRemembered('compare.full', 'a');
  const find = (side) => {
    const [country, force] = side.split(' · ');
    return APP_DATA.filter((e) => e.module === section &&
      e.country === country &&
      (!topic || e.topic === topic) &&
      (e.force === force || e.force === 'Multiple') &&
      (!ech || inEchelon(e, ech)));
  };
  const left = find(a), right = find(b);
  const rows = ALL_TOPICS.map((tp) => ({ tp, l: left.filter((e) => e.topic === tp.key), r: right.filter((e) => e.topic === tp.key) }))
    .filter((x) => x.l.length || x.r.length);
  const head = (side, n) => (
    <div className={`p-2 rounded-lg border text-sm font-bold leading-snug ${t.card}`} style={{ borderLeft: '4px solid ' + countryColour(side.split(' · ')[0]) }}>
      {side.split(' · ')[0]}
      <div className={`text-xs font-medium ${t.muted}`}>{side.split(' · ')[1] === 'Multiple' ? 'All forces' : side.split(' · ')[1]} · {n}</div>
    </div>
  );
  const cell = (list) => (
    <div className="space-y-1.5 min-w-0">
      {list.length === 0 ? <div className={`p-2 text-sm ${t.faint}`}>—</div> : list.map((e) => (
        <button key={e.id} type="button" onClick={() => go('entry', e.id)}
          className={`w-full text-left p-2 rounded-lg border text-sm leading-snug ${t.card}`}>
          <span className="font-semibold">{e.title}</span>
          {e.confidence !== 'Confirmed' && <span className={`block text-xs ${t.muted}`}>{e.confidence}</span>}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      <p className={`text-sm ${t.muted}`}>Pick two armies, then what to compare. Tap any entry to read it.</p>
      <div className="grid grid-cols-2 gap-2">
        <Pick wide label="Left" value={a} onChange={(v) => setA(v || COMPARE_SIDES[0])} options={COMPARE_SIDES} />
        <Pick wide label="Right" value={b} onChange={(v) => setB(v || firstOther)} options={COMPARE_SIDES} />
      </div>
      {ENTRY_TOPICS.length > 1 && <Pick wide label="Topic" value={topic} onChange={setTopic} options={ENTRY_TOPICS.map((x) => ({ value: x.key, label: x.name }))} />}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((x) => <Chip key={x} on={section === x} onClick={() => setSection(x)}>{SECTION_LABELS[x] || x}</Chip>)}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip on={!ech} onClick={() => setEch(null)}>All echelons</Chip>
        {ALL_ECHELONS.map((x) => <Chip key={x} on={ech === x} onClick={() => setEch(x)}>{x}</Chip>)}
      </div>
      <div className="flex gap-2">
        <Chip on={view === 'side'} onClick={() => setView('side')}>Side by side</Chip>
        <Chip on={view === 'full'} onClick={() => setView('full')}>Full entries</Chip>
      </div>
      {view === 'side' ? (
        <div className="space-y-3">
          <div className={`grid grid-cols-2 gap-2 sticky top-14 z-10 py-1 ${t.page}`}>{head(a, left.length)}{head(b, right.length)}</div>
          {rows.length === 0 && <Empty>Not yet added for this choice. Try another section or All echelons.</Empty>}
          {rows.map(({ tp, l, r }) => (
            <div key={tp.key}>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.muted}`}>{tp.name}</div>
              <div className="grid grid-cols-2 gap-2">{cell(l)}{cell(r)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Chip on={full === 'a'} onClick={() => setFull('a')}>{a.split(' · ')[0]}</Chip>
            <Chip on={full === 'b'} onClick={() => setFull('b')}>{b.split(' · ')[0]}</Chip>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[[a, left, 'a'], [b, right, 'b']].map(([side, list, k]) => (
              <div key={k} className={`space-y-3 ${full === k ? '' : 'hidden md:block'}`}>
                <div className="hidden md:block">{head(side, list.length)}</div>
                {list.length === 0 ? <Empty>Not yet added for this choice.</Empty> : list.map((e) => <EntryCard key={side + e.id} entry={e} />)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Coverage: how many entries each country has in each topic. A cell opens those entries.

// ---------- explore: ranges and the military map ----------
// Diagram width: on phones capped by screen height so the list below stays usable; on wide screens the
// diagram sits in a pinned left column.
const diagMax = (phonePx, phoneVh) => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 1024px)').matches
  ? 'min(460px, 70vh)' : 'min(' + phonePx + 'px, ' + phoneVh + 'vh)');
// Coloured column header used by the two-column (left and right) views.
function SideHead({ country, sub }) {
  const { t } = useApp();
  return (
    <div className={`p-2 rounded-lg border text-sm font-bold leading-snug min-w-0 ${t.card}`} style={{ borderLeft: '4px solid ' + countryColour(country) }}>
      {country}{sub ? <div className={`text-xs font-medium ${t.muted}`}>{sub}</div> : null}
    </div>
  );
}
// One colour per country, used in both views (readable on light and dark backgrounds).
const COUNTRY_COLOUR = { 'United States': '#3b82f6', Russia: '#ef4444', 'South Korea': '#14b8a6', Ukraine: '#eab308', China: '#ec4899', Japan: '#8b5cf6', Australia: '#f97316', 'North Korea': '#84cc16', Indonesia: '#f43f5e', Malaysia: '#0ea5e9', Singapore: '#b45309', India: '#15803d' };
const countryColour = (c) => COUNTRY_COLOUR[c] || '#94a3b8';
const DASHES = ['', '7 5', '2 4', '10 4 2 4'];
const RANGE_KINDS = ['Guns', 'Mortars', 'Rockets and Missiles'];
const niceMax = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x * p >= v);
  return m * p;
};
const fmtKm = (km) => (km < 10 ? String(km).replace(/\.0$/, '') : Math.round(km).toLocaleString('en-GB'));

function RangeRings() {
  const { t, go } = useApp();
  const [kind, setKind] = useRemembered('ranges.kind', 'Guns');
  const countriesOf = (k) => Object.keys(COUNTRY_COLOUR).filter((c) => RANGE_DATA.some((x) => x.k === k && x.c === c)).sort(byCountry);
  const [L, setL] = useRemembered('ranges.left', 'United States');
  const [Rt, setRt] = useRemembered('ranges.right', 'Russia');
  const [sel, setSel] = useRemembered('ranges.sel', null); // ticked weapons; null = the first weapon of each army
  const avail = countriesOf(kind);
  const left = avail.includes(L) ? L : avail[0];
  const right = avail.includes(Rt) && Rt !== left ? Rt : avail.find((c) => c !== left) || null;
  const colL = RANGE_DATA.filter((x) => x.k === kind && x.c === left);
  const colR = right ? RANGE_DATA.filter((x) => x.k === kind && x.c === right) : [];
  const ticked = sel || [colL[0], colR[0]].filter(Boolean).map((x) => x.n);
  const shown = colL.concat(colR).filter((x) => ticked.includes(x.n));
  const toggle = (n) => setSel(ticked.includes(n) ? ticked.filter((x) => x !== n) : ticked.concat([n]));
  const maxKm = niceMax(Math.max(1, ...shown.flatMap((x) => x.a.map((a) => a.km))));
  const C = 200, RAD = 180;
  const rOf = (km) => (km / maxKm) * RAD;
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => f * maxKm);
  const outerKm = (x) => Math.max(...x.a.map((a) => a.km));
  const column = (list) => (
    <div className="space-y-1.5 min-w-0">
      {list.length === 0 && <div className={`p-2 text-sm ${t.faint}`}>None in this group.</div>}
      {list.map((x) => {
        const on = ticked.includes(x.n);
        return (
          <div key={x.n} className={`rounded-lg border ${t.card}`} style={on ? { borderLeft: '4px solid ' + countryColour(x.c) } : undefined}>
            <button type="button" onClick={() => toggle(x.n)} aria-pressed={on} className="w-full flex items-start gap-2 p-2 text-left">
              <span className={`shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${on ? t.chipOn : t.chip}`}>{on && <Check size={14} />}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug">{x.n}</span>
                <span className={`block text-xs ${t.muted}`}>up to {fmtKm(outerKm(x))} km{x.r ? ' · reported' : ''}</span>
              </span>
            </button>
            {on && (
              <div className={`px-2 pb-2 -mt-1 text-xs leading-snug ${t.muted}`}>
                {x.a.map((a) => <div key={a.a}>{a.a}: {fmtKm(a.km)} km</div>)}
                <button type="button" onClick={() => go('entry', x.id)} className={`mt-0.5 font-semibold ${t.link}`}>Entry ›</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  // Picker block: above the diagram on phones, at the top of the right column on wide screens.
  const controls = (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGE_KINDS.map((k) => <Chip key={k} on={kind === k} onClick={() => { setKind(k); setSel(null); }}>{k}</Chip>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pick wide label="Left" value={left} onChange={(v) => { if (v) { setL(v); setSel(null); } }} options={avail} />
        <Pick wide label="Right" value={right} onChange={(v) => { if (v) { setRt(v); setSel(null); } }} options={avail.filter((c) => c !== left)} />
      </div>
    </>
  );
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Ranges Compared</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>Pick two armies. The first weapon of each is shown; tick others to add them. Solid ring: standard round; dashed or dotted: longer-range rounds.</p>
      </div>
      <div className="space-y-3 lg:hidden">{controls}</div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
      <div className={`sticky top-14 lg:top-20 self-start z-10 pb-2 ${t.page}`}>
        <Card className="!p-2 sm:!p-4">
          {shown.length === 0 ? <Empty>Tick at least one weapon below.</Empty> : (
            <svg viewBox="0 0 400 400" className="w-full mx-auto block" style={{ maxWidth: diagMax(250, 34) }} role="img" aria-label={'Range rings for ' + shown.map((x) => x.n).join(', ')}>
              {ticks.map((km, i) => (
                <g key={i}>
                  <circle cx={C} cy={C} r={rOf(km)} fill="none" stroke="currentColor" strokeOpacity="0.15" />
                  <text x={C + 3} y={C - rOf(km) + 13} fontSize="13" fill="currentColor" opacity="0.6">{fmtKm(km)} km</text>
                </g>
              ))}
              {shown.map((x, i) => {
                const col = countryColour(x.c);
                const outer = outerKm(x);
                const ang = (-60 + i * (300 / Math.max(1, shown.length))) * Math.PI / 180;
                const lx = C + Math.cos(ang) * Math.max(rOf(outer), 14);
                const ly = C + Math.sin(ang) * Math.max(rOf(outer), 14);
                return (
                  <g key={x.n}>
                    {x.a.map((a, j) => (
                      <circle key={j} cx={C} cy={C} r={rOf(a.km)} fill={j === x.a.length - 1 ? col : 'none'} fillOpacity="0.05"
                        stroke={col} strokeWidth="2.5" strokeDasharray={DASHES[Math.min(j, 3)]} />
                    ))}
                    <circle cx={lx} cy={ly} r="4" fill={col} />
                    <text x={lx + (Math.cos(ang) >= 0 ? 7 : -7)} y={ly + 5} fontSize="14" fontWeight="700" fill={col}
                      textAnchor={Math.cos(ang) >= 0 ? 'start' : 'end'}>{x.n}</text>
                  </g>
                );
              })}
              <circle cx={C} cy={C} r="3" fill="currentColor" />
            </svg>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <SideHead country={left} sub={colL.length + ' Weapon' + (colL.length === 1 ? '' : 's')} />
            {right ? <SideHead country={right} sub={colR.length + ' Weapon' + (colR.length === 1 ? '' : 's')} /> : <div />}
          </div>
        </Card>
      </div>
      <div className="space-y-3">
      <div className="hidden lg:block space-y-3">{controls}</div>
      <div className="grid grid-cols-2 gap-2">
        {column(colL)}
        {right ? column(colR) : <div className={`p-2 text-sm ${t.faint}`}>No second army has figures in this group.</div>}
      </div>
      <p className={`text-xs ${t.faint}`}>Maximum figures from this app’s entries. Real ranges depend on charge, round, altitude and weather. Ukraine is not listed: its entries give no weapon ranges of its own.</p>
      </div>
      </div>
    </div>
  );
}


// ---------- kill chain: animated find → decide → strike → assess ----------
const KC_POS = { S: [150, 52], C: [70, 178], G: [205, 196], G2: [292, 220], T: [330, 88] };
const KC_PATH = {
  detect: 'M150,52 L330,88', laser: 'M150,52 L330,88', assess: 'M150,52 L330,88',
  report: 'M150,52 L70,178', task: 'M70,178 L205,196', fire: 'M205,196 Q270,-20 330,88', move: 'M205,196 L292,220'
};
const KC_ACT = { detect: 'Sensor Finds the Target', laser: 'Sensor Lights the Target', assess: 'Sensor Watches the Result', report: 'Sensor Reports', decide: 'Command Decides', task: 'Command Tasks the Shooter', fire: 'Shooter Fires', move: 'Shooter Moves' };

function KillChain() {
  const { t, go } = useApp();
  const [key, setKey] = useRemembered('chain.key', KILL_CHAINS[0].key);
  const [step, setStep] = useRemembered('chain.step', 0);
  const [playing, setPlaying] = useState(false);
  const chain = KILL_CHAINS.find((c) => c.key === key) || KILL_CHAINS[0];
  const steps = chain.steps;
  const cur = steps[Math.min(step, steps.length - 1)];
  const col = countryColour(chain.c);
  useEffect(() => {
    if (!playing) return undefined;
    if (step >= steps.length - 1) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setStep(step + 1), 3200);
    return () => clearTimeout(id);
  }, [playing, step, key]);
  const pick = (k) => { setKey(k); setStep(0); setPlaying(false); };
  const moved = steps.findIndex((x) => x.act === 'move');
  const gAt = moved >= 0 && step >= moved ? KC_POS.G2 : KC_POS.G;
  const hit = steps.findIndex((x) => x.act === 'fire');
  const hitDone = hit >= 0 && step > hit;
  const node = (k, label, fill, xy) => {
    const [x, y] = xy || KC_POS[k];
    const active = (cur.act === 'decide' && k === 'C') || (['detect', 'laser', 'assess', 'report'].includes(cur.act) && k === 'S') ||
      (cur.act === 'task' && (k === 'C' || k === 'G')) || (['fire', 'move'].includes(cur.act) && k === 'G') ||
      (['detect', 'laser', 'fire', 'assess'].includes(cur.act) && k === 'T');
    return (
      <g key={k}>
        {active && <circle cx={x} cy={y} r="22" fill={fill} opacity="0.18"><animate attributeName="r" values="16;26;16" dur="1.6s" repeatCount="indefinite" /></circle>}
        <circle cx={x} cy={y} r="13" fill={fill} stroke="currentColor" strokeOpacity={active ? 0.9 : 0.2} strokeWidth="2" />
        <text x={x} y={y + (k === 'S' ? -20 : 30)} fontSize="12.5" fontWeight="700" textAnchor="middle" fill="currentColor">{label}</text>
      </g>
    );
  };
  const armyPick = <Pick wide label="Army" value={key} onChange={(v) => v && pick(v)} options={KILL_CHAINS.slice().sort((x, y) => byCountry(x.c, y.c)).map((c) => ({ value: c.key, label: c.c + ': ' + c.name }))} />;
  const path = KC_PATH[cur.act];
  const lineCol = cur.act === 'laser' ? '#ef4444' : cur.act === 'fire' ? '#f59e0b' : col;
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Kill Chain</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>How each army closes the loop from finding a target to striking it. Press Play, or step through.</p>
      </div>
      <div className="lg:hidden">{armyPick}</div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
      <div className={`sticky top-14 lg:top-20 self-start z-10 pb-2 ${t.page}`}>
        <Card className="!p-2 sm:!p-4">
          <svg viewBox="0 0 400 260" className="w-full mx-auto block" style={{ maxWidth: diagMax(400, 44) }} role="img" aria-label={chain.c + ' kill chain, step ' + (step + 1) + ': ' + cur.label}>
            <line x1="250" y1="10" x2="250" y2="250" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 6" />
            <text x="390" y="250" fontSize="11" textAnchor="end" fill="currentColor" opacity="0.5">enemy side</text>
            {path && (
              <g key={key + step}>
                <path d={path} fill="none" stroke={lineCol} strokeWidth={cur.act === 'fire' ? 3 : 2.5}
                  strokeDasharray={['detect', 'assess'].includes(cur.act) ? '6 5' : cur.act === 'report' || cur.act === 'task' ? '2 5' : ''} opacity="0.9" />
                <circle r="6" fill={lineCol}>
                  <animateMotion dur={cur.act === 'fire' ? '1.4s' : '1.1s'} repeatCount="indefinite" path={path} />
                </circle>
              </g>
            )}
            {node('T', chain.nodes.T, '#64748b')}
            {node('S', chain.nodes.S, col)}
            {node('C', chain.nodes.C, col)}
            {node('G', chain.nodes.G, col, gAt)}
            {hitDone && <g><circle cx="330" cy="88" r="20" fill="#f59e0b" opacity="0.25" /><text x="330" y="93" fontSize="14" textAnchor="middle">✸</text></g>}
          </svg>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {steps.map((x, i) => (
              <button key={i} type="button" aria-label={'Step ' + (i + 1) + ': ' + x.label} onClick={() => { setStep(i); setPlaying(false); }}
                className="h-2.5 rounded-full transition-all" style={{ width: i === step ? 22 : 10, background: i <= step ? col : 'currentColor', opacity: i <= step ? 1 : 0.2 }} />
            ))}
          </div>
        </Card>
      </div>
      <div className="space-y-3">
      <div className="hidden lg:block">{armyPick}</div>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: col }}>Step {step + 1} of {steps.length} · {cur.label}</span>
          {cur.time && <Tag>{cur.time}</Tag>}
        </div>
        <div className={`mt-1 text-xs ${t.muted}`}>{KC_ACT[cur.act]}</div>
        <p className="mt-2 text-base leading-relaxed">{cur.text}</p>
        <button type="button" onClick={() => go('entry', cur.id)} className={`mt-2 text-sm font-semibold ${t.link}`}>Entry › {(ENTRY_BY_ID[cur.id] || {}).title}</button>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        <Btn kind="ghost" disabled={step === 0} onClick={() => { setStep(step - 1); setPlaying(false); }}><ChevronLeft size={18} /> Back</Btn>
        {playing ? <Btn onClick={() => setPlaying(false)}>Pause</Btn>
          : <Btn onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying(true); }}><Play size={18} /> {step >= steps.length - 1 ? 'Replay' : 'Play'}</Btn>}
        <Btn kind="ghost" disabled={step >= steps.length - 1} onClick={() => { setStep(step + 1); setPlaying(false); }}>Next <ChevronRight size={18} /></Btn>
      </div>
      <p className={`text-xs ${t.faint}`}>A simplified picture built from this app’s entries; each step links to its source entry. Times are those the sources give.</p>
      </div>
      </div>
    </div>
  );
}

// Countries as hubs; a line joins two countries when entries link to each other (“Compare …”).
// One exercise: who took part, where and when, the fires practised, and the entries that cover it.
function ExerciseCard({ x }) {
  const { t, go } = useApp();
  const pill = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] leading-tight font-medium ${t.chip}`;
  return (
    <div className={`rounded-xl border p-3 min-w-0 space-y-1.5 ${t.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold leading-snug">{x.name}{x.kind ? <span className="block mt-0.5"><Tag tone="warn">{x.kind}</Tag></span> : null}</div>
        <ConfBadge value={x.confidence} />
      </div>
      <div className={`text-xs ${t.muted}`}>{x.dates}{x.place ? ' · ' + x.place : ''}</div>
      <div className="flex flex-wrap gap-1">
        {x.armies.map((c) => <span key={c} className={pill}><span className="w-2 h-2 rounded-full" style={{ background: countryColour(c) }} />{c}</span>)}
        {asList(x.others).map((c) => <span key={c} className={`${pill} border-dashed`}>{c}</span>)}
      </div>
      <p className="text-sm leading-relaxed">{x.fires}</p>
      <div className="flex flex-wrap gap-1.5">
        {asList(x.entryIds).map((id) => ENTRY_BY_ID[id] && (
          <button key={id} type="button" onClick={() => go('entry', id)} className={`text-xs underline underline-offset-2 text-left ${t.link}`}>{ENTRY_BY_ID[id].title}</button>
        ))}
      </div>
      {asList(x.sources).length > 0 && (
        <div className={`text-[11px] ${t.faint}`}>Source: {asList(x.sources).map((s, i) => <span key={i}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.publisher}</a></span>)}</div>
      )}
    </div>
  );
}

function MilitaryMap() {
  const { t, go, lib, setLib } = useApp();
  const [topic, setTopic] = useRemembered('map.topic', null);
  const [a, setA] = useRemembered('map.a', 'United States');
  const [b, setB] = useRemembered('map.b', 'Russia');
  // Links: entries written for comparison, or exercises the armies train in together.
  const [mode, setMode] = useRemembered('map.mode', 'Comparisons');
  const exMode = mode === 'Exercises';
  const countries = ALL_COUNTRIES;
  const pairs = useMemo(() => {
    const seen = Object.create(null), out = [];
    APP_DATA.forEach((e) => asList(e.relatedIds).forEach((r) => {
      const o = ENTRY_BY_ID[r];
      if (!o || o.country === e.country) return;
      if (topic && e.topic !== topic && o.topic !== topic) return;
      const k = [e.id, o.id].sort().join('~');
      if (seen[k]) return;
      seen[k] = 1; out.push([e, o]);
    }));
    return out;
  }, [topic]);
  const edges = useMemo(() => {
    const m = Object.create(null);
    pairs.forEach(([x, y]) => { const k = [x.country, y.country].sort().join('|'); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map((k) => ({ k, c1: k.split('|')[0], c2: k.split('|')[1], n: m[k] }));
  }, [pairs]);
  const exEdges = useMemo(() => {
    const m = Object.create(null);
    EXERCISES.forEach((x) => {
      const arm = x.armies.filter((c) => ALL_COUNTRIES.includes(c));
      arm.forEach((p, i) => arm.slice(i + 1).forEach((q) => { const k = [p, q].sort().join('|'); m[k] = (m[k] || 0) + 1; }));
    });
    return Object.keys(m).map((k) => ({ k, c1: k.split('|')[0], c2: k.split('|')[1], n: m[k] }));
  }, []);
  const shown = exMode ? exEdges : edges;
  const exOf = (c) => EXERCISES_NEWEST.filter((x) => x.armies.includes(c));
  const exPair = a && b ? EXERCISES_NEWEST.filter((x) => x.armies.includes(a) && x.armies.includes(b)) : [];
  const count = (c) => APP_DATA.filter((e) => e.country === c && (!topic || e.topic === topic)).length;
  const C = 200, RAD = 145;
  const pos = Object.create(null);
  countries.forEach((c, i) => {
    const ang = (-90 + i * 360 / countries.length) * Math.PI / 180;
    pos[c] = [C + Math.cos(ang) * RAD, C + Math.sin(ang) * RAD];
  });
  const tapHub = (c) => {
    if (!a || (a && b)) { setA(c); setB(null); }
    else if (c === a) { setA(null); }
    else setB(c);
  };
  const tapEdge = (e) => { setA(e.c1); setB(e.c2); };
  const on = (e) => (a && b ? (e.c1 === a && e.c2 === b) || (e.c1 === b && e.c2 === a) : a ? e.c1 === a || e.c2 === a : true);
  const pairList = a && b ? pairs.filter(([x, y]) => (x.country === a && y.country === b) || (x.country === b && y.country === a))
    .map(([x, y]) => (x.country === a ? [x, y] : [y, x])) : [];
  // Each linked entry once, under its own topic, in its own army's column.
  const linkCount = Object.create(null);
  pairList.forEach(([x, y]) => { linkCount[x.id] = (linkCount[x.id] || 0) + 1; linkCount[y.id] = (linkCount[y.id] || 0) + 1; });
  const uniqBy = (list) => list.filter((e, i) => list.findIndex((o) => o.id === e.id) === i);
  const linkedL = uniqBy(pairList.map(([x]) => x));
  const linkedR = uniqBy(pairList.map(([, y]) => y));
  // Picker block: above the diagram on phones, at the top of the right column on wide screens.
  const mapControls = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Pick wide label="Left" value={a} onChange={(v) => { setA(v); if (!v) setB(null); }} options={countries} />
        <Pick wide label="Right" value={b} onChange={(v) => setB(v)} options={countries.filter((c) => c !== a)} />
      </div>
      <div className="flex gap-2" role="group" aria-label="Links">
        {['Comparisons', 'Exercises'].map((m) => <Chip key={m} on={mode === m} onClick={() => setMode(m)}>{m === 'Comparisons' ? 'Linked Entries' : 'Joint Exercises'}</Chip>)}
      </div>
      {!exMode && <Pick wide label="Topic" value={topic} onChange={(v) => { setTopic(v); }} options={ENTRY_TOPICS.map((x) => ({ value: x.key, label: x.name }))} />}
    </>
  );
  const partners = a && !b ? shown.filter((e) => e.c1 === a || e.c2 === a).map((e) => ({ c: e.c1 === a ? e.c2 : e.c1, n: e.n })).sort((p, q) => q.n - p.n) : [];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Military Map</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>{exMode ? 'Lines join armies that train together in joint and combined exercises (plus training programmes and operational cooperation, marked as such); thicker lines mean more links. Pick two armies, or tap a line, to see them.' : 'Pick two armies to see which of their entries are linked for comparison.'}{exMode ? '' : ' Each circle is a country, sized by its entries; thicker lines mean more links. You can also tap the circles or lines.'}</p>
      </div>
      <div className="space-y-3 lg:hidden">{mapControls}</div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
      <div className="lg:sticky lg:top-20 self-start">
      <Card className="!p-2 sm:!p-4">
        <svg viewBox="0 0 400 400" className="w-full mx-auto block" style={{ maxWidth: diagMax(300, 40) }} role="img" aria-label="Links between armies">
          {shown.map((e) => {
            const [x1, y1] = pos[e.c1], [x2, y2] = pos[e.c2];
            const w = 1.5 + Math.min(8, Math.sqrt(e.n) * 1.6);
            return (
              <g key={e.k} onClick={() => tapEdge(e)} style={{ cursor: 'pointer' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={on(e) ? 0.45 : 0.08} strokeWidth={w} />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="18" />
                {on(e) && (a || shown.length < 12) && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} fontSize="11" textAnchor="middle" fill="currentColor" opacity="0.8">{e.n}</text>
                )}
              </g>
            );
          })}
          {countries.map((c) => {
            const [x, y] = pos[c];
            const n = count(c);
            const r = 10 + Math.min(22, Math.sqrt(n) * 1.8);
            const picked = c === a || c === b;
            const dim = a && !picked && !(b ? false : shown.some((e) => (e.c1 === a && e.c2 === c) || (e.c2 === a && e.c1 === c)));
            return (
              <g key={c} onClick={() => tapHub(c)} style={{ cursor: 'pointer' }} opacity={dim ? 0.3 : 1}>
                <circle cx={x} cy={y} r={r} fill={countryColour(c)} fillOpacity={picked ? 0.9 : 0.6} stroke={picked ? 'currentColor' : 'none'} strokeWidth="2.5" />
                <text x={x} y={y + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill="#fff">{n}</text>
                <text x={x} y={y + r + 13} fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">{c}</text>
              </g>
            );
          })}
        </svg>
      </Card>
      </div>
      <div className="space-y-3 mt-4 lg:mt-0">
      <div className="hidden lg:block space-y-3">{mapControls}</div>
      {exMode && !a && (
        <div className="space-y-2">
          <p className={`text-sm ${t.muted}`}>{EXERCISES.length} exercises. Some join an army in the app with partners outside it (New Zealand, the United Kingdom, NATO and CSTO members); those are listed under that army.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{EXERCISES_NEWEST.map((x) => <ExerciseCard key={x.id} x={x} />)}</div>
        </div>
      )}
      {exMode && a && (
        <div className="space-y-2">
          {!b && (
            <div className="flex flex-wrap gap-2">
              {partners.map((p) => <Chip key={p.c} on={false} onClick={() => setB(p.c)}>{p.c} · {p.n}</Chip>)}
            </div>
          )}
          <div className="font-semibold">{b ? a + ' and ' + b + ': ' + exPair.length + ' shared exercise' + (exPair.length === 1 ? '' : 's') : a + ': ' + exOf(a).length + ' exercise' + (exOf(a).length === 1 ? '' : 's')}</div>
          {(b ? exPair : exOf(a)).length === 0 ? <Empty>No shared exercise in the app yet. The Liaison agent adds exercises as sources confirm them.</Empty>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{(b ? exPair : exOf(a)).map((x) => <ExerciseCard key={x.id} x={x} />)}</div>}
        </div>
      )}
      {!exMode && !a && <p className={`text-sm ${t.muted}`}>{pairs.length} links between armies{topic ? ' in this topic' : ''}. Most run through the United States, because each country module was written to compare with it.</p>}
      {!exMode && a && !b && (
        <div className="space-y-2">
          <div className="font-semibold">{a}: {count(a)} entries{topic ? ' in this topic' : ''}</div>
          <div className="flex flex-wrap gap-2">
            {partners.map((p) => <Chip key={p.c} on={false} onClick={() => setB(p.c)}>{p.c} · {p.n}</Chip>)}
            {partners.length === 0 && <span className={`text-sm ${t.muted}`}>No links to other armies{topic ? ' in this topic' : ''}.</span>}
          </div>
          <Btn kind="ghost" onClick={() => { setLib({ ...lib, tab: 'Entries', query: '', filters: topic ? { country: a, topic } : { country: a } }); }}>Show {a} entries in the Library</Btn>
        </div>
      )}
      {!exMode && a && b && (
        <div className="space-y-3">
          <div className={`grid grid-cols-2 gap-2 sticky top-14 z-10 py-1 ${t.page}`}>
            <SideHead country={a} sub={linkedL.length + ' Linked ' + (linkedL.length === 1 ? 'Entry' : 'Entries')} />
            <SideHead country={b} sub={linkedR.length + ' Linked ' + (linkedR.length === 1 ? 'Entry' : 'Entries')} />
          </div>
          {pairList.length === 0 ? <Empty>No direct links between these two{topic ? ' in this topic' : ''}. Try another army or All topics.</Empty>
            : <p className={`text-sm ${t.muted}`}>{pairList.length} link{pairList.length === 1 ? '' : 's'}{topic ? ' in ' + topicName(topic) : ''}. Each entry is listed once, under its own topic; open it to see what it is linked to.</p>}
          {ALL_TOPICS.map((tp) => {
            const l = linkedL.filter((e) => e.topic === tp.key);
            const r = linkedR.filter((e) => e.topic === tp.key);
            if (!l.length && !r.length) return null;
            const cell = (list) => (
              <div className="space-y-1.5 min-w-0">
                {list.length === 0 ? <div className={`p-2 text-sm ${t.faint}`}>—</div> : list.map((e) => (
                  <button key={e.id} type="button" onClick={() => go('entry', e.id)} className={`w-full text-left p-2 rounded-lg border text-sm leading-snug ${t.card}`}>
                    <span className="font-semibold">{e.title}</span>
                    <span className={`block text-xs ${t.muted}`}>linked to {linkCount[e.id]} {linkCount[e.id] === 1 ? 'entry' : 'entries'}</span>
                  </button>
                ))}
              </div>
            );
            return (
              <div key={tp.key}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.muted}`}>{tp.name}</div>
                <div className="grid grid-cols-2 gap-2">{cell(l)}{cell(r)}</div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

function Coverage() {
  const { t, lib, setLib, go } = useApp();
  const open = (country, topic) => { setLib({ ...lib, tab: 'Entries', query: '', filters: { country, topic } }); go('library'); };
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Coverage</h1>
      <p className={t.muted}>Entries per country and topic. A dash means nothing has been added yet. Tap a number to open those entries.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className={`text-left p-2 border-b ${t.border}`}>Topic</th>
              {ALL_COUNTRIES.map((c) => <th key={c} className={`text-center p-2 border-b ${t.border}`}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {ENTRY_TOPICS.map((x) => (
              <tr key={x.key}>
                <td className={`p-2 border-b ${t.border}`}>{x.name}</td>
                {ALL_COUNTRIES.map((c) => {
                  const n = APP_DATA.filter((e) => e.topic === x.key && e.country === c).length;
                  return (
                    <td key={c} className={`text-center p-2 border-b ${t.border}`}>
                      {n ? <button type="button" className={`font-semibold underline underline-offset-2 ${t.link}`} onClick={() => open(c, x.key)}>{n}</button> : <span className={t.faint}>–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// First letter of a term for the A to Z filter; terms starting with a digit go under "0-9".
const termLetter = (term) => { const c = String(term).trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '0-9'; };
const GLOSSARY_LETTERS = ['0-9'].concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

function GlossaryList() {
  const { t } = useApp();
  const [q, setQ] = useState('');
  const [letter, setLetter] = useRemembered('glossary.letter', 'A');
  const needle = q.trim().toLowerCase();
  const has = new Set(GLOSSARY.map((g) => termLetter(g.term)));
  // A search looks through every letter; otherwise only the chosen letter is shown.
  const list = GLOSSARY.filter((g) => needle
    ? (g.term + ' ' + g.full + ' ' + (g.plain || '')).toLowerCase().includes(needle)
    : (letter === 'All' || termLetter(g.term) === letter))
    .slice().sort((x, y) => x.term.localeCompare(y.term));
  return (
    <div className="space-y-3">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a term or abbreviation"
        className={`w-full min-h-[44px] rounded-lg border px-3 text-base ${t.input}`} />
      <div className="flex flex-wrap gap-1" role="group" aria-label="First letter">
        {['All'].concat(GLOSSARY_LETTERS).map((L) => {
          const on = !needle && letter === L;
          const off = L !== 'All' && !has.has(L);
          return (
            <button key={L} type="button" disabled={off} onClick={() => { setLetter(L); setQ(''); }}
              className={`min-w-[36px] h-9 px-2 rounded-lg border text-sm font-semibold ${on ? t.chipOn : t.chip} ${off ? 'opacity-30' : ''}`}>{L}</button>
          );
        })}
      </div>
      <div className={`text-sm ${t.muted}`}>{needle ? list.length + ' matches across all letters' : list.length + ' of ' + GLOSSARY.length + ' terms' + (letter === 'All' ? '' : ' · ' + letter)}</div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {list.map((g) => (
          <div key={g.term} className={`rounded-xl border p-3 sm:p-4 min-w-0 ${t.card}`}>
            <div className="font-bold text-sm sm:text-base break-words">{g.term}</div>
            <div className={`text-xs sm:text-sm ${t.muted}`}>{g.full}</div>
            <p className="mt-1.5 text-sm leading-relaxed">{g.plain || 'Definition not yet added.'}</p>
            {g.context && <p className={`mt-1 text-xs ${t.faint}`}>{g.context}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// LEARN: home, learning path
// ==========================================
function lessonStatus(lesson, state) {
  const p = state.progress[lesson.id];
  const list = lessonsOf(lesson.topic);
  const idx = list.findIndex((l) => l.id === lesson.id);
  // Part 5 (Other armies): each country lesson stands alone, so all are open from the start.
  // Parts 1-4 build lesson on lesson and unlock in order.
  const topic = ALL_TOPICS.find((x) => x.key === lesson.topic);
  const anyOrder = !!(topic && topic.part === 5);
  const prevPassed = anyOrder || idx <= 0 || !!(state.progress[list[idx - 1].id] || {}).passed;
  const passed = !!(p && p.passed);
  // A passed lesson is flagged when one of its entries was added or updated in a later release.
  const changed = passed && lesson.entryIds.some((id) => {
    const e = ENTRY_BY_ID[id];
    return e && (isNewer(e.updatedIn, p.version) || isNewer(e.addedIn, p.version));
  });
  return { passed, open: state.freeStudy || prevPassed, best: p ? p.best : null, changed };
}

function nextLesson(state) {
  for (const topic of ALL_TOPICS) {
    const found = lessonsOf(topic.key).find((l) => {
      const s = lessonStatus(l, state);
      return s.open && !s.passed;
    });
    if (found) return found;
  }
  return null;
}

const dueReviews = (state) => Object.keys(state.review).filter((k) => state.review[k].due <= Date.now());

function ProgressBar({ value }) {
  const { t } = useApp();
  return (
    <div className={`h-2 rounded-full overflow-hidden ${t.soft}`}>
      <div className="h-full bg-teal-500 transition-all" style={{ width: Math.round(Math.max(0, Math.min(1, value)) * 100) + '%' }} />
    </div>
  );
}

// Shown when this copy of the app is older than a monthly cycle. A share link is a fixed
// copy and never updates itself, so the learner has to open the current one.
function UpdateDue() {
  const { t, go } = useApp();
  const age = contentAgeDays();
  if (age <= STALE_AFTER_DAYS) return null;
  // The website is always the current version: only copies elsewhere (such as Canvas share links) get this warning.
  const onWebsite = typeof window !== 'undefined' && (window.FIRES_ATLAS_ASK ||
    (APP_LINK && window.location && window.location.origin === new URL(APP_LINK).origin));
  if (onWebsite) return null;
  return (
    <div className={`p-3 rounded-lg border text-sm ${t.warn}`}>
      <div className="font-bold">This copy is {age} days old. A newer version is probably available.</div>
      <div className="mt-1">
        {APP_LINK ? (
          <>Open the current version at <a href={APP_LINK} target="_blank" rel="noreferrer" className="underline font-semibold break-all">{APP_LINK}</a>.</>
        ) : 'Ask your instructor for the current link.'}
        {' '}To keep your progress, copy it here first and restore it there.
      </div>
      <Btn kind="ghost" className="mt-2" onClick={() => go('more')}><Copy size={16} /> Copy my progress</Btn>
    </div>
  );
}

function HomeView() {
  const { t, state, go, storageOk, lib, setLib } = useApp();
  const explore = (tab) => { setLib({ ...lib, tab }); go('library'); };
  const next = nextLesson(state);
  const resume = state.last && LESSON_BY_ID[state.last.lessonId] ? LESSON_BY_ID[state.last.lessonId] : null;
  const due = dueReviews(state).length;
  const news = changesSince(state.seenVersion);
  const hasNews = isNewer(CONTENT.version, state.seenVersion);
  const fresh = Object.keys(state.progress).length === 0 && !state.last;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Fires Atlas</h1>
        <p className={`mt-1 ${t.muted}`}>How the world's armies organise, equip, train and employ their fires. Open sources only.</p>
      </div>

      {!storageOk && (
        <div className={`p-3 rounded-lg border text-sm ${t.bad}`}>Progress cannot be saved in this browser. Export your progress from More before you close the page.</div>
      )}

      {hasNews && (
        <button type="button" onClick={() => go('news')} className={`w-full text-left p-4 rounded-xl border ${t.info}`}>
          <div className="flex items-center gap-2 font-bold"><Star size={18} /> Content updated to version {CONTENT.version}</div>
          <div className="mt-1 text-sm">{news.length > 0 ? `${news.length} change${news.length === 1 ? '' : 's'} since your last visit. ` : ''}See what changed.</div>
        </button>
      )}
      <UpdateDue />

      <div>
        <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${t.muted}`}>Explore</div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { icon: Lightbulb, name: 'Developments', text: (asList(DEVELOPMENTS.insights).length ? 'Key Insights for ' + DEVELOPMENTS.insights[0].title + ', and ' : '') + DEVELOPMENTS.items.length + ' news items. Updated ' + DEVELOPMENTS.updated + '.', open: () => go('developments') },
            { icon: Target, name: 'Ranges', text: 'Guns, mortars and missiles compared as rings.', open: () => explore('Ranges') },
            { icon: Share2, name: 'Military Map', text: 'How the armies in this app link and compare.', open: () => explore('Map') },
            { icon: Zap, name: 'Kill Chain', text: 'Watch armies go from finding a target to striking it.', open: () => explore('Kill Chain') }
          ].map((c) => (
            <button key={c.name} type="button" onClick={c.open} className={`flex flex-col text-left rounded-xl border p-3 sm:p-4 min-w-0 ${t.card}`}>
              <div className="flex items-start gap-1.5 sm:gap-2">
                {React.createElement(c.icon, { size: 18, className: `shrink-0 mt-0.5 sm:mt-1 ${t.link}` })}
                <div className="font-bold text-sm sm:text-lg leading-snug">{c.name}</div>
              </div>
              <div className={`mt-1 text-xs sm:text-sm line-clamp-3 sm:line-clamp-none ${t.muted}`}>{c.text}</div>
            </button>
          ))}
        </div>
      </div>

      <Card>
        {resume || next ? (
          <>
            <div className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}>{resume ? 'Resume where you stopped' : 'Next lesson'}</div>
            <div className="mt-1 text-xl font-bold">{(resume || next).title}</div>
            <div className={`mt-1 text-sm ${t.muted}`}>{topicName((resume || next).topic)} · Level {(resume || next).level} · about 10 minutes</div>
            <Btn className="mt-4 w-full sm:w-auto" onClick={() => go('lesson', (resume || next).id)}><Play size={18} /> Continue learning</Btn>
          </>
        ) : LESSONS.length === 0 ? (
          <div className={t.muted}>No lessons have been added yet.</div>
        ) : (
          <>
            <div className="text-xl font-bold">Every lesson passed</div>
            <div className={`mt-1 ${t.muted}`}>Keep it fresh in Review, or browse the Library. New content arrives with each monthly update.</div>
          </>
        )}
        {fresh && (
          <button type="button" onClick={() => go('more')} className={`mt-4 block text-sm underline ${t.muted}`}>Used Fires Atlas before on another link? Restore your progress.</button>
        )}
      </Card>

      {due > 0 && (
        <button type="button" onClick={() => go('review')} className={`w-full text-left p-4 rounded-xl border ${t.warn}`}>
          <div className="flex items-center gap-2 font-bold"><RotateCcw size={18} /> {due} question{due === 1 ? '' : 's'} due for review</div>
          <div className="mt-1 text-sm">Questions you missed come back after {REVIEW_STEPS.join(', ')} days.</div>
        </button>
      )}

      <div>
        <h2 className="text-lg font-bold mb-3">Topics</h2>
        {ALL_TOPICS.length === 0 ? <Empty>No topics have been added yet.</Empty> : (
          <div className="space-y-5">
            {PARTS.map((pt) => {
              // Country topics (Part 5) run A–Z by country; other parts keep their teaching order.
              const inPart = ALL_TOPICS.filter((x) => x.part === pt.part)
                .sort((x, y) => (x.country && y.country ? x.country.localeCompare(y.country) : 0));
              if (inPart.length === 0) return null;
              return (
                <div key={pt.part}>
                  <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${t.muted}`}>Part {pt.part} · {pt.name}</div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {inPart.map((topic) => {
                      const list = lessonsOf(topic.key);
                      const done = list.filter((l) => lessonStatus(l, state).passed).length;
                      const count = uniq(list.flatMap((l) => l.entryIds)).length;
                      return (
                        <button key={topic.key} type="button" onClick={() => go('topic', topic.key)} className={`flex flex-col text-left rounded-xl border p-3 sm:p-4 min-w-0 ${t.card}`}>
                          {topic.country && <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${t.country}`}>{topic.country}</div>}
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            {React.createElement(topicIcon(topic), { size: 18, className: `shrink-0 mt-0.5 sm:mt-1 ${topic.country ? t.country : t.link}` })}
                            <div className="font-bold text-sm sm:text-lg leading-snug">{topic.name}</div>
                          </div>
                          <div className={`mt-1 text-xs sm:text-sm line-clamp-3 sm:line-clamp-none ${t.muted}`}>{topic.description}</div>
                          <div className="mt-auto pt-3"><ProgressBar value={list.length ? done / list.length : 0} /></div>
                          <div className={`mt-1.5 text-xs sm:text-sm ${t.muted}`}>{done}/{list.length} lessons<span className="hidden sm:inline"> passed</span> · {count} entries</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`text-sm ${t.faint}`}>Content version {CONTENT.version}, released {CONTENT.released}.</div>
    </div>
  );
}

function TopicView({ topicKey }) {
  const { t, state, go, lib, setLib } = useApp();
  const topic = TOPICS.find((x) => x.key === topicKey);
  if (!topic) return <Empty>Not yet added.</Empty>;
  const list = lessonsOf(topicKey);
  return (
    <div className="space-y-5">
      <div>
        {topic.country && <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${t.country}`}>{topic.country}</div>}
        <h1 className="text-2xl font-bold">{topic.name}</h1>
        <p className={`mt-1 ${t.muted}`}>{topic.description}</p>
        {topic.country && EXERCISES.some((x) => x.armies.includes(topic.country)) && (
          <div className="mt-3 text-sm">
            <span className="font-semibold">Trains with: </span>
            {EXERCISES_NEWEST.filter((x) => x.armies.includes(topic.country)).map((x, i) => {
              const partners = x.armies.filter((c) => c !== topic.country).concat(asList(x.others));
              return (
                <span key={x.id}>{i ? ' · ' : ''}
                  <button type="button" className={`underline underline-offset-2 ${t.link}`} onClick={() => { VIEW_MEMORY['map.mode'] = 'Exercises'; VIEW_MEMORY['map.a'] = topic.country; VIEW_MEMORY['map.b'] = null; setLib({ ...lib, tab: 'Map' }); go('library'); }}>{x.name}</button>
                  {partners.length ? <span className={t.muted}> ({partners.join(', ')})</span> : null}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {list.length === 0 && <Empty>Lessons for this topic have not been added yet. Its entries are in the Library.</Empty>}
      {LEVELS.map((lv) => {
        const inLevel = list.filter((l) => l.level === lv.level);
        if (inLevel.length === 0) return null;
        return (
          <div key={lv.level}>
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-lg font-bold">Level {lv.level}: {lv.name}</h2>
            </div>
            <p className={`text-sm mb-3 ${t.muted}`}>{lv.blurb}</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {inLevel.map((l, li) => {
                const s = lessonStatus(l, state);
                return (
                  <button key={l.id} type="button" disabled={!s.open} onClick={() => go('lesson', l.id)}
                    className={`flex flex-col text-left rounded-xl border p-3 sm:p-4 min-w-0 ${t.card} ${s.open ? '' : 'opacity-50'}`}>
                    <span className="flex items-center gap-2 mb-1.5">
                      <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${s.passed ? t.good : s.open ? t.info : t.chip}`}>
                        {s.passed ? <Check size={16} /> : s.open ? <Play size={14} /> : <Lock size={14} />}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}>Lesson {li + 1}</span>
                    </span>
                    <span className="block font-bold text-sm sm:text-base leading-snug">{l.title}</span>
                    <span className={`mt-auto pt-2 block text-xs sm:text-sm ${t.muted}`}>
                      ~{lessonMinutes(l)} min · {l.exercises.length} questions
                      {s.best !== null ? ` · best ${Math.round(s.best * 100)}%` : ''}
                    </span>
                    {s.changed && <span className="block mt-1"><Tag tone="info"><Star size={12} /> Changed since you passed</Tag></span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// EXERCISES: choice, scenario, order, match, predict
// Correct answers are stored first in the data, so every list is shuffled on screen.
// ==========================================
const range = (n) => Array.from({ length: n }, (_, i) => i);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
};

function ChoiceEx({ ex, onResult }) {
  const { t } = useApp();
  const order = useMemo(() => shuffle(range(asList(ex.options).length)), [ex]);
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(false);
  const check = () => { setDone(true); onResult(pick === ex.answer); };
  return (
    <div className="space-y-3">
      {ex.situation && (
        <div className={`p-3 rounded-lg border text-base leading-relaxed ${t.info}`}><span className="font-bold">Situation: </span>{ex.situation}</div>
      )}
      <div className="text-lg font-semibold leading-snug"><TermText text={ex.q} /></div>
      <div className="space-y-2">
        {order.map((i) => {
          const tone = done ? (i === ex.answer ? t.good : i === pick ? t.bad : t.card) : (i === pick ? t.info : t.card);
          return (
            <button key={i} type="button" disabled={done} onClick={() => setPick(i)}
              className={`w-full text-left min-h-[48px] px-4 py-3 rounded-lg border text-base leading-snug ${tone}`}>
              {ex.options[i]}
            </button>
          );
        })}
      </div>
      {!done && <Btn disabled={pick === null} onClick={check}>Check answer</Btn>}
    </div>
  );
}

function OrderEx({ ex, onResult }) {
  const { t } = useApp();
  const steps = asList(ex.steps);
  const [items, setItems] = useState(() => {
    let s = shuffle(range(steps.length));
    for (let n = 0; n < 5 && steps.length > 1 && s.every((v, i) => v === i); n++) s = shuffle(range(steps.length));
    return s;
  });
  const [done, setDone] = useState(false);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp;
    setItems(next);
  };
  const check = () => { setDone(true); onResult(items.every((v, i) => v === i)); };
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-snug"><TermText text={ex.q} /></div>
      <div className={`text-sm ${t.muted}`}>Use the arrows to put the steps in order, first step at the top.</div>
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={v} className={`flex items-center gap-2 p-2 rounded-lg border ${done ? (v === i ? t.good : t.bad) : t.card}`}>
            <span className="shrink-0 w-7 text-center font-bold">{i + 1}</span>
            <span className="flex-1 text-base leading-snug">{steps[v]}{done && v !== i ? <span className="block text-sm opacity-80">Correct position: {v + 1}</span> : null}</span>
            {!done && (
              <span className="shrink-0 flex gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}
                  className={`w-11 h-11 rounded-lg flex items-center justify-center disabled:opacity-30 ${t.btn2}`}><ArrowUp size={18} /></button>
                <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}
                  className={`w-11 h-11 rounded-lg flex items-center justify-center disabled:opacity-30 ${t.btn2}`}><ArrowDown size={18} /></button>
              </span>
            )}
          </div>
        ))}
      </div>
      {!done && <Btn onClick={check}>Check order</Btn>}
    </div>
  );
}

function MatchEx({ ex, onResult }) {
  const { t } = useApp();
  const pairs = asList(ex.pairs);
  const rights = useMemo(() => shuffle(pairs.map((p) => p[1])), [ex]);
  const [sel, setSel] = useState({});
  const [done, setDone] = useState(false);
  const complete = pairs.every((p, i) => sel[i]);
  const check = () => { setDone(true); onResult(pairs.every((p, i) => sel[i] === p[1])); };
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-snug"><TermText text={ex.q} /></div>
      <div className="space-y-3">
        {pairs.map((p, i) => {
          const ok = sel[i] === p[1];
          return (
            <div key={i} className={`p-3 rounded-lg border ${done ? (ok ? t.good : t.bad) : t.card}`}>
              <div className="font-semibold text-base leading-snug mb-2">{p[0]}</div>
              <select value={sel[i] || ''} disabled={done} aria-label={'Match for ' + p[0]}
                onChange={(e) => setSel({ ...sel, [i]: e.target.value })}
                className={`w-full min-h-[44px] rounded-lg border px-3 text-base ${t.input}`}>
                <option value="">Choose the match</option>
                {rights.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {done && !ok && <div className="mt-2 text-sm">Correct match: {p[1]}</div>}
            </div>
          );
        })}
      </div>
      {!done && <Btn disabled={!complete} onClick={check}>Check matches</Btn>}
    </div>
  );
}

// Open question. The learner answers first, then marks their own answer against the model answer.
function PredictEx({ ex, onResult }) {
  const { t } = useApp();
  const [shown, setShown] = useState(false);
  const [marked, setMarked] = useState(false);
  const mark = (ok) => { setMarked(true); onResult(ok); };
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-snug"><TermText text={ex.q} /></div>
      <textarea rows={3} disabled={shown} placeholder="Type your answer, or say it aloud. It is not stored."
        className={`w-full rounded-lg border p-3 text-base ${t.input}`} />
      {!shown && <Btn onClick={() => setShown(true)}>Show the answer</Btn>}
      {shown && (
        <div className={`pl-4 border-l-4 ${t.why}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.whyT}`}>Answer</div>
          <div className="text-base leading-relaxed max-w-[70ch]"><TermText text={ex.a} /></div>
        </div>
      )}
      {shown && !marked && (
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => mark(true)}><Check size={18} /> I had the main point</Btn>
          <Btn kind="ghost" onClick={() => mark(false)}>I missed it</Btn>
        </div>
      )}
    </div>
  );
}

const EXERCISE_TYPES = { choice: ChoiceEx, scenario: ChoiceEx, order: OrderEx, match: MatchEx, predict: PredictEx };

// One exercise with its feedback. onResult(true | false) is called once.
function Exercise({ ex, onResult }) {
  const { t } = useApp();
  const [result, setResult] = useState(null);
  const [showEntry, setShowEntry] = useState(false);
  const entry = ENTRY_BY_ID[ex.entryId];
  const Body = EXERCISE_TYPES[ex.type];
  const report = (ok) => { setResult(ok); onResult(ok); };

  if (!Body) {
    return (
      <div className="space-y-3">
        <Empty>This question type is not supported yet.</Empty>
        {result === null && <Btn kind="ghost" onClick={() => report(true)}>Skip</Btn>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Body ex={ex} onResult={report} />
      {result !== null && (
        <div className={`p-3 rounded-lg border text-base leading-relaxed ${result ? t.good : t.bad}`}>
          <div className="font-bold">{result ? 'Correct.' : ex.type === 'predict' ? 'Noted. It will come back in Review.' : 'Not quite. It will come back in Review.'}</div>
          {ex.why && <div className="mt-1">{ex.why}</div>}
        </div>
      )}
      {result !== null && entry && (
        <div>
          <button type="button" className={`text-sm font-semibold inline-flex items-center gap-1 ${t.link}`} onClick={() => setShowEntry(!showEntry)}>
            <BookOpen size={16} /> {showEntry ? 'Hide the entry' : 'Read the entry: ' + entry.title}
          </button>
          {showEntry && <div className="mt-3"><EntryCard entry={entry} startOpen /></div>}
        </div>
      )}
    </div>
  );
}

// ==========================================
// LESSON PLAYER and REVIEW
// ==========================================
const toTop = () => { try { window.scrollTo(0, 0); } catch (err) { /* not available in every preview */ } };

// One entry inside a lesson: What, then How, then the learner commits to a Why before it is shown.
function EntryStep({ entry, onNext }) {
  const { t } = useApp();
  const [stage, setStage] = useState(0);
  return (
    <TermScope kit={EQUIPMENT_LINKS[entry.id]}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag>{entry.force}</Tag>
        {sortEchelons(entry.echelon).filter((x) => x !== 'N/A').map((x) => <Tag key={x}>{x}</Tag>)}
        <ConfBadge value={entry.confidence} />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold leading-snug"><KitTitle text={entry.title} /></h2>
      {entry.changeNote && (
        <div className={`p-3 rounded-lg border text-sm ${t.info}`}>
          <span className="font-bold">Changed in {entry.updatedIn || entry.addedIn}:</span> {entry.changeNote}
        </div>
      )}
      <Block kind="what" lines={entry.what} />
      {stage >= 1 && <Block kind="how" lines={entry.how} />}
      {stage === 1 && (
        <div className={`p-3 rounded-lg border text-base ${t.warn}`}>
          <span className="font-bold">Before you go on:</span> why do you think it is done this way? Settle on an answer, then reveal.
        </div>
      )}
      {stage >= 2 && <Block kind="why" lines={entry.why} />}
      <Btn className="w-full sm:w-auto" onClick={() => (stage < 2 ? setStage(stage + 1) : onNext())}>
        {['Show how it works', 'Reveal why', 'Continue'][stage]} <ArrowRight size={18} />
      </Btn>
    </div>
    </TermScope>
  );
}

function LessonView({ lessonId }) {
  const { t, state, update, go } = useApp();
  const lesson = LESSON_BY_ID[lessonId];
  const saved = state.last && state.last.lessonId === lessonId ? state.last : null;
  const [step, setStep] = useState(saved ? saved.step || 0 : 0);
  const [results, setResults] = useState(saved ? saved.results || {} : {});
  const [answered, setAnswered] = useState(false);
  const [outcome, setOutcome] = useState(null);
  useEffect(toTop, [step]);

  if (!lesson) return <Empty>This lesson has not been added yet.</Empty>;
  const list = lessonsOf(lesson.topic);
  const idx = list.findIndex((l) => l.id === lesson.id);
  const status = lessonStatus(lesson, state);
  if (!status.open) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-lg font-bold"><Lock size={18} /> {lesson.title}</div>
        <p className={`mt-2 ${t.muted}`}>This lesson opens when you pass the one before it. To read in any order, switch on free study under More.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {idx > 0 && <Btn onClick={() => go('lesson', list[idx - 1].id)}>Go to the lesson before</Btn>}
          <Btn kind="ghost" onClick={() => go('topic', lesson.topic)}>See the learning path</Btn>
        </div>
      </Card>
    );
  }

  const entries = lesson.entryIds.map((id) => ENTRY_BY_ID[id]).filter(Boolean);
  const exercises = asList(lesson.exercises);
  const total = 1 + entries.length + exercises.length; // intro, entries, exercises; the summary follows
  const at = Math.min(step, total);
  const exIndex = at - 1 - entries.length;

  const finish = () => {
    const right = exercises.filter((x, i) => results[i]).length;
    const score = exercises.length ? right / exercises.length : 1;
    const passed = score >= PASS_MARK;
    update((s) => {
      const prev = s.progress[lessonId] || {};
      const review = { ...s.review };
      exercises.forEach((x, i) => {
        if (!results[i]) review[lessonId + '#' + i] = { due: Date.now() + REVIEW_STEPS[0] * DAY, step: 0 };
      });
      return {
        last: null,
        review,
        progress: {
          ...s.progress,
          [lessonId]: {
            passed: !!prev.passed || passed,
            best: Math.max(prev.best || 0, score),
            version: passed ? CONTENT.version : prev.version || null,
            at: Date.now()
          }
        }
      };
    });
    setOutcome({ right, n: exercises.length, score, passed });
    setStep(total);
  };

  const advance = () => {
    const nextStep = at + 1;
    setAnswered(false);
    if (nextStep >= total) { finish(); return; }
    setStep(nextStep);
    update({ last: { lessonId, step: nextStep, results } });
  };

  const restart = () => { setStep(0); setResults({}); setAnswered(false); setOutcome(null); update({ last: null }); };

  let body;
  if (at >= total) {
    const o = outcome || { right: 0, n: exercises.length, score: status.best || 0, passed: status.passed };
    const missed = exercises.map((x, i) => ({ x, i })).filter((m) => !results[m.i]);
    const nextUp = list[idx + 1];
    body = (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl border ${o.passed ? t.good : t.warn}`}>
          <div className="text-2xl font-bold">{o.right} of {o.n} correct</div>
          <div className="mt-1 text-base">
            {o.passed ? (nextUp ? 'Lesson passed. The next lesson is open.' : 'Lesson passed.') : `The pass mark is ${Math.round(PASS_MARK * 100)}%. Read the entries you missed and try again.`}
          </div>
        </div>
        {outcome && missed.length > 0 && (
          <Card>
            <div className="font-bold mb-2">To revisit</div>
            <ul className="space-y-3">
              {missed.map((m) => (
                <li key={m.i} className="text-base leading-snug">
                  {m.x.q}
                  {ENTRY_BY_ID[m.x.entryId] && (
                    <button type="button" className={`block mt-0.5 text-sm font-semibold text-left ${t.link}`} onClick={() => go('entry', m.x.entryId)}>
                      Read: {ENTRY_BY_ID[m.x.entryId].title}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className={`mt-3 text-sm ${t.muted}`}>These questions return in Review after {REVIEW_STEPS.join(', ')} days.</div>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          {o.passed && nextUp && <Btn onClick={() => go('lesson', nextUp.id)}>Next lesson <ArrowRight size={18} /></Btn>}
          <Btn kind={o.passed ? 'ghost' : undefined} onClick={restart}><RotateCcw size={18} /> Try again</Btn>
          <Btn kind="ghost" onClick={() => go('topic', lesson.topic)}>Learning path</Btn>
        </div>
      </div>
    );
  } else if (at === 0) {
    body = (
      <div className="space-y-4">
        <div className={`text-sm font-bold uppercase tracking-widest ${t.muted}`}>{topicName(lesson.topic)} · Level {lesson.level}</div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug">{lesson.title}</h1>
        <div className={`p-3 rounded-lg border text-base ${t.info}`}><span className="font-bold">Objective: </span>{lesson.objective}</div>
        {lesson.intro && <p className="text-base leading-relaxed max-w-[70ch]">{lesson.intro}</p>}
        <Card>
          <div className="font-bold mb-2">In this lesson</div>
          <ul className="space-y-1.5">
            {entries.map((e) => <li key={e.id} className="text-base leading-snug">{e.title}</li>)}
          </ul>
          <div className={`mt-3 text-sm ${t.muted}`}>{entries.length} entries, then {exercises.length} questions. Pass mark {Math.round(PASS_MARK * 100)}%.</div>
        </Card>
        <Btn className="w-full sm:w-auto" onClick={advance}><Play size={18} /> Start</Btn>
      </div>
    );
  } else if (exIndex < 0) {
    const entry = entries[at - 1];
    body = <EntryStep key={entry.id} entry={entry} onNext={advance} />;
  } else {
    body = (
      <div className="space-y-4">
        <div className={`text-sm font-bold uppercase tracking-widest ${t.muted}`}>Question {exIndex + 1} of {exercises.length}</div>
        <Exercise key={exIndex} ex={exercises[exIndex]}
          onResult={(ok) => { setResults((r) => ({ ...r, [exIndex]: ok })); setAnswered(true); }} />
        {answered && (
          <Btn className="w-full sm:w-auto" onClick={advance}>
            {exIndex + 1 === exercises.length ? 'See the result' : 'Next question'} <ArrowRight size={18} />
          </Btn>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1"><ProgressBar value={at / total} /></div>
        <span className={`text-sm tabular-nums ${t.muted}`}>{Math.min(at + 1, total)} / {total}</span>
        <button type="button" aria-label="Leave the lesson" onClick={() => go('topic', lesson.topic)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.btn2}`}><X size={18} /></button>
      </div>
      {body}
    </div>
  );
}

// ---------- review: missed questions come back after 1, 3 and 7 days ----------
function reviewItem(key) {
  const cut = key.lastIndexOf('#');
  const lesson = LESSON_BY_ID[key.slice(0, cut)];
  const ex = lesson ? asList(lesson.exercises)[Number(key.slice(cut + 1))] : null;
  return ex ? { key, lesson, ex } : null;
}

function ReviewView() {
  const { t, state, update, go } = useApp();
  const [queue, setQueue] = useState(() => dueReviews(state).filter(reviewItem));
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState(false);
  useEffect(toTop, [pos]);
  const scheduled = Object.keys(state.review).filter(reviewItem);

  const record = (key, ok) => {
    update((s) => {
      const review = { ...s.review };
      const stepNow = (review[key] || {}).step || 0;
      if (!ok) review[key] = { due: Date.now() + REVIEW_STEPS[0] * DAY, step: 0 };
      else if (stepNow + 1 >= REVIEW_STEPS.length) delete review[key];
      else review[key] = { due: Date.now() + REVIEW_STEPS[stepNow + 1] * DAY, step: stepNow + 1 };
      return { review };
    });
    setAnswered(true);
  };

  if (queue.length === 0 || pos >= queue.length) {
    const nextDue = scheduled.length ? Math.min.apply(null, scheduled.map((k) => state.review[k].due)) : null;
    const days = nextDue ? Math.max(0, Math.ceil((nextDue - Date.now()) / DAY)) : null;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <Card>
          <div className="text-lg font-bold">{queue.length > 0 ? 'Review complete' : 'Nothing is due'}</div>
          <p className={`mt-1 ${t.muted}`}>
            {scheduled.length === 0
              ? 'Questions you miss in a lesson are kept here and come back after ' + REVIEW_STEPS.join(', ') + ' days.'
              : `${scheduled.length} question${scheduled.length === 1 ? ' is' : 's are'} scheduled. The next is due ${days === 0 ? 'today' : 'in ' + days + ' day' + (days === 1 ? '' : 's')}.`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {scheduled.length > 0 && (
              <Btn kind="ghost" onClick={() => { setQueue(scheduled); setPos(0); setAnswered(false); }}><RotateCcw size={18} /> Practise them now</Btn>
            )}
            <Btn onClick={() => go('home')}>Back to Learn</Btn>
          </div>
        </Card>
      </div>
    );
  }

  const item = reviewItem(queue[pos]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">Review</h1>
        <span className={`text-sm tabular-nums ${t.muted}`}>{pos + 1} / {queue.length}</span>
      </div>
      <ProgressBar value={pos / queue.length} />
      <div className={`text-sm ${t.muted}`}>From: {item.lesson.title}</div>
      <Exercise key={item.key + ':' + pos} ex={item.ex} onResult={(ok) => record(item.key, ok)} />
      {answered && (
        <Btn className="w-full sm:w-auto" onClick={() => { setPos(pos + 1); setAnswered(false); }}>
          {pos + 1 === queue.length ? 'Finish' : 'Next question'} <ArrowRight size={18} />
        </Btn>
      )}
    </div>
  );
}

// ==========================================
// PAGES: single entry, what's new, saved, feedback, more
// ==========================================
function legacyCopy(text) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (err) {
    return false;
  }
}

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
  } catch (err) { /* fall through */ }
  return Promise.resolve(legacyCopy(text));
}

// Copy button. Where the browser blocks copying, the text is shown so it can be selected by hand.
function CopyBox({ text, label }) {
  const { t } = useApp();
  const [status, setStatus] = useState(null);
  const value = typeof text === 'function' ? null : text;
  const run = () => {
    const body = typeof text === 'function' ? text() : text;
    copyText(body).then((ok) => setStatus(ok ? 'ok' : body));
  };
  return (
    <div>
      <Btn kind="ghost" onClick={run}><Copy size={16} /> {status === 'ok' ? 'Copied' : label}</Btn>
      {status && status !== 'ok' && (
        <div className="mt-2">
          <textarea readOnly rows={6} value={value || status} onFocus={(e) => e.target.select()}
            className={`w-full rounded-lg border p-3 text-sm font-mono ${t.input}`} />
          <div className={`mt-1 text-sm ${t.muted}`}>Copying is blocked in this view. Select the text above and copy it.</div>
        </div>
      )}
    </div>
  );
}

// Close controls inside a card opened on its own page (an entry or a news item): an X in the top-right corner
// and a Close button at the foot. Both return to where the card was opened, as Back does.
function CardCloseX({ onClose }) {
  const { t } = useApp();
  return (
    <button type="button" onClick={onClose} aria-label="Close"
      className={`absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center ${t.btn2}`}>
      <X size={18} />
    </button>
  );
}
function CardCloseFoot({ onClose }) {
  const { t } = useApp();
  return (
    <div className={`mt-4 pt-3 border-t flex justify-end ${t.border}`}>
      <button type="button" onClick={onClose} className={`inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg text-sm font-semibold ${t.btn2}`}>
        <X size={16} /> Close
      </button>
    </div>
  );
}

function EntryView({ id }) {
  const { back } = useApp();
  const entry = ENTRY_BY_ID[id];
  if (!entry) return <Empty>This entry has not been added yet.</Empty>;
  return <EntryCard entry={entry} startOpen onClose={back} />;
}

// ---------- what's new ----------
const CHANGE_KINDS = {
  new: { label: 'New', tone: 'good' },
  updated: { label: 'Updated', tone: 'info' },
  corrected: { label: 'Corrected', tone: 'warn' },
  withdrawn: { label: 'Withdrawn', tone: 'bad' }
};

function NewsView() {
  const { t, state, update, go } = useApp();
  const unread = isNewer(CONTENT.version, state.seenVersion);
  const records = CHANGELOG.slice().sort((a, b) => (a.version < b.version ? 1 : -1));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">What's new</h1>
        <p className={`mt-1 ${t.muted}`}>Content version {CONTENT.version}, released {CONTENT.released}. Content is reviewed against open sources.</p>
      </div>
      <UpdateDue />
      {unread && (
        <Card>
          <div className="font-bold">New and Updated labels are showing in the Library</div>
          <p className={`mt-1 text-sm ${t.muted}`}>They stay until you mark this release as read.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Btn onClick={() => update({ seenVersion: CONTENT.version })}><Check size={18} /> Mark as read</Btn>
          </div>
        </Card>
      )}
      {records.map((r) => (
        <Card key={r.version}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">Version {r.version}</span>
            <span className={`text-sm ${t.muted}`}>{r.date}</span>
            {isNewer(r.version, state.seenVersion) && <Tag tone="info"><Star size={12} /> New for you</Tag>}
          </div>
          {r.summary && <p className="mt-1 text-base leading-relaxed max-w-[70ch]">{r.summary}</p>}
          {asList(r.changes).length === 0 ? (
            <p className={`mt-2 text-sm ${t.muted}`}>No changes to individual entries in this release.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {r.changes.map((c, i) => {
                const kind = CHANGE_KINDS[c.kind] || { label: c.kind || 'Change', tone: 'info' };
                const entry = ENTRY_BY_ID[c.entryId];
                return (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 pt-0.5"><Tag tone={kind.tone}>{kind.label}</Tag></span>
                    <span className="min-w-0 text-base leading-snug">
                      {entry ? (
                        <button type="button" className={`font-semibold text-left ${t.link}`} onClick={() => go('entry', entry.id)}>{entry.title}</button>
                      ) : <span className="font-semibold">{c.title || (c.topic ? topicName(c.topic) : 'General')}</span>}
                      <span className="block">{c.summary}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------- equipment look-up: photos and specifications ----------
const specsUrl = (q) => 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(q);
const photosUrl = (q) => 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
const specsFor = (name) => {
  const s = EQUIPMENT_SPECS[name];
  return s && s.same ? EQUIPMENT_SPECS[s.same] : s;
};

// Photo and short summary from Wikipedia, fetched only when a learner opens a system.
// Uses the exact article title in EQUIPMENT_SPECS (w), never a free search, so it cannot
// pull an unrelated article. Returns null when offline, blocked or missing; links stay as fallback.
const WIKI_CACHE = {};
function wikiLookup(title) {
  const q = title;
  if (!WIKI_CACHE[q]) {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1'
      + '&titles=' + encodeURIComponent(q)
      + '&prop=pageimages%7Cextracts%7Cinfo&inprop=url&piprop=thumbnail&pithumbsize=640'
      + '&exintro=1&explaintext=1&exsentences=3';
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, 8000);
    WIKI_CACHE[q] = fetch(url, ctl ? { signal: ctl.signal } : undefined)
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => {
        const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
        const pg = pages[0];
        if (!pg || !pg.title || pg.missing !== undefined || pg.invalid !== undefined) return null;
        return {
          title: pg.title,
          url: pg.fullurl || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(pg.title.replace(/ /g, '_')),
          img: pg.thumbnail && pg.thumbnail.source ? pg.thumbnail.source : '',
          extract: pg.extract || ''
        };
      })
      .catch(() => { delete WIKI_CACHE[q]; return null; })
      .finally(() => clearTimeout(timer));
  }
  return WIKI_CACHE[q];
}

// Equipment card, opened on its own page from an entry or news item: photo and summary from Wikipedia,
// key figures from this app's sources, and outside search links. Close returns to the card it came from.
// ---------- short videos ----------
// The same clips serve a system listed under another name.
// Systems that share another system's clips (same equipment under another name), so no equipment shows more than two.
const VIDEO_SAME = { 'M777': 'M777A2', 'K9A2': 'K9 Thunder', 'K9PL / K9': 'K9 Thunder', 'XM1776 (K9)': 'K9 Thunder', 'PHL-16': 'PHL-191 / PHL-16' };
const reviewMode = () => { try { return /[?&]review\b/.test(window.location.search); } catch (e) { return false; } };
const videosFor = (n) => asList(VIDEO_LINKS[n] || VIDEO_LINKS[VIDEO_SAME[n]]).filter((c) => c.ok || reviewMode());

// One clip: a still image until tapped, so nothing loads from YouTube (data, cookies) unless the learner asks.
function VideoClip({ c }) {
  const { t } = useApp();
  const [play, setPlay] = useState(false);
  const watchUrl = 'https://www.youtube.com/watch?v=' + c.v + (c.s ? '&t=' + c.s + 's' : '');
  return (
    <div className={`rounded-lg border overflow-hidden ${t.border} ${t.card}`}>
      <div className="relative w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
        {play ? (
          <iframe className="absolute inset-0 w-full h-full" title={c.t}
            src={'https://www.youtube-nocookie.com/embed/' + c.v + '?autoplay=1&rel=0&playsinline=1&hl=en' + (c.lang ? '&cc_load_policy=1&cc_lang_pref=en' : '') + (c.s ? '&start=' + c.s : '')}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          c.warn ? (
            <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-white px-4 text-center" aria-label={'Combat footage. Play: ' + c.t}>
              <span className="rounded-full bg-red-700 p-3"><Play size={22} /></span>
              <span className="text-sm font-semibold">Combat footage: tap to play</span>
            </button>
          ) : (
          <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full group" aria-label={'Play: ' + c.t}>
            <img src={'https://i.ytimg.com/vi/' + c.v + '/hqdefault.jpg'} alt="" loading="lazy" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/70 p-3 text-white"><Play size={26} /></span>
            </span>
          </button>
          )
        )}
      </div>
      <div className="p-3 text-sm space-y-1">
        {(!c.ok || c.warn) && <div className="flex flex-wrap gap-1.5">
          {!c.ok && <Tag tone="info">Pending review</Tag>}
          {c.warn && <Tag tone="bad">Combat footage</Tag>}
        </div>}
        <div className="font-semibold leading-snug">{c.en || c.t}</div>
        {c.en && c.en !== c.t && <div className={`text-xs ${t.muted}`}>Original title: {c.t}</div>}
        <div className={`text-xs ${t.muted}`}>{c.lang ? <span className="font-semibold">In {c.lang} · </span> : null}{c.ch} · YouTube</div>
        {c.w && <div className="text-sm"><span className="font-semibold">Watch for: </span>{c.w}</div>}
        {c.warn && <div className="text-xs font-medium">{c.warn}</div>}
        {c.note && <div className={`text-xs ${t.muted}`}>{c.note}</div>}
        <a href={watchUrl} target="_blank" rel="noreferrer" className={`text-xs underline underline-offset-2 ${t.link}`}>Open on YouTube</a>
      </div>
    </div>
  );
}

// Review mode: every clip not yet approved, numbered, in one list.
const pendingVideos = () => {
  const out = [];
  Object.keys(VIDEO_LINKS).sort((a, b) => a.localeCompare(b)).forEach((n) => VIDEO_LINKS[n].forEach((c) => { if (!c.ok) out.push({ n, c }); }));
  // Combat footage last, in its own section.
  return out.filter((x) => !x.c.warn).concat(out.filter((x) => x.c.warn));
};
function VideoReview() {
  const { t } = useApp();
  const list = pendingVideos();
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold">Video Review</h2>
        <p className={`mt-1 text-base ${t.muted}`}>{list.length} clips are waiting. Watch each one, then send Claude the numbers to drop; the rest are switched on for all learners. Only you see this list (it needs ?review in the address).</p>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {list.map(({ n, c }, i) => (
          <div key={n + c.v} className="min-w-0 contents">
            {c.warn && (i === 0 || !list[i - 1].c.warn) && (
              <div className={`sm:col-span-2 p-3 rounded-lg border text-sm ${t.bad}`}>
                <span className="font-bold">Combat footage ({list.filter((x) => x.c.warn).length} clips).</span> Real strikes from the war in Ukraine, published by a party to the conflict or unverified. They show no preview image. Approve only those you judge fit for learners; approved ones keep the warning.
              </div>
            )}
            <div className="min-w-0">
            <div className="text-sm font-bold mb-1">#{i + 1} · {n}</div>
            <VideoClip c={c} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Library > Videos: every approved clip, filtered by army and weapon type. A tile opens the system's card on its Watch tab.
const VIDEO_TYPES = ['Guns and Howitzers', 'Mortars', 'Rockets and Missiles', 'Drones and Loitering Munitions', 'Ammunition',
  'Sensors and Targeting', 'Command and Control', 'Air Defence', 'Support Vehicles', 'Armoured Vehicles'];
const kitQuery = (n) => {
  for (const list of Object.values(EQUIPMENT_LINKS)) { const k = list.find((x) => x.n === n); if (k) return k.q; }
  for (const it of DEVELOPMENTS.items) { const k = asList(it.equipment).find((x) => x.n === n); if (k) return k.q; }
  return n;
};
// Country pills for a system: the armies it serves with (coloured dot for the eight armies in this app,
// "Others · Germany" for any other army) and, when different, the country that designed it.
const MAIN_ARMIES = () => Object.keys(COUNTRY_COLOUR);
// "Israel (reported)" counts under Israel; "Not disclosed" / "Not stated" counts under none and shows no pill.
const originsOf = (o) => String(o || '').replace(/\s*\(reported\)/gi, '').split(/, | and /).filter((x) => x && !/^Not /.test(x));
function CountryPills({ n, kind }) {
  const { t } = useApp();
  const m = VIDEO_META[n];
  if (!m) return null;
  const pill = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] leading-tight font-medium ${t.chip}`;
  const main = MAIN_ARMIES();
  return (
    <div className="flex flex-wrap gap-1">
      {m.c.map((cty) => (
        <span key={cty} className={pill} title={main.includes(cty) ? 'Army: ' + cty : 'Army outside the eight in this app: ' + cty}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COUNTRY_COLOUR[cty] || '#94a3b8' }} />
          {main.includes(cty) ? cty : 'Others · ' + cty}
        </span>
      ))}
      {originsOf(m.o).length > 0 && !m.c.some((cty) => originsOf(m.o).includes(cty)) && (
        <span className={`${pill} border-dashed`} title="Country that designed it">Designed in {m.o}</span>
      )}
      {kind && m.k && <span className={pill}>{m.k}</span>}
    </div>
  );
}

function VideoLibrary() {
  const { t, go } = useApp();
  const [country, setCountry] = useRemembered('videos.country', null);
  const [kind, setKind] = useRemembered('videos.kind', null);
  const [q, setQ] = useRemembered('videos.q', '');
  const needle = q.trim().toLowerCase();
  const all = [];
  Object.keys(VIDEO_LINKS).sort((a, b) => a.localeCompare(b)).forEach((n) => {
    const m = VIDEO_META[n] || { c: ['Others'], k: '', o: '' };
    videosFor(n).forEach((c) => all.push({ n, c, m }));
  });
  // A clip filed under two systems (e.g. a gun and its resupply vehicle) is shown once.
  { const seen = new Set(); for (let i = all.length - 1; i >= 0; i--) { if (seen.has(all[i].c.v)) all.splice(i, 1); else seen.add(all[i].c.v); } }
  // Country: one of the eight armies matches a system it uses or designed (NASAMS, Norway and US, is under United States);
  // Others matches a system serving with any other army.
  const main = MAIN_ARMIES();
  const countries = main.filter((c) => all.some((x) => x.m.c.includes(c) || originsOf(x.m.o).includes(c))).sort(byCountry).concat(['Others']);
  const inCountry = (x) => country === 'Others' ? x.m.c.some((c) => !main.includes(c)) : (x.m.c.includes(country) || originsOf(x.m.o).includes(country));
  const list = all.filter((x) => (!country || inCountry(x)) && (!kind || x.m.k === kind) &&
    (!needle || (x.n + ' ' + x.c.t + ' ' + x.c.ch).toLowerCase().includes(needle)));
  const systems = new Set(list.map((x) => x.n)).size;
  return (
    <div className="space-y-3">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a system or video"
        className={`w-full min-h-[44px] rounded-lg border px-3 text-base ${t.input}`} />
      <div className="flex flex-wrap gap-2">
        <Pick label="Country" value={country} onChange={setCountry} options={countries} />
        <Pick label="Weapon type" value={kind} onChange={setKind} options={VIDEO_TYPES.filter((k) => all.some((x) => x.m.k === k))} />
      </div>
      <div className={`text-xs ${t.faint}`}>Country shows what that army uses (in service, ordered or on trial) and what that country designed. “Others · Germany” marks an army outside the eight in this app.</div>
      <div className={`flex items-center justify-between text-sm ${t.muted}`}>
        <span>{list.length} videos · {systems} systems</span>
        {(country || kind || needle) && <button type="button" className={`font-semibold ${t.link}`} onClick={() => { setCountry(null); setKind(null); setQ(''); }}>Clear filters</button>}
      </div>
      {list.length === 0 ? <Empty>No video matches. Clear a filter or try another word.</Empty> : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {list.map(({ n, c, m }) => (
            <button key={n + c.v} type="button" onClick={() => go('kit', { n, q: kitQuery(n), tab: 'watch' })}
              className={`text-left rounded-xl border overflow-hidden min-w-0 ${t.border} ${t.card}`}>
              <div className="relative w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
                {c.warn ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900 text-white text-xs font-semibold text-center px-2">
                    <span className="rounded-full bg-red-700 p-2"><Play size={16} /></span>Combat footage
                  </div>
                ) : (
                  <>
                    <img src={'https://i.ytimg.com/vi/' + c.v + '/mqdefault.jpg'} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/70 p-2 text-white"><Play size={18} /></span></span>
                  </>
                )}
              </div>
              <div className="p-2.5 sm:p-3">
                <div className="font-bold text-sm sm:text-base leading-snug break-words">{n}</div>
                <div className="text-xs sm:text-sm leading-snug line-clamp-2 mt-0.5">{c.en || c.t}</div>
                {c.lang && <div className={`text-xs mt-0.5 font-semibold ${t.muted}`}>In {c.lang}</div>}
                <div className={`text-xs mt-1 ${t.muted} truncate`}>{c.ch}</div>
                <div className="mt-1.5"><CountryPills n={n} kind /></div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className={`text-xs ${t.faint}`}>Videos play from YouTube. Their content and any claims in them are the uploader’s, not this app’s.</div>
    </div>
  );
}

function KitVideos({ clips }) {
  const { t } = useApp();
  if (!clips.length) return null;
  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${t.muted}`}>Watch</div>
      <div className="grid grid-cols-1 gap-3">
        {clips.map((c) => <VideoClip key={c.v} c={c} />)}
      </div>
      {clips.some((c) => c.lang) && <div className={`mt-1 text-xs ${t.muted}`}>Not in English? Captions start in English where YouTube has them. Otherwise tap CC, then Settings › Subtitles › Auto-translate › English.</div>}
      <div className={`mt-1 text-xs ${t.faint}`}>Videos play from YouTube. Their content and any claims in them are the uploader’s, not this app’s.</div>
    </div>
  );
}

function KitCard({ k, onClose }) {
  const { t } = useApp();
  const [wiki, setWiki] = useState('idle');
  const [imgFail, setImgFail] = useState(false);
  const spec = specsFor(k.n);
  const noPhoto = !(spec && spec.w);
  useEffect(() => {
    if (noPhoto) return;
    setWiki('loading');
    wikiLookup(spec.w).then((res) => setWiki(res));
  }, [k.n]);
  const rows = spec ? asList(spec.r) : [];
  const hasPhoto = wiki && typeof wiki === 'object' && wiki.img && !imgFail;
  // Videos sit beside the photo and figures on wider screens; on phones a tab switches between them.
  const clips = videosFor(k.n);
  const [tab, setTab] = useState(k.tab === 'watch' ? 'watch' : 'info');
  const wide = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
  const split = clips.length > 0 && wide;
  const showInfo = !clips.length || wide || tab === 'info';
  const showWatch = clips.length > 0 && (wide || tab === 'watch');
  return (
    <Card className="relative">
      <CardCloseX onClose={onClose} />
      <div className="pr-12">
        <div className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}>Equipment</div>
        <h2 className="text-xl sm:text-2xl font-bold leading-snug mt-0.5">{k.n}</h2>
        {spec && spec.t && <div className={`mt-0.5 text-sm ${t.muted}`}>{spec.t}</div>}
        {VIDEO_META[k.n] && <div className="mt-2"><CountryPills n={k.n} kind /></div>}
      </div>
      {clips.length > 0 && !wide && (
        <div className={`mt-3 grid grid-cols-2 gap-1 p-1 rounded-lg ${t.soft}`} role="tablist">
          {[['info', 'Overview'], ['watch', 'Watch (' + clips.length + ')']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-semibold ${tab === id ? t.card + ' shadow-sm' : t.muted}`}>
              {id === 'watch' && <Play size={14} />}{label}
            </button>
          ))}
        </div>
      )}
      <div className={split ? 'mt-4 grid grid-cols-2 gap-5 items-start' : 'mt-4'}>
      {showInfo && <div className="space-y-4 min-w-0">
        {!noPhoto && wiki === 'loading' && (
          <div className={`text-sm ${t.faint}`}>Loading photo from Wikipedia…</div>
        )}
        {!noPhoto && hasPhoto && (
          <figure>
            <img src={wiki.img} alt={'Photo: ' + wiki.title} loading="lazy" onError={() => setImgFail(true)}
              className={`w-full max-h-80 object-contain rounded ${t.soft}`} />
            <figcaption className={`mt-1 text-xs ${t.faint}`}>
              Photo and summary: Wikipedia, “{wiki.title}”.{' '}
              <a href={wiki.url} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${t.link}`}>Open article</a>.
              {' '}The article may cover the wider family of this system.
            </figcaption>
          </figure>
        )}
        {!noPhoto && wiki && typeof wiki === 'object' && wiki.extract && (
          <p className={`text-base leading-relaxed max-w-[70ch] ${t.muted}`}>{wiki.extract}</p>
        )}
        {!noPhoto && wiki !== 'loading' && wiki !== 'idle' && !hasPhoto && (
          <div className={`text-sm ${t.faint}`}>No photo could be shown here (offline, blocked, or the article has none). Use the links below.</div>
        )}
        <div>
          <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${t.muted}`}>Key Figures</div>
          {rows.length ? (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-t ${t.border}`}>
                    <th scope="row" className="text-left align-top font-semibold pr-3 py-1.5 w-1/3">{row[0]}</th>
                    <td className="align-top py-1.5">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={`text-sm ${t.muted}`}>No figures in this app’s sources yet.</div>
          )}
          <div className={`mt-1 text-xs ${t.faint}`}>From this app’s own sources. “(reported)” marks a press or vendor figure. A figure not listed is not stated in our sources.</div>
        </div>
        <div className="text-sm">
          <a href={specsUrl(k.q)} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${t.link}`}>Search Wikipedia</a>
          {' · '}
          <a href={photosUrl(k.q)} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${t.link}`}>Google Images</a>
          <span className={t.faint}> (opens outside the app, not checked)</span>
        </div>
      </div>}
      {showWatch && <div className={`min-w-0 ${split ? 'sticky top-20' : ''}`}><KitVideos clips={clips} /></div>}
      </div>
      <CardCloseFoot onClose={onClose} />
    </Card>
  );
}

// The equipment named in an entry or news item: one button per system; each opens its own card.
function KitLinks({ kit }) {
  const { t, go } = useApp();
  const scope = useContext(TermScopeCtx);
  const all = asList(kit);
  // Systems already linked in the card's text are left out here.
  const rest = all.filter((k) => !(scope && scope.owners && scope.owners.has('kit:' + k.n)));
  if (!rest.length) return null;
  return (
    <div className={`p-3 rounded-lg text-sm ${t.soft}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.muted}`}>{rest.length < all.length ? 'Other Equipment' : 'Equipment: Photo and Key Figures'}</div>
      <div className="grid grid-cols-2 gap-2">
        {rest.map((k, i) => {
          const spec = specsFor(k.n);
          return (
            <button key={k.n + i} type="button" onClick={() => go('kit', { n: k.n, q: k.q })}
              className={`flex items-start justify-between gap-2 text-left rounded-lg border px-3 py-2 min-w-0 ${t.border} ${t.card}`}>
              <span className="min-w-0">
                <span className="block font-semibold leading-snug">{k.n}</span>
                {spec && spec.t && <span className={`block text-xs ${t.muted} line-clamp-2`}>{spec.t}</span>}
              </span>
              <ChevronRight size={16} className={`shrink-0 mt-0.5 ${t.muted}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- developments: curated news with analysis ----------
function DevelopmentCard({ item, startOpen, onClose }) {
  const { t, go } = useApp();
  const [open, setOpen] = useState(!!startOpen);
  return (
    <TermScope kit={item.equipment}>
    <Card className={onClose ? 'relative' : ''}>
      {onClose && <CardCloseX onClose={onClose} />}
      <button type="button" onClick={() => setOpen(!open)} className={`w-full text-left ${onClose ? 'pr-12' : ''}`}>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <Tag>{item.date.length === 4 ? item.date + ', month not stated' : item.date}</Tag>
          <Tag>{item.country}</Tag>
          <Tag>{item.topic}</Tag>
          <ConfBadge value={item.confidence} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold leading-snug"><KitTitle text={item.headline} /></h3>
          {!onClose && <ChevronDown size={20} className={`shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''} ${t.muted}`} />}
        </div>
        {!open && <p className={`mt-1.5 text-base leading-relaxed max-w-[70ch] line-clamp-2 sm:line-clamp-none ${t.muted}`}>{asList(item.what)[0]}</p>}
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <div className={`pl-4 border-l-4 ${t.what}`}>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.whatT}`}>What happened</div>
            <ul className="space-y-2">
              {asList(item.what).map((line, i) => <li key={i} className="text-base leading-relaxed max-w-[70ch]"><TermText text={line} /></li>)}
            </ul>
          </div>
          <div className={`pl-4 border-l-4 ${t.why}`}>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.whyT}`}>So what (analysis)</div>
            <ul className="space-y-2">
              {asList(item.soWhat).map((line, i) => <li key={i} className="text-base leading-relaxed max-w-[70ch]"><TermText text={line} /></li>)}
            </ul>
          </div>
          <KitLinks kit={item.equipment} />
          {item.watchFor && (
            <div className={`p-3 rounded-lg text-sm ${t.soft}`}>
              <span className="font-bold">Watch for: </span>{item.watchFor}
            </div>
          )}
          <div className={`pt-3 border-t text-sm space-y-2 ${t.border} ${t.muted}`}>
            {asList(item.relatedIds).length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Background in the Library:</span>
                {item.relatedIds.filter((rid) => ENTRY_BY_ID[rid]).map((rid) => (
                  <button key={rid} type="button" className={`text-left underline underline-offset-2 ${t.link}`} onClick={() => go('entry', rid)}>{ENTRY_BY_ID[rid].title}</button>
                ))}
              </div>
            )}
            <ul className="space-y-1">
              {asList(item.sources).map((src, i) => (
                <li key={i}>
                  {src.url ? <a href={src.url} target="_blank" rel="noreferrer" className={`italic underline ${t.link}`}>{src.title}</a> : <span className="italic">{src.title}</span>}
                  {' '}({src.publisher}, {src.year})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {onClose && <CardCloseFoot onClose={onClose} />}
    </Card>
    </TermScope>
  );
}

// Compact news card for the two-per-row Developments grid; it opens the item on its own page.
function DevelopmentTile({ item }) {
  const { t, go } = useApp();
  return (
    <button type="button" onClick={() => go('dev', item.id)} className={`flex flex-col text-left rounded-xl border p-3 sm:p-4 min-w-0 ${t.card}`}>
      <div className={`flex items-center gap-1 text-xs font-medium mb-1 min-w-0 ${t.muted}`}>
        <span className="shrink-0 inline-block w-2 h-2 rounded-full" style={{ background: countryColour(item.country) }} />
        <span className="truncate">{item.country} · {item.date}</span>
      </div>
      <div className="font-bold text-sm sm:text-base leading-snug">{item.headline}</div>
      <div className={`mt-1 text-xs sm:text-sm line-clamp-3 ${t.muted}`}>{asList(item.what)[0]}</div>
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-1">
        <Tag>{item.topic}</Tag>
        {item.confidence !== 'Confirmed' && <Tag tone={item.confidence === 'Reported' ? 'warn' : 'bad'}>{item.confidence}</Tag>}
      </div>
    </button>
  );
}

// Key Insights: a monthly card of cross-army takeaways (analysis), linked to the news items and entries behind them.
function InsightsCard({ card, open }) {
  const { t, go } = useApp();
  const [shown, setShown] = useState(!!open);
  const devById = Object.fromEntries(DEVELOPMENTS.items.map((i) => [i.id, i]));
  return (
    <div className={`rounded-xl border p-4 ${t.card}`}>
      <button type="button" className="w-full text-left" onClick={() => setShown(!shown)}>
        <div className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}>Key Insights · Analysis</div>
        <div className="font-bold text-lg leading-snug mt-0.5">{card.title}: {card.points.length} takeaways across the armies</div>
        {!shown && <div className={`mt-1 text-sm ${t.link}`}>Show</div>}
      </button>
      {shown && (
        <div className="mt-3 space-y-4">
          {card.points.map((p, n) => (
            <div key={n}>
              <div className="font-bold">{n + 1}. {p.head}</div>
              <div className="mt-1 text-base">{p.text}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {asList(p.devIds).filter((id) => devById[id]).map((id) => (
                  <button key={id} type="button" className={`text-left underline underline-offset-2 ${t.link}`} onClick={() => go('dev', id)}>{devById[id].headline}</button>
                ))}
                {asList(p.entryIds).filter((id) => ENTRY_BY_ID[id]).map((id) => (
                  <button key={id} type="button" className={`text-left underline underline-offset-2 ${t.link}`} onClick={() => go('entry', id)}>{ENTRY_BY_ID[id].title}</button>
                ))}
              </div>
            </div>
          ))}
          {asList(card.questions).length > 0 && (
            <div className={`p-3 rounded-lg border ${t.info}`}>
              <div className="font-bold">Think about it</div>
              <ul className="mt-1 list-disc pl-5 space-y-1">{card.questions.map((q, n) => <li key={n}>{q}</li>)}</ul>
            </div>
          )}
          <div className={`text-sm ${t.muted}`}>Analysis drawn from the news items and entries linked above, as of {card.asOf}. It points out patterns; it does not recommend what any army should do.</div>
          <button type="button" className={`text-sm font-semibold ${t.link}`} onClick={() => setShown(false)}>Hide</button>
        </div>
      )}
    </div>
  );
}

function DevelopmentsView() {
  const { t } = useApp();
  const [country, setCountry] = useRemembered('dev.country', null);
  const [topic, setTopic] = useRemembered('dev.topic', null);
  const [conf, setConf] = useRemembered('dev.conf', null);
  const [year, setYear] = useRemembered('dev.year', null);
  const [month, setMonth] = useRemembered('dev.month', null);
  const items = DEVELOPMENTS.items.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  // Dates are YYYY-MM-DD, YYYY-MM or YYYY. Items with only a year sit under "Month not stated".
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const yearOf = (i) => String(i.date).slice(0, 4);
  const monthOf = (i) => (String(i.date).length >= 7 ? String(i.date).slice(5, 7) : 'none');
  const years = uniq(items.map(yearOf)).sort().reverse();
  const inYear = items.filter((i) => !year || yearOf(i) === year);
  const months = uniq(inYear.map(monthOf)).sort((a, b) => (a === 'none') - (b === 'none') || b.localeCompare(a))
    .map((m) => ({ value: m, label: (m === 'none' ? 'Month not stated' : MONTHS[Number(m) - 1]) + ' (' + inYear.filter((i) => monthOf(i) === m).length + ')' }));
  // Featured armies A–Z, then Others (news from armies without their own lessons yet).
  const countries = uniq(items.map((i) => i.country)).sort(byCountry);
  const topics = uniq(items.map((i) => i.topic)).sort();
  const shown = items.filter((i) => (!year || yearOf(i) === year) && (!month || monthOf(i) === month) && (!country || i.country === country) && (!topic || i.topic === topic) && (!conf || i.confidence === conf));
  const filtered = year || month || country || topic || conf;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Developments</h1>
        <p className={`mt-1 ${t.muted}`}>{'Selected artillery news from open sources, newest first. Updated ' + DEVELOPMENTS.updated + '. Use Year to see older items.'} “So what” is analysis, not fact.</p>
      </div>
      {asList(DEVELOPMENTS.insights).length > 0 && (
        <div className="space-y-2">
          <InsightsCard key={DEVELOPMENTS.insights[0].month} card={DEVELOPMENTS.insights[0]} open />
          {DEVELOPMENTS.insights.slice(1).map((c) => <InsightsCard key={c.month} card={c} />)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Pick label="Year" value={year} options={years} onChange={(v) => { setYear(v); setMonth(null); }} />
        <Pick label="Month" value={month} options={months} onChange={setMonth} />
        <Pick label="Country" value={country} options={countries} onChange={setCountry} />
        <Pick label="Topic" value={topic} options={topics} onChange={setTopic} />
        <Pick label="Confidence" value={conf} options={uniq(items.map((i) => i.confidence))} onChange={setConf} />
        {filtered && <button type="button" className={`text-sm font-semibold ${t.link}`} onClick={() => { setYear(null); setMonth(null); setCountry(null); setTopic(null); setConf(null); }}>Clear filters</button>}
      </div>
      <p className={`text-sm ${t.muted}`}>{shown.length} of {items.length} items</p>
      {shown.length === 0 ? <Empty>No items match these filters.</Empty> : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">{shown.map((item) => <DevelopmentTile key={item.id} item={item} />)}</div>
      )}
    </div>
  );
}

// ---------- saved entries and notes ----------
function SavedView() {
  const { t, state, go } = useApp();
  const [show, setShow] = useState('All');
  const noted = Object.keys(state.notes).filter((id) => state.notes[id]);
  const ids = uniq(state.bookmarks.concat(noted)).filter((id) => ENTRY_BY_ID[id]).filter((id) =>
    show === 'All' || (show === 'Saved' ? state.bookmarks.includes(id) : noted.includes(id)));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Saved</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'Saved', 'With notes'].map((x) => <Chip key={x} on={show === x} onClick={() => setShow(x)}>{x}</Chip>)}
      </div>
      {ids.length === 0 ? (
        <Empty>
          Nothing here yet. Open an entry and press Save or Add note.
          <div className="mt-3"><Btn kind="ghost" onClick={() => go('library')}>Open the Library</Btn></div>
        </Empty>
      ) : <div className="grid grid-cols-2 gap-2 sm:gap-3">{ids.map((id) => <EntryTile key={id} entry={ENTRY_BY_ID[id]} />)}</div>}
    </div>
  );
}

// ---------- feedback ----------
const FEEDBACK_KINDS = ['Correction', 'Suggestion', 'Content request', 'App problem'];
const whereLabel = (where) => (ENTRY_BY_ID[where] ? ENTRY_BY_ID[where].title + ' (' + where + ')'
  : LESSON_BY_ID[where] ? 'Lesson: ' + LESSON_BY_ID[where].title : 'General');
const formLink = (f) => FEEDBACK_FORM_URL.replace('{text}', encodeURIComponent(feedbackText(f)));
const feedbackText = (f) => '[' + String(f.at).slice(0, 10) + '] ' + f.kind + ' | ' + whereLabel(f.where) + ' | content ' + f.version + '\n' + f.text;

function FeedbackView({ where }) {
  const { t, state, update } = useApp();
  const [about, setAbout] = useState(where || 'general');
  const [kind, setKind] = useState(where ? 'Correction' : 'Suggestion');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(null);
  const [delivery, setDelivery] = useState(null); // 'sending' | 'delivered' | 'failed'
  const inbox = feedbackStore.list(state);
  // On the website, feedback goes straight to the author through the site's own route. In Canvas it stays on the device.
  const route = typeof window !== 'undefined' && window.FIRES_ATLAS_FEEDBACK;

  const submit = () => {
    const record = {
      id: 'fb-' + Date.now(), at: new Date().toISOString(), kind, where: about,
      text: text.trim(), version: CONTENT.version
    };
    feedbackStore.add(update, record);
    setSent(record);
    setText('');
    if (route) {
      setDelivery('sending');
      fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: record.kind, where: record.where, about: whereLabel(record.where), text: record.text, version: record.version }) })
        .then((r) => setDelivery(r.ok ? 'delivered' : 'failed'))
        .catch(() => setDelivery('failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className={`mt-1 ${t.muted}`}>Report an error, suggest an improvement or ask for a topic. Do not include classified, restricted or personal information.</p>
      </div>

      <Card>
        <div className="space-y-3">
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.muted}`}>Type</div>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_KINDS.map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}
            </div>
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${t.muted}`}>About</div>
            <div className="flex flex-wrap items-center gap-2 text-base">
              <span>{whereLabel(about)}</span>
              {about !== 'general' && <button type="button" className={`text-sm font-semibold ${t.link}`} onClick={() => setAbout('general')}>Make it general</button>}
            </div>
          </div>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="What should change, and where did you see it? A source helps for corrections."
            className={`w-full rounded-lg border p-3 text-base ${t.input}`} />
          <Btn disabled={text.trim().length < 3} onClick={submit}><Send size={18} /> Submit feedback</Btn>
        </div>
      </Card>

      {sent && (
        <div className={`p-4 rounded-xl border ${t.good}`}>
          <div className="font-bold">{delivery === 'delivered' ? 'Sent to the author. Thank you.' : delivery === 'sending' ? 'Sending…' : 'Recorded. Thank you.'}</div>
          {delivery === 'delivered' ? (
            <div className="mt-1 text-sm">A copy is also kept in the list below, on this device.</div>
          ) : delivery === 'failed' ? (
            <div className="mt-1 text-sm">It could not be sent just now, so it is kept on this device. Copy it and send it to the person who shared this app with you, or try again later.</div>
          ) : delivery === 'sending' ? null : FEEDBACK_FORM_URL ? (
            <>
              <div className="mt-1 text-sm">One more step: send it to the author. {FEEDBACK_FORM_URL.includes('{text}') ? 'Your text is already filled in on the form.' : 'Copy your text, then paste it into the form.'}</div>
              <a href={formLink(sent)} target="_blank" rel="noreferrer"
                className={`mt-3 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-base font-semibold ${t.btn}`}><Send size={18} /> Send to the author</a>
            </>
          ) : (
            <div className="mt-1 text-sm">It is kept in the inbox below, on this device. To pass it on, copy it and send it to the person who shared this app with you.</div>
          )}
          <div className="mt-3"><CopyBox text={feedbackText(sent)} label="Copy this feedback" /></div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Your feedback on this device ({inbox.length})</h2>
          {inbox.length > 0 && <CopyBox text={() => inbox.map(feedbackText).join('\n\n')} label="Copy all" />}
        </div>
        {inbox.length === 0 ? <Empty>No feedback recorded on this device.</Empty> : inbox.map((f) => (
          <Card key={f.id}>
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone="info">{f.kind}</Tag>
              <Tag>{String(f.at).slice(0, 10)}</Tag>
              <Tag>content {f.version}</Tag>
            </div>
            <div className={`mt-2 text-sm ${t.muted}`}>{whereLabel(f.where)}</div>
            <p className="mt-1 text-base leading-relaxed whitespace-pre-wrap max-w-[70ch]">{f.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {FEEDBACK_FORM_URL && (
                <a href={formLink(f)} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 min-h-[40px] text-sm font-semibold ${t.link}`}><Send size={14} /> Send to the author</a>
              )}
              <button type="button" className={`inline-flex items-center gap-1 min-h-[40px] text-sm font-semibold ${t.muted}`}
                onClick={() => feedbackStore.remove(update, f.id)}><Trash2 size={14} /> Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


// ---------- welcome: the front page, shown on a first visit and from More > About ----------
// Shared totals (supporters and visits), kept by the website itself (worker/index.js). In Canvas there is no route, so no totals show.
// Read when used: the website sets window.FIRES_ATLAS_COUNT only after this file has loaded.
const counterBase = () => (typeof window !== 'undefined' && window.FIRES_ATLAS_COUNT ? window.FIRES_ATLAS_COUNT : '');
const COUNTER_ID = 'fires-atlas-aa21bb28'; // names the "already supported / visited" marks kept in the browser
const remember = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set: (k) => { try { window.localStorage.setItem(k, 'true'); } catch (e) { /* storage blocked */ } }
};
// action 'get' reads a total; 'hit' adds one and returns the new total. Gives up after 8 seconds.
const counter = (action, key) => {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctl) ctl.abort(); }, 8000);
  return fetch(counterBase() + '/' + key, { method: action === 'hit' ? 'POST' : 'GET', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then((res) => {
      if (!res.ok) throw new Error('Counter responded ' + res.status);
      return res.json().then((d) => { if (!d || typeof d.value !== 'number') throw new Error('No value'); return d.value; });
    })
    .finally(() => clearTimeout(timer));
};

// The front page's sample entry, played the way a lesson plays it: What, then How, a pause, Why, then one check.
const SAMPLE = {
  what: ['A radar that detects shells, rockets and mortar bombs while they are in flight.'],
  how: ['It tracks a short part of the flight path and calculates back to the firing point, usually within seconds.'],
  why: ['A gun that is located quickly can be engaged before it moves. This is why modern guns fire and relocate, and why the radar itself limits how long it transmits.'],
  q: 'An enemy weapon-locating radar is watching your battery. What should your guns do?',
  options: ['Keep firing from the same position', 'Fire, then move before the reply arrives', 'Stop firing for the rest of the day', 'Fire only at night'],
  answer: 1,
  why2: 'The radar can locate a gun within seconds of its first round, so survival depends on leaving before counter-battery fire lands.'
};
function SampleEntry() {
  const { t } = useApp();
  const [stage, setStage] = useState(0); // 0 what, 1 how, 2 why, 3 check
  const [pick, setPick] = useState(null);
  const restart = () => { setStage(0); setPick(null); };
  return (
    <Card>
      <div className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}>Sample Entry · try it</div>
      <h3 className="text-xl font-bold mt-1 mb-3">Weapon-Locating Radar</h3>
      <div className="space-y-4">
        <Block kind="what" lines={SAMPLE.what} />
        {stage >= 1 && <Block kind="how" lines={SAMPLE.how} />}
        {stage === 1 && (
          <div className={`p-3 rounded-lg border text-base ${t.warn}`}>
            <span className="font-bold">Before you go on:</span> why do you think it is done this way? Settle on an answer, then reveal.
          </div>
        )}
        {stage >= 2 && <Block kind="why" lines={SAMPLE.why} />}
        {stage >= 3 && (
          <div className="space-y-2">
            <div className="font-semibold">{SAMPLE.q}</div>
            {SAMPLE.options.map((o, i) => {
              const done = pick !== null;
              const tone = !done ? t.chip : i === SAMPLE.answer ? t.good : i === pick ? t.bad : t.chip;
              return (
                <button key={i} type="button" disabled={done} onClick={() => setPick(i)}
                  className={`w-full text-left p-3 rounded-lg border text-base ${tone}`}>{o}</button>
              );
            })}
            {pick !== null && (
              <div className={`p-3 rounded-lg border text-sm ${pick === SAMPLE.answer ? t.good : t.warn}`}>
                <span className="font-bold">{pick === SAMPLE.answer ? 'Correct. ' : 'Not quite. '}</span>{SAMPLE.why2}
              </div>
            )}
          </div>
        )}
        {stage < 3 ? (
          <Btn className="w-full sm:w-auto" onClick={() => setStage(stage + 1)}>
            {['Show how it works', 'Reveal why', 'Check your understanding'][stage]} <ArrowRight size={18} />
          </Btn>
        ) : pick !== null && (
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm italic ${t.muted}`}>Every lesson in the app works this way.</span>
            <button type="button" onClick={restart} className={`text-sm font-semibold ${t.link}`}>Try again</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function WelcomeView({ first }) {
  const { t, update, back } = useApp();
  const [supporters, setSupporters] = useState(null);
  const [supported, setSupported] = useState(!!remember.get('fires_atlas_supported_' + COUNTER_ID));
  const [supportError, setSupportError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!counterBase()) return undefined;
    let live = true;
    counter('get', 'supporters').then((n) => { if (live) setSupporters(n); }).catch(() => {});
    const visitedKey = 'fires_atlas_visited_' + COUNTER_ID;
    if (!remember.get(visitedKey)) counter('hit', 'visits').then(() => remember.set(visitedKey)).catch(() => {});
    return () => { live = false; };
  }, []);
  const support = () => {
    if (busy || supported) return;
    setBusy(true);
    setSupportError(false);
    counter('hit', 'supporters')
      .then((n) => { setSupporters(n); setSupported(true); remember.set('fires_atlas_supported_' + COUNTER_ID); })
      .catch(() => setSupportError(true))
      .finally(() => setBusy(false));
  };
  const start = () => { update({ welcomed: true }); if (!first) back(); };
  const H = ({ children }) => <h2 className={`text-xl font-bold ${t.link}`}>{children}</h2>;
  const parts = [
    ['Learn', 'Short lessons. Each covers what, how and why, then checks your understanding.'],
    ['Library', 'Every entry, searchable by country, force, echelon and type, with side-by-side Compare and an A to Z Glossary.'],
    ['Equipment Cards', 'Tap any underlined weapon or sensor for its photo, key figures, the armies that use it and where it was designed.'],
    ['Videos', 'Short clips of the equipment in action, filtered by country and weapon type, and in each equipment card.'],
    ['Ranges and Military Map', 'Weapon ranges as rings, and how the armies link and compare.'],
    ['Kill Chain', 'Watch armies go from finding a target to striking it, step by step, with sourced timings.'],
    ['Developments', 'Recent artillery news, with what happened, what it means and what to watch next.'],
    ['Ask', 'A question in plain words, answered from the entries with links to them.']
  ];
  return (
    <div className="space-y-8">
      <section className="space-y-3 pt-2">
        <h1 className="text-4xl font-bold tracking-tight">Fires Atlas</h1>
        <p className={`text-lg ${t.muted}`}>A learning reference on artillery and fire support worldwide, built from open sources.</p>
        {first && <div className="flex flex-wrap gap-2 pt-1"><Btn onClick={start}><Play size={18} /> Start learning</Btn></div>}
        <p className={`text-sm ${t.muted}`}>{APP_DATA.length} entries · {LESSONS.length} lessons · {ALL_COUNTRIES.length} armies · {Object.keys(VIDEO_META).length} equipment cards · {Object.values(VIDEO_LINKS).reduce((a, l) => a + l.filter((c) => c.ok).length, 0)} videos</p>
      </section>

      <section className={`p-4 rounded-xl border space-y-2 ${t.info}`}>
        <h2 className="text-xl font-bold">Objectives</h2>
        <p className="text-base">After working through Fires Atlas, you should be able to:</p>
        <ol className="list-decimal pl-5 space-y-1.5 text-base leading-relaxed">
          <li><span className="font-semibold">Explain how fire support works end to end:</span> how fires are linked to manoeuvre, delivered, directed, protected and sustained, and why each part is done the way it is.</li>
          <li><span className="font-semibold">Compare your understanding with other militaries:</span> see how different armies organise, equip and employ their artillery for the same tasks.</li>
          <li><span className="font-semibold">Apply lessons from recent conflicts:</span> recognise what has changed in finding targets, striking them and surviving the reply, and what that means for planning and protecting fires.</li>
          <li><span className="font-semibold">Think critically about your own practice:</span> question your assumptions with a wider view of the options other armies have chosen.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <H>Why This Was Built</H>
        <p className="text-base leading-relaxed max-w-[70ch]">Artillery is changing quickly. Armies are rebuilding how they find targets, direct fire, survive counter-fire and sustain their guns. The lessons are spread across doctrine, journals and reports that few people have time to read.</p>
        <p className="text-base leading-relaxed max-w-[70ch]">Fires Atlas brings that open material into one place, in a form that can be learned in short sittings. Every entry answers three questions: what it is, how it works, and why it is built that way. Equipment cards and short videos then show the systems themselves.</p>
      </section>

      <section className="space-y-3">
        <H>How It Is Made</H>
        <p className="text-base leading-relaxed max-w-[70ch]">Fires Atlas is built only from public sources. Research is drafted with the Deep Research function of Google’s Gemini, and the app is built with Anthropic’s Claude. Every source is opened and checked before it goes in, each entry shows its sources and a confidence label (Confirmed, Reported or Analysis), and weak or unverifiable claims are left out.</p>
      </section>

      <section className="space-y-3">
        <H>What You Take Away</H>
        <p className="text-base leading-relaxed max-w-[70ch]">Every army must find, decide, strike, survive and sustain. Comparing how each does it shows you:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-base leading-relaxed">
          <li>Why each system exists and the task it serves</li>
          <li>The trade-offs behind each army’s choices: range or mobility, mass or precision, control or speed</li>
          <li>What is changing: drones, long-range fires, faster counter-battery fire</li>
          <li>Which lessons are proven in conflicts and which are only claimed</li>
          <li>How partners operate, and how others may fight</li>
          <li>Sharper questions about your own practice</li>
        </ul>
      </section>

      <SampleEntry />

      <section className="space-y-3">
        <H>Who It Is For</H>
        <p className="text-base leading-relaxed">Anyone who studies or practises fire support: gunners, fire support officers, planners, instructors and students.</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {parts.map(([h, p]) => (
            <div key={h} className={`p-3 rounded-lg border min-w-0 ${t.card}`}>
              <div className="font-bold text-sm sm:text-base">{h}</div>
              <div className={`text-xs sm:text-sm mt-0.5 ${t.muted}`}>{p}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <H>Questions to Carry with You</H>
        <p className="text-base leading-relaxed max-w-[70ch]">The lessons use the United States as a worked example, because its doctrine is openly published and explains its reasons. As you read, set it against what you know of your own force.</p>
        <ul className="list-disc pl-5 space-y-2 text-base leading-relaxed">
          <li>How does our own force do this, and why is it different?</li>
          <li>Which of their problems do we share, and which do we not have?</li>
          <li>What does their answer assume about size, money or ground that does not hold for us?</li>
          <li>Faced with the same lessons from recent conflicts, what would we do first?</li>
        </ul>
        <p className={`text-sm ${t.muted}`}>Keep your answers for internal discussion with your peers or team. Do not type details of your own force into the app.</p>
      </section>

      <section className="space-y-3">
        <H>Your Progress</H>
        <p className="text-base leading-relaxed max-w-[70ch]">Progress is kept in this browser on this device. To move it to another device or browser, go to More, press “Copy my progress”, then paste it into “Restore” on the other one.</p>
      </section>

      {counterBase() && (
        <section className="space-y-3">
          <H>Show Support</H>
          <div className="flex flex-wrap items-center gap-4">
            <Btn kind={supported ? 'ghost' : undefined} disabled={supported || busy} onClick={support}><Star size={18} fill={supported ? 'currentColor' : 'none'} /> {supported ? 'Supported. Thank you.' : busy ? 'Sending…' : 'Show support'}</Btn>
            {supporters !== null && <span className="text-2xl font-bold">{supporters.toLocaleString('en-GB')} <span className={`text-base font-normal ${t.muted}`}>{supporters === 1 ? 'supporter' : 'supporters'}</span></span>}
          </div>
          {supportError && <p className={`text-sm ${t.muted}`}>Not recorded. Check your connection and press again.</p>}
        </section>
      )}

      {first && <div className="flex flex-wrap gap-2"><Btn onClick={start}><Play size={18} /> Start learning</Btn></div>}
      <p className={`text-sm ${t.faint}`}>Content is drawn from open sources only. Videos play from YouTube; their content is the uploader’s.</p>
    </div>
  );
}

// ---------- more ----------
function Switch({ label, hint, on, onChange }) {
  const { t } = useApp();
  return (
    <button type="button" role="switch" aria-checked={!!on} onClick={() => onChange(!on)} className="w-full flex items-center gap-3 text-left min-h-[48px]">
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className={`block text-sm ${t.muted}`}>{hint}</span>}
      </span>
      <span className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${on ? 'bg-teal-500' : t.dark ? 'bg-slate-700' : 'bg-slate-300'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function NavRow({ icon, label, hint, onClick }) {
  const { t } = useApp();
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 text-left min-h-[48px]">
      <span className={t.muted}>{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className={`block text-sm ${t.muted}`}>{hint}</span>}
      </span>
      <ChevronRight size={18} className={t.faint} />
    </button>
  );
}

// Plain-text copy of the content, used as the baseline for the monthly research check.
const contentAsText = () => ['Fires Atlas content, version ' + CONTENT.version + ', released ' + CONTENT.released, '']
  .concat(APP_DATA.map((e) => [
    'ID: ' + e.id,
    'Topic: ' + topicName(e.topic) + ' | Country: ' + (e.country || '') + ' | Force: ' + e.force + ' | Section: ' + e.module,
    'Title: ' + e.title,
    'Confidence: ' + e.confidence + ' | As of: ' + e.asOf,
    'What: ' + asList(e.what).join(' '),
    'How: ' + asList(e.how).join(' '),
    'Why: ' + asList(e.why).join(' '),
    'Sources: ' + asList(e.sources).map((s) => s.title + ' (' + s.publisher + ', ' + s.year + ')').join('; '),
    ''
  ].join('\n'))).join('\n');

function MoreView() {
  const { t, state, update, go, storageOk } = useApp();
  const [paste, setPaste] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const passed = LESSONS.filter((l) => (state.progress[l.id] || {}).passed).length;

  const restore = () => {
    try {
      const data = JSON.parse(paste);
      if (!data || typeof data !== 'object' || typeof data.progress !== 'object') throw new Error('shape');
      update({ ...DEFAULT_STATE, ...data });
      setPaste('');
      setMessage('Progress restored.');
    } catch (err) {
      setMessage('That text is not a Fires Atlas progress copy.');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">More</h1>
      {!storageOk && <div className={`p-3 rounded-lg border text-sm ${t.bad}`}>Progress cannot be saved in this browser. Copy your progress below before you close the page.</div>}

      <Card>
        <div className={`divide-y ${t.dark ? 'divide-slate-800' : 'divide-slate-200'}`}>
          <NavRow icon={<Info size={20} />} label="About Fires Atlas" hint="What it is, who it is for, and questions to carry with you" onClick={() => go('welcome')} />
          <NavRow icon={<BookOpen size={20} />} label="Coverage" hint="How many entries each army has in each topic" onClick={() => go('coverage')} />
          <NavRow icon={<Lightbulb size={20} />} label="Developments" hint={'Artillery news and what it means. Updated ' + DEVELOPMENTS.updated} onClick={() => go('developments')} />
          <NavRow icon={<Star size={20} />} label="What's new" hint={'Content version ' + CONTENT.version + ', released ' + CONTENT.released} onClick={() => go('news')} />
          <NavRow icon={<MessageSquare size={20} />} label="Feedback" hint="Report an error or suggest an improvement" onClick={() => go('feedback')} />
          <NavRow icon={<Send size={20} />} label="Ask the reference" hint="Questions answered from the entries in this app" onClick={() => go('ask')} />
        </div>
      </Card>

      <Card>
        <div className={`divide-y ${t.dark ? 'divide-slate-800' : 'divide-slate-200'}`}>
          <Switch label="Dark theme" on={state.dark} onChange={(v) => update({ dark: v })} />
          <Switch label="Free study" hint="Open every lesson without passing the one before it" on={state.freeStudy} onChange={(v) => update({ freeStudy: v })} />
        </div>
      </Card>

      <Card>
        <div className="font-bold">Your progress</div>
        <p className={`mt-1 text-sm ${t.muted}`}>{passed} of {LESSONS.length} lessons passed. Progress, notes and saved entries are kept in this browser only. Copy them to move to another device, or to the new link after a monthly update.</p>
        <div className="mt-3"><CopyBox text={() => JSON.stringify(state)} label="Copy my progress" /></div>
        <textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="To restore, paste a progress copy here."
          className={`mt-3 w-full rounded-lg border p-3 text-sm font-mono ${t.input}`} />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Btn kind="ghost" disabled={!paste.trim()} onClick={restore}>Restore</Btn>
          {confirmReset ? (
            <>
              <Btn onClick={() => { update({ ...DEFAULT_STATE, dark: state.dark, seenVersion: CONTENT.version }); setConfirmReset(false); setMessage('Progress cleared.'); }}>Confirm: clear everything</Btn>
              <Btn kind="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
            </>
          ) : <Btn kind="ghost" onClick={() => setConfirmReset(true)}><Trash2 size={16} /> Clear progress</Btn>}
        </div>
        {message && <div className={`mt-2 text-sm ${t.muted}`}>{message}</div>}
      </Card>

      <Card>
        <div className="font-bold">For the author</div>
        <p className={`mt-1 text-sm ${t.muted}`}>A plain-text copy of every entry. Paste it into the monthly research prompt so the check starts from what the app says now.</p>
        <div className="mt-3"><CopyBox text={contentAsText} label="Copy all content as text" /></div>
      </Card>

      <div className={`text-sm leading-relaxed ${t.faint}`}>
        Fires Atlas · content version {CONTENT.version} · {APP_DATA.length} entries, {LESSONS.length} lessons, {GLOSSARY.length} terms.
        Built from open sources only. Each entry carries a confidence label and its sources; check the source before relying on a detail.
      </div>
    </div>
  );
}

// ==========================================
// ASK: questions answered from the entries in this app
// ==========================================
const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'was', 'what', 'why', 'how', 'who', 'does', 'did', 'with', 'that', 'this', 'from', 'into', 'about', 'which', 'when', 'where', 'their', 'they', 'have', 'has', 'between', 'explain', 'tell', 'can', 'you']);
const ASK_ENTRY_LIMIT = 14;

// Picks the entries most relevant to the question, so the request stays small as content grows.
function entriesForQuestion(question) {
  let words = question.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  GLOSSARY.forEach((g) => {
    [g.term].concat(g.aliases || []).forEach((k) => {
      if (new RegExp('\\b' + escapeRegExp(k) + '\\b', 'i').test(question)) {
        words = words.concat(String(g.full).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
      }
    });
  });
  words = uniq(words);
  return APP_DATA.map((e) => {
    const title = e.title.toLowerCase();
    const body = entryText(e);
    const score = words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0);
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, ASK_ENTRY_LIMIT).map((x) => x.e);
}

const entryForAsk = (e) => ({
  id: e.id, title: e.title, topic: topicName(e.topic), country: e.country, force: e.force,
  echelon: asList(e.echelon), section: e.module, confidence: e.confidence, asOf: e.asOf,
  what: e.what, how: e.how, why: e.why,
  sources: asList(e.sources).map((s) => s.title + ' (' + s.publisher + ', ' + s.year + ')')
});

async function askGemini(history, question) {
  const recent = history.filter((m) => m.role === 'user').slice(-2).map((m) => m.text).join(' ');
  const entries = entriesForQuestion(question + ' ' + recent);
  const latest = CHANGELOG.slice().sort((a, b) => (a.version < b.version ? 1 : -1))[0];
  const systemPrompt = [
    'You are an instructor explaining artillery and fire support to a military professional who is learning.',
    'Answer only from the ENTRIES below. They come from open sources.',
    'Structure the answer as what it is, how it works, and why it is done that way. Give the why most weight: reasoning, trade-offs and lessons.',
    'Name the entry title you used. If an entry has confidence Reported or Analysis, say so.',
    'If the ENTRIES do not answer the question, say: "That is not in the current content." Then name the closest titles from the INDEX. Do not add facts from outside the ENTRIES.',
    'Use plain sentences and short paragraphs. No tables. Use British English spelling, but keep the official names of US units, documents and equipment as they are.',
    'End with one line in exactly this form: Entries: id1, id2',
    '',
    'CONTENT VERSION: ' + CONTENT.version + ' (released ' + CONTENT.released + ')',
    'LATEST CHANGES: ' + JSON.stringify(latest || {}),
    'INDEX (all entry titles): ' + APP_DATA.map((e) => e.title).join(' | '),
    'ENTRIES: ' + JSON.stringify(entries.map(entryForAsk))
  ].join('\n');

  const contents = history.slice(-8).map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
    .concat([{ role: 'user', parts: [{ text: question }] }]);

  const apiKey = ""; // API key populated by environment
  // On the website build, the page sets window.FIRES_ATLAS_ASK to its own server route, which holds the key.
  // In Canvas it is not set, and the call goes straight to Gemini as before.
  const proxy = typeof window !== 'undefined' && window.FIRES_ATLAS_ASK;
  const apiUrl = proxy || `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const payload = { contents, systemInstruction: { parts: [{ text: systemPrompt }] } };

  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const text = data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
      if (!text) throw new Error('Empty answer');
      return text;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

// Splits the answer from its closing "Entries: id1, id2" line.
function splitAnswer(text) {
  const lines = String(text).trim().split('\n');
  const last = lines[lines.length - 1] || '';
  const match = last.match(/^\**Entries:?\**:?\s*(.*)$/i);
  if (!match) return { body: String(text).trim(), ids: [] };
  const ids = match[1].split(/[,\s]+/).map((x) => x.replace(/[^a-z0-9-]/gi, '')).filter((x) => ENTRY_BY_ID[x]);
  return { body: lines.slice(0, -1).join('\n').trim(), ids: uniq(ids) };
}

function AnswerText({ text }) {
  return (
    <>
      {String(text).split('\n').filter((line) => line.trim()).map((line, j) => (
        <div key={j} className={j > 0 ? 'mt-2' : ''}>
          {line.replace(/^\s*[*-]\s+/, '• ').split(/(\*\*.*?\*\*)/g).map((part, k) => (
            part.startsWith('**') && part.endsWith('**') ? <strong key={k}>{part.slice(2, -2)}</strong> : <React.Fragment key={k}>{part}</React.Fragment>
          ))}
        </div>
      ))}
    </>
  );
}

function AskView() {
  const { t, state, go, chat, setChat } = useApp();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ block: 'end' });
  }, [chat, busy]);

  const upNext = nextLesson(state);
  const starters = ['Compare how the forces organise fire support at company level.']
    .concat(upNext ? ['Brief me on: ' + upNext.title] : [])
    .concat(['What changed in the latest content update?']);

  const send = async (raw) => {
    const question = String(raw || '').trim();
    if (!question || busy) return;
    const history = [];
    chat.forEach((m, i) => {
      const reply = chat[i + 1];
      if (m.role === 'user' && reply && reply.role === 'model' && !reply.error) history.push(m, reply);
    });
    setInput('');
    setChat(chat.concat([{ role: 'user', text: question }]));
    setBusy(true);
    try {
      const text = await askGemini(history, question);
      setChat((c) => c.concat([{ role: 'model', text }]));
    } catch (err) {
      setChat((c) => c.concat([{ role: 'model', error: true, text: 'The answer could not be fetched. Check the connection and send the question again.' }]));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ask</h1>
          <p className={`mt-1 text-sm ${t.muted}`}>Answers are generated from the entries in this app. Questions are sent to Google's Gemini service: do not type classified, restricted or personal information.</p>
        </div>
        {chat.length > 0 && <Btn kind="ghost" onClick={() => setChat([])}>Clear</Btn>}
      </div>

      {chat.length === 0 && (
        <div className="space-y-2">
          {starters.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className={`w-full text-left min-h-[48px] px-4 py-3 rounded-lg border text-base ${t.card}`}>{s}</button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {chat.map((m, i) => {
          if (m.role === 'user') {
            return <div key={i} className="flex justify-end"><div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm text-base leading-relaxed ${t.btn}`}>{m.text}</div></div>;
          }
          const parsed = m.error ? { body: m.text, ids: [] } : splitAnswer(m.text);
          return (
            <div key={i} className={`max-w-[95%] px-4 py-3 rounded-2xl rounded-bl-sm border text-base leading-relaxed ${m.error ? t.bad : t.card}`}>
              <AnswerText text={parsed.body} />
              {parsed.ids.length > 0 && (
                <div className={`mt-3 pt-3 border-t flex flex-col items-start gap-2 ${t.border}`}>
                  {parsed.ids.map((id) => (
                    <button key={id} type="button" className={`text-left text-sm font-semibold underline underline-offset-2 ${t.link}`} onClick={() => go('entry', id)}>{ENTRY_BY_ID[id].title}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {busy && <div className={`text-sm ${t.muted}`}>Reading the entries…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder="Ask about an organisation, a procedure or a lesson"
          className={`flex-1 min-h-[48px] rounded-lg border px-4 text-base ${t.input}`} />
        <button type="submit" aria-label="Send" disabled={busy || !input.trim()}
          className={`w-12 min-h-[48px] rounded-lg flex items-center justify-center disabled:opacity-40 ${t.btn}`}><Send size={18} /></button>
      </form>
    </div>
  );
}

// ==========================================
// APP SHELL: navigation, header, tab bar
// ==========================================
const TABS = [
  { view: 'home', label: 'Learn', Icon: GraduationCap },
  { view: 'library', label: 'Library', Icon: BookOpen },
  { view: 'review', label: 'Review', Icon: RotateCcw },
  { view: 'saved', label: 'Saved', Icon: Bookmark },
  { view: 'more', label: 'More', Icon: Settings }
];
// The tab that stays lit while a deeper page is open.
const TAB_OF = { home: 'home', topic: 'home', lesson: 'home', library: 'library', entry: 'library', review: 'review', saved: 'saved', more: 'more', news: 'more', developments: 'more', dev: 'more', kit: 'library', feedback: 'more', ask: 'more', welcome: 'more', coverage: 'more' };

export default function App() {
  const [state, update, storageOk] = useStore();
  const [stack, setStack] = useState([{ view: 'home', param: null }]);
  const [lib, setLib] = useState({ tab: 'Entries', query: '', filters: {} });
  const [chat, setChat] = useState([]);
  const t = theme(state.dark);
  const cur = stack[stack.length - 1];

  // A browser that does not know the learner starts one release back, so the latest changes show until marked as read.
  useEffect(() => {
    if (!state.seenVersion) update({ seenVersion: previousVersion() });
  }, []);
  useEffect(toTop, [stack.length, cur.view]);

  const go = (view, param) => setStack((s) => s.concat([{ view, param: param === undefined ? null : param }]));
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const tab = (view) => setStack([{ view, param: null }]);

  const due = dueReviews(state).length;
  const unread = isNewer(CONTENT.version, state.seenVersion);
  const activeTab = TAB_OF[cur.view] || 'home';
  const paramKey = typeof cur.param === 'string' ? cur.param : cur.param ? JSON.stringify(cur.param) : '';

  let page;
  if (cur.view === 'topic') page = <TopicView key={paramKey} topicKey={cur.param} />;
  else if (cur.view === 'lesson') page = <LessonView key={paramKey} lessonId={cur.param} />;
  else if (cur.view === 'library') page = <Library />;
  else if (cur.view === 'entry') page = <EntryView key={paramKey} id={cur.param} />;
  else if (cur.view === 'review') page = <ReviewView />;
  else if (cur.view === 'saved') page = <SavedView />;
  else if (cur.view === 'news') page = <NewsView />;
  else if (cur.view === 'developments') page = <DevelopmentsView />;
  else if (cur.view === 'videoreview') page = <VideoReview />;
  else if (cur.view === 'kit') page = cur.param && cur.param.n ? <KitCard key={paramKey} k={cur.param} onClose={back} /> : <Empty>Equipment not found.</Empty>;
  else if (cur.view === 'dev') { const it = DEVELOPMENTS.items.find((x) => x.id === cur.param); page = it ? <DevelopmentCard key={paramKey} item={it} startOpen onClose={back} /> : <Empty>This item is no longer listed.</Empty>; }
  else if (cur.view === 'feedback') page = <FeedbackView key={paramKey} where={cur.param ? cur.param.where : null} />;
  else if (cur.view === 'ask') page = <AskView />;
  else if (cur.view === 'more') page = <MoreView />;
  else if (cur.view === 'welcome') page = <WelcomeView />;
  else if (cur.view === 'coverage') page = <Coverage />;
  else if (!state.welcomed && !state.last && Object.keys(state.progress || {}).length === 0) page = <WelcomeView first />;
  else page = <HomeView />;

  const badge = (view) => (view === 'review' && due > 0 ? due : view === 'more' && unread ? '•' : null);

  return (
    <Ctx.Provider value={{ t, state, update, go, back, lib, setLib, storageOk, chat, setChat }}>
      <div className={`min-h-screen text-base ${t.page}`}>
        <header className={`sticky top-0 z-40 border-b ${t.nav}`}>
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
            {stack.length > 1 ? (
              <button type="button" aria-label="Back" onClick={back} className={`w-11 h-11 -ml-2 rounded-lg flex items-center justify-center ${t.muted}`}><ChevronLeft size={22} /></button>
            ) : null}
            <button type="button" onClick={() => tab('home')} className="font-bold text-lg tracking-tight">Fires Atlas</button>
            <button type="button" onClick={() => go('news')} title="What's new"
              className={`hidden sm:inline-block ml-1 px-2 py-0.5 rounded border text-xs font-medium ${unread ? t.info : t.chip}`}>v{CONTENT.version}{unread ? ' · new' : ''}</button>
            <nav className="hidden sm:flex items-center gap-1 ml-auto">
              {TABS.map(({ view, label }) => (
                <button key={view} type="button" onClick={() => tab(view)}
                  className={`min-h-[40px] px-3 rounded-lg text-sm font-semibold ${activeTab === view ? t.navOn : t.muted}`}>
                  {label}{badge(view) ? <span className="ml-1 px-1.5 rounded-full bg-teal-500 text-slate-950 text-xs">{badge(view)}</span> : null}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-1 ml-auto sm:ml-2">
              <button type="button" onClick={() => go('ask')} className={`min-h-[40px] px-3 rounded-lg inline-flex items-center gap-1.5 text-sm font-semibold ${t.btn2}`}><MessageSquare size={16} /> Ask</button>
              <button type="button" aria-label={state.dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => update({ dark: !state.dark })}
                className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.muted}`}>{state.dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pt-5 pb-28 sm:pb-12">
          {reviewMode() && cur.view !== 'videoreview' && (
            <button type="button" onClick={() => go('videoreview')} className={`w-full mb-4 p-3 rounded-lg border text-left text-sm font-semibold ${t.info}`}>
              Review mode: {pendingVideos().length} videos waiting for review. Open the review list →
            </button>
          )}
          {page}
          <div className={`mt-10 pt-4 border-t text-center text-sm font-medium ${t.border} ${t.muted}`}><div>Built from open sources · Researched with Gemini</div><div className="mt-0.5">Built with Claude · Curated by ITCH</div></div>
        </main>

        <nav className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t ${t.nav}`}>
          <div className="grid grid-cols-5">
            {TABS.map(({ view, label, Icon }) => (
              <button key={view} type="button" onClick={() => tab(view)}
                className={`relative min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${activeTab === view ? t.navOn : t.muted}`}>
                <Icon size={20} />
                {label}
                {badge(view) ? <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] px-1 rounded-full bg-teal-500 text-slate-950 text-[11px] leading-[18px] text-center">{badge(view)}</span> : null}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </Ctx.Provider>
  );
}
