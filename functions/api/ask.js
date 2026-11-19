// Cloudflare Pages Function: POST /api/ask
// Passes the Ask page's request to Gemini with the key kept on the server.
// Set in Cloudflare (Pages project > Settings > Variables and Secrets):
//   GEMINI_API_KEY  (secret, required)
//   GEMINI_MODEL    (optional, default below)
const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_BODY = 1500000; // characters; the app sends the selected entries plus the title index

export async function onRequestPost({ request, env }) {
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
