# Provider monetization and session QA — 2026-09-17

Production: https://soberanchor.com. Deployment verified at both ends of the main runtime pass: `e6f192da22569a7d2b504cd75cbd43b706e21314`, `dpl_4hMTJXJDePvCwnJ1kgRjTgEVBs6j`, immutable deployment https://soberanchor-ix4tsol1j-odius7-maxs-projects.vercel.app. The in-flight ODI-75 fix was not on this production deployment. No implementation or deployment changes made.

Used Travis's existing signed-in provider session and the synthetic “SoberAnchor Demo — Pending Claim” listing, displayed Verified/basic. No claims, listing edits, purchases, sent emails, or account changes. One explicitly synthetic mailto-form probe was performed. No cleanup IDs were returned or created by that handler.

## ODI-75 — inconsistent provider offer (confirmed, P1)

Flow: marketing pricing → provider dashboard → Plan & Billing.

Expected: consistent names, prices, free entitlements, paid features, placement disclosures, and offer terms across all provider surfaces.

Actual: the marketing page and dashboard sell different offers. Exact source-copy appendix: [monetization-copy-inventory](2026-09-17-monetization-copy-inventory.md). This appendix inventories 16 principal templates, including conditional/source-only surfaces; supplemental surfaces below complete the discovered pricing/upsell coverage. It does not imply every tier or account state was rendered.

| Surface | Exact observed price/feature text |
|---|---|
| https://soberanchor.com/for-providers | “Claimed”; “Free”; “Up to 3 facility photos”; “Verified ✓ Claimed badge on your page”; “Monthly page-view stats” |
| https://soberanchor.com/for-providers | Enhanced: “$99” + “/mo · Founding Partner rate (regularly $199)”; Premium: “$299” + “/mo · Founding Partner rate (regularly $499)” |
| https://soberanchor.com/for-providers | “Founding Partner rates are locked for 12 months. Outpatient-only programs receive 50% off all paid tiers.” Annual offer: two months free; full exact surrounding text in appendix. |
| https://soberanchor.com/dashboard — Plan & Billing | Basic: “Free”, “1 photo”; Enhanced: “$149/mo”, “Verified badge ✓”, “Featured badge ⭐”, “Up to 10 photos”, “Respond to reviews”; Premium: “$399/mo”, “Top-of-results placement”, “Unlimited photos”, “Event posting” |
| https://soberanchor.com/dashboard — My Listing | “Your Plan”, “basic”, “Free forever”, “Upgrade”. Source-only paid branches still say “$149/mo” and “$399/mo”. |
| https://soberanchor.com/dashboard — Overview | “See how your listing is performing”; “Listing views, contact clicks, and lead analytics. Upgrade to Enhanced to unlock.”; “Upgrade to Enhanced →” |
| https://soberanchor.com/dashboard — Overview | “Upgrade Your Listing”; “Get more visibility, more leads.”; “Featured badge, top placement, photos, analytics, and more.”; “View Plans →” |
| https://soberanchor.com/dashboard — Overview | “📩 Want leads delivered to your inbox?”; “Upgrade to Enhanced to add a contact form to your listing and start receiving leads.”; “Learn More →” |
| https://soberanchor.com/dashboard — Leads | “Unlock Lead Capture”; “Upgrade to Enhanced to add a \"Contact This Facility\" form to your listing. Leads are delivered straight to your dashboard — no middleman, no fulfillment work.”; “View Plans & Upgrade →” |

The dashboard omits the founding, annual, and outpatient terms and puts verification into a paid feature list despite the verified free test listing. Its placement/reviews promises also conflict with the locked offer described in ODI-75. Marketing offers free page-view stats while the basic Overview gates the analytics surface. Feature implementation was not exhaustively exercised; conflicting copy is confirmed independently of whether the promised capability exists.

Repro: visit https://soberanchor.com/for-providers, compare the cards to https://soberanchor.com/dashboard → Plan & Billing, then Overview, My Listing, and Leads. Proposed fix: one canonical offer/entitlement definition shared by marketing, cards, upsells, FAQs, and admin labels; remove unsupported promises and keep free verification distinct from paid promotion.

### Upgrade button behavior

All of these were clicked independently at https://soberanchor.com/dashboard: Overview “Upgrade to Enhanced →”, “View Plans →”, “Learn More →”; My Listing “Upgrade”; Leads “View Plans & Upgrade →”. Each opens the Plan & Billing tab and retains https://soberanchor.com/dashboard. They are functioning internal tab changes.

Enhanced and Premium “Upgrade” links were also clicked independently. Both have the literal target `mailto:providers@soberanchor.com?subject=Upgrade%20to%20{t.label}%20plan`. Both leave the browser at https://soberanchor.com/dashboard with no checkout or in-page success/error. No email was sent; external email-client behavior was not verified. These are email links, not Stripe buttons.

FAQ says: “Click the Upgrade button on any plan card and we'll reach out within one business day to get you set up. Stripe integration is coming soon for self-serve billing.” Clicking alone does not send a request, so this promise should explicitly require sending the email or use an acknowledged inquiry flow.

## ODI-76 — auth-unaware CTA, not observed session loss (confirmed, recommended P2)

Expected: a signed-in provider sees a dashboard/continue action; no redundant login prompt. Actual: “Already listed? Sign in” opens “Sign In” / “Welcome back to SoberAnchor.” on every click, although the session remains valid. Back navigation alone does **not** open it.

Exact single-origin chain:

1. https://soberanchor.com/dashboard → nav For Providers → https://soberanchor.com/for-providers. No modal.
2. At https://soberanchor.com/for-providers click “Already listed? Sign in”: same URL, modal opens. Escape: same URL, modal closes.
3. My account → Dashboard → https://soberanchor.com/dashboard: verified provider Overview accessible without credentials.
4. Back → https://soberanchor.com/for-providers: no modal. Click same CTA: same URL, modal opens again; Escape closes it.
5. Forward → https://soberanchor.com/dashboard: same authenticated provider accessible. Back → https://soberanchor.com/for-providers: no modal.
6. Third CTA click at https://soberanchor.com/for-providers opens the modal again; Escape closes it.

No preview, www alias, auth-required query, or different origin in this loop. Three CTA clicks, three redundant modals; dashboard remained accessible without reauthentication. Source `ProviderAuthButton` unconditionally calls `openAuthModal('login')` and does not inspect user state. Proposed fix: resolve session before choosing CTA; signed-in provider → dashboard, signed-out user → login with deliberate continuation. Preserve this Back/Forward regression test.

## ODI-77 — false receipt from mailto-only form (confirmed, recommended P1)

Flow: https://soberanchor.com/for-providers → “Claim your free listing” form → “Claim My Listing →”.

Expected: accurately described submission with validated input, a durable acknowledged request or explicit email-compose handoff, and no success message before receipt. Actual: client opens a mailto URL and unconditionally renders success after 400ms. It does not enter the real facility-specific claim flow.

Repro and validation (all remain https://soberanchor.com/for-providers):

1. Submit empty form: “Facility name, contact name, and email are required.”
2. Enter facility `TEST ONLY — ODI-77 QA — NOT A FACILITY`, contact `TEST ONLY QA ROBOT`, email `invalid-email`, type `Other`, phone blank. Native email validity reports typeMismatch; no success.
3. Replace email with `odi77-qa@example.invalid` and click once. UI says “Request received” and “We'll reach out to odi77-qa@example.invalid within one business day to get your listing live.” No email was sent.
4. Reload https://soberanchor.com/for-providers: receipt disappears and initial form returns.

Source trace: `src/app/for-providers/ClaimSection.tsx` prevents normal submission, checks trimmed facility/contact/email, constructs `mailto:providers@soberanchor.com` with subject `Listing claim request — TEST ONLY — ODI-77 QA — NOT A FACILITY` and body containing facility/contact/email/phone/type, assigns `window.location.href`, then calls the success state after a timer. No fetch, server action, Supabase write, or server-side email operation exists in this handler. There is no HTTP API request target/status or persistence acknowledgement to report. Browser tooling did not expose a network/HAR capture: this is source-derived transport/persistence evidence plus observed UI behavior, not a claim that all background page traffic was measured. No claim/provider/request ID is produced by this implementation.

Validation: required-name/contact/email checks and native email syntax exist; phone and facility type optional. No real facility lookup, ownership check, deduplication, or deliverability check here. The reserved `.invalid` email passing syntax is expected; the defect is claiming receipt regardless of email delivery.

Copy also promises “Fill in the form and we'll have your listing live within one business day. No contracts, no credit card.” and “No contracts · No credit card · We respond within 1 business day”. FAQ promises directory publication “within 24 hours”. Proposed fix: direct existing facilities to the actual claim flow; explicitly separate new-listing requests and acknowledge only durable server acceptance. If mailto remains, label it as composing an email and never assert receipt.

## Additional copy coverage and limitations

- https://soberanchor.com/find/00000000-0000-4000-a000-000000000001 was visited read-only. It is currently claimed, so its unclaimed card was absent. Source-only exact card: “🏥 Claim This Listing”; “Add photos, keep your information accurate, and protect your listing from unauthorized changes — free.” ClaimFlow continuation/outcome strings are in the appendix; no new claim performed.
- https://soberanchor.com/find: conditional directory/search “⭐ Featured” and “✓ Verified” badges inventoried from source. Paid tier appearance not forced during this read-only pass.
- https://soberanchor.com/admin/facilities and https://soberanchor.com/admin/facilities/[id]: source-only tier labels, including “Enhanced ($149/mo)” and “Premium ($399/mo)”; full strings in appendix. Admin subscription selectors belong to the separate free/pro/founding member ladder, not provider pricing.
- https://soberanchor.com/program was rendered: separate Free “$0/forever for personal use”, Pro “$7/mo”, “or $59/year — save ~30%”; feature lists in appendix. Do not confuse this Sponsor Pro product with provider Enhanced/Premium.
- https://soberanchor.com/upgrade was rendered: “Payment processing coming soon”, “$7 / month”, “$59 / year — save ~30%”. Copy: “We're setting up secure payment processing for Sponsor Pro subscriptions. Your trial data is safe — all your sponsee connections, notes, and history will be there when billing goes live.” Provider Upgrade links do not navigate here.
- Sponsor dashboard conditional/source-only surfaces at https://soberanchor.com/dashboard: `SponsorView` badges “Founding Member”, “Sponsor Pro” (compact “Founding”, “Pro”); shared `UpgradeToProModal` used by SponsorView, OverviewTab, PeopleCard and capacity flows; `AcceptAtCapModal` copy is in appendix. `AddSponseeModal`: “You've reached your free sponsee limit. Upgrade to Pro for unlimited sponsees.” Tooltip: “Free tier supports 1 active sponsee. Upgrade to Pro for unlimited.” No sponsee mutations performed.
- `SponsorProTrialModal` source-only at https://soberanchor.com/dashboard: “Try Sponsor Pro free for 30 days”; “Start free 30-day trial”; features “Sponsee dashboard with vitals and alerts”, “14-day mood trends with full history”, “Step work review and feedback tools”, “Meeting attendance reports”, “Private sponsor notes and reminders”. No trial started. Presence in source is not proof the trigger is currently reachable.

## New items for Travis's triage — not new Linear issues

1. **P2, runtime + source:** Enhanced and Premium mailto subjects contain literal `{t.label}` rather than the selected plan. Repro: https://soberanchor.com/dashboard → Plan & Billing → inspect/click either Upgrade link. Expected distinct plan name; actual identical unresolved expression. Fix the interpolation and make the required send-email step explicit.
2. **Potential P1, source-only:** premium Overview “Search Trends” presents fixed counts (38, 27, 24, 19, 15) as “Anonymized search data from people looking for help in your area this month.” Footer: “Search trend data is anonymized and updated weekly. Counts reflect unique searches.” Source `src/components/providers/OverviewTab.tsx` hardcodes them. Not rendered with this basic account. Review before selling premium analytics; label demonstration data or connect actual aggregate data. No assertion of runtime premium visibility beyond the source condition.

No fixes made. No broad DB inspection or cleanup performed. Findings apply to the verified deployment, not Claude's subsequent in-flight changes.
