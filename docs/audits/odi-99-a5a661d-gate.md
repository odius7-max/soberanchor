# ODI-99 search slice 1.1 — PASS at 71fda22

**Latest retest: `71fda22736f591f673626d1d75d9e05cc1f6d126` — PASS.** Both timing guardrail findings are closed. Bounded focus-transition evidence is sufficient for this gate; live screen-reader spoken-output verification remains an explicitly unverified, nonblocking residual. See the final appended section. Earlier FAIL verdicts below are retained as history and superseded for this SHA.

**Verdict: FAIL for `a5a661dcc1db1ca77dcf0134c934c2128e5f06b3`: one P2 fix required in finding 4.** Findings 1–3 pass. The initial keyboard path improves to two Tabs, but a second ambiguous search retains the old long path. This gate specifically covers completion of the four slice-1 findings; the keyboard finding is not fully closed.

Astra, 2026-09-24. Preview: https://soberanchor-git-fix-odi-99-search-1-1-odius7-maxs-projects.vercel.app

Vercel independently reports deployment `dpl_9Gu3Uspgp6MQ5VkqAUuZSqthvt9z`, READY, exact requested SHA and branch `fix/odi-99-search-1-1`. Immutable hostname: `soberanchor-f6m32i15g-odius7-maxs-projects.vercel.app`. No stale-preview retry needed. Local checkout remains main at `a93b5302da864dab61304ae539f6c50a5b3b9add`; source comparisons use `git show` for the requested commit, without switching branches.

## Finding 1 — honest City, ST failure: PASS

| Query | Rendered outcome | Facility cards |
| --- | --- | ---: |
| Faketown, ME | We couldn't find Faketown in Maine. | 0 |
| Faketown, Maine | We couldn't find Faketown in Maine. | 0 |
| faketown, me | We couldn't find faketown in Maine. | 0 |
| Missoula, ND | We couldn't find Missoula in North Dakota. | 0 |
| Faketown | Ordinary Search results / No matches, without location-failure copy | 0 |

All explicit-location failures offer the two labeled recovery links. Clicking **Browse all Maine listings** lands on `?q=Maine#results`, with the statewide heading and 15 alphabetic results, no distance badges or origin. The North Dakota equivalent also works.

Clicking **Search “Faketown” as text** lands on `?q=Faketown&mode=text#results` and shows ordinary text/no-match results. Crucially, **Search “Missoula” as text** from the North Dakota failure lands on `?q=Missoula&mode=text#results`, shows eight text matches and the explanation that it matches across name/city/state, and has **no distance heading, origin, or miles**. Some text matches are in Montana, as expected for an explicitly requested nationwide text search; the app does not silently resolve the query to a Montana geographic search.

The bypass occurs before the location branches and calls the existing keyword function. No geographic cards appear before the user chooses an alternative.

**City-echo wording: keep it.** Lowercase `faketown` is clear and faithful to the input. Automatic title-casing could damage legitimate names such as Coeur d'Alene. The canonical full state name already supplies useful normalization.

## Finding 2 — statewide heading: PASS

`California` and `CA` both render **“Recovery services and places in California”**, with 15 results and the alphabetic-browse subline. Neither has a distance heading, explanation, origin, or badge. The Maine and North Dakota recovery-link destinations also use the new heading. Keep this wording for the mixed directory.

## Finding 3 — chooser field synchronization: PASS

Submitted Springfield, then selected Springfield AR using only the keyboard. The heading, URL, and input all change to the chosen place; input reads **Springfield, AR**. Refresh preserves the selected place and card list. Back restores the Springfield chooser and the input **Springfield**.

Separately selected Springfield IL and pressed Enter in the field again: input remains **Springfield, IL** and results remain geographic Springfield IL results, rather than reopening the ambiguous chooser. This closes the previous reproducible field-sync defect.

## Finding 4 — keyboard focus: FAIL, P2

**First submission passes:** `/find` → enter Springfield → submit focuses `h2#chooser-heading`; Tab 1 reaches Clear search; Tab 2 reaches Springfield AR. Focus is visible and Enter selects the option.

**A subsequent ambiguous query does not receive that behavior:**

1. Open `/find?q=Springfield#results` and allow the chooser to finish rendering.
2. Put focus in the directory field, replace the query with `san diego`, and press Enter.
3. Wait for **Which san diego?** and the CA/TX options.
4. Focus remains on `input#directory-search`; it does not move to the new heading.
5. Reaching San Diego CA takes **12 Tabs**, through Search, the category/community links, and Clear search.

Reproduced in two runs, with the full Tab sequence recorded on the second run. After the route scroll, the focused input was above the viewport. The old keyboard burden survives on a normal repeat-search flow.

**Cause:** at this SHA, `src/components/find/FocusOnMount.tsx:19–22` runs its effect only for `[targetId]`. The parent at `src/app/find/page.tsx` always supplies the same `chooser-heading` ID. When the existing chooser component updates from Springfield to San Diego, the effect does not rerun.

**Required fix:** trigger heading focus on each newly submitted/resolved chooser query, for example with a stable query/chooser identity dependency or a keyed focus component. Avoid refocusing on unrelated renders or while the user merely types. This is a small completion fix to the feature being gated, not a request for a new search feature.

**Required retest:** first ambiguous submission and chooser-to-chooser submission must both produce heading → Clear search → first option in two Tabs. Repeat with Springfield → san diego and the reverse; retain chosen-field sync, Back, refresh, and Enter selection.

### Direct-load focus judgment

Focusing the chooser heading is appropriate on a search submission and on a direct `#results` link: it announces the decision before the options and avoids choosing on the user's behalf. `preventScroll` is reasonable when anchor navigation has placed the result region in view.

On a fresh direct URL **without `#results`**, however, observed `scrollY = 0` while the focused heading was about 1,088 px below the viewport at 1024×900. That is surprising: keyboard/screen-reader focus and the visible page disagree. Recommend preserving normal initial focus for unanchored direct visits, or deliberately bringing the focused heading into view. Do not assume every direct URL has the hash. Fold this into the focus fix if practical; the required failure above is independently reproducible even with the normal hash-bearing search flow. Full screen-reader testing was not performed.

## Source and payment-order verification

Compared function source extracted from Git objects for slice-1 SHA `1e27dba` and requested SHA `a5a661d`:

- `buildSearchFilter`: byte-identical extracted function, 482 UTF-8 bytes.
- `keywordSearch`: byte-identical extracted function, 343 UTF-8 bytes.
- Entire `src/lib/location-resolve.ts`: byte-identical.
- Entire `src/components/find/FeaturedBand.tsx`: byte-identical.

The commit diff confirms the honest state is a pre-filter branch. No distance-ordering code, RPC argument construction, candidate selection in the resolver, result concatenation, or card merge ordering changed. No DB migration is part of this commit. The payment-blind ordering verified in slice 1 is unchanged in application source; this run does not claim a fresh production `pg_get_functiondef` read.

## Regression sweep

| Query | Cards | First–last miles | Observation |
| --- | ---: | --- | --- |
| Missoula, MT | 25 | 0.5–96.6 | Required heading and approximation explanation |
| 10001 | 25 | 0.3–1.8 | Dense nearby results; no long-distance note |
| 59801 | 25 | 0.6–96.0 | ZIP distance path |
| 69201 | 25 | 102.8–157.0 | Note and first card both say 102.8 miles |
| Springfield Recovery Center | 0 | None | Ordinary text/no-match path |
| 99999 | 0 | None | Unknown-ZIP recovery message preserved |

All four distance queries reproduce the exact slice-1 card IDs, order, displayed distances, and card text; every adjacent distance is non-decreasing. Show more on 59801 yields 50 unique cards, preserves the first 25 exactly, and maintains distance order.

All **36 layout cases** pass `scrollWidth === clientWidth`: browse, Faketown ME, lowercase faketown ME, Missoula ND, California, Springfield, Missoula MT, 69201, and 99999 at **320/375/768/1024**. Both `/find` and `/` pass the standing **768 === 768** check. Inspected saved mobile failure/chooser and desktop failure screenshots; links fit and remain usable. The result-section screenshots were explicitly scrolled for inspection and do not certify automatic anchor positioning. No uncaught browser page errors were recorded.

## Evidence and scope

- [Probe](odi-99-gate.cjs)
- [Matrix, recovery-link outcomes, source comparisons, history and layout results](odi-99-a5a661d-evidence/results.json)
- [Repeated-chooser reproduction, full Tab sequence, direct-load focus and resubmit evidence](odi-99-a5a661d-evidence/focus-followup.json)
- [320px failure state](odi-99-a5a661d-evidence/320-FaketownME.png)
- [375px chooser](odi-99-a5a661d-evidence/375-Springfield.png)
- [Initial keyboard focus](odi-99-a5a661d-evidence/keyboard.png)
- [Direct visit without hash](odi-99-a5a661d-evidence/direct-no-hash.png)

Used Playwright against the deployed preview. The bulk probe initially paused on a harness assumption that adding a hash to the same URL would cause a new mount; corrected the probe to make fresh direct visits and resumed the remaining checks. That timeout is not counted as an application failure. The repeated-chooser defect was separately reproduced and matches the source dependency behavior.

Only audit artifacts were written. No application changes, production writes, local builds, commits, merges, or checkout changes. **Fix list: one required P2 focus-update correction, with the direct-load focus policy recommendation above.**

---

## Retest — 19c2db5886301bfa6e3bd0677667d7d95a34290c

**Verdict: FAIL — original focus defect fixed, but the new user-interaction protection is incomplete and the claimed focus-call cap is not enforced.** Findings 1–3 and requested regression spot-checks remain passing. This retest does not clear the merge prompt.

Vercel independently confirms the same alias now serves READY deployment `dpl_7gzE22hSLMTiUZq8X9FEfPhsc2JQ`, exact SHA `19c2db5886301bfa6e3bd0677667d7d95a34290c`, branch `fix/odi-99-search-1-1`. Immutable hostname: `soberanchor-4ou2jqc67-odius7-maxs-projects.vercel.app`. No stale-SHA wait was needed.

### Requested fix — PASS

- Springfield → san diego → Springfield: each submitted chooser finishes with the heading focused; Tab 1 is Clear search, Tab 2 is the first candidate. The original 12-stop defect is closed in both directions.
- Fresh `/find?q=Springfield` without a hash: focus remains on BODY, `scrollY=0`, no automatic jump.
- Fresh `/find?q=Springfield#results`: chooser heading receives focus and the page scrolls to the result region.
- Choose Springfield IL: field reads Springfield, IL. Back restores the Springfield chooser, refocuses its heading, and restores the field to Springfield.

### Guardrails — two failures

**R1 [P2, required]: do not take focus from a user who resumed editing while results were pending.**

Reproduction against the deployed preview, with only the browser's Springfield fetch delayed 500ms to make the timing reproducible:

1. Open `/find` and submit Springfield using Enter.
2. Immediately type ` next` while the input still has focus, before the chooser response arrives.
3. Before arrival: active element is `input#directory-search`; value is `Springfield next`.
4. On arrival: `FocusOnQuery` explicitly calls heading.focus while `directory-search` is active. Final focus is `h2#chooser-heading`; field value becomes `Springfield`.

This violates the requested “type immediately after submitting; focus must stay in the field” guardrail. The added text is also discarded by the existing query-to-field synchronization. That reset is reported as an observed interaction between the two behaviors, not as a newly changed DirectorySearch implementation.

Cause at this SHA: `src/components/find/FocusOnQuery.tsx:48` focuses the heading unconditionally before the body-only guard exists. The later animation-frame checks protect users only after the initial effect has run. Merely checking whether the input is focused is insufficient, since ordinary Enter submission also leaves focus there; distinguish a later user interaction from the original submission.

Fix: track user interaction/editing after submission and suppress automatic initial focus/reclaim when the user has moved on. Preserve the newer draft rather than replacing it with an older submitted query. Keep the normal two-Tab path when no later user interaction occurred. Add a delayed-response regression that types immediately after submission, rather than only testing typing after the heading has mounted.

**R2 [P2, required]: make the claimed bounded retry behavior real.**

Instrumented actual `HTMLElement.focus()` calls in the deployed page, forwarding every call to the original browser method. In a controlled stress test, blurred the focused heading to BODY three times, 70ms apart, during the first second. Recorded **four heading focus calls** at approximately 2862.0, 2884.0, 2967.0, and 3034.4ms on the page clock, including three reclaims from BODY. This is a synthetic reset test of the claimed cap, not evidence that a normal router navigation naturally resets three times.

The implementation at lines 65–68 has a time deadline but no reclaim counter. Every frame that sees BODY can focus the heading again. Consequently, “focus() fires at most twice” is false as an implementation guarantee. It also only observes user movement at animation-frame sampling time; this is not a permanent record that the user interacted.

Fix: explicitly bound retries to the intended initial focus plus at most one recovery, and permanently cancel automatic focus after subsequent user interaction. If a different focus coordination strategy is selected, document its actual bounds and verify them; do not equate a one-second loop with a two-call cap.

### Passing timing checks and screen-reader limits

Resuming typing **after** the chooser heading appears, during the reclaim window, leaves focus in the input and retains `san diego next` after 1.15 seconds. Tabbing from the focused heading to Clear search during that window also leaves focus on the link after 1.15 seconds. These successful cases do not cover the pending-response failure above.

The heading remains a programmatically focusable H2 preceding the options, a sensible accessible target. However, no actual NVDA/JAWS/VoiceOver announcement test was available in this browser automation environment. Focus-call/event instrumentation is not a screen reader. I cannot certify a single spoken announcement, and “at most twice” would not itself prove one announcement even if enforced. Multiple body-to-heading focus transitions may produce repeated announcements; validate with an actual screen reader after the guardrail correction and revise the unsupported source comment.

### Unchanged findings and spot-checks — PASS

The `a5a661d` → `19c2db5` application diff only changes chooser focus wiring and replaces FocusOnMount with FocusOnQuery. Parser, resolver, DirectorySearch, FeaturedBand, keyword function, and ordering logic are unchanged.

Rendered result text matches the prior gate exactly for Faketown ME, Faketown Maine, lowercase faketown me, Missoula ND, bare Faketown, California, CA, Missoula MT, and 69201. In particular:

- Explicit unknown city/state queries still have zero cards and both recovery offers; lowercase echo remains as ratified.
- Missoula ND → Search “Missoula” as text still produces eight ordinary text matches, no geographic heading or miles.
- California/CA retain “Recovery services and places in California,” without a distance origin.
- Missoula MT: 25 results, 0.5–96.6 miles, unchanged rendered list.
- 69201: 25 results, 102.8–157.0 miles; first card and long-distance note both use 102.8.
- Standing 768 checks: `/find` and `/` both have `scrollWidth = clientWidth = 768`.
- No uncaught page errors recorded.

### Retest evidence

- [Retest probe](odi-99-retest.cjs)
- [Focus calls/events, timing guardrails, query transitions and regression results](odi-99-19c2db5-evidence/results.json)

The 500ms response delay and repeated body resets exist only in the test browser. No production behavior/data was modified. Only audit files were written; no application edits, commits, merges, builds, or checkout changes.

**Current required fix list: R1 pending-response interaction protection; R2 explicitly bounded and user-cancellable focus recovery.** Preserve the now-passing chooser query dependency and hash gating.

---

## Third-round retest — 71fda22736f591f673626d1d75d9e05cc1f6d126 — PASS

Astra, 2026-09-28. **PASS clears the ODI-99 merge prompt for this exact SHA. Required fix list: none.** The preceding R1/R2 findings are now closed.

Vercel independently reports the same preview alias serving READY deployment `dpl_25CxQFPVx58LbQNbBK2Nt5TQ9EnC`, branch `fix/odi-99-search-1-1`, SHA `71fda22736f591f673626d1d75d9e05cc1f6d126`. Immutable hostname: `soberanchor-ncyuo39xk-odius7-maxs-projects.vercel.app`. No stale-SHA retry needed.

### R1 — pending edits and resubmission: PASS

Re-ran the earlier reproduction with the matching fetch held for 500ms in the test browser. Submitted Springfield and immediately typed ` next` before the response arrived. On arrival and after the recovery window, the field still reads **Springfield next**, active element remains **directory-search**, and heading focus calls are **zero**.

Extended the independent test to both a chooser query and a distance query at normal and throttled CPU:

| CPU rate | Submitted query | Draft after response | Active element | Heading calls |
| --- | --- | --- | --- | ---: |
| 1× | Springfield | Springfield next | directory-search | 0 |
| 1× | Missoula, MT | Missoula, MT next | directory-search | 0 |
| 8× slowdown | Springfield | Springfield next | directory-search | 0 |
| 8× slowdown | Missoula, MT | Missoula, MT next | directory-search | 0 |

After each edited-response case, replaced the draft with `san diego`, submitted again, and selected **San Diego, CA**. The fresh submission restores ordinary chooser focus, and selecting the option updates the untouched input to **San Diego, CA**. The edit protection does not permanently disable finding-3 field synchronization.

Typing after the heading appears also retains the newer draft and caret through the recovery window. The implementation now separates the field's last submitted value from a newer draft; the focus helper respects the edited active field before its initial call.

### R2 — enforced cap, fresh budgets, and cancellation: PASS

Re-ran the controlled focus-reset stress with **five** heading-to-BODY resets. Instrumentation forwards all focus calls to the native browser method and records actual focusin transitions.

| CPU rate | First query: Springfield | Second query: san diego |
| --- | --- | --- |
| 1× | 2 calls / 2 transitions | 2 calls / 2 transitions |
| 8× slowdown | 2 calls / 2 transitions | 2 calls / 2 transitions |

No third call occurs despite repeated resets. The second query receives a fresh budget rather than inheriting an exhausted first-query budget. These controlled reset counts differ from the builder's timing-dependent 8× count of one, but satisfy the actual maximum of two.

Tabbing away during the window stays on the chosen link without being pulled back. An additional cancellation test tabs away and then deliberately blurs that link to BODY: after 1.15 seconds, focus remains on BODY, with no renewed heading recovery. This passes at 1× and 8× and demonstrates permanent cancellation rather than merely skipping one frame. Clicking and typing in the field after the heading appears also remains respected. Source review confirms capture listeners for keydown, pointerdown, and input, explicit stopped state, cleanup, and the incremented per-effect call counter checked before further recovery.

### Announcement-evidence ruling

**Bounded-transitions evidence closes the code-level finding for this gate. Live spoken-output verification is a nonblocking residual, not a requirement for another build round.**

The ordinary Springfield → san diego → Springfield run records one new heading focus call and one new heading focusin transition per submitted query. Synthetic router-style resets produce at most the enforced two. There is no unbounded repeated-focus behavior, and deliberate subsequent interaction cancels the recovery.

This does **not** establish what NVDA, JAWS, or VoiceOver speaks. No live AT run was performed, and this report does not certify a single spoken announcement or general accessibility compliance. Retain a manual AT follow-up for the normal announcement, recovery path, and Back navigation. No need to route that as a prerequisite to this merge.

The source now explicitly disclaims spoken-output certification, although its general sentence that a screen reader announces once per transition should not be treated as measured evidence. A future comment cleanup can simply state that speech depends on the AT/browser combination; this is not a required code fix.

### Original fixes and regression spot-checks: PASS

- Springfield → san diego → Springfield: heading focus followed by **Clear search → first option**, exactly two Tabs each way.
- No-hash direct Springfield visit: BODY focus, `scrollY=0`. Hash-bearing direct visit: heading focus and results positioning.
- Choose Springfield IL: input reads Springfield, IL. Back returns to the chooser, input Springfield, heading focused.
- Rendered text is identical to the preceding gate for Faketown ME, Faketown Maine, lowercase faketown me, Missoula ND, bare Faketown, California, CA, Missoula MT, and 69201. Explicit city/state failures still have zero cards and both offers; lowercase city echo remains ratified.
- Missoula ND's explicit text offer remains eight ordinary text results with no distance origin or badges.
- California/CA retain the mixed-directory statewide heading, without a distance origin.
- Missoula MT remains **25 results, 0.5–96.6 miles**. 69201 remains **25 results, 102.8–157.0 miles**, with **102.8** shared by the first card and note.
- `/find` and `/` both pass the 768 standing check: `scrollWidth = clientWidth = 768`.
- No uncaught page errors recorded in either independent browser run.

The commit's application changes are limited to DirectorySearch and FocusOnQuery; parsing, query functions, distance ranking, FeaturedBand, and server outcome rendering are unchanged. Did not rely on the builder's 27/27 or six-run summary as gate evidence.

### Third-round evidence and scope

- [Independent probe, main and throttled stress modes](odi-99-round3.cjs)
- [Main rerun: routes, guardrails, regressions, layouts](odi-99-71fda22-evidence/results.json)
- [1×/8× edits, resubmissions, fresh budgets and permanent cancellation](odi-99-71fda22-evidence/stress.json)

Only audit artifacts were written. Network delay, CPU slowdown, and body resets were confined to the test browser. No application edits, production writes, local builds, commits, merges, or checkout changes.

**Final fix list: none required. Residual: manual screen-reader spoken-output verification, explicitly not certified by this gate.**
