# ODI-88 / ODI-89 preview gate — c4a46e9

Date: 2026-09-21. Amended overall: **PASS with known pre-existing issue ODI-70.** Production comparison below reproduces the identical 768px shared-header overflow; it is not a defect introduced by this branch. The H1/H2 honesty fixes pass the sampled functional and source checks. No application files changed; no direct database reads performed.

## Provenance — PASS

- Tested alias: https://soberanchor-git-fix-odi-88-89-honest-copy-odius7-maxs-projects.vercel.app
- Vercel deployment API resolved that alias to `dpl_4xDdVSpw1Hgxa39gEk7S2JQxibTf`, state `READY`.
- Immutable deployment hostname: `soberanchor-8sxu61ex6-odius7-maxs-projects.vercel.app`.
- API branch: `fix/odi-88-89-honest-copy`.
- API SHA and local HEAD: `c4a46e98cf8cf537610a2d5e86885e498bc9fa67`.
- Commit changes only `src/components/GuidedDiscovery.tsx` and `src/app/program/page.tsx`. Reviewed the parent-to-commit diff; no database changes in this commit.
- Independently observed the absent program testimonial section, consistent with the supplied content marker.

## 1. Myself, desktop 1440 × 900 — PASS

Opened homepage → Help me find resources → Myself → Alcohol → All of the above → Show My Results. Repeated this flow to click all three result links.

- Heading: “Where to start”.
- Subhead: “Starting points based on your answers. Each link goes to the real directory or meeting finder, where you can search your own area.”
- Crisis block: “SAMHSA National Helpline”, “Free, confidential, 24/7”, `1-800-662-4357`. Parent diff confirms the crisis block is unchanged.
- Three navigation cards; no family card.
- Case-insensitive scan of rendered step-four page text found none of: “found for you”, “personalized”, “San Diego”, “meetings this week”, “Insurance accepted”, “Featured”.
- Clicked Find meetings: resolved to `/fellowships`, rendering “Find a fellowship that fits” and fellowship listings.
- Clicked Browse the treatment directory: resolved to `/find?category=treatment`, rendering the directory with Treatment Centers selected (“Showing below”) and treatment listings.
- Clicked Read the recovery guides: resolved to `/resources`, rendering “Find the right guide, whatever you're facing.”, topic navigation, and latest articles.
- Desktop document scrollWidth/clientWidth: 1425/1425 (1440px viewport includes a 15px scrollbar).

## 2. Loved one, 375 × 812 — PASS mobile; FAIL 768px standing check

Opened the homepage flow with A family member or loved one → Alcohol → All of the above → results.

- Same three cards plus “Fellowships for families and friends”.
- Exact family copy: “Al-Anon and Nar-Anon are for the people supporting someone”.
- Clicked the family card; it resolved to `/fellowships` and rendered “Find a fellowship that fits”.
- Visual inspection of upper and lower mobile results confirmed four cards stack vertically, with readable wrapped copy and separate View arrows.
- Card rectangles at 375px: all x=24, width=312; heights 93, 113, 54, 54px. No overlapping cards.
- At 375px: document scrollWidth **360**, clientWidth **360** — no horizontal overflow.
- At 768px: document scrollWidth **870**, clientWidth **753** — **117px overflow**. All four result cards fit (x=66.5, width=620).
- Overflow reproduced on the professional results screen at 768px. DOM geometry identifies the header Sign In/Get Started container extending to x=870.203125; Get Started is outside the viewport. Screenshot visibly showed a horizontal scrollbar and clipped header controls.
- All six prohibited strings also absent in the loved-one rendered results at both sampled widths.

The failing geometry is in the shared header, outside the two files changed by this commit. Initially treated as a gate failure pending baseline comparison; the appended production check classifies it as pre-existing ODI-70.

## 3. Friend / professional — PASS

Sampled each through homepage → discovery → Alcohol → All of the above → results at 375px.

- A friend or colleague: four cards, including the family card and exact Al-Anon/Nar-Anon supporting-someone wording.
- I'm a professional: only the three general cards; family card absent, even with All of the above selected. Confirmed again in the 768px rendered screenshot.

## 4. Program removal and continuity — PASS

- “Real stories”, “What members say”, “Placeholder testimonials”, and “Angel J.” all absent from rendered text and serialized DOM.
- Independent HTTP fetch of `/program` returned 200 and 115,236 characters of HTML. Case-insensitive searches for all four strings returned -1 (absent).
- All four strings also absent from the local `src/app/program/page.tsx` at the verified SHA. Diff removes both the testimonial data array and the rendered section.
- Rendered DOM confirms hero; daily check-in, step-work, meetings, and milestone feature sections; sponsor section; four trust cards; Free/Pro pricing; and seven FAQ entries remain.
- Desktop screenshots inspected the hero and sponsor-to-trust boundary. The trust section follows the sponsor section coherently with ordinary section padding, no leftover testimonial block or visual gap.
- Measured sponsor bottom and trust top both equal document y=3570.328125px (zero gap between section boxes).
- “Anonymous by default” trust card remains, as expected. Audit H3 is excluded from this gate per the request.

## 5. Browser console — PASS for sampled session

Browser console error reads returned empty arrays after desktop discovery, treatment and resources navigation, loved-one results, friend results, professional results, and program inspection. The same tab captured the homepage and fellowship navigations. No console errors were observed on sampled paths. Browser-tool locator errors during automation were corrected and were not application console errors.

## Disposition

**PASS with known issue ODI-70**, following the requested production-baseline disposition below. H1/H2 copy behavior and removal checks passed. The 768px overflow remains a real, pre-existing issue tracked separately. No merge or deployment mutation performed.

## Follow-up: production baseline comparison — 2026-09-21

Tested `https://soberanchor.com/` signed out in the same browser, with the identical **768 × 1024** viewport. Measured `document.documentElement.scrollWidth` and `clientWidth`, and inspected elements whose right edge exceeds the client width.

| Surface | innerWidth | scrollWidth | clientWidth | Overflow |
|---|---:|---:|---:|---:|
| Production homepage | 768 | 870 | 753 | 117px |
| Production guided-discovery step 4 | 768 | 870 | 753 | 117px |
| Previously tested branch step 4 | 768 | 870 | 753 | 117px |

Production path: homepage → Help me find resources → A family member or loved one → Alcohol → All of the above → Show My Results. The production results still render “Here's what we found for you” and “Meetings Near You”, confirming the comparison sampled the older production copy.

On **both production surfaces**, the same overflowing elements were observed:

- Header auth DIV, text `Sign InGet Started`, class `hidden md:flex items-center gap-2 flex-shrink-0`, computed `flex-shrink: 0`, right edge **870.203125px**.
- Sign In button, right edge **753.9375px**.
- Get Started button, right edge **870.203125px**.

These exactly match the branch header geometry. Production console error collection was empty. Restored the temporary viewport override afterward.

Historical corroboration: `docs/audits/2026-09-18-provider-path-d01ee8e-final.md:92` references the separate 768px legacy-overflow note. Direct inspection of commit `5586d2a31f022b819addb79420a499d5cfa063ef` confirms that the two-row nav restructure introduced `flex-shrink-0` on the desktop auth container. The live computed style and matching production geometry support the supplied ODI-70 root-cause classification.

**Classification: PRE-EXISTING — ODI-70, not a regression of `fix/odi-88-89-honest-copy`. Amended branch verdict: PASS with known issue ODI-70 noted.** This supersedes the initial blocking disposition; the original failing measurement is retained above as evidence. Claude can proceed with the merge prompt under the requested gate criteria.

## Authorized merge and production verification — 2026-09-21

- User authorized a normal merge and production push. Fetched origin and verified main was `fb503f090f3de94ae15ef255d5b01bb60ced5098` and the branch was the gated `c4a46e98cf8cf537610a2d5e86885e498bc9fa67`.
- Created normal two-parent merge `43dea94bc10dae413ca0438dbaed9f1a6f3a2ca5` with `git merge --no-ff`; no squash or history rewrite. Parents are the two SHAs above. Merge tree matches the gated branch exactly (`git diff --exit-code c4a46e9 HEAD` passed).
- Pushed `main` to origin successfully.
- Vercel production deployment `dpl_GaVzSd1N3Yw1ozSEpf31KvNw3aBs` reached **READY**. Lookup by `soberanchor.com` verified that domain now resolves to this deployment, target production, branch main, merge SHA `43dea94bc10dae413ca0438dbaed9f1a6f3a2ca5`.
- Fresh production browser visit to `/program`: “Real stories” absent from rendered text and serialized DOM.
- Fresh production homepage → Help me find resources → Myself → Alcohol → All of the above → Show My Results: rendered heading **“Where to start”**, expected starting-points subhead, SAMHSA block, and three navigation cards.
- No console errors observed during these production spot-checks. ODI-70 remains the separately tracked pre-existing issue.
