// Cloudflare Worker for Fires Atlas.
// Static files (public/) are served by Workers Static Assets. Only /api/* reaches this code (see wrangler.jsonc).
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ask') return ask(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
