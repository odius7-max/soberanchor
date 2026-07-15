# SoberAnchor Listing Tiers — Locked Rules v1

*Status: LOCKED (Travis + Claude + Codex, 2026-07-15). Source of truth for provider-facing copy, the PDP build spec, and directory sorting. Supersedes the research report's recommendation on lead-capture placement.*

---

## The ladder

| Tier | Schema | Price | Consumer-visible | Facility-side |
|---|---|---|---|---|
| **Unclaimed** | `is_claimed=false`, `listing_tier='basic'` | Free | Complete SAMHSA facts, plain presentation, real phone + website (plain links), map, Similar-centers module, claim banner | — |
| **Claimed** | `is_claimed=true`, `is_verified=true`, tier `basic` | Free | + ✓ Claimed badge, moderated About, hours, up to 3 photos, corrected data | Profile editing, corrections, monthly view stats |
| **Enhanced** | `listing_tier='enhanced'` | $99/mo intro → $199/mo | + full gallery, video, logo/branding, staff, amenities, styled CTAs, highlighted insurance card, **lead form**, Similar-centers module removed | + lead capture (email alerts), lead & page analytics |
| **Premium** | `listing_tier='premium'`, `is_featured=true` | $299/mo intro → $499/mo | + labeled **⭐ Featured** placement (band surfaces only) + Featured badge on PDP | + call-tracking analytics (facility-owned number), quarterly report, priority support |

Annual discount (~2 months free) from day one. Consider ~50% pricing for outpatient-only facilities (Rehabs.com pattern). Founding Partner intro pricing locked 12 months.

## The two locked decisions (Codex revisions)

**1. Lead capture starts at Enhanced.** The lead form is conversion machinery, not safety information — the facility's real phone and website appear on every tier, so members always reach help directly. The form **never renders below Enhanced**: no member request is ever captured and left undelivered (capturing-then-withholding is the one unacceptable version). Claimed→paid funnel: view stats ("your page got N views last month — Enhanced captures them").

**2. Paid visibility lives only in labeled Featured surfaces.** Payment NEVER influences organic ordering, anywhere. Featured band(s) are visually separate, always labeled "Featured," and paid listings also appear in organic results at their natural (unboosted) position.

## Ranking policy (the rule + the code it changes)

**Allowed organic ranking signals:** relevance, distance, name, rating/reviews, data-quality (`is_verified` — free, earned by claiming, an accuracy signal not a payment).
**Forbidden organic ranking signals:** `listing_tier`, `is_featured`, any payment state.

The live code violates this today in four places — fix in the build:

1. `src/components/find/FacilitiesDirectory.tsx` — the `featured` sort uses `tierOrder {premium:3, enhanced:2, basic:0}` then `is_featured`. Replace default sort with name (or distance when geo). Render a separate labeled Featured band above results instead.
2. `src/app/find/page.tsx` — treatment preview orders by `listing_tier desc, is_featured desc`. Remove both; add labeled Featured band when featured facilities exist.
3. `src/app/api/smart-search/route.ts` `queryFacilities` — orders `is_featured desc, is_verified desc, name`. Drop `is_featured`; keep `is_verified` (free signal), then name. If search results get a Featured band later, it's a separate labeled fetch.
4. `src/app/find/sober-living/page.tsx` — cross-listed section orders by `listing_tier desc, is_featured desc`. Same fix.

Publish the policy on a "How we make money" page: flat subscriptions, no referral fees, no lead selling, labeled sponsorship, pay never affects ranking. (Even Recovery.com couldn't survive adversarial verification on that last claim — publishing and honoring it is a differentiator.)

## Legal bright lines (unchanged from research; counsel review before first paid invoice)

- Flat monthly subscriptions only — never per-lead / per-call / per-booking / per-admission (FL §817.505, CA SB 1228, EKRA; FTC R360 $3.8M)
- Facility's real phone number on every tier; no masked/rerouted numbers; call tracking only as facility-owned analytics
- Leads route only to the facility the member chose — never pooled, shared, auctioned, or sold
- Claim verification required (domain email / callback to listed number / licensure doc); state licensure check for paid tiers; LegitScript gate for Premium at scale
- No patient testimonials at any tier
- SAMHSA baseline facts (services, address, phone) never gated

## Provider self-editing (structured form, not a CMS)

Two-layer data model: SAMHSA import is the immutable base layer; provider edits live in an overrides layer (`facility_overrides` table or JSONB). Render = override if present, else SAMHSA. Re-imports never clobber edits; conflicts flag the provider to confirm, not SoberAnchor to adjudicate.

- **Marketing content** (About, photos, hours, amenities, staff, logo): provider-owned, bounded fields, moderation queue (approve/reject, never author).
- **Clinical facts** (levels of care, detox, MAT, populations, payment): editable via structured checkboxes mapped to the SAMHSA taxonomy (keeps search filters working), provenance shown on page ("Updated by provider, {date}" vs "SAMHSA data"), attestation required for safety-critical claims (medical detox, MAT).
- No layout control, no free-form sections, no page builder. Ever.

Phasing: P1 (with Claimed launch): About, hours, contact corrections, 3 photos. P2 (with Enhanced): gallery, video, amenities, staff, lead routing config. P3: clinical-facts editing with provenance + attestation.

## Build sequence (locked)

1. **Lock tier rules** — this document. ✅
2. **Provider-facing copy** — update `/for-providers` to the ladder above (pricing table, "how we make money," claim CTA).
3. **Directory sorting fix** — the four code changes above (small, shippable immediately; makes the product honest before the first dollar).
4. **PDP tier build spec** — tier-gated rendering on `find/[id]`, claim flow, overrides layer P1, moderation queue.
5. Stripe/billing for provider subscriptions (uses existing `provider_subscriptions.monthly_rate`).
