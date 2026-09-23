# ODI-93 slice 1 — design review

Reviewed by Astra, 2026-09-23. Design review only, not a runtime gate. Read `docs/planning/search-v2-plan.md` and cross-referenced the existing `src/lib/facility-search.ts`. Production counts and proposed RPCs were not independently inspected. No application code, database, or git changes made.

Recommendation: keep city-first prioritization and no default radius cutoff. Revise the build contract before relay: specify ambiguity and state-only behavior, qualify location coverage and distances, and expand acceptance tests. Typeahead and typo tolerance can remain deferred.

## 1. Input mix and parsing

City-first is a reasonable product hypothesis given Travis's locator experience. Someone searching for themselves, a relative, or a destination is likely to know the town before its ZIP. This is judgment informed by the supplied experience, not measured SoberAnchor behavior or an established percentage.

Priority in design and tests need not dictate parser precedence. Recognize complete input shapes rather than looking for location fragments anywhere in a query:

- Exact ZIP/ZIP+4 and exact 3–4 digit prefixes are unambiguous formats; preserve leading zeroes. Define whether unhyphenated nine-digit ZIP+4 is accepted. Do not truncate arbitrary longer numeric strings to five digits.
- Explicit city + state should resolve that pair only, including space-separated forms such as `Portland ME`. Never silently drop an unrecognized state or resolve a different Portland.
- State-only queries should retain a statewide browsing/filter contract, without a distance header. A state has no useful single search origin. The current plan says both that states get distance ordering and that ODI-92 state behavior stays unchanged; resolve this contradiction explicitly. Preserve existing free-text name matching only where deliberately intended.
- Bare cities resolve directly only when one distinct place is recognized. Multiple matches enter disambiguation. Specify bare `Washington`, `New York`, `LA`, and state-code collisions. An acceptable slice-1 rule is that exact state names/codes remain statewide; an explicit city+state selects the city. Make the resulting scope visible.
- Recognize whole locations, not substrings in facility names such as `California Recovery Center`. Keep a visible way to search a facility name when it exactly collides with a town name.
- For unrecognized explicit city+state input, show location-resolution failure with an option to search the text instead. Existing ODI-92 comma handling ORs the parts: falling through from a failed city lookup could return every facility in the supplied state and disguise a failed resolution. General free-text fallback can otherwise remain unchanged.

The promise that a ZIP reference table makes **any US town** resolve is unsupported. Postal place names are not a complete town/alias gazetteer, and GeoNames explicitly disclaims completeness. Replace it with a measured coverage commitment and a recoverable miss state. If universal town coverage is essential, supplement the location data before claiming it; do not require a typeahead feature to solve a data problem. Keep postal aliases separately if source rows contain multiple names per ZIP, rather than losing them through a ZIP-only primary key. [GeoNames postal dataset and README](https://download.geonames.org/export/zip/)

Define the proposed median centroid precisely and call it an estimated search origin. It is not necessarily downtown, an official city centroid, or the visitor's location. State must be part of grouping; avoid merging distinct same-name places if the source distinguishes them. Verify representative multi-ZIP cities and outliers.

The analytics follow-up contradicts itself: retaining raw query strings is not aggregate-only collection, even without user IDs. Measure query class, resolution outcome, ambiguity outcome, and bucketed result counts without raw search text. This is a correction to the proposed follow-up, not added slice-1 scope.

## 2. Ambiguous towns

Use an inline, post-submit choice: **“Which Springfield?”** followed by **“Choose a state to see nearby centers.”** Render distinct city/state options as keyboard-accessible buttons or links; include county if city+state is still ambiguous. Deduplicate multiple ZIP rows representing the same place. An alphabetical list with a state selector is sufficient; avoid silently hiding less prominent choices.

Do not first display distance-ranked facilities for a guessed town. A stressed visitor can overlook a correction strip and trust the wrong results. A choice after submission is core ambiguity handling and can ship without typeahead or fuzzy matching.

An explicitly selected state can narrow the candidates. Device proximity or an inferred IP location should not silently settle the choice, particularly for people searching for someone elsewhere. Preserve the query while choosing; encode the chosen place in the results URL so refresh/back/share retain the origin.

## 3. No default radius cutoff

Support k-nearest as the slice-1 default, with filters applied **before** taking the nearest 25. Distances help people assess options and avoid arbitrary empty pages. However, k-nearest is worse than an optional radius filter for someone with a hard travel limit, repeated outpatient visits, limited transport, or an island/mountain/water crossing. Straight-line proximity can differ sharply from travel feasibility. A nearby option may also be across a state boundary. These are reasons to prioritize a later user-controlled distance filter and clear geography, not to impose a universal 50-mile wall.

Twenty-five nearest options also do not solve deliberate far-from-home residential search by themselves. Preserve the ability to search another destination, and decide whether this slice supports more results or explicitly shows only the nearest 25. The proposed RPC currently specifies only a limit, not pagination.

The 50-mile message is a useful product cue, not a suitability or network-adequacy judgment. CMS's outpatient distances in the plan are correct, but the regulation governs Medicare Advantage contracted networks, with time/distance and population criteria. It does not establish a consumer search UX gold standard or prove that no cutoff is optimal. Label the decision as a product judgment informed by variable access distances. [42 CFR 422.116](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.116)

The assertion that FindTreatment.gov “does not gate by radius at all” needs a direct, dated developer-guide citation and separate evidence of public UI behavior. Its API access page references a guide, but the guide/default behavior was not retrievable in this review. Nearest-first sorting alone cannot establish an unlimited search radius. Treat that assertion as unverified, not disproven. [FindTreatment.gov API access page](https://findtreatment.gov/api-request-form)

PostGIS geography `<->` measures spherical distance, not route distance. Use the same unrounded metric for ranking and threshold evaluation; round only the displayed number. Equal-distance ties should have a stable noncommercial secondary key. Avoid calling this “true distance” without explaining the metric. [PostGIS operator documentation](https://postgis.net/docs/geometry_distance_knn.html)

## 4. Recommended copy

| Situation | Copy |
| --- | --- |
| Input label | City, state, ZIP code, or center name |
| Organic results heading | Nearest listed centers to {City, ST or ZIP} |
| Supporting distance note | Approximate straight-line distances from the center of {place}. Travel distances may be longer. |
| Card | About {n} miles |
| Nearest matching result exceeds 50 miles | The closest center listed for this search is about {n} miles from {place}. |
| ZIP absent from reference data | We couldn't find a location for ZIP code {input}. Try a city and state, or check the ZIP code. |
| City+state cannot resolve | We couldn't find that location. Try a nearby city and state or a ZIP code. |
| Numeric prefix | Centers with ZIP codes starting with {prefix} |
| RPC/network error | We couldn't load results. Please try again. |

Use a consistent rounded distance in the card and long-distance note; specify the boundary policy so a value slightly over 50 does not produce a contradictory “more than 50” alongside `50.0`. For distances that round to zero, use `Less than 0.1 mile` instead of implying an exact shared location.

“Listed” and “for this search” keep the message within what the directory and active filters can establish. Missing centroid data does not prove a ZIP is invalid. A service failure must not become an unrecognized-ZIP message or an empty result set. Put the distance heading above the organic list, not above a Featured band with different ordering. Unknown distances must not become zero-mile labels. Keep recovery actions available without adding alarmist copy.

## 5. Additions to the build/gate matrix

| Coverage | Concrete acceptance checks |
| --- | --- |
| Location decisions | Bare Springfield opens choices; Springfield IL and Springfield MA select distinct origins; city+full state, city+code, comma-free input, whitespace and lowercase agree; explicit wrong/unrecognized state never silently resolves elsewhere. |
| State versus city | CA/California, Washington, New York, Washington DC, PR/Puerto Rico follow documented scope; state-only browsing has no fabricated distance origin. |
| Gazetteer coverage | A confirmed facility-free place, postal alias/local town name, multi-ZIP city, and absent place; check selected origin plausibility independently of facility presence. Record source coverage rather than asserting all towns. |
| Territories and geography | Add Alaska, Hawaii, DC, and territory city queries as well as 00901. GeoNames publishes PR/GU/VI/AS/MP separately: verify seed coverage and normalization rather than assuming US.zip includes them. Current matrix has five states plus PR, not the promised six states. |
| ZIP classification | 00901 remains five characters; valid hyphenated ZIP+4; defined handling of nine digits; 3- and 4-digit prefixes; 1–2 and 6–8 digits; malformed ZIP+4; verified absent five-digit ZIP. `abcde` tests free-text fallback, not an invalid ZIP. |
| Genuine nearest set | Check every adjacent distance, not just first/last. Independently calculate expected nearest eligible IDs and sample distances, catching lat/lng reversal, wrong origins, unit errors, or an incomplete candidate pool that still sorts correctly. |
| Filters and caps | Type filter applied before LIMIT; zero eligible matches; fewer than 25; more than 25 and documented continuation behavior; stable ties at the cutoff; full-precision ordering despite rounded ties. |
| Threshold | Controlled fixtures immediately below, exactly at, and above 50 miles; note uses nearest matching organic result; zero results and RPC failure do not trigger it; account for rounding. Natural nationwide examples alone will not guarantee coverage. |
| Missing coordinates | Backfilled rows can participate; remaining coordinate-less rows are excluded from geographic results but text-findable; never fabricated zero distances. |
| Payment blindness | Inspect candidate selection and ORDER BY, and compare expected distance order/IDs. Statistical lack of correlation with tier is neither necessary nor sufficient: paid listings can coincidentally be nearer. Test equal-distance paid/unpaid ties and Featured separation. |
| State transitions | Search A then B rapidly with responses out of order; change/clear filters and query; ZIP-to-text transition clears stale miles and heading; back/refresh/share preserve selected place. |
| Recovery and accessibility | Unknown place, valid ZIP without reference data, empty eligible set, and network error have distinct outcomes; keyboard-only town choice, focus and result announcements, long labels, 200% zoom, mobile layouts and overflow. |
| RPC readiness/performance | Verify anon-role access, input/limit validation, bounded output, expected return shape and distance numeric type; measure cold/warm latency against an agreed budget with relevant filters. Table/index existence alone does not prove an effective query plan. |

The DB owner's handoff should resolve candidate enumeration for ambiguous names, state-only behavior, centroid algorithm, territory coverage, and continuation semantics before Claude Code starts. `city_centroid(p_city, p_state)` alone does not define how bare-city candidates are discovered. The build prompt should require the decisions above, rather than asking the builder to merely report whichever ambiguity behavior was chosen.

No source spec was edited. This document records recommendations for the next revision and eventual runtime gate.
