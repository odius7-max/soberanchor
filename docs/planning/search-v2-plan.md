# Search v2 plan — ODI-93, slice 1 (city-first location search + distance ranking)

*Claude, 2026-09-23, v2. Scope ratified by Travis: core first (location + distance), typeahead/typo tolerance/intent tokens as later slices. Revised per Astra's design review (docs/audits/search-v2-design-review.md) — all six findings incorporated. Destination: docs/planning/search-v2-plan.md.*

## 1. The radius question (Travis's research ask)

Is there a gold standard for geo-search radius, versus the automotive default of 50 miles expanding by 50 in rural areas? For healthcare, the references converge:

**CMS network adequacy standards (42 CFR 422.116)** codify that *access distances legitimately vary by geography*: Medicare Advantage networks must have outpatient behavioral health within 10 miles in large metro counties, 25 metro, 40 micro, 50 rural, 100 CEAC (psychiatry: 10/30/45/60/100). Per Astra's review, this supports the variance observation — it is a network-adequacy rule, not a consumer-search standard, and is cited only as the former.

**FindTreatment.gov (SAMHSA's locator, our closest comparator)** documents its behavior in its developer guide (findtreatment.gov/assets/FindTreatment-Developer-Guide.pdf, Jan 30 2025): the distance limit (`limitType=2` with `limitValue` in meters) is an *optional* parameter, and the default `sort` is `0`, "sort by nearest distance." Nearest-first with no mandatory radius is SAMHSA's documented default. (Citation verified against the guide directly, closing the review's open flag.)

**Locator UX practice** favors k-nearest over fixed radius: never return an empty page because of an arbitrary circle; show the nearest results with distances printed and let the person judge. An expanding-radius loop (50 → 100 → 150) approximates k-nearest with cliff effects at each boundary.

**Decision (Astra-endorsed): k-nearest, no radius gate.** Order by true distance, print miles on every card, 25 per page with continuation. Distances are approximate straight-line figures and the UI says so (copy in §5). Where the nearest result exceeds 50 miles, a plain note states the fact. An optional user-facing radius *filter* (10/25/50/100, default Any) helps people with hard travel limits and comes in slice 2 as UI only — it never becomes a silent default cutoff.

## 2. Input mix and parse rules (Travis's data + Astra's review)

Travis's enterprise locator data: most users type a city, town, or state; few type a ZIP. Published research doesn't quantify the split (NN/G recommends flexible input plus a "use current location" element rather than favoring a format), so his observation governs, and ODI-98 instruments /find so the mix becomes our own measured number.

Parse rules (deterministic, whole-input):

1. **Whole-input matching only.** A query is treated as a location only when the *entire* input (allowing a trailing state name/code and punctuation) resolves as one. "Springfield" → location path; "Springfield Recovery Center" → text/name path, never a location guess with leftovers. This is what keeps facility names from being misread as places.
2. **State alone = statewide browse, not a distance search.** A bare state name or 2-letter code keeps the existing ODI-92 statewide behavior, headed "Treatment centers in {State}" — a state never acquires an arbitrary distance origin.
3. **City/town (+optional state) = distance search** from the town centroid.
4. **5-digit ZIP (ZIP+4 accepted, first five used) = distance search** from the ZIP centroid. 3–4 digit numeric = ZIP-prefix filter, labeled, no distance order.
5. **Everything else** falls through to the existing ODI-92 text path unchanged.

**Ambiguous towns (Astra: essential, not deferrable): post-submit inline disambiguation.** "Springfield" with no state renders a "Which Springfield?" chooser — city, ST options deduplicated across ZIPs, rendered as links (keyboard-accessible by construction), each resolving to the disambiguated query URL. No best-guess-plus-correction-strip; geographic results render only after the place is unambiguous. Back/refresh reproduce results because the query and chosen place live in the URL.

**Coverage is measured, not assumed.** GeoNames is a postal dataset and disclaims completeness, so "any US town resolves" is replaced by a coverage commitment: at seed time Claude reports (a) ZIP rows loaded including the separate territory files (PR, GU, VI, AS, MP — explicitly imported and verified), (b) distinct city+state names available to the recognizer, (c) the percentage of the facilities table's own 4,020 city+state values present in zip_centroids, with the miss-list attached. Unresolved towns fall through to text search honestly — never to a silent wrong guess.

## 3. Verified data reality (production, 2026-09-23)

11,415 facilities; zip is 5-digit on 100% of rows (6,034 distinct); lat/long on 11,409; `geog` populated on 10,948 — **461 rows have coordinates but null geog** (backfill below). PostGIS 3.3.7 installed; GiST index `idx_facilities_geog` exists, so KNN ordering is index-served. `pg_trgm` available, not installed (slice 3). No ZIP-centroid table yet.

## 4. DB layer — Claude applies (ledgered), before the code session

1. **Backfill geog** for the 461 rows from lat/long. Remaining 6 rows (no coords) stay text-findable; noted on ODI-93 for coordinate backfill.
2. **`zip_centroids`** (zip text pk, city text, state text, latitude float8, longitude float8, geog geography(Point,4326)), seeded from GeoNames US postal data **plus the separate territory files** (CC BY 4.0; attribution in §7 and the site colophon). RLS enabled, public read. Seed report per §2's coverage commitment.
3. **RPC `search_facilities_near`**(p_lat float8, p_lng float8, p_facility_type facility_type default null, p_limit int default 25, p_offset int default 0), security invoker, stable. Filters (facility_type, geog not null) apply in WHERE *before* the KNN order/limit — near results can never be squeezed out by the cap before filtering. Returns facility rows + `distance_miles`. **ORDER BY distance, id** — the id tiebreak makes ordering fully deterministic; nothing else ever appears in the ORDER BY. Offset supports continuation beyond 25.
4. **RPC `city_centroid`**(p_city text, p_state text default null): resolves city (+optional state) against zip_centroids; returns all distinct city/state candidates so the app can disambiguate — one row means unambiguous, several rows feed the "Which {city}?" chooser.

## 5. App layer — Claude Code builds (branch `feat/search-v2-core`)

Copy (Astra's recommended strings, adopted verbatim):

- Results heading: **"Nearest listed centers to {place}"**
- Distance explanation (persistent under the heading): **"Approximate straight-line distances from the center of {place}. Travel distances may be longer."**
- Long-distance note (nearest result > 50 mi): **"The closest center listed for this search is about {n} miles from {place}."**
- Unknown ZIP: **"We couldn't find a location for ZIP code {input}. Try a city and state, or check the ZIP code."** A centroid miss is a lookup failure, presented as above; a network/RPC error is a different state with its own message ("Something went wrong on our end — try again") — never conflated.

Behavior: parse rules per §2; statewide browse keeps its own heading; per-card "{n} mi"; disambiguation chooser before geographic results for ambiguous towns; pagination beyond 25 via p_offset ("Show more"); rapid consecutive searches are sequence-guarded (stale responses discarded — last submitted query wins); query + disambiguated place in the URL so back/refresh reproduce results. Organic ordering comes from the RPC untouched — no client re-sort. Featured band unchanged, separate, labeled. The 6 coordinate-less facilities remain text-findable. No LLM anywhere.

## 6. Gate shape (Astra runs her own; these are the build-time obligations)

Nationwide matrix with city queries first ("Missoula, MT", "Chicago", "san diego", a coverage-verified facility-free town, "Springfield" → chooser), ZIPs across density tiers (10001, 60614, 73301, 59801, 69201, 00901 — the last verifying territory import), a **verified-absent** 5-digit ZIP (confirm absence in zip_centroids before using it as the unknown-ZIP case; "abcde" is a free-text case, not an invalid-ZIP case), a ZIP+4, and prefix "782". Per Astra's late-failure list: independently verify nearest-IDs on a sample (own haversine against the candidate pool — sorted distances alone can hide a wrong origin); test facility_type filter + nearest interaction (filter before limit); distance ties stable across runs; continuation past 25; 50-mile-boundary cases both sides of the note; keyboard-only disambiguation; back/refresh; stale-response guard under rapid input. **Payment-blindness is proven deterministically, not by correlation**: assert the RPC's ORDER BY contains only distance and id (pg_get_functiondef), plus a behavioral check that a nearer organic result always precedes a farther one regardless of tier.

## 7. DB change ledger — applied to production 2026-09-23 (Claude, Travis-approved)

| Change | Detail | Verification |
|---|---|---|
| Migration `search_v2_zip_centroids_and_geog_trigger` | zip_centroids table (RLS, public read, city/state indexes) + facilities geog sync trigger (BEFORE INSERT/UPDATE OF latitude, longitude) | applied, success |
| geog backfill | 461 rows, geog computed from each row's own lat/long; no source columns touched | facilities with geog: 10,948 → 11,409 (= all rows with coords); 6 rows remain coordinate-less, text-findable |
| zip_centroids seed | 41,197 ZIPs from GeoNames US + PR/VI/GU/AS/MP files (CC BY 4.0); 511 APO/FPO rows excluded; seeded via scripts/seed-zip-centroids.mjs run on Travis's machine (service key never left .env.local); CSV + script committed at scripts/ | table count 41,197, all with geog; territories PR:177 VI:16 GU:21 AS:1 MP:3; 29,668 distinct city+state names |
| Coverage commitment (§2) | 99.7% of facilities' distinct city+state values resolve in zip_centroids | 14 misses, all punctuation/spelling variants (Coeur d Alene, Winston Salem, O'Neill, Mc-space names), one military base, plus the protected "Demo City, ZZ" fixture — text fallback covers them; recognizer should match punctuation-insensitively |
| Migration `search_v2_rpcs` | search_facilities_near (KNN, filters before limit, ORDER BY distance+id only) + city_centroid (returns all candidates for disambiguation) | Missoula KNN: 0.7/0.8/2.1 mi ascending; city_centroid('Springfield') → 24 candidates; city_centroid('Missoula','MT') → 1 (8 zips); pg_get_functiondef ORDER BY assertion: true |

## 8. Attribution

ZIP centroid data: GeoNames postal code dataset (geonames.org), including US territory files, licensed CC BY 4.0.

---

# Build prompt (relay when the DB layer is confirmed applied)

TO: CLAUDE CODE — new session
Task: ODI-93 slice 1 — city-first nationwide location search with distance ranking. Branch `feat/search-v2-core` off latest main. Spec: docs/planning/search-v2-plan.md (v2, Astra-reviewed; commit it with your branch if untracked). Astra's design review: docs/audits/search-v2-design-review.md.

The DB layer is already live in production Supabase (applied and ledgered by Claude): `facilities.geog` backfilled to 11,409 rows; table `zip_centroids` (GeoNames US + territories, with geog); RPC `search_facilities_near(p_lat, p_lng, p_facility_type default null, p_limit default 25, p_offset default 0)` returning facility rows + distance_miles ordered by (distance, id) with filters applied before the KNN limit; RPC `city_centroid(p_city, p_state default null)` returning all matching city/state candidates. Verify each exists before building; if any is missing, stop and report — do not create DB objects yourself.

Build, in `src/lib/facility-search.ts` and the /find results flow:
1. Whole-input parsing, in order: (a) entire input is a state name/code → existing ODI-92 statewide browse, heading "Treatment centers in {State}", no distance origin; (b) entire input is city (+optional state) → `city_centroid`; one candidate → distance results; multiple → render a "Which {city}?" chooser (deduplicated "City, ST" links to the disambiguated query URL; no geographic results until chosen); (c) entire input is a 5-digit ZIP (accept ZIP+4, use first five) → zip_centroids lookup → distance results; (d) 3–4 digit numeric → facilities.zip prefix filter, labeled "ZIP codes starting {prefix}", no distance order; (e) anything else, including inputs that only partially contain a place name ("Springfield Recovery Center") → existing ODI-92 text path unchanged.
2. Distance results UI: heading "Nearest listed centers to {place}"; under it, "Approximate straight-line distances from the center of {place}. Travel distances may be longer."; per-card "{n} mi"; when the nearest result exceeds 50 miles: "The closest center listed for this search is about {n} miles from {place}."; "Show more" continuation via p_offset. Do not re-sort RPC results client-side.
3. Failure states, kept distinct: unresolvable ZIP → "We couldn't find a location for ZIP code {input}. Try a city and state, or check the ZIP code."; RPC/network error → an our-fault error state, never the unknown-ZIP message. Existing honest empty states preserved.
4. Robustness: query + chosen disambiguation in the URL (back/refresh reproduce results); rapid consecutive searches sequence-guarded so a stale response never renders over a newer one; disambiguation chooser fully keyboard-operable.
5. Ordering rules (hard): organic order comes solely from the RPC (distance, id). Never tier, rating, or any payment-related column anywhere in ordering. Featured band unchanged, separate, labeled. No LLM/semantic anything.
6. Verify before reporting: tsc + build clean. Against production DB, run and tabulate: "Missoula, MT", "Chicago", "san diego", "Springfield" (report the chooser contents), a facility-free town you confirm exists in zip_centroids, "California" (statewide browse — confirm no distance heading), 10001, 60614, 73301, 59801, 69201, 00901, a 5-digit ZIP you first verify is absent from zip_centroids, a ZIP+4, "abcde" (free-text path), prefix "782", "Springfield Recovery Center" (must hit the text path, not location). Per distance query record: result count, first/last distance (non-decreasing), heading present. Independently verify nearest-IDs for 59801 and 10001 with your own haversine over the full candidate pool. Test: facility_type filter with distance (filter applies before the 25 cap), tie stability across two runs, continuation past 25, both sides of the 50-mile note, keyboard-only disambiguation, back/refresh, rapid-input stale guard. Regression: ODI-92 state and text searches unchanged; 320/375/768/1024 layouts on /find; 768 standing check (scrollWidth === clientWidth).
Report: diff summary, the query matrix table, deviations, noticed-but-not-touched list. Push the branch, report the SHA. Do not merge — Astra gates first.
