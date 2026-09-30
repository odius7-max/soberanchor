# Hero alignment: production diagnosis

Date: 2026-09-29. Browser inspection of production and the ODI-102 preview; no application changes, commits, or merges.

## Finding

The user's production screenshot reflects the old hero positioning. Production still uses `pl-[clamp(4px,6vw,90px)]`: its left edge stops moving at 110px including the section gutter, while the centered navigation moves inward as the viewport grows. The current ODI-102 preview correctly aligns the hero with the navigation logo.

Vercel deployment metadata inspected during this review:

- Production `soberanchor.com`: main, `dbbe485df02655bd282bdd764efff99e3017c7c7`.
- ODI-102 preview: `fix/odi-102-hero-align`, `1b94baf93cc3f33ce728ac19242825731555ba97`.

## Independent browser measurements

CSS pixels from the viewport's left edge; logo means its link box, hero means headline box, section means “Find what you need.” heading.

| Viewport | Production hero | Preview hero | Logo, both | Section, both |
|---|---:|---:|---:|---:|
| 1440 | 106.39 | 184 | 184 | 160 |
| 1465 | 107.89 | 196.5 | 196.5 | 172.5 |
| 1920 | 110 | 424 | 424 | 400 |

No horizontal overflow at these widths on either deployment. Fonts and hero image finished loading before measurement. Inspected the preview's 1920px screenshot: its photograph is painted and the copy visibly aligns with the logo. This targeted diagnosis is not a complete gate of the latest preview SHA.

## Recommendation for Claude Code

1. Carry the reviewed ODI-102 alignment change through the normal gate/merge/deployment process. Production does not yet contain it; further adjustments to production's old viewport-relative padding would duplicate work already present on the preview.
2. To satisfy the request that the rest of the page also align, resolve the existing ODI-104 container mismatch. Use the navigation's content edge as the canonical desktop baseline. Nav puts `px-6` **inside** its centered `max-w-[1120px]` box; homepage sections put their gutter outside that box, producing the measured 24px difference.
3. Give navigation, hero content, and below-fold section content the same centered container and gutter semantics: a border-box, full-width, max-width 1120px wrapper with 24px horizontal padding. Keep the hero photograph full bleed, and the copy left aligned within that wrapper. Remove compensating hero offsets when adopting the common wrapper; do not stack another gutter on top. Preserve/review mobile spacing explicitly instead of applying a desktop correction blindly.
4. Keep text measure separate from container alignment. Moving the copy inward can put long lines over the walkers; retain the preview's narrower headline treatment while verifying the final composition. Do not widen the headline merely to repair its left edge.

Desktop acceptance coordinates for the shared container: 104px at 1280, 184px at 1440, 424px at 1920, and 744px at 2560. Logo, hero copy, and section headings should share those edges. Verify the breakpoint band, photograph clearance, and mobile layout after any container refactor.

## Evidence

- `hero-production-diagnosis.cjs`: independent browser probe.
- `hero-production-diagnosis/measurements.json`: measurements.
- `hero-production-diagnosis/production-1440.png`, `production-1465.png`, `production-1920.png`.
- `hero-production-diagnosis/preview-1440.png`, `preview-1465.png`, `preview-1920.png`.

No merge or production deployment was performed.
