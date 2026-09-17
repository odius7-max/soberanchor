# SoberAnchor Tier FEATURE Fences — v1

*Status: RATIFIED (Travis, 2026-09-17) on ODI-80. Companion to
PROVIDER-PREMIUM-SPEC.md: that document locks the **ladder and pricing**, this
one locks **what each tier functionally gets**. Pricing questions
("Founding Partner" framing, the anchor prices, the Premium gap) remain open on
ODI-80 and are NOT settled here.*

> **Provenance note.** Travis delivered a full `TIER-FEATURES-V1.md` alongside
> the ODI-80 ratification comment, but it was not attached to the issue and was
> not in the repo. This file is transcribed from the ratification comment
> (ODI-80, 2026-09-17T19:03Z) so the fences are version-controlled beside the
> spec they constrain. If the delivered document differs in any detail, replace
> this file with it — the comment is the authority, this transcription is not.

---

## 1. Analytics — a three-way split

| Tier | Gets |
|---|---|
| **Claimed** (free) | Monthly page-view count |
| **Enhanced** | Full dashboard — views, clicks, inquiries, trends |
| **Premium** | The above **plus** real area market insight, once the pipeline exists |

All three are gated behind `PAGE_ANALYTICS_LIVE` in
`src/lib/provider-tiers.ts` until **ODI-82** (page-view and contact-click
instrumentation) ships. Nothing may display a number it does not actually
measure — see ODI-79 for the failure this rule exists to prevent.

## 2. Media — no middle cap

- **Claimed (free):** 3 photos.
- **Enhanced and above:** unlimited photos, plus video and logo/branding.

There is deliberately **no intermediate cap**. The free tier's limit of 3 is
enforced at render time, not at write time, so stored content may exceed it.

## 3. Leads are identical at every paid tier — STANDING RULE

Premium **never** receives more leads, faster leads, or better-routed leads than
Enhanced. The inquiry form, its routing and its delivery are byte-identical
between the two paid tiers. What Premium buys is **visibility and insight, not
preferential access to people seeking help.**

This is elevated to a standing rule alongside flat-pricing-only. Any change that
would differentiate lead handling by tier is out of bounds without re-ratifying
this document.

## 4. Premium v1 contents

**Committed for v1:**

- Labeled **Featured** placement (the directory band) — Premium-only, and always
  visibly labeled as sponsorship
- Quarterly performance report (**ODI-83**; a manual process at first)
- Priority support

**Explicitly NOT committed for v1:**

- **Call tracking.** Its bullet comes **off** the published tier card until the
  feature is actually built. (Removed from the config on the ODI-52 rebase
  branch, replaced by the fence-1 market-insight line.)

**Deferred Premium ideas** (logged, not promised): multi-location organisation
tools; homepage and state-level featured slots.

---

## Related issues

- **ODI-80** — provider pricing review; this ratification lives in its comments.
  Pricing itself still open.
- **ODI-82** — instrumentation. Blocks ODI-54 and ODI-83, and gates every
  analytics claim above.
- **ODI-83** — quarterly performance report process (the Premium anchor).
- **ODI-52** — tier-gated listing rendering; the first consumer of these fences.
