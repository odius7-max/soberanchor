# Concept B — Claude's review

*Claude, 2026-09-21. Responds to `homepage-concept-b-claude-review.md`. Read together with `homepage-concept-b.png`, `homepage-concept-a.png` (comparison), `homepage-warmth-brand-direction.md`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/Nav.tsx`. Planning and critique only — no implementation started.*

## 1. Visual direction critique

**The direction is right.** B trades the current page's feature-inventory opening (10 checklist bullets before any human warmth) for photography, editorial type, and air. That matches everything we know about the two audiences: a family member in crisis doesn't want a features grid, and a member doing daily work doesn't need to be re-sold. Compared to A, B is calmer and more confident — A's tinted action cards and dashboard mock read more "SaaS landing page," B's photo triptych and serif headings read more like a place. I agree with the switch to B.

Specific observations, keyed to the mockup:

- **The two doors survive, but unevenly.** "Find support" (filled) vs "Explore recovery tools" (outlined) is acceptable hierarchy — help-seeking is the more urgent journey — but section 02's check-in widget is the only proof the member side exists. That's fine *if* section 02 stays above the founder band and renders well on mobile. What B loses relative to the current page is the explicit "for yourself or someone you love" *inside the door*, not just the subhead — the family-member audience should see themselves in the Find Support path, not have to infer it.
- **The third audience is missing entirely.** No provider entry anywhere in the mockup — nav shows Find Support / Recovery Tools / Our Story / Sign In. The current nav carries Find, Fellowships, Resources, Our Story, **For Providers** (Nav.tsx:82-86, Footer too). Homepage nav is one of our ratified provider entry doors from the entry-point map; we just shipped the whole provider path on the strength of those doors. The brief already flags this; confirming from code: **For Providers must stay in nav and footer.** Fellowships and Resources also need homes (nav, footer, or directory band) — they're live destinations with real traffic paths.
- **Photo triptych:** the strongest element. Ordinary-life imagery matches the brand direction's imagery brief almost exactly. Two cautions: the text overlays burned into photos ("REAL PEOPLE / REAL PROGRESS", "A BRIGHTER TOMORROW TOGETHER") are both a claim problem (implies pictured people are members) and a contrast/accessibility problem — drop the overlays, let the photos be photos. And all three images are AI-generated placeholders; nothing ships until we have licensed photography chosen against the imagery brief.
- **Handwritten annotations** ("A kinder tomorrow is possible", "A steadier brighter you is still ahead"): remove. They're the slogan cluster problem in decorative form, they're illegible at small sizes, and they'll fail contrast. The warmth should come from the photography and surfaces — which B already proves it can.
- **Check-in widget ("Example dashboard"):** the caption is exactly right and must survive to production — labeled example, never implied-live (ODI-79 rule: no fabricated data presented as real). The "Your next meeting — Community Recovery Group, 0.8 mi" card is fabricated; as a labeled illustration it's acceptable, but consider making the product shot an actual capture of the real check-in UI with demo data, per the brand direction doc. The real thing builds more trust than a stylized fake, and we have demo fixtures for exactly this.
- **Founder band:** B's "Built from lived experience" with copy but no person is weaker than what the site already has (Angel, named, with sobriety years). The brand direction is right that a real portrait + approved account is the strongest warmth asset available. Placeholder until Angel provides both.

**Mobile hierarchy** (B is desktop-only; these are the constraints for the mobile comp):

- Order must be: heading → subhead → both CTAs → *then* photo band (shallow crop, maybe single image). If the triptych sits between headline and CTAs on mobile, the help-seeker's action falls below the fold — the one failure mode this page can't afford.
- Sections 01/02 stack; the check-in widget needs a real mobile layout, not a shrunk desktop card — mood chips at 5-across get cramped below ~360px (we already abbreviate mood labels below 400px in the live app; same lesson applies).
- Serif display sizes need a tighter clamp on mobile — B's hero is ~72px equivalent; at 375px it should land nearer 32-36px or the headline wraps to five lines.
- ODI-70 lesson stands: no `flex-shrink-0` on wide flex rows; verify 768px scrollWidth on the new composition before any gate.

## 2. Scope assessment (from the code, not vibes)

**The homepage itself is cheap.** `page.tsx` is a self-contained 421-line client component; its only component dependencies are Nav, Footer, and GuidedDiscovery. A full recomposition touches one file plus new homepage-scoped styles. No data dependencies, no server actions, no auth interaction. The GuidedDiscovery entry ("Help me find resources" / "Talk to AI search") is a real product feature B doesn't show — it should keep an entry point inside the Find Support path.

**The global blast radius is all in three places:**

- **`--font-display` is a loaded gun.** globals.css:22-27 shows Cormorant Garamond was *retired* app-wide and `--font-display` now aliases Outfit — but **77 files still reference it**. Repointing that alias to a new serif restyles every heading on every surface (dashboard, admin, auth) in one line. Do not do that. Introduce a *new* token (`--font-editorial`) applied deliberately, surface by surface. Open question for Travis: B reverses the serif-retirement decision — was Cormorant retired for taste (fine, pick a better serif) or for legibility/perf (then we need that answer before recommitting)? Candidates if we proceed: Fraunces, Source Serif 4, or Lora at display sizes only, loaded via `next/font` rather than the current CSS `@import` (which is itself a small perf improvement worth taking while we're here).
- **Color tokens ripple.** `--off-white` (#FAFAF8) appears in 20 files, navy/teal utilities in 42, `card-hover` in 23. B's cream is warmer than the current off-white. Changing token *values* in place restyles the app; adding *new* tokens (`--cream`, `--sand`, `--apricot` per the brand direction's candidates) and using them on the homepage first is additive and safe. Contrast-check teal-on-cream and any text-over-photo before ratifying combinations.
- **Nav and Footer are shared.** Any nav restyling in stage 1 must be color/spacing only, links untouched.

**Staged rollout (agreeing with and sharpening the brief's):**

1. **Homepage only:** recomposition of page.tsx, new homepage-scoped tokens + `--font-editorial`, approved copy, real photography, nav links unchanged. Astra gates it like any other branch.
2. **Shared public surfaces:** Nav/Footer restyle, then /find, /our-story, /resources brought onto the same tokens so the homepage→directory journey isn't a cliff. This is the stage where the serif and cream become "the public brand."
3. **Facility detail** (`/find/[id]`): its own design pass — it has tier rendering, galleries, lead forms we just built; restyling it is not a token swap.
4. **Dashboard/admin:** own review, last. The `--font-display` alias only gets cleaned up (or retired) here.

Nothing in B requires backend, auth, or data changes. Concur with Astra: this is visual scope with a copy problem, not a rebuild.

## 3. Two copy alternatives

Both follow the voice rules; differences are strategy, not tone.

**Option 1 — task-first (Astra's draft, one edit):**

> **Find help. Keep working your program.**
> Find treatment, sober living, and meetings — for yourself or someone you love. If you're working a program, keep your check-ins, step work, and milestones here.
> [Find support] [Explore recovery tools]

Why: two audiences, two sentences, each names concrete things that exist in the product (verified against page.tsx bullets and shipped features). My one edit to Astra's version: moved "for yourself or someone you love" into the first sentence with dashes so the family-member reader hits it inside the *find* clause, where it applies, rather than at the end.

**Option 2 — audience-first:**

> **For your recovery, or someone you love's.**
> Search treatment centers, sober living, and meetings — free, no account needed. If you're working a program, your check-ins, step work, and milestones live here too.
> [Find support] [Explore recovery tools]

Why: leads with *who it's for* rather than *what to do*, which is warmer at the cost of a slightly awkward possessive; moves the one supportable trust fact ("free, no account needed to browse" — true today) into the subhead where the old trust-line lived. If the possessive grates, "For your recovery — or someone else's." is the fallback.

Section copy (either option): directory band **"What kind of help are you looking for?"** (Astra's — it's the question people actually arrive with); program band **"Keep your program in one place."** with the three concrete lines from the brand direction ("Notice patterns in your check-ins" etc. — all validated as real features); founder band **"Why we built SoberAnchor"** pending Angel's approved account.

Copy to strike from B, with reasons: "Space for what comes next" / "Make room for your everyday recovery" (mood without content); "Compassionate, trusted resources" ("trusted" is an unsupported claim — the voice rules ban it; "Compassionate" is a self-award — show, don't claim); all handwritten annotations and photo overlays (slogan clusters, claim risk, contrast); "Built from lived experience" as a *heading* is fine only if the section actually contains lived experience — i.e., Angel's real account, not a mission paragraph.

## 4. Unknown claims and questions for Travis / Angel

1. **Serif reversal:** why was Cormorant Garamond retired? Taste, legibility, or performance? Determines whether B's serif direction proceeds and with which face.
2. **"Anonymous by default"** (current live trust line): browsing is anonymous; accounts have emails; sponsors see sponsee activity. Before reusing any privacy claim, decide the accurate sentence. Recommend replacing with the narrower, checkable "Free to browse — no account needed."
3. **Angel:** is there an approved portrait? Will she write/approve a short first-person account for the founder band? Is "{n}+ years sober" (computed live from 2021-12-04 in page.tsx) still something she wants published?
4. **Resource bylines:** current cards say "Angel · 6 min" etc. Do those articles exist with those authors at /resources? Validate before restyling them into the new design.
5. **Photography budget/source:** licensed stock chosen to the imagery brief, or a real shoot? (The brief's rule stands either way: never imply pictured people are members.)
6. **Nav simplification appetite:** B implies collapsing Find/Fellowships/Resources into "Find Support." Are we willing to test that consolidation (with Fellowships/Resources reachable inside), or keep all five labels? Provider link is non-negotiable either way.

## 5. Smallest useful next deliverable

**A hero-only pair (desktop + mobile frame) with final copy, plus a one-page token sheet.** Concretely: the chosen copy option set in the actual candidate serif, on the actual cream, with one licensed-candidate photo (not generated), CTAs in final colors — and the token sheet listing `--cream/--sand/--apricot/--font-editorial` values with contrast results for every text/surface pair used. That single artifact resolves the four decisions everything else depends on (copy option, serif, palette, photo direction) before anyone touches page.tsx, and it's small enough for Angel to react to. Everything below the hero reuses those decisions.

---
*Not reviewed here: /for-providers page styling (stage 2), facility detail (stage 3), dashboard (stage 4). No installation of editorial skills performed; agree with starting from `no-ai-slop` as a review aid only, one tool not two, applied to copy drafts — the voice rules above are the standard, the tool is a lint.*
