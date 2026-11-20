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
| `worker/index.js` | Cloudflare Worker: serves `public/`; `POST /api/ask` (Gemini, key kept on the server); `POST /api/feedback` and the password-protected `/admin/feedback`. |
| `wrangler.jsonc` | Worker configuration (name, static assets folder, routes that run the Worker). |
| `build.sh` | Rebuilds `public/app.js` from `src/` (needs Bun). |

## Cloudflare (Workers, connected to this repository)

- Deploy command: `npx wrangler deploy` (Cloudflare's default). No build command is needed.
- The Worker name in the dashboard must match `name` in `wrangler.jsonc` (`fires-atlas`).
- Settings → Variables and Secrets:
  - `GEMINI_API_KEY`: a Gemini API key from Google AI Studio, type **Secret**. Without it, every page works except Ask.
  - `GEMINI_MODEL` (optional, type Text): defaults to `gemini-3-flash-preview`.
  - `FEEDBACK_PASSWORD` (type **Secret**): password for reading feedback at `/admin/feedback` (any user name).
- Feedback storage: a KV namespace bound as `FEEDBACK` (declared in `wrangler.jsonc` by its ID). Learners' feedback is stored there; nothing identifying (no IP address) is kept.

## Updating

Replace `src/FiresAtlas.jsx`, run `./build.sh`, commit `src/` and `public/app.js` together.
Cloudflare redeploys on every push to `main`.

## Content

Open sources only. No classified, restricted, export-controlled or leaked material.

## Agent team

Claude Code subagents live in `.claude/agents/`. They are available in any Claude Code session opened in this repository
(ask, for example, "Use Sentry to check this branch"). Shared files: `ops/AGENT_RULES.md` (rules), `ops/LESSONS.md`
(past mistakes and their checks), `ops/TASKS.md` (schedule, open items, log), `ops/research/` (country research notes).

| Agent | Job |
|---|---|
| Herald | Front page, What's New, README |
| Sentry | Regression guard: checks and the Lessons Register |
| Observer | Learner feedback, app review, improvements |
| Recce | Research lead: weekly news, monthly sweep; tasks the nine country researchers (`recce-<country>`) |
| Armourer | Videos, equipment cards, specs, country data |
| Instructor | Lessons, links, exercises that make learners apply what they read |
| Adjutant | Weekly follow-up of all agents; summary to the owner |

Checks: `node tools/check.mjs` (content, links between entries, equipment, videos, style) and
`python3 tools/check_links.py --videos --sources` (live clips and source pages). Agents open pull requests; the owner merges.
