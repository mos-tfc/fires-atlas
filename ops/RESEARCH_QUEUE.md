# Research Queue

Owned by **Signaller**. Monthly, in the first week: **one update prompt per region, at most 5 armies each** (changes since each army's date in `research/LAST_UPDATED.json`; `node tools/mass_prompt.mjs` writes them all). Other weeks: at most **3 gap-fill prompts**. Never more than 3 prompts in a week or 3 open at once.
The current prompts are shown to the owner on the Research Desk page: https://claude.ai/artifact/NjnHgsE85gLcGz1PJt9rTV
Prompts live in `ops/research/prompts/` and are regenerated just before hand-out. Gap-fill prompts (`node tools/gap_prompt.mjs "<Country>"`) cover standing gaps only; add `--with-changes` to include news since the army's date.
Status: Queued · Handed out (date) · Returned (date) · Done (date) · Named only

## Priority order (thinnest first)

| # | Prompt | Why it matters for learners | Status |
|---|---|---|---|
| 0 | Monthly updates: Americas and Europe; Northeast Asia; Southeast Asia and Oceania (`prompts/update-*.md`) | Keeps every army current | Update 1 (Americas and Europe) returned and loaded 24 Nov: 19 news items, 2 exercises; update 2 (Northeast Asia) returned and loaded 24 Nov: 13 news items, 2 exercises, 2 corrections; update 3 handed out (24 Nov, week 1) |
| 0a | New army: India (`prompts/new-india.md`, from `node tools/new_country_prompt.mjs "India"`) | Twelfth army; already in Super Garuda Shield and Talisman Sabre | Queued (week 2) |
| 1 | Ukraine gap fill (`prompts/ukraine.md`) | 13 entries; no liaison or rocket entries; no training entries | Queued (week 2; first version handed out 21 Nov) |
| 2 | China gap fill (`prompts/china.md`) | 12 entries; four areas missing (drones, gunnery, counter-fire, sustainment) | Queued (week 2; first version handed out 21 Nov) |
| 3 | South Korea gap fill (`prompts/south-korea.md`) | 17 entries; no ammunition or training entries | Queued (week 3; first version handed out 21 Nov) |
| 4 | Japan gap fill (`prompts/japan.md`) | 17 entries; no lessons entries | Queued (week 3) |
| 5 | North Korea gap fill (`prompts/north-korea.md`) | 18 entries; 5 rest on assessment only; no training entries | Queued (week 3) |
| 6 | Australia gap fill (`prompts/australia.md`) | 18 entries; no training entries | Queued (week 4) |
| 7 | Russia gap fill (`prompts/russia.md`) | 27 entries; thin on liaison, ammunition and gunnery | Queued (week 4) |
| 8 | US source links: 9 sources Archivist could not find (list below) | Lets learners check sources for themselves | Queued (week 4, with Russia) |

## US source links
Archivist, 21 Nov 2026: 27 of 43 named sources linked (26 applied; one uncertain match held back); one wrong citation corrected (FM 3-09.8 → TC 3-09.81).

**For the owner's combined prompt (find a free public copy, or the current official equivalent; same or newer edition only):**
- usa-ttp-uas: CRS "US Army Transformation in Contact" (2024) — closest found: CRS R47985
- joint-ttp-jtc, joint-ttp-tst, joint-ttp-collection: JP 3-60 Joint Targeting, 2024 edition (only older public copies found)
- usa-eq-bfist: US Army Weapon Systems Handbook, 2022 edition (only 2020–2021 found)
- usa-trn-13f: Fires Center of Excellence course catalogue (2023)
- usa-trn-jfo: Joint Fires Observer Memorandum of Agreement (2021)
- les-ukraine-cb: CSIS "Counter-Battery Warfare in Ukraine" (2023) — title not found; may be misnamed
- les-nk-2020: RUSI "Military Lessons of the Nagorno-Karabakh Conflict" (2021) — exact title not found
- les-gaza-2023: Modern War Institute Urban Warfare Project case study on Gaza (2024)
- usa-les-survivability: "LSCO and Command Post Survivability" (US Army, 2024) — too generic to find
- les-ta-ctc-weak, les-c2-ctc-trends: CALL "FY24 CTC Trends, No. 25-07"
- joint-trn-pc: "Army Public Affairs (March 2025)" — vague; possible match is the 9 March 2025 Project Convergence Capstone 5 story

**Named only (no public copy; not put to the owner):**
- joint-eq-nabk: STANAG 4355 — NATO standard sold through standards bodies, not free
- usa-eq-llsr: TM 11-5855-315-10 (LLDR operator's manual) — Army technical manuals are distribution-restricted; not to be sought (open sources only)
