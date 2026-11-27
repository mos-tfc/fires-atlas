# Task Board

Shared by all agents. **Adjutant** reviews it weekly and reports to the owner.
Each agent adds a line under its own name when it starts or finishes work: date, what, status, pull request link.
Status: Open · In progress · Waiting on owner · Done.

## Standing schedule

| Agent | Cadence | Job |
|---|---|---|
| Recce | Weekly (Mon) and monthly (first Mon) | Developments news; monthly sweep of all eleven armies |
| Armourer | Weekly (Wed) | Videos and source links still work; new clips for systems without one; equipment data complete |
| Sentry | Every pull request, and weekly (Thu) | Run checks; compare against the Lessons Register |
| Observer | Weekly (Fri) | Learner feedback; review the app; propose improvements |
| Instructor | Fortnightly | Lessons, links between entries, questions that make learners apply what they read |
| Herald | After any user-facing change, and weekly (Sat) | Front page, What's New summary, hand-over notes |
| Liaison | Monthly, and after each new army or exercise | Exercises between armies, partnerships, shared equipment, cross-army links |
| Signaller | Daily (max 3 prompts a day to the owner) | Research prompts, follow-ups, returns; learner experience |
| Archivist | Until cleared | Public links for the ~37 US entries with named-only sources |
| Adjutant | Weekly (Sun) | Follow up every agent; one summary to the owner |

## Open items (carried over from the follow-up tracker 20 Nov 2026; updated 26 Nov 2026)

- [x] Owner: repository moved to mos-tfc, Cloudflare reconnected, new token (expires about 21 Feb 2027), old history purged (24–25 Nov 2026).
- [x] Owner: Claude GitHub app installed; weekly, instructor and monthly routines approved (25 Nov 2026).
- [ ] Owner: 27 Nov 2026 brought forward Australia, Russia, US source links and Japan official sources (owner free). Regional update prompts once a month (max 5 armies each) plus up to 3 gap-fill prompts in other weeks, paced by Signaller (see ops/RESEARCH_QUEUE.md).
- [x] Kill chains for China, Japan and North Korea (21 Nov 2026, from existing entries); second chains for US, Russia, Ukraine, South Korea, Australia, Malaysia, Singapore. 24 Nov 2026: owner asked for one general chain per army; the pairs were merged (sensors named together in the Find step).
- [ ] Ranges for Ukraine and Australia (after research). Indonesia has one chain only (no second sensor path well sourced).
- [ ] 13 systems without a video, plus 4 Indonesian (Armourer).
- [x] Owner: review 64 pending clips (36 Indonesian, 22 Malaysian, 6 Singaporean) at ?review. (owner approved all, 24 Nov 2026)
- [ ] About 37 US entries name a source with no public link: Archivist searches; unresolved go to Signaller as one owner prompt; otherwise stay named (owner decision 21 Nov).
- [x] Developments refresh replaced by the monthly regional update prompts (with a Key Insights card each month).
- [x] Singapore added from the owner's open-source report (21 Nov 2026); FPDA partner list restored in the Malaysia JTAC entry.
- [ ] Optional: the March 2026 Singapore Parliament discussion of Indonesia's KHAN missile, only if the official Hansard record (sprs.parl.gov.sg) is found; the report cited a third-party site.
- [ ] Phone test (owner): Developments (News / Key Insights tabs, footnotes), lesson cards, Videos, Glossary A to Z, More (progress card).
- [ ] Owner: renew the GitHub token before about 21 Feb 2027.
- [ ] Owner (optional): Cloudflare Workers Builds, non-production branch build command still says "None" (false red check on agent pull requests).
- [ ] Owner: confirm Ask works on the site (needs the GEMINI_API_KEY secret in Cloudflare) and send one "Test" through More > Feedback.
- [ ] Owner: unpublish the retired Google Sites front page, if not done.
- [ ] Owner decides: keep scroll position on Back (offered, not built); ask GitHub Support to purge cached old commits (optional).
- [ ] US duplicate review: 26 Nov run stopped by a safety filter; re-run in a later session, owner approves each merge.
- [ ] Optional: Philippines and Thailand as new armies (owner not yet confirmed); domain (owner: not yet).

## Owner decisions (21 Nov 2026)
- Retire the Google Sites front page (owner unpublishes it in Google; nothing in the app links to it).
- Keep the Canvas copy as a backup.
- Purge old Git history after the move to the GitHub organisation.
- Add the feedback password as a cloud secret after the move.

## Log

### Herald
- 2026-11-21 · What's New summary: nine other armies including Malaysia; front-page counts update themselves · Done
- 2026-11-20 · Front page counts and What's New summary updated for Indonesia (nine armies) · Done
### Sentry
- 2026-11-21 · Singapore: 23 links (22 OK, 1 blocked → replaced by MINDEF release); unofficial order-of-battle details (from a Wikipedia page citing a personal X account) left out; overstatements corrected (TMG 'progressively introduced', 2 Oct unveiling, SIGMA resemblance only, Primus/HIMARS figures Reported, Wallaby 6 Sep–2 Nov, SAF-wide simulation figure, ST Engineering claims removed) · Done
- 2026-11-21 · Malaysia: 114 links checked (75 OK, 22 by search, 14 blocked, 1 wrong, 1 dead, 1 image-only); wrong, dead and blocked dropped; 6 claims corrected (Keris Strike dates, Paveway, CAESAR airlift, G5 tender, repair tender, ARTHUR value not used); Singapore blog sources excluded. Indonesia: 6 unconfirmed blocked links removed, 2 claims corrected · Done
- 2026-11-20 · Indonesia report: 60 source links checked (46 OK, 1 verified by search, 10 blocked, 1 image-only, 2 wrong, 0 dead); 2 wrong + 1 suspect dropped; 3 claims corrected; AXYS-ISR and drone/cyber lessons rated Analysis (only source could not be opened); 2 bad relatedIds caught by tools/check.mjs · Done
### Observer
### Recce
- 2026-11-21 · Kill Chain: 10 new chains (18 in total), every step tied to an existing entry; target node labelled 'Target' throughout · Done
- 2026-11-21 · Singapore added from owner's open-source report: 25 entries, 16 glossary terms, 3 news items, kill chain (radar counter-fire to HIMARS), ranges; recce-singapore added · Done
- 2026-11-21 · Malaysia added from owner's research report: 25 entries, 14 glossary terms, 5 news items, kill chain (drone to ASTROS salvo), 5 range sets; recce-malaysia added · Done
- 2026-11-20 · Indonesia added from owner's research report: 26 entries, 19 glossary terms, 5 news items, kill chain, 4 range sets; recce-indonesia researcher added · Done
### Armourer
- 2026-11-21 · Singapore: 16 new systems, 6 matched (HIMARS, GMLRS, TPQ-53, ARTHUR, TPQ-36/37); 6 clips pending; origin pills handle 'reported' and 'not disclosed' · Waiting on owner (?review)
- 2026-11-21 · Malaysia: 25 new systems with specs and country data, 7 matched to existing cards (Malaysia added to their armies), 23 clips pending review; no clip for 11 systems · Waiting on owner (?review)
- 2026-11-20 · Indonesia: specs, photos and country data for 24 systems; 36 YouTube clips (oEmbed-checked) added as pending; no clip yet for AV-UCF, Pindad Mo-3, Minibe, AXYS-ISR · Waiting on owner (review clips at ?review)
### Instructor
- 2026-11-25 · Fortnightly review: 7 recall exercises rewritten as scenarios (usa-org-bcd, joint-eq-hades, usa-trn-jfo, les-nk-2020, joint-ttp-rkt-reload, usa-org-sus-maint-levels; Gaza scenario on les-gaza-2023); 153 reciprocal relatedIds added (Singapore back-links removed by Sentry, L18); glossary NALE and MARLE added; entry counts reported (US 312, others 12 to 27); proposals for owner in PR · Waiting on owner (PR)
- 2026-11-21 · Singapore: 5 lessons, 35 exercises; corrected after Sentry (Primus weight, ST Engineering, Afghanistan question, unit numbers) · Done
- 2026-11-21 · Malaysia: 5 lessons, 35 exercises, comparisons with the US and Indonesia · Done
- 2026-11-20 · Indonesia: 5 lessons, 35 exercises (mostly scenario, one predict each on Indonesia's choices) · Done
### Liaison
- 2026-11-21 · 19 links: added Freedom Shield (US–ROK), Southern Jackaroo (AUS–US–JPN–ROK), Joint Sea (China–Russia, naval), Operation Interflex/Kudu (Ukraine–Australia, training programme), Kursk (North Korea–Russia, operational cooperation); full 2025 participant lists for Super Garuda Shield (13 nations) and Talisman Sabre (19 nations). Every army now linked. Sources: official releases and established press; defence.gov.au and .mil pages verified by search (blocked to scripts) · Done
- 2026-11-21 · EXERCISES data (14 exercises, 9 army-to-army links) built from entries; Military Map 'Joint Exercises' mode; 'Trains with' on country pages; check.mjs validates exercises. Next: confirm full participant lists against official releases (e.g. other nations at Super Garuda Shield and Talisman Sabre), add Korean and Japanese–Australian exercises · Open
- 2026-11-21 · Created. Exercises previously lived only inside each army's entries (17 named: Super Garuda Shield, Talisman Sabre, Keris Strike, Lembing Sakti, Wallaby, Tiger Balm, Forging Sabre, Thunder Warrior, Keris MAREX, Bersama Shield, Bersama Lima, Dynamic Front, Bold Quest, Orient Shield, CSTO exercises); no cross-army exercise view yet · Open (owner decision)

### Signaller
- 2026-11-21 · Created; 7 current gap-fill prompts generated; day 1 handed to owner: Ukraine, China, South Korea · Handed out

### Archivist
- 2026-11-21 · First pass: 27 of 43 named sources linked across 25 entries (armypubs public releases, irp.fas.org, marines.mil, army.mil); FM 3-09 linked to the superseding 2024 edition; FM 3-09.8 citation corrected to TC 3-09.81; 11 sources queued for the owner's combined prompt; STANAG 4355 and the LLDR technical manual left named only · Done

### Adjutant
- 2026-11-20 · Open: owner to review 36 Indonesian clips; Developments refresh about 4 Jan 2027 now includes Indonesia · Open

## Schedules (cloud routines, created 24 Nov 2026; manage at https://claude.ai/code/routines)
- Weekly Review: Mon 06:00 SGT (cron 0 22 * * 0 UTC). Recce news, Armourer, Observer, Sentry, Herald, Signaller (writes ops/research/THIS_WEEK.md), Adjutant. One PR.
- Instructor: Wed 06:00 SGT (cron 0 22 * * 2 UTC), on even ISO weeks only. One PR.
- Monthly Sweep: 1st of the month 08:00 SGT (cron 0 0 1 * * UTC). Country researchers, then Liaison and Sentry. One PR.
- All run on Sonnet 5.5 with no connectors, on agent/<name>/<date> branches; the owner merges.
- 2026-11-24 · Owner's regional update 1 (US, Russia, Ukraine; 1 May–24 Nov 2026) loaded: 19 Developments items, Daring Warrior added, Orient Shield updated. Every source opened or, where the site blocks scripts, confirmed by exact-title search (L1–L5). Dropped: Kerch Bridge strike (only blog and Wikipedia sources), PrSM $8.4bn (third-hand via Anadolu), nuclear-forces exercise and civilian strikes (out of scope), DA PAM 600-3 career guidance (link blocked, unconfirmed), JR3 practice rocket and drone-unit recruitment (low learner value), 'HI-RAIN' label and 4MDTF HIMARS detail (not on the cited pages). Corrected: CSG 'contract' is a selection to compete for task orders; Daring Warrior ran 29 Aug–22 Sep (not 28 Sep); Paladin award dated 16 Jun (BAE). Dates for US, Russia, Ukraine set to 2026-11-24.
- 2026-11-24 · Owner's regional update 2 (China, Japan, North Korea, South Korea) loaded: 13 Developments items; Keen Sword and the Hoguk combined counter-fire exercise added. Corrections applied: China's Strategic Support Force disbanded 19 April 2024 (entry chn-org-ssf-icp and glossary PLASSF updated, Defense News 2024); the PHL-16 parade item was dated 2026 but the parade was 3 September 2025 (moved to Earlier developments). Dropped or trimmed for lack of a confirmed source: SCMP counter-FPV details (FK-4000, LW-30), 38 North analysis figures (90 km, 24-tube launcher), ROK DIA '15 million rounds', KCNA '100 per cent accuracy', HVGP 900 km and Koizumi quote, MigFlug drone-line item, Fuji Firepower (YouTube only), routine Chinese ministry live-fire clips, K9MH contract (already covered by the XM1776 item). Dates for China, Japan, North Korea, South Korea set to 2026-11-24.
- 2026-11-24 · Owner's regional update 3 (Australia, Indonesia, Malaysia, Singapore) loaded: 10 Developments items (Australia 6, Indonesia 1, Malaysia 1, Singapore 2); KNDS 19 Nov release added to the LG1 item; Sigma identification added to the Truck Mounted Gun item; Keris Woomera (12–20 Oct 2026, first HIMARS firing overseas) and Bersama Lima (12–21 Oct 2026) updated. Dropped: Indonesia 750-battalion item (November hearing and artillery split unconfirmed; earlier coverage names a different Army chief), Malaysian G5 AS4000 upgrade (search points to AS2000 on the G5; Malaysian Defence blocked), Lembing Sakti 2026 (Reddit only), Newcastle missile factory and A$36 billion GWEO figure (not in confirmed text), ANAO detail on asset condition and remediation plans (only the headline finding confirmed), Op Kudu lessons and the Army NDS fact sheet (defence.gov.au unreachable), EOS Slinger, PUSARTI tenders, Brunei mortar course (low learner value). Agni Warrior 2026 (India–Singapore table-top, no firing) held for Liaison when India is added.
- 2026-11-25 · India added as the twelfth army from the owner's report: 20 entries, 13 glossary terms, 5 lessons (35 exercises), 5 news items, kill chain 'Radar to Rocket Salvo', 4 ranges, 7 new equipment cards (13 clips pending review), Yudh Abhyas and Agni Warrior added, India moved from 'others' to 'armies' in Super Garuda Shield and Talisman Sabre. Sentry: 11 OK, 7 partial, 1 blocked (GlobalMilitary); every claim resting only on the blocked aggregator was removed (inventory totals, Smerch count, Suryastra in service), weak claims cut (M777 slinging, Swathi pack-up), official sources added (PIB Pinaka test, PIB March DAC, Akashvani K9 contract and October DAC, Akashvani ATAGS, MINDEF Agni Warrior 2024). New region 'South Asia' in LAST_UPDATED. recce-india agent added. Gap for India's first gap fill: the May 2025 India–Pakistan clash.
- 2026-11-25 · Ukraine gap fill loaded: 12 new entries (three battle zones, HIMARS and M270, Vilkha and Long Neptune, battalion strike company, powered bombs, precision against jamming, ISR orbits, massing for the breach, barrel wear, robot resupply, training abroad and at home); 'What the Artillery War Teaches' and 'Precision, Mines and Civilian Harm' updated; AHS Krab and M120 Rak specs filled. Overlapping report sections (Delta, KRIP-A, shells, radars, DPICM) not duplicated. Sentry: 5 OK, 6 partial, 2 wrong (fixed), 5 blocked (3 confirmed; 2 replaced or dropped); unsupported lines removed (M777 6,000-round anecdote, late-2022 counteroffensive line, early Excalibur line, Poland repair hubs, CSIS 2027 aid line). New Ukraine lessons were not written: the Instructor run was stopped by an automated safety check and was not retried; the entries are in the Library without a lesson.
- 2026-11-26 · China gap fill loaded: 13 new entries (PHL-03, ASN-301, CH-4 for deep fires, cluster munition policy, target support, theater command of deep fires, Four Antis, air and drone defence, logistics, artillery academy and its May 2025 merger, exercises, Ukraine lessons, limits of PLA learning). Sentry: 2 OK, 3 partial, 6 blocked-confirmed, 2 blocked (ATP, IISS dropped). Dropped: the 122mm pod-launcher entry (its only source did not contain it), CH-901 swarm claim (IISS scenario, unverified), '3–5 minute' strike claim, 'five intelligence feeds', PLZ-05 resupply line. Report's errata already reflected in the app (SSF, PHL-191 branch). No lessons generated this time.

- 2026-11-26 · Developments: 32 items given their article dates (from the source pages' published dates); 5 found to predate May 2026 moved to Earlier developments (LUCAS, EuroPULS, OWE 500, Estonia–IAI 2023, ARGE SHORAD 2022), keeping their equipment cards; 4 items that cited only forum posts or nothing given real sources (Germany Tomahawk/Typhon, Lithuania Switchblade 600, M-SHORAD and M-ACE, Leopard drone cages). 4 items keep month-only dates (sources blocked or blog).
- 2026-11-26 · Earlier developments are now full news cards (flag "earlier": true) chosen with a Period filter on the Developments page; the plain list is gone.
- 2026-11-26 · Developments: Period filter removed at the owner's request; all news in one list, newest first; the Year filter separates 2026 from 2025 and older items.
- 2026-11-26 · India gap fill loaded: 10 entries (Operation Sindoor guns and counter-battery, drones and missiles, lessons after Sindoor; Excalibur; charges, fuzes and Pinaka rockets; SATA units; SANJAY; the C4I gap; war wastage reserves; ordnance factories to defence companies). 'Why India Is Buying Mobility and Loitering Munitions' moved from Analysis to Confirmed with PIB sources; Loitering, Pinaka, industry and FARP entries updated. Sentry: 18 OK, 5 partial, 3 blocked-confirmed; claims narrowed to what sources say (unit moves, sectors, Pakistan's weapons, SATA, audit figures dropped where unverifiable). Desk: South Korea, Japan and North Korea gap fills handed out for the week of 30 Nov.

- 2026-11-26 · PR #1 (Instructor review) merged on the owner's instruction; 33 two-way links from other armies' entries back to Singapore entries restored (L32).
- 2026-11-26 · Owner approved all 13 India clips (all pass oEmbed).
- 2026-11-26 · Japan gap fill loaded: 10 entries (JJOC; SHIELD; GSDF small attack UAVs; satellite targeting for stand-off missiles; EW units in missile regiment live fire; counter-drone layers; Japan's reading of Ukraine; Resolute Dragon kill web; Type 99; Type 96); corrections to 10 existing entries (Type 25 deployment units and dates, SSM regiments, Vulcano on Type 99, loitering munitions, JTAC, allied fires, Fuji School, build-up budget, links); Type 96 and Type 99 spec cards filled (Reported). Dropped: regional artillery regiment reorganisation and Integrated Targeting (official pages blocked, dates conflict in search), Orient Shield 26 (USARPAC page unconfirmed), Asia Times, Fast-Track Procurement and the ¥70 billion laser/HPM figure (not in sources), all 'Official MOD' Type 96/99 figures (pages blocked), 2024/2025 white paper pages (http only). Source script: fa/tools/jpn_gap_apply.py.
