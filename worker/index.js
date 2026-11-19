// Cloudflare Worker for Fires Atlas.
// Static files (public/) are served by Workers Static Assets. Only /api/* and /admin/* reach this code (see wrangler.jsonc).
// POST /api/ask passes the Ask page's request to Gemini with the key kept on the server.
// Set in Cloudflare (Worker > Settings > Variables and Secrets):
//   GEMINI_API_KEY  (Secret, required for Ask)
//   GEMINI_MODEL    (Text, optional; default below)
const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_BODY = 1500000; // characters; the app sends the selected entries plus the title index

async function ask(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  // Only accept calls from pages on this same site.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!env.GEMINI_API_KEY) {
    return new Response('Ask is not set up on this site yet.', { status: 503 });
  }
  const body = await request.text();
  if (body.length > MAX_BODY) return new Response('Request too large', { status: 413 });

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

// ---------- feedback ----------
// POST /api/feedback stores one learner message in the KV namespace bound as FEEDBACK.
// GET /admin/feedback lists them for the author, behind a password (secret FEEDBACK_PASSWORD; any user name).
// Nothing identifying is stored: no IP address, no browser details.
const FEEDBACK_KINDS = ['Correction', 'Suggestion', 'Content request', 'App problem'];
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

async function feedback(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response('Forbidden', { status: 403 });
  if (!env.FEEDBACK) return new Response('Feedback storage is not set up yet.', { status: 503 });
  const raw = await request.text();
  if (raw.length > 6000) return new Response('Too long', { status: 413 });
  let d;
  try { d = JSON.parse(raw); } catch (e) { return new Response('Bad request', { status: 400 }); }
  const text = clip(d.text, 3000).trim();
  if (text.length < 3) return new Response('Empty', { status: 400 });
  const at = new Date().toISOString();
  const record = {
    at, text,
    kind: FEEDBACK_KINDS.includes(d.kind) ? d.kind : 'Other',
    where: clip(d.where, 80), about: clip(d.about, 200), version: clip(d.version, 20)
  };
  // Newest first when listed: keys sort by (far future - now).
  const key = 'fb:' + String(9e15 - Date.now()).padStart(16, '0') + ':' + Math.random().toString(36).slice(2, 8);
  await env.FEEDBACK.put(key, JSON.stringify(record));
  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function authorised(request, env) {
  if (!env.FEEDBACK_PASSWORD) return false;
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let pair = '';
  try { pair = atob(h.slice(6)); } catch (e) { return false; }
  const pass = pair.slice(pair.indexOf(':') + 1);
  // Constant-time comparison.
  const a = new TextEncoder().encode(pass), b = new TextEncoder().encode(env.FEEDBACK_PASSWORD);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function adminFeedback(request, env) {
  if (!env.FEEDBACK_PASSWORD) return new Response('Set the FEEDBACK_PASSWORD secret first.', { status: 503 });
  if (!authorised(request, env)) {
    return new Response('Password required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Fires Atlas feedback", charset="UTF-8"', 'Cache-Control': 'no-store' } });
  }
  if (!env.FEEDBACK) return new Response('Feedback storage is not set up yet.', { status: 503 });
  const url = new URL(request.url);
  if (request.method === 'POST' && url.searchParams.get('delete')) {
    const k = url.searchParams.get('delete');
    if (k.startsWith('fb:')) await env.FEEDBACK.delete(k);
    return Response.redirect(url.origin + '/admin/feedback', 303);
  }
  const listed = await env.FEEDBACK.list({ prefix: 'fb:', limit: 200 });
  const rows = await Promise.all(listed.keys.map(async (k) => {
    const v = await env.FEEDBACK.get(k.name, 'json');
    return v ? { key: k.name, ...v } : null;
  }));
  const items = rows.filter(Boolean);
  if (url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify(items, null, 2), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  const list = items.map((f) => `<article><div class="meta"><b>${esc(f.kind)}</b> · ${esc(f.at.slice(0, 16).replace('T', ' '))} UTC · content ${esc(f.version)}</div>
<div class="about">${esc(f.about || f.where)}</div><p>${esc(f.text)}</p>
<form method="post" action="/admin/feedback?delete=${encodeURIComponent(f.key)}" onsubmit="return confirm('Delete this message?')"><button>Delete</button></form></article>`).join('\n');
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Fires Atlas feedback</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1.5rem 16px;background:#f8fafc;color:#0f172a}
@media (prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}article{background:#1e293b!important;border-color:#334155!important}}
article{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:10px 0}
.meta{font-size:13px;opacity:.75}.about{font-size:13px;opacity:.75;margin-top:2px}p{white-space:pre-wrap;margin:.5rem 0}
button{font:inherit;font-size:13px;padding:4px 10px;border-radius:6px;border:1px solid #94a3b8;background:transparent;color:inherit;cursor:pointer}
</style></head><body><h1>Fires Atlas feedback</h1><p>${items.length} message${items.length === 1 ? '' : 's'}${listed.list_complete ? '' : ' (newest 200 shown)'} · <a href="/admin/feedback?format=json">download as JSON</a></p>
${list || '<p>No feedback yet.</p>'}</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ask') return ask(request, env);
    if (url.pathname === '/api/feedback') return feedback(request, env);
    if (url.pathname === '/admin/feedback') return adminFeedback(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
