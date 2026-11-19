# fires-atlas

A learning reference on artillery and fire support worldwide, built from open sources.

Developed by ITCH.

## What is in this repository

| Path | What it is |
|---|---|
| `index.html` | The page. Loads Tailwind CSS, React and the icon library from pinned CDN versions, then `app.js`. |
| `app.js` | The app, compiled from `src/`. This is what visitors run. |
| `src/FiresAtlas.jsx` | The app source. The same file runs in Gemini Canvas. |
| `src/main.jsx` | Website entry point: points the Ask page at `/api/ask` and starts the app. |
| `functions/api/ask.js` | Cloudflare Pages Function for the Ask page. Holds the Gemini key on the server. |
| `build.sh` | Rebuilds `app.js` from `src/` (needs Bun). |

## Cloudflare Pages settings

- Framework preset: **None**
- Build command: **(leave empty)**
- Build output directory: **/** (the repository root)
- Variables and Secrets (Settings → Variables and Secrets, Production):
  - `GEMINI_API_KEY`: a Gemini API key from Google AI Studio, as a **Secret**. Without it, every page works except Ask.
  - `GEMINI_MODEL` (optional): defaults to `gemini-3-flash-preview`.

## Updating

Replace `src/FiresAtlas.jsx`, run `./build.sh`, commit `src/` and `app.js` together.
Cloudflare redeploys on every push to `main`.

## Content

Open sources only. No classified, restricted, export-controlled or leaked material.
