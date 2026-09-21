# Homepage type decision — Literata

*Claude, 2026-09-21. Decision ratified by Travis after reviewing `font-specimen.html` (six candidates on the proposed cream). Supersedes the open serif question in `homepage-concept-b-review.md` §4.1.*

## Decision

- **Display face: Literata** (Google Fonts, variable: `opsz` 7–72, `wght` 200–900). Display use only — headings and hero.
- **Body/UI face: Outfit stays.** No change to body text, buttons, forms, labels, or any dashboard/admin surface.
- The retired Cormorant Garamond lesson is honored: Literata is a low-contrast, screen-first serif; the failure mode that got Cormorant retired (fragile hairlines at small sizes) does not apply.

## Implementation notes (for the build stage — not now)

- New token **`--font-editorial`**, applied deliberately per surface, homepage first. Do **not** repoint the existing `--font-display` alias (77 files reference it; that alias only gets cleaned up in the dashboard-stage review).
- Load via **`next/font/google`** (Literata with `axes: ['opsz']`), not a CSS `@import`. While touching this, migrating the existing Outfit `@import` in `globals.css` to `next/font` is a cheap same-lane improvement.
- Suggested cuts: hero `wght` 500–600 at large `opsz`; section headings 600; never all-caps letterspaced (that stays Outfit's job in the existing `.section-label` pattern).
- Contrast pairs already checked: navy `#003366` on cream `#FAF7F2` ≈ 11.7:1 (AAA); teal `#2A8A99` on cream ≈ 3.9:1 (large-text/label only). Full pair-by-pair table lands with the token sheet.

## What this unblocks

The hero-only comp (desktop + mobile) can now be produced in the real face. Remaining inputs for that comp: final hero copy choice (two options in `homepage-concept-b-review.md` §3) and one licensed candidate photo. Open founder questions (portrait, approved account, "Anonymous by default" replacement) are unchanged from the review.
