# Provider Tier Feature Fences — v1 (ratified addendum)

*Ratified by Travis 2026-09-17 in tier-planning session with Claude. Extends PROVIDER-PREMIUM-SPEC.md — the locked legal/ranking rules there are unchanged and still control. This document sets the FEATURE fences per tier for the build-out (ODI-52 rebase, ODI-53 editor, analytics work). Any change here is a change to `src/lib/provider-tiers.ts` plus this doc.*

## Ratified fences

### 1. Analytics — split three ways

- **Claimed (free):** monthly page-view count. Exactly what the published card promises, nothing more.
- **Enhanced:** full analytics dashboard — page views, contact clicks, inquiry counts, trends over time.
- **Premium:** everything in Enhanced **plus market insight** — real, anonymized search-trend data for the facility's area, only once the real aggregation pipeline exists (never fabricated; ODI-79 rule is permanent).
- All of it stays behind `PAGE_ANALYTICS_LIVE` until instrumentation ships. Honest "not measuring yet" copy remains until then.

### 2. Media — 3 / unlimited + video

- **Claimed:** up to 3 photos (as published).
- **Enhanced and above:** unlimited photos, video tour, logo and branding on the page.
- No middle cap. The old dashboard card's "10 photos" shape is dead.

### 3. Leads — identical at every paid tier

- Same form, same routing (only to the chosen facility), same inbox at Enhanced and Premium.
- **Premium never gets more, faster, or better-routed leads.** Its edge is visibility and insight only. This is a deliberate legal-optics fence (no paying-more-for-more-connections), and it is now as firm as the flat-pricing rule.
- Lead-management *tooling* upgrades (notes, statuses, templates) were considered and deferred — not in v1 at any tier.

### 4. Premium v1 differentiators — committed set

Premium at launch = **labeled Featured placement (ODI-52 scope, directory results band) + quarterly performance report + priority support + the analytics market-insight layer when live.**

- **Quarterly report:** committed. Starts as a manually assembled PDF (views, clicks, inquiries, market context) per the ODI-80 recommendation; tooling later.
- **Call tracking:** NOT committed for v1. **Conflict with the published card** (it currently lists "Call-tracking analytics on your own number") — resolve by removing or softening that bullet in the tier config before ODI-54 sells Premium. Suggested replacement bullet: the market-insight analytics line. Revisit call tracking as its own scoped issue when there's a paying Premium base.
- **Multi-location org tools:** deferred, noted as the most natural future Premium hook for large operators.
- **Homepage/state-page featured slots:** deferred; v1 Featured = directory results band as ODI-52 already scopes it.

## What this changes in the build queue

1. **ODI-52 rebase scope check:** rendering must respect these fences — unlimited media sections at Enhanced+, Featured band Premium-only, lead form identical at both paid tiers. (Believed already consistent with the July build; verify at review.)
2. **ODI-53 editor scope:** photo limits enforced per tier (3 / unlimited); video, logo, branding fields Enhanced+; all edits through the override/moderation layer regardless of tier — paying never skips review.
3. **Tier config edit (rides next branch):** remove/soften the call-tracking bullet on Premium; add market-insight line.
4. **New issue — page-view & click instrumentation:** powers all three analytics layers; flips PAGE_ANALYTICS_LIVE.
5. **New issue — quarterly report v1 (manual process):** template + data pull checklist; first real one due one quarter after first Premium subscriber.

## Standing rules restated (unchanged, from PROVIDER-PREMIUM-SPEC.md)

Flat subscriptions only. Real facility phone on every tier. Organic ranking payment-blind. Paid placement labeled, always. Verification free at every tier, never sold. SAMHSA baseline facts never gated. No testimonials. No fabricated data anywhere, at any tier, ever.
