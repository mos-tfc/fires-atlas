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
| Adjutant | Weekly (Sun) | Follow up every agent; one summary to the owner |

## Open items (carried over from the follow-up tracker, 20 Nov 2026)

- [ ] Owner: move the repository to the GitHub organisation; reconnect Cloudflare; new token (old one expires about 19 Dec 2026).
- [ ] Owner: install the Claude GitHub app on the organisation, so scheduled agents can open pull requests.
- [ ] Owner: run the gap-fill research prompts for the seven armies; Recce and Instructor load the results.
- [x] Kill chains for China, Japan and North Korea (21 Nov 2026, from existing entries); second chains for US, Russia, Ukraine, South Korea, Australia, Malaysia, Singapore.
- [ ] Ranges for Ukraine and Australia (after research). Indonesia has one chain only (no second sensor path well sourced).
- [ ] 13 systems without a video, plus 4 Indonesian (Armourer).
- [ ] Owner: review 64 pending clips (36 Indonesian, 22 Malaysian, 6 Singaporean) at ?review.
- [ ] About 37 US entries name a source with no public link (Recce / Sentry: find public versions or leave named).
- [ ] Developments refresh due about 4 Jan 2027 (Recce).
- [x] Singapore added from the owner's open-source report (21 Nov 2026); FPDA partner list restored in the Malaysia JTAC entry.
- [ ] Optional: the March 2026 Singapore Parliament discussion of Indonesia's KHAN missile, only if the official Hansard record (sprs.parl.gov.sg) is found; the report cited a third-party site.
- [ ] Phone test of Videos tab, Glossary A to Z, equipment pills (owner).

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
- 2026-11-21 · Singapore: 5 lessons, 35 exercises; corrected after Sentry (Primus weight, ST Engineering, Afghanistan question, unit numbers) · Done
- 2026-11-21 · Malaysia: 5 lessons, 35 exercises, comparisons with the US and Indonesia · Done
- 2026-11-20 · Indonesia: 5 lessons, 35 exercises (mostly scenario, one predict each on Indonesia's choices) · Done
### Liaison
- 2026-11-21 · 19 links: added Freedom Shield (US–ROK), Southern Jackaroo (AUS–US–JPN–ROK), Joint Sea (China–Russia, naval), Operation Interflex/Kudu (Ukraine–Australia, training programme), Kursk (North Korea–Russia, operational cooperation); full 2025 participant lists for Super Garuda Shield (13 nations) and Talisman Sabre (19 nations). Every army now linked. Sources: official releases and established press; defence.gov.au and .mil pages verified by search (blocked to scripts) · Done
- 2026-11-21 · EXERCISES data (14 exercises, 9 army-to-army links) built from entries; Military Map 'Joint Exercises' mode; 'Trains with' on country pages; check.mjs validates exercises. Next: confirm full participant lists against official releases (e.g. other nations at Super Garuda Shield and Talisman Sabre), add Korean and Japanese–Australian exercises · Open
- 2026-11-21 · Created. Exercises previously lived only inside each army's entries (17 named: Super Garuda Shield, Talisman Sabre, Keris Strike, Lembing Sakti, Wallaby, Tiger Balm, Forging Sabre, Thunder Warrior, Keris MAREX, Bersama Shield, Bersama Lima, Dynamic Front, Bold Quest, Orient Shield, CSTO exercises); no cross-army exercise view yet · Open (owner decision)

### Adjutant
- 2026-11-20 · Open: owner to review 36 Indonesian clips; Developments refresh about 4 Jan 2027 now includes Indonesia · Open
