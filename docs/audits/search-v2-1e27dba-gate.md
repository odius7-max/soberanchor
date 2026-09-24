# ODI-93 slice 1 — PASS with nonblocking follow-ups

Astra gate, September 23, 2026 Pacific / September 24 UTC.

**Verdict: PASS for SHA `1e27dba5584af2f502e0d6f719595b9585659dd6`.** No blocking regression found in the requested gate. ODI-99 remains an explicit accepted defect; the follow-ups below are not merge conditions. No application edits, production writes, builds, commits, or merges performed.

Preview: https://soberanchor-git-feat-search-v2-core-odius7-maxs-projects.vercel.app

Vercel independently reports alias deployment `dpl_Hr12AZ1LR5VgBCtHZ1XRv8M7eGT4`, READY, branch `feat/search-v2-core`, exact requested SHA. Immutable deployment hostname: `soberanchor-724qps9vp-odius7-maxs-projects.vercel.app`. Local HEAD also matches. No stale-deployment retry was necessary.

## Method and evidence

Used the installed Playwright Chromium against the deployed preview; agent-browser CLI was unavailable. Read production data through the anonymous REST API, independently computed haversine distances, and cross-referenced the exact checkout. Did not reuse the builder's matrix or distance results. Browser runtime page-error listeners recorded zero uncaught page errors in the matrix and UI runs; this is not a claim that every console/network message was captured.

- [Probe source](search-v2-gate-probe.cjs)
- [Full query matrix and rendered card IDs](search-v2-1e27dba-evidence/matrix.json)
- [Independent distance calculations and RPC output](search-v2-1e27dba-evidence/independent-distance.json)
- [Layout, keyboard, history, pagination, rapid-search evidence](search-v2-1e27dba-evidence/ui.json)
- [Error-state, regression, and stale-input evidence](search-v2-1e27dba-evidence/extra.json)

SQL inspection has a different provenance: the user relayed Claude's production `pg_get_functiondef` output dated 2026-09-24 because SQL access is unavailable to the gate role. I inspected that supplied definition; I did not execute the catalog query myself. Independent runtime ordering checks below use direct anonymous DB reads.

## 1. Parse routing — PASS

| Input | Observed result | Count | First–last miles |
| --- | --- | ---: | --- |
| Missoula, MT | Nearest listed centers to Missoula, MT | 25 | 0.5–96.6 |
| Chicago | Nearest listed centers to Chicago, IL | 25 | 0.3–2.6 |
| coeur d alene | Nearest listed centers to Coeur d'Alene, ID | 25 | 0.4–30.4 |
| 59801 | Nearest listed centers to Missoula, MT 59801 | 25 | 0.6–96.0 |
| 59801-1234 | Same origin and IDs as 59801 | 25 | 0.6–96.0 |
| California / CA | Treatment centers in California; statewide text/browse path | 15 each | None |
| 782 | Centers with ZIP codes starting with 782 | 25 | None |
| abcde | Search results; No matches | 0 | None |
| Springfield Recovery Center | Search results; No matches; never a chosen location | 0 | None |
| Springfield | Which Springfield? | 24 choices, 0 facility cards | None |
| san diego | Which san diego? | CA/TX choices, 0 facility cards | None |
| 69201 | Nearest listed centers to Valentine, NE 69201 | 25 | 102.8–157.0 |
| 10001 | Nearest listed centers to New York, NY 10001 | 25 | 0.3–1.8 |
| 00901 | Nearest listed centers to San Juan, PR 00901 | 25 | 0.7–31.2 |
| 99999 | Unknown-ZIP recovery copy | 0 | None |
| Faketown, ME | Existing OR text fallback; first 15 Maine matches | 15 | None |
| Recovery | Existing free-text results across multiple states | 15 | None |

Both choosers render before any geographic result cards. Keyboard-only operation was tested from the search field: type query, Enter, Tab through controls, Enter on a candidate. Focus outlines are visible. Springfield AR and San Diego CA selection work. Refresh reproduces the selected heading and exact card list; Back returns to the original chooser. Candidate links encode city and state in the URL.

UX assessment: clear choices, adequate targets, no forced guess. Keyboard users traverse 12 Tab stops from the search input to the first candidate because the category/navigation links intervene. This works, but focus management could be better. See follow-ups.

## 2. Distance honesty and independent nearest IDs — PASS

Every geographic card in the matrix has miles, every adjacent pair is non-decreasing, and each geographic results section includes both the required heading and the full approximate-straight-line explanation. Non-geographic branches have neither distance badges nor a distance origin.

Valentine displays: **“The closest center listed for this search is about 102.8 miles from Valentine, NE 69201.”** First card: **102.8 mi**. Chicago, New York, and other nearby queries do not show the note. No radius cutoff is imposed: Missoula's first page extends to 96.6 miles and Valentine starts beyond 100 miles.

Fetched all **11,409 facilities with latitude/longitude**, in ordered batches of 1,000. Calculated haversine distances independently from each facility's raw coordinates and the separately fetched ZIP origin, using mean Earth radius 3958.761316 miles; sorted by unrounded distance then UUID. For **59801, 10001, and 69201**, both unrestricted and outpatient-only:

- RPC IDs 1–25 exactly match independently ranked IDs 1–25.
- RPC offset 25 IDs exactly match independently ranked IDs 26–50.
- Repeating the initial RPC returns identical results.
- Maximum difference between raw computed miles and one-decimal RPC miles is below 0.048 mile, consistent with rounding.
- The deployed DOM's first 25 IDs exactly match the independent unrestricted ordering for all three ZIPs.

This verifies the actual nearest set, not just monotonic labels, and checks filter-before-limit behavior. UI Show more changes 25 to 50 unique results, preserving the initial 25 in order. The category tiles do not filter submitted search results in slice 1; that existing behavior is explicit in the source.

## 3. Failure honesty — PASS; ODI-99 accepted

Direct reference-table read confirms **99999 has no row**. Preview copy is “We couldn't find a location for ZIP code 99999.” followed by “Try a city and state, or check the ZIP code.” No cards or distance origin appear.

Exercised the deployed server's failure branch using a read-only query containing a null character (`Missoula` + U+0000), causing RPC rejection. It renders **“We couldn't load results. Please try again.” / “This one is on us, not your search.”**, distinct from unknown ZIP and no matches. This tests a real RPC error path; it is not a simulated network outage. No production data or infrastructure was altered.

**ODI-99 confirmed:** `Faketown, ME` becomes the existing OR text filter and returns the first 15 alphabetically ordered Maine listings, not literally every Maine listing on screen. The query's candidate pool is statewide. It is misleading location recovery, but the UI says it is matching across name/city/state and does not claim a resolved origin or print invented distances. Given the explicitly accepted ticket and preserved ODI-92 fallback, this is nonblocking for this gate. Resolve it before describing unrecognized city/state handling as fully honest.

## 4. Payment blindness — PASS, with SQL provenance noted

The relayed production definition's selection/order is:

```sql
from facilities f
where f.geog is not null
  and (p_facility_type is null or f.facility_type = p_facility_type)
order by f.geog <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, f.id
limit least(greatest(coalesce(p_limit, 25), 1), 100)
offset greatest(coalesce(p_offset, 0), 0)
```

This is raw spherical distance plus ID only. Listing tier is a returned field but does not influence candidate selection, ordering, or limit. Display distance is rounded after calculation. No tier/rating/payment sorting is present in the application distance path: `searchNear` concatenates contiguous RPC pages, `toCards` maps additional flags by ID without changing order, and the list maps those rows unchanged. The only `.sort()` in the new resolver/parser/find path sorts city chooser candidates by state/city.

The independent 11,409-row ranking above confirms preview output against distance/ID expectations without using tier as an input. This is deterministic verification, not a correlation claim.

## 5. Regression and layouts — PASS

Anonymous REST comparisons reproduce the displayed IDs for California, CA, Recovery, Faketown ME, abcde, Springfield Recovery Center, and ZIP prefix 782. The prefix sample's ZIPs all start with 782. Existing `buildSearchFilter`, `keywordSearch`, DirectorySearch, and FeaturedBand behavior is preserved; FeaturedBand and DirectorySearch have no diff in this commit.

The no-query `/find` page still displays a separate **Featured / Sponsored** band, currently containing the protected SoberAnchor demo listing. Search results do not acquire that band, consistent with the prior branch. Source confirms its premium/is_featured selection stays separate from organic results.

All **28 layout cases** pass `document.documentElement.scrollWidth === clientWidth`: seven states (browse, Springfield, san diego, Missoula, 69201, 99999, California) at **320, 375, 768, 1024**. Both `/find` and `/` independently pass the standing **768 === 768** check. Inspected screenshots of the mobile results, chooser, desktop chooser focus, and 768 homepage. At 320 the result cards are cramped and names truncate, but remain contained and actionable; no horizontal overflow found.

Rapid submissions Missoula → Chicago → 10001 → Portland ME settle on the Portland ME URL and heading, with no stale geographic heading remaining. This is a runtime rapid-submission check, not a controlled server-response reordering experiment.

Representative captures: [320 results](search-v2-1e27dba-evidence/results-320-MissoulaMT.png), [375 chooser](search-v2-1e27dba-evidence/results-375-Springfield.png), [keyboard focus](search-v2-1e27dba-evidence/keyboard-sandiego.png), [768 home](search-v2-1e27dba-evidence/home-768.png). Results captures were explicitly scrolled to the section; they are not evidence of the automatic post-submit scroll position.

## 6. Wording decisions and nonblocking fix list

1. **Reword statewide heading to “Recovery services and places in {State}”.** This includes sober living, therapists, and venues without implying every listing is a treatment center. Keep the “Listings across {State}, ordered by name” subline. Apply the same vocabulary consistently to mixed location/prefix lists in a copy follow-up; do not silently add a treatment-only filter to make the current heading true.
2. **Keep `{n} mi` on cards.** The persistent approximation explanation provides the qualification; repeating “About” on every card adds clutter. Keep “Less than 0.1 mi” for rounded zero and preserve the explanation wherever distances appear.
3. **Sync the search field with URL changes after a chooser selection.** Reproduced: search Springfield → select Springfield IL → correct IL results/URL, but the field still reads Springfield. Enter again reopens the chooser. `DirectorySearch` initializes local state from `initialQuery` without synchronizing subsequent prop changes. A refresh corrects it. This does not corrupt results or history, so it is nonblocking, but it is a concrete UX defect for Claude Code to fix.
4. **Improve keyboard arrival at the chooser.** Move focus to the results/chooser heading after submission, or provide equivalent result announcement and a short route to choices. Current links are operable and focus-visible, but the long Tab route is unnecessary work. Full screen-reader testing was not performed.
5. **Keep ODI-99 open.** Explicitly unresolved city+state input should have a recoverable location failure instead of returning an OR-expanded statewide list.

Additional scope notes: the implementation caps continuation at eight pages/200 listings (source-reviewed; UI continuation tested through 50). The matrix tests both sides of the 50-mile note with real data, not controlled 49.95/50.00/50.05 fixtures. Because the RPC returns one decimal and UI compares that rounded value, values slightly above 50 that round to 50.0 do not trigger the note; the card and note remain consistent. Do not claim an unrounded-threshold boundary gate from this run. Broader gazetteer coverage/analytics follow-ups were not re-audited as part of this runtime gate.

**Merge-blocking fix list: none.** PASS applies to the verified SHA and observed production dataset; it does not certify a later deployment automatically.
