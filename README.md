# fires-atlas

A learning reference on artillery and fire support worldwide, built from open sources.

Developed by ITCH.

## What is in this repository

| Path | What it is |
|---|---|
| `public/index.html` | The page. Loads Tailwind CSS, React and the icon library from pinned CDN versions, then `app.js`. |
| `public/app.js` | The app, compiled from `src/`. This is what visitors run. |
| `src/FiresAtlas.jsx` | The app source. The same file runs in Gemini Canvas. |
| `src/main.jsx` | Website entry point: points the Ask page at `/api/ask` and starts the app. |
| `worker/index.js` | Cloudflare Worker: serves `public/` and answers `POST /api/ask` with the Gemini key kept on the server. |
| `wrangler.jsonc` | Worker configuration (name, static assets folder, routes that run the Worker). |
| `build.sh` | Rebuilds `public/app.js` from `src/` (needs Bun). |

## Cloudflare (Workers, connected to this repository)

- Deploy command: `npx wrangler deploy` (Cloudflare's default). No build command is needed.
- The Worker name in the dashboard must match `name` in `wrangler.jsonc` (`fires-atlas`).
- Settings → Variables and Secrets:
  - `GEMINI_API_KEY`: a Gemini API key from Google AI Studio, type **Secret**. Without it, every page works except Ask.
  - `GEMINI_MODEL` (optional, type Text): defaults to `gemini-3-flash-preview`.

## Updating

Replace `src/FiresAtlas.jsx`, run `./build.sh`, commit `src/` and `public/app.js` together.
Cloudflare redeploys on every push to `main`.

## Content

Open sources only. No classified, restricted, export-controlled or leaked material.
