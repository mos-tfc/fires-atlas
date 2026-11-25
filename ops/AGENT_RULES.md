# Rules for Every Fires Atlas Agent

Read this file and `ops/LESSONS.md` before any work. Log your work in `ops/TASKS.md` under your name.

## The app
- One React file: `src/FiresAtlas.jsx`. The **content block** (top of the file, down to the end of `LESSONS`) holds all data:
  CONTENT, CHANGELOG, TOPICS, APP_DATA (entries), GLOSSARY, DEVELOPMENTS, EQUIPMENT_LINKS, EQUIPMENT_SPECS,
  VIDEO_LINKS, VIDEO_META, RANGE_DATA, KILL_CHAINS, LESSONS. Below it is app code.
- Website: https://fires-atlas.menofsteel.workers.dev, deployed by Cloudflare on each merge to `main`.
- Build: `./build.sh` (bun) rebuilds `public/app.js`. Always rebuild and commit `public/app.js` with a source change.
- Checks: `node tools/check.mjs` must pass (exit 0) before any pull request. `python3 tools/check_links.py --videos` for clips.

## Entry format
Fields: id, topic, country, addedIn, module (Forces, TTPs, Equipment, Training, Lessons), force, echelon [], type,
title (title case), what [], how [], why [], sources [{title, publisher, year, url}], confidence, asOf (YYYY-MM), relatedIds [].
- Confidence: **Confirmed** (official or primary source), **Reported** (press, vendor, single unverified source),
  **Analysis** (assessment). Start a line with "Reported:" or "Analysis:" when that line rests on weaker ground.
- Where sources disagree, give each figure with its source. Never fill gaps with another army's doctrine.

## Non-negotiable
1. **Open sources only.** Nothing classified, restricted, export-controlled or leaked.
2. **Singapore only from the owner’s open-source report.** Singapore and SAF content may be added only from an open-source report the owner has shared, checked like any other army. Never add internal, restricted or personal knowledge of the SAF. Until that report is loaded, leave Singapore references out and list them in `ops/TASKS.md` to add later.
3. **Verify every link yourself** (open it, match its title). Never invent or edit a URL. See L1 to L5.
4. **Do not change a claim** without a dated primary source. Log doubts instead.
5. **Review before publishing.** Work on a branch named `agent/<name>/<yyyy-mm-dd>`, open a pull request with a plain summary,
   and stop. The owner merges. Never push to `main`.
6. **No secrets, no personal details** in commits, pages or web requests. Commit as `Fires Atlas <fires-atlas@users.noreply.github.com>`.
7. **Style:** plain UK English, short sentences, clinical tone, no intensifiers ("massive", "devastating"). Official names keep
   their own spelling. Title case for titles and labels.
8. **Videos:** YouTube clips must pass oEmbed. No combat strike footage unless the owner approved it; such clips carry `warn`. **At most two clips per equipment**, counting other names for the same system (map them in `VIDEO_SAME`). A clip not in English carries `lang` (e.g. "Korean") and `en` (an accurate English title); prefer one English and one local-language clip when both exist.
9. If something is unclear or risky, write it in the pull request under "Questions for the owner" rather than guessing.

10. **Keep research prompts in step with the app.** A pull request that adds a new kind of content (a data set, or a field learners see) also updates `tools/new_country_prompt.mjs` (and `tools/gap_prompt.mjs` if relevant) and `ops/research/PROMPT_COVERAGE.json`. `node tools/check.mjs` fails on a data set the prompt does not cover. Sentry checks this on every pull request.

11. **Research Desk.** When an owner's report is loaded, the same change removes its prompt from `ops/research/DESK.json` and rebuilds the Desk (`python3 tools/build_desk.py`); the page is republished to the same link. The Desk never shows prompts that are already done.

## Pull request summary (template)
- What changed (one line per item, with entry ids)
- Sources added, and how each was verified
- Checks: output of `node tools/check.mjs` (last line) and link or video check if run
- Questions for the owner
