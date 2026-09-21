# Provider-path ca0b6dc retest — in progress

Preview verified READY: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app

Exact SHA `ca0b6dc955c05e94de6063a85a25e9570bec2352`, deployment `dpl_HHXF6Ei9ANkLa6Y6ZHHAEyLfA5aT`; immutable URL https://soberanchor-j9fdqj5kk-odius7-maxs-projects.vercel.app. One deployment lookup; no deployment polling. Prior evidence remains in `2026-09-18-provider-path-d49ef3c-gates.md`. Local git diff confirms /auth/continue and AuthHydrationListener unchanged between tested SHAs. Test6's callback, pending submission/reload, restricted pending dashboard and signed-in continuation already passed; not unfinished.

## Current results

| Gate | Status | Evidence |
|---|---|---|
| PP-R1 destination | PASS | Cancel now reaches demo …0001 listing, with no next query |
| PP-R1 no reopen | FAIL (P2) | Claim login modal remains/reopens over destination listing after cancel |
| PP-R2 reload restoration | PASS | Reload-only valid claim next restores “Sign in to claim your facility” |
| PP-R2 callback exclusion | PASS, observed initial callback state | Signed-out callback with next showed its own interstitial, no auth modal; no token used in this check |
| PP-R2 signup preservation | PASS | Provider signup stayed signup through auth-query removal, settlement and email entry |
| PP-COPY provider / generic control | PASS | Provider reassurance replaced; generic recovery copy retained |
| PP-DEFAULT fresh bootstrap | Pending test7 password/confirmation/setup and Claude DB read |
| Test5 repaired-row rendering | Pending sign-in; rendering evidence only |
| Demoprovider / ODI-76 / Profile / Settings | Pending session |
| Full member/wrong-door sweep | Pending; generic signup form control observed only |

## R1 residual failure

Started signed out via https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001

Redirect observed https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required&next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001, settled at https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 with “Sign in to claim your facility”.

Clicked “Close” once. After navigation settled, URL was https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001, no query, but full subsequent accessibility observation still contained modal “Close”, “Sign in to claim your facility”, “Email”, “Sign In →”, “Create account”. Thus destination fixed but dismissal/no-reopen gate fails. This run used the direct claim route, not a fresh PDP CTA click; both enter the same observed claim-auth continuation. Exact PDP-origin replay still worth including after cancellation fix.

Likely interaction, not yet proven: AuthModal close effect pushes the listing asynchronously while R2 observes closed modal plus still-present next and opens auth again before navigation completes. A deterministic cancellation suppression/atomic intent clear must cover this gap; do not remove reload restoration to hide it. No implementation changes made.

## R2 and copy chains

- Navigated and reloaded https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 — visible “Sign in to claim your facility”, email/password, “Create account”.
- Navigated signed out to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/auth/continue?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 — “Finishing sign-in…” / “One moment while we confirm your account.” No modal on observed callback state; manual link retains next. This is exclusion evidence, not another successful email exchange.
- https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/ → “Get Started”: “Create Account”, “Your data is private, portable, and always yours. Delete anytime.” Email/password/confirm only. Original recovery trust paragraph and “— Angel, co-founder” retained. No signup submitted.
- https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers → “Create your provider account →” → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fwelcome. Heading “Create your provider account”; “Set up your account, then find your facility.” Confirm Password and “Create Account →” remain after settlement and email entry; no login-mode hijack.

Exact provider body: “Claiming is free forever, and verification is earned rather than sold — we never charge per lead, per call or per admission, and inquiries go only to the facility a family chooses. Paid placement is always labelled, and it never changes organic search results.” Attribution “— The SoberAnchor team”. No recovery/journal/sponsor paragraph in provider modal.

## Ledger

`odius7+providertest7@gmail.com`: email entered in signup only; awaiting Travis's password, submission and confirmation URL. Auth UUID pending. No account/DB writes by Astra in this retest yet. No fixture changes. Existing test5 repair is Claude's action and must not be counted as bootstrap proof. Demoprovider recovery opt-in will remain presence-only.

Browser tab 8 held for test7 password handoff. Overall sign-off withheld: residual R1 failure and outstanding gates.

## Test7 live bootstrap trace

Travis submitted signup and supplied confirmation link. Opened once in same tab. Chain:

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers
2. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fwelcome
3. `https://ybpwqqbnfphdmsktghqd.supabase.co/auth/v1/verify?token=[REDACTED]&type=signup&redirect_to=https%3A%2F%2Fsoberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app%2Fauth%2Fcontinue%3Fnext%3D%252Fproviders%252Fwelcome`
4. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/auth/continue?next=%2Fproviders%2Fwelcome — directly observed “Finishing sign-in…” / “One moment while we confirm your account.” Code-bearing intermediate, if any, was already consumed before this snapshot; do not claim it was captured.
5. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/welcome — automatic, no manual intervention or auth modal on callback. “Welcome — let's set up your account”. Name initially “Friend”: PP-NAME remains reproduced, separate from bootstrap state.

Submitted name `TEST Provider Seven`, organization `TEST Provider Path Seven`. Form reached “Find your facility”. No recovery fields in welcome setup. Asked Claude via Travis for auth UUID and app-written user_setup state, explicitly no row repair. No facility claim or recovery opt-in performed for this identity.

Clicked account-menu Dashboard → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard. Settled default displayed “🏥 My Facility”, “No facility linked yet”, “Claim a facility listing to manage it from your dashboard.” and “Claim a Listing →”. No recovery onboarding, sobriety prompt, Journal or Step Work tabs in the observed dashboard. **PP-DEFAULT fresh-account UI PASS; persisted primary remains awaiting Claude DB evidence.**

Signed test7 out. Direct protected-route check: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required with generic “Sign In” / “Welcome back to SoberAnchor.” email/password modal. **Signed-out /dashboard guard PASS.** Prepared test5 email and handed password entry to Travis; no test5 authenticated rendering observed yet. Other member routes and full signup/onboarding sweep remain pending.

## Test5 repaired-row rendering — PASS

Travis confirmed sign-in as test5. One deployment check in this resumed session confirmed the preview still resolves to ca0b6dc / dpl_HHXF6Ei9ANkLa6Y6ZHHAEyLfA5aT.

- https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard — settled default displays “🏥 My Facility”, “No facility linked yet”, “Claim a facility listing to manage it from your dashboard.” and “Claim a Listing →”. No recovery onboarding, sobriety prompts, Journal or Step Work tabs.
- Account-menu “Profile” targets https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/profile and resolves to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility, same empty facility shell. No recovery fields rendered in observed states.
- Direct https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/my-recovery/settings likewise resolves to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility. No recovery fields. These are redirects, not newly observed provider profile/settings editors.

This is rendering evidence after Claude's row repair only; it is NOT evidence that the original test5 signup initialized its primary correctly. No edits, claims or recovery opt-in performed. Demoprovider's owned-location, navigation and opt-in-presence checks remain separate and pending.
