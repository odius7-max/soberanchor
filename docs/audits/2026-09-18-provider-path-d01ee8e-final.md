# Provider-path final retest — d01ee8e

Status: IN PROGRESS — authenticated gates require Travis's sessions. No merge sign-off yet. No code changes, claims, account creation, or recovery opt-in in this retest.

## Deployment

- Requested and Vercel-verified SHA: `d01ee8e487c9bfe5db5b9ebaf5b3f58304203f93`.
- Vercel status: READY; deployment `dpl_DtJEL3Lt5kE95YL4Bk83u4SxCq2z`.
- Immutable deployment: https://soberanchor-iix0sz4eb-odius7-maxs-projects.vercel.app
- Runtime origin for every step below: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app

Previously passed checks in the d49ef3c and ca0b6dc audit reports carry forward; this report supersedes the ca0b6dc R1 residual failure only. Outstanding checks are not converted to passes.

## Results

| Gate | Result | Evidence |
|---|---|---|
| R1 atomic cancel | PASS in observed UI states | Modal removed immediately after Close; settled listing has no modal and no query; subsequent settled check still closed. |
| Cancel → Back → explicit retry | PASS | Back returns to prior next-bearing homepage without automatically reopening; explicit Sign In opens claim-specific prompt. Fresh listing CTA retry also opened it. |
| Test5 Provider label | PASS | Visible screenshot reads “Provider \| TEST Provider Path QA”; default dashboard is the empty facility workspace. |
| Demoprovider label / switcher / opt-in / ODI-76 | PASS | Independent signed-in UI checks below; recovery opt-in untouched. Separate nav overflow finding for triage. |
| Real member label and existing-member read-only sweep | PASS on c2edc8a | Travis's actual preview session: member label, recovery shell, Saved, Profile, Settings, sponsor deep link and member-only provider CTA verified. Fresh onboarding/wrong-door gates are separate. |
| Saved-favorites prompt | PASS | Signed-out demo listing displays unchanged account invitation, then generic signup fields. No save or signup submitted. |
| Generic signup fields | PASS | Email, Password, Confirm Password; no new role questions; original recovery reassurance present. This does not prove post-signup onboarding. |
| Signed-out protected dashboard | PASS | Direct /dashboard routes to /?auth=required with generic Sign In modal. |

## R1 exact runtime chain

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001 — signed out; clicked “🏥 Claim This Listing”.
2. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 — “Sign in to claim your facility”, “Use the account that manages this listing.”, Close, email/password and Create account.
3. Clicked Close once. Immediate snapshot retained the step-2 URL while navigation was pending, but the modal was absent already.
4. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001 — first captured settled arrival has no modal and no next query. No late restoration observed. This is sampled UI evidence, not a frame-by-frame recording of navigation.
5. Browser Back → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 — no automatic modal.
6. Clicked nav “Sign In” → same full URL, claim-specific modal reopened with “Sign in to claim your facility”. Explicit retry works.
7. Closed again → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001 — subsequent settled observation again has no modal.

An earlier combined observation/Back tool call timed out and lost its output; no assertion above relies on that lost observation. A separate fresh PDP CTA retry was also observed to reopen the claim prompt before the recorded chain.

## Signed-out member controls

At https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001:

- “Save to favorites” → heading “Save your favorites”.
- Body: “Create a free account to save listings and keep them in an easy, accessible place to reference anytime.”
- Actions: “Create Account →”, “Sign In”. Footer: “Free forever · No credit card · Delete anytime”.
- “Create Account →” opens generic signup on the same full URL: “Create Account”, “Your data is private, portable, and always yours. Delete anytime.” Fields Email, Password, Confirm Password. Original recovery trust paragraph and “— Angel, co-founder” remain. No form submitted. First-setup wrong-door paths remain unobserved in this check.

Direct https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required: “Sign In”, “Welcome back to SoberAnchor.”, Email, Password, “Sign In →”. Test5 email entered solely for Travis's login handoff.

## Remaining evidence and ledger

- Need a real member session for independent label and member sweep. Demoprovider checks completed below.
- Test7 app-written primary_workspace DB verification and UUID are still unreceived in this report's evidence; fresh UI bootstrap passed in ca0b6dc. Test5 repaired-row rendering is rendering-only evidence.
- Test6 claim callback and pending outcome were completed in d49ef3c; do not recreate the claim as though outstanding. Its database IDs remain Claude's ledger follow-up.
- No reset-ledger additions from this retest. No passwords or confirmation tokens recorded here.

## Test5 label — independent signed-in observation

Travis signed in as test5. One Vercel lookup reconfirmed READY deployment `dpl_DtJEL3Lt5kE95YL4Bk83u4SxCq2z` at exact SHA `d01ee8e487c9bfe5db5b9ebaf5b3f58304203f93`.

At https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard, screenshot shows nav label “Provider | TEST Provider Path QA”. Accessibility describes that button as “My account”, so the label proof is the visible screenshot, not its accessible name. Dashboard shows “🏥 My Facility”, “No facility linked yet”, “Claim a facility listing to manage it from your dashboard.” and “Claim a Listing →”. No recovery onboarding in the observed dashboard. PASS for test5 label and carried-forward facility rendering. This remains a repaired-row test, not fresh-bootstrap DB proof.

Signed test5 out to prepare demoprovider login. No account edits or fixture writes performed.

## Demoprovider session — PASS for requested functional gates

Travis supplied the standing demoprovider session. Vercel reconfirmed the same READY deployment and exact d01ee8e SHA once. Account identity is Travis-attested; UI independently shows both expected owned demo locations and organization.

- https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard — facility mode by default. Visible account-button text, read from rendered DOM: “Provider | SoberAnchor Demo Organization (TEST) ▾”. Initial location “SoberAnchor Demo — Pending Claim”, “✓ Verified”. “✨ Start your recovery journey →” present; neither it nor Dismiss was activated. No recovery tabs/onboarding.
- Location selector → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility&facility=00000000-0000-4000-a000-000000000003 — selected “SoberAnchor Demo — Claimed”; Overview names the same facility; “✓ Verified”.
- Selector back → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility&facility=00000000-0000-4000-a000-000000000002 — selected “SoberAnchor Demo — Pending Claim”; Overview matches. Switcher PASS both directions.
- Nav For Providers → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers — both entry buttons read “Go to your dashboard”. First button → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility, facility shell with …0002 selected.
- Browser Back → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers — both “Go to your dashboard” buttons retained. Forward → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility — facility shell retained.
- Back again → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers — same session-aware buttons; second button → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility. No auth modal or sign-in redirect in captured states anywhere in this chain. Single preview origin throughout. ODI-76 PASS; sampled observations do not prove absence of a sub-frame flash.
- Account-menu Profile targets https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/profile and resolves to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility. Settings direct navigation https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/settings also resolves to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility. No recovery fields; these are redirects, not provider editors.

## New observation for triage — long provider label overflows nav (P2, provisional)

- URL: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility (also visible on initial /dashboard).
- Expected: organization label fits or truncates within the viewport; no horizontal page overflow.
- Actual: long “Provider | SoberAnchor Demo Organization (TEST) ▾” extends beyond the right edge in screenshot and the page has a horizontal scrollbar. Read-only DOM measurement: window.innerWidth=1016; document.documentElement.scrollWidth=1045.
- Repro: sign in as standing demoprovider, view the dashboard at the observed 1016px window width. Compare test5's shorter label, which visually fit in this session's earlier screenshot. Exact CSS cause not diagnosed.
- Proposed fix for triage: constrain/truncate long organization text and preserve nav/control access at this breakpoint. No implementation change made; functional label gate remains PASS. This new layout finding is sent to Travis for severity/merge triage, not silently treated as accepted.

No claim, listing edits, recovery enablement, or dismissal performed. Location selection may persist the product's ordinary workspace/location preference. Real-member and first-setup/wrong-door evidence remains pending.

## 2026-09-19 — c2edc8a retest setup and deployment attribution

- Preview verified READY at exact SHA `c2edc8a7a59d4e387c2210905bdb605374a9b23d`, deployment `dpl_5eGbSjUivXfgHifoVZqpd46K2yKb`, immutable https://soberanchor-g6vm60fl1-odius7-maxs-projects.vercel.app; alias https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app.
- Travis's supplied real-member session was observed at https://soberanchor.com/dashboard, showing the member shell and recovery navigation. Production independently resolves to `76092b370c8231ae5c8182537571f4cdc955da32` / `dpl_GRd6MGFm36jQzrxp8K2A6YwFEsdk`. This is baseline evidence only, NOT a member regression pass on the provider-path branch. Personal recovery content is omitted from this report.
- Navigated to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required, “Sign In”, “Welcome back to SoberAnchor.” Preview session is signed out. Requested member login on this origin; production session was not signed out or modified.
- Source inspection of c2edc8a confirms bounded ellipsis text, full label in title, and a separate non-shrinking chevron. This is source evidence only; 1016px demoprovider runtime verification remains pending a session. Commit-message claims of browser success are not substituted for independent QA. Its separate 768px legacy-overflow note has not been independently retested here.
- No new account or fixture writes. Full sign-off still pending member checks and independent overflow closure.

## 2026-09-19 — real member runtime evidence on c2edc8a

Travis signed in separately on the verified preview. This is an actual authenticated member session, not a mocked/nonexistent identity. Read-only sweep; no recovery/profile/settings/favorite/claim submissions. Personal recovery details omitted.

| Step / full deployment URL | Actual / result |
|---|---|
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard | Account button rendered text “My Journey \| Travis” plus separate ▾. “⚓ My Journey”, “👥 My Sponsees”, “📍 Check In”; Today, Step Work, Journal, Meetings, Tasks, Saved tabs present. No provider takeover/onboarding. PASS. |
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard — clicked Saved | All, Favorites, Watchlist filters and saved content rendered. No login prompt; no favorite mutations. PASS render/access. |
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/profile — account menu Profile | Stays on member Profile route, “My Profile”, “Profile Information”, “Save Profile”. No provider redirect; did not save. PASS. |
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/settings — direct navigation | Stays on Settings, “Settings”, “Account & Security”, disabled “Update Password”. Did not enter credentials/change settings. PASS. |
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?tab=sponsees — direct protected link | Resolves to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard with sponsor view, “Your Sponsees”, “+ Add Sponsee”, “Review Step Work”. Query consumption observed; no auth prompt or provider shell. PASS. No sponsee actions taken. |
| https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers | Signed-in member-only buttons “Set up a provider account →” and “Set up a provider account”. No auth modal. Did not activate enablement. PASS. |

These observations close the existing-member session/label gap. They do not create evidence for fresh generic email signup, modal/card first-setup correction, invitation acceptance, or blocked correction 409; those require separate synthetic setup if still normative for sign-off. Earlier signed-out generic form and favorites-prompt passes carry forward.
