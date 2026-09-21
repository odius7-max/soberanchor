# Final verification — 374dd22

Verified deployment SHA `374dd22e9924aa47ca620126c7ca450f04bb54dc`, branch `fix/odi-75-tier-card`, READY deployment `dpl_Cgyoq6YPL4bQBa9kKAnoicYXu8pQ`. Immutable URL https://soberanchor-b36n7kq1u-odius7-maxs-projects.vercel.app. Actual revised page content rendered at the branch alias; no build-placeholder/status-code inference.

## 1. Publication timelines — PASS (runtime)

URL: https://soberanchor-git-fix-odi-75-tier-card-odius7-maxs-projects.vercel.app/for-providers

Expanded FAQ: “Use the form on this page — it opens a pre-filled email in your mail app for you to send. We'll reply within one business day of receiving it to verify your details and get your listing added.”

ClaimSection intro: “Fill this in and we'll open a pre-filled email for you to send. We'll reply within one business day of receiving it. No contracts, no credit card.”

Footer: “No contracts · No credit card · We respond within 1 business day of receiving your email”. Prior publication promises “live within one business day” / “within 24 hours” removed from these sources and revised runtime content.

## 2. Dashboard — source PASS; runtime BLOCKED by missing connected session

URL attempted: https://soberanchor-git-fix-odi-75-tier-card-odius7-maxs-projects.vercel.app/dashboard

Actual final URL: https://soberanchor-git-fix-odi-75-tier-card-odius7-maxs-projects.vercel.app/?auth=required

Connected-browser inventory contains only this signed-out tab. Asked Travis to sign in here or reconnect the browser with the reported session. This is a test-access gate, not a diagnosed auth regression.

Pinned source now renders Overview: “Enhanced ($99/mo Founding Partner rate) adds your full gallery, branding and inquiry capture. Premium ($299/mo Founding Partner rate) adds clearly-labeled Featured placement.” Leads: “Enhanced ($99/mo Founding Partner rate) adds a callback-request form to your listing.” All compact price calls in these two components use `tierPriceQualified`. PlanTab is unchanged from 224188e (empty file diff); tier data remains unchanged. My Listing uses the same helper, per accepted function-level limit; admin selectors intentionally remain unqualified. These observations do not substitute for the requested signed-in runtime check.

## 3. Post-click handoff — PASS (runtime)

URL: https://soberanchor-git-fix-odi-75-tier-card-odius7-maxs-projects.vercel.app/for-providers

Used only `TEST ONLY — FINAL QA — NOT A FACILITY`, `TEST ONLY QA`, `final-qa@example.invalid`. Clicked “Open email to request your listing”. Same URL remained. Status: “Your mail app should have opened with a pre-filled email — send it and we'll take it from there. Nothing reaches us until you do. Nothing opened? Email providers@soberanchor.com directly.” No receipt assertion, no email sent, no IDs created by this handler.

## Signed-in runtime completion — item 2 PASS

All three observations used https://soberanchor-git-fix-odi-75-tier-card-odius7-maxs-projects.vercel.app/dashboard; tab changes retained that exact URL. Travis's connected session displayed the verified synthetic provider “SoberAnchor Demo — Pending Claim”. This supersedes the earlier session gate.

- Overview rendered: “Enhanced ($99/mo Founding Partner rate) adds your full gallery, branding and inquiry capture. Premium ($299/mo Founding Partner rate) adds clearly-labeled Featured placement.” No unqualified $99/$299 mentions in its visible content.
- Leads rendered: “Enhanced ($99/mo Founding Partner rate) adds a callback-request form to your listing. Inquiries go straight to you and only to you — no middleman, never sold or shared. Your real phone number and website stay on your listing on every tier, including this one.” No unqualified price mentions.
- Plan & Billing matches the previously reviewed offer: $99/mo with “Founding Partner rate · regularly $199”; $299/mo with “Founding Partner rate · regularly $499”; “Flat monthly rate. Annual billing: 2 months free.”; “Founding Partner rates are locked for 12 months. Outpatient-only programs receive 50% off all paid tiers.” Free verification, Premium-only labeled Featured, no reviews/event-posting or organic-ranking promise. Email buttons and resolved subjects verified in live DOM; FAQ explicitly requires sending the email. No email sent.

## Decision

All three final-check items PASS. QA sign-off for merging commit 374dd22e9924aa47ca620126c7ca450f04bb54dc, with the user's accepted limits: My Listing paid branch function/source-level only, no paid fixture; admin selectors intentionally unqualified. No merge performed.
