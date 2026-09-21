# Provider Tier Capability Matrix — Promised vs. Built

*Claude, 2026-09-17, post-merge 7e901e3. Purpose: show what each tier actually gives a provider today on production, versus what the ladder promises, and where every gap is tracked. Demo fixtures are now staged one-per-tier so you can see the real states (viewing guide at the bottom).*

## The honest headline

The tier ladder is currently **mostly promises stored in one config file**. Two big pieces make tiers *visible*, and neither is on production yet: the tier-gated listing page (ODI-52 — built in July, branch never merged, needs a rebase) and the provider editor (ODI-53 — spec'd, unbuilt). What IS live: the claim flow, verification, the dashboard shell with tier-aware gating, and the honest pricing surfaces from today's merges. That's why looking for tier differences has been frustrating — most of the fence posts exist, but the fences aren't built.

## Claimed (Free)

| Promise (/for-providers) | Status today | Tracked |
|---|---|---|
| Verified ✓ Claimed badge on your page | **LIVE** — claim → domain-match or admin approval → badge on listing + dashboard | done (ODI-40 arc) |
| Edit description, hours, contact info | **NOT BUILT** — no editor exists at any tier | ODI-53 |
| Up to 3 facility photos | **NOT BUILT** — no photo upload exists | ODI-53 |
| Corrections to SAMHSA-sourced data | **NOT BUILT** — the two-layer override model exists in the DB (facility_overrides), no provider-facing way to write it | ODI-53 |
| Monthly page-view stats | **NOT BUILT** — nothing instruments views; dashboard now says so honestly (PAGE_ANALYTICS_LIVE flag, off) | no issue yet — needs one |
| Protection against unauthorized listing edits | **PARTIAL** — ownership locking is real (server-side claim, one owner, admin review); but since editing doesn't exist, "protection" is currently structural | ODI-53 inherits |

**Net: a free provider today gets the badge, ownership, and a status dashboard. Every content promise on the free card waits on ODI-53.**

## Enhanced ($99/mo Founding)

| Promise | Status today | Tracked |
|---|---|---|
| Full photo gallery and video tour | **NOT BUILT** (rendering: ODI-52 branch; upload: ODI-53) | ODI-52 + ODI-53 |
| Your logo and branding on the page | **NOT BUILT** — same split | ODI-52 + ODI-53 |
| Staff profiles and amenities section | **NOT BUILT** — same split | ODI-52 + ODI-53 |
| Inquiry capture, routed only to you | **BUILT ON BRANCH** — lead form + leads table + RLS landed in the July ODI-52 build; never merged | ODI-52 (rebase) → ODI-65 (QA) |
| Highlighted insurance and payment section | **NOT BUILT** | ODI-52 |
| No other centers shown on your page | **PARTIAL** — needs verification of what the current PDP shows | ODI-52 acceptance |
| Inquiry and page analytics dashboard | **NOT BUILT** — Leads tab exists as shell; analytics not instrumented | ODI-52 + new analytics issue |

**Net: Enhanced's flagship (lead capture) is code that exists but isn't merged. The dashboard's Leads tab is the receiving end waiting for it.**

## Premium ($299/mo Founding)

| Promise | Status today | Tracked |
|---|---|---|
| Featured placement in directory — labeled | **RENDERING ON BRANCH** — is_featured flag live in DB; labeled Featured band is ODI-52 work | ODI-52 |
| Featured badge on your listing page | Same | ODI-52 |
| Call-tracking analytics on your own number | **NOT BUILT** — no infrastructure | no issue yet — needs one |
| Quarterly performance report | **NOT BUILT** — no process or tooling | no issue yet — needs one |
| Priority support | Process promise, no tooling needed yet | — |

**Net: Premium is the thinnest tier in reality — its differentiators are one unmerged branch (Featured) and two unbuilt features. This matches the ODI-80 finding: the fix is content, not price.**

## What you can look at right now (fixtures staged 2026-09-17)

- **…0001 "Unclaimed"** — basic, unclaimed: the free/unclaimed baseline listing.
- **…0002 "Pending Claim"** — now **enhanced**, owned by providertest1: sign in and check the dashboard — Plan & Billing should mark Enhanced as current plan, and the Leads tab should show its enhanced state instead of the upsell. This is the cleanest view of what tier-gating exists in the dashboard today.
- **…0003 "Claimed"** — now **premium + featured**: check its listing page and the /find directory for any Featured treatment on prod (expect little — that rendering is the ODI-52 branch; the gap you see IS the finding).

Reset note: these tier flips are added to the fixture-reset ledger (all revert to basic/unfeatured).

## Enhancement roadmap this implies (suggested order)

1. **ODI-52 rebase → merge** — single biggest unlock: makes Enhanced and Premium *visible* (gallery/branding/insurance sections, lead form, Featured band), unblocks ODI-65 lead QA. The code exists; it needs a rebase onto two days of merges.
2. **ODI-53 provider editor** — makes the FREE tier's promises real (edit info, photos, SAMHSA corrections via the override layer + moderation queue). Also the foundation Enhanced's content features sit on.
3. **Page-view instrumentation** (new issue) — flips PAGE_ANALYTICS_LIVE honestly; free tier's "monthly page-view stats" becomes real; Enhanced's analytics dashboard gets data.
4. **ODI-54 Stripe** — now unblocked; without it every tier is aspirational anyway.
5. **Call-tracking + quarterly report** (new issues, Premium substance) — can follow billing; the quarterly report can start as a manual process per the ODI-80 recommendation.
