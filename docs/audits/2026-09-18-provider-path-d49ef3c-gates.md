# Provider-path §5 runtime gates — in progress

Preview: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app

Vercel verified READY deployment `dpl_DfZBtTF3bQ4o2FiBUibjaazPqxSA`, exact SHA `d49ef3cc65026e8baa03773fc26ee4cf710ff25d`, branch `feat/provider-path`. Immutable deployment: https://soberanchor-7gq9adf72-odius7-maxs-projects.vercel.app. All runtime steps below use the branch preview, not production or earlier claim previews. Content check showed the new “Create your provider account →” door. No tight polling used.

Normative inputs: PROVIDER-PATH-SPEC.md §5, review eight gates, and user's runtime scope. Corrected baseline: …0001 unclaimed/basic; …0002 and …0003 demoprovider-owned. Demoprovider provider-primary/recovery-disabled; other row-less accounts are valid legacy members. Demoprovider recovery opt-in is presence-only, never activated.

## Runtime log and findings

### PP-R1 — FAIL — claim-auth cancel returns to homepage (P2)

Expected: close signed-out claim auth → originating demo listing; no immediate reopen.

Observed chain:

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001 — “🏥 Claim This Listing” visible.
2. Clicked link targeting https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001
3. Settled at https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 — “Sign in to claim your facility”; “Use the account that manages this listing.”
4. Clicked modal “Close”. Settled at https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/ — homepage, no modal, not the listing.

Source corroboration at tested SHA: AuthModal close effect strips `next` on the current pathname; it does not use the new continuationCancelHref helper. Proposed correction: wire the deterministic cancel destination through one cancellation owner, preserving successful-auth suppression.

### PP-R2 — FAIL — reload loses visible claim continuation (P2)

Expected: signed-out reload with valid claim `next` presents an auth prompt or explicit continuation card.

Repro: navigate to and reload https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001

Actual: homepage with ordinary “Sign In” / “Get Started”; no reconstructed claim modal or continuation card. Facility remains only in the URL. Source corroboration: AuthQueryOpener exits when `auth` is absent. Proposed correction: implement the spec's entry-surface-scoped reconstruction, excluding callback exchange and cancelled occurrences.

### PP-COPY — FAIL — provider signup retains recovery trust paragraph (P2)

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers — clicked “Create your provider account →”.
2. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fwelcome — provider signup heading “Create your provider account”; subtitle “Set up your account, then find your facility.” Email, Password, Confirm Password inputs, “Create Account →”.

Actual body still includes “Recovery work is deeply personal — your journal entries, step work, and check-ins are yours alone.” and “your sponsor only sees what you explicitly share”. This contradicts the adopted plan's provider-specific reassurance change. Public homepage recovery marketing behind the modal is not itself graded as an onboarding defect. Proposed correction: provider-context body copy, retain generic recovery copy for members.

## Gate coverage so far

| Gate | Status |
|---|---|
| Deployment SHA/content | PASS |
| Review 1 / R5 welcome + claim confirmation | Pending password and email handoff; neither trace complete |
| Review 2 existing member claim preserves identity | Not run |
| Review 3 provider-before-claim setup/reload/reset | Welcome entry only observed; remaining pending |
| Review 4 claim authorization/idempotency/rejection | Not run |
| Review 5 corrected fixture preservation | …0001 unclaimed/basic public appearance observed; DB baseline verification belongs to Claude; other checks pending |
| Review 6 second-location / retained claim | Signed-out claim retains UUID; authenticated checks pending |
| Review 7 reset ledger | Initialized below |
| Review 8 member sweep / wrong-door | Not run |
| R1 / R2 | FAIL as above |
| ODI-76 signed-in Back/Forward | Pending demoprovider session |
| Provider Profile/Settings and opt-in presence | Pending demoprovider session |
| Build / DB verification | Separate Claude Code / Claude evidence; not claimed here |

## Reset ledger / handoff

- Welcome identity staged: `odius7+providertest5@gmail.com`; email entered only. Password/submission delegated to Travis. Creation not yet confirmed; auth UUID pending.
- Claim identity reserved: `odius7+providertest6@gmail.com`; not created yet.
- No claim, workspace mutation or facility write performed by this pass yet.
- Standing demoprovider: auth `0bc90dee-5f79-4c7a-a6b4-c75894419451`, provider account `17cc7fa8-6080-42b0-b83b-94b6257405e2` (user-supplied baseline; not newly created).
- Confirmation URLs/auth codes will be redacted in the saved report; full route/query structure will be preserved. Never save usable confirmation tokens in the ledger.

## Welcome callback continuation — observed follow-up

Identity: `odius7+providertest5@gmail.com`. Before opening the supplied link, browser showed “Account created! Check your email to confirm, then sign in.”

Full route chain (secrets redacted):

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers — provider signup door.
2. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fwelcome — signup/check-email state.
3. `https://ybpwqqbnfphdmsktghqd.supabase.co/auth/v1/verify?token=[REDACTED]&type=signup&redirect_to=https%3A%2F%2Fsoberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app%2Fauth%2Fcontinue%3Fnext%3D%252Fproviders%252Fwelcome` — opened once, in the SAME signup tab.
4. `https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/auth/continue?code=[REDACTED]&next=%2Fproviders%2Fwelcome` — directly observed “Finishing sign-in…” / “One moment while we confirm your account.”
5. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/welcome — automatic landing, no manual navigation. “Welcome — let's set up your account”; “Two quick things, then we'll help you find your facility in the directory.” Inputs “Your name *” and “Organization (optional)”; “Continue →”.

**Callback routing PASS.** No failure copy or pathname-only flash observed in captured states. Client-route versus three-second hard-fallback mechanism was not instrumented; do not claim which mechanism won or that snapshots prove absence of every transient frame. The initial manual link snapshot pointed to `/?auth=required` before state settlement; not clicked or graded as a separate failure.

### PP-NAME — FAIL — provider welcome starts with “Friend” (P2)

At step 5 above, the name input was prefilled with **“Friend”**, contrary to the provider-path principle. Source passes persisted profile display_name to that input; the value's DB origin needs Claude confirmation. Replaced it with explicit synthetic name for the next test.

### Provider setup persistence — PASS for form/funnel, FAIL for default workspace

At https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/welcome submitted name `TEST Provider Five` and organization `TEST Provider Path QA`. UI changed to **“Find your facility”** and **“Search the directory for the facility you manage. We'll take you straight to its claim page.”** Reload preserved this completed-setup funnel.

Searching `SoberAnchor Demo` returned …0001 with “This is mine →” linking to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001; …0002 and …0003 displayed “Already claimed”. No claim submitted by this identity. “My facility isn't listed” exposes “request a listing →” to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/for-providers#claim — expected destination, not a defect; link target inspected, not clicked.

### PP-DEFAULT — FAIL — fresh provider goes to recovery dashboard after provider setup (P1, merge blocker)

**DB corroboration supplied by Claude via Travis:** auth UUID `39113c5f-8ba7-40be-b6a4-dc104ccdeb3c` (`odius7+providertest5@gmail.com`). `user_setup.primary_workspace='member'`, `provider_started_at=22:12:52`, `provider_setup_completed_at=22:12:52`, `recovery_enabled_at=NULL`, `organization_name='TEST Provider Path QA'`. `user_profiles.display_name='TEST Provider Five'`, `onboarding_completed=false`. Times are reproduced as supplied; no timezone inferred. This confirms the wrong persisted primary, rather than merely a stale rendered dashboard. Correct provider enablement/setup completion does not compensate for the missing provider-first bootstrap. No DB repair performed by Astra.

Repro after above welcome completion: open account menu and click “Dashboard” → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard

Expected: provider empty workspace/facility funnel; no recovery onboarding without opt-in.

Actual: recovery shell with “Today”, “Step Work”, “Journal”, “Meetings”, “Tasks”, “Saved”; “STEP 1 OF 4 · SETUP”, “What should we call you?”, “+ Add your sobriety date”, “Currently on Step 1 · Powerlessness”, and “Log today's check-in”. A “🏥 My Facility” mode button was also present. No recovery opt-in was performed.

The OnboardingCard quiet switch **“Here for your facility instead? Switch to provider setup →”** is present (render-level PASS for that component), but this was an incorrectly routed provider, not the required fresh generic-signup regression. It was not activated.

Source evidence at d49ef3c: signup supplies `emailRedirectTo` but no recorded provider-intent metadata; complete-provider-setup enables provider and completion without setting primary workspace. DEFAULT_SETUP is member-primary. This supports a missing signup-bootstrap hypothesis, not a substitute for DB verification. Proposed fix: wire the specified new-signup intent initialization without reclassifying existing members; preserve sole callback navigation ownership.

## Updated reset ledger / next handoff

- `odius7+providertest5@gmail.com`: signup and email confirmation completed; name and organization written as above; provider setup saved and survives reload. Auth UUID and user_setup before/after state requested from Claude via Travis. No facility claim, recovery onboarding, journal/check-in, or opt-in action performed.
- Signed out test5 through the product menu.
- `odius7+providertest6@gmail.com`: email staged in claim-context signup for …0001; awaiting Travis password/submission/link. Claim UUID retained through login → signup toggle. Signup trust copy still has recovery paragraph.
- …0001 remains unclaimed in the observed listing after test5; …0002/…0003 ownership not altered.

Current browser tab 8 is held at claim signup for test6. Remaining gates require continuation; no overall sign-off.

## Claim callback — test6 follow-up

Identity `odius7+providertest6@gmail.com`: check-email copy observed before opening supplied confirmation link. Link opened once in the same signup tab.

Full route chain (secrets redacted):

1. https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/find/00000000-0000-4000-a000-000000000001
2. Claim link targets https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001
3. Settled auth/signup at https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001
4. `https://ybpwqqbnfphdmsktghqd.supabase.co/auth/v1/verify?token=[REDACTED]&type=signup&redirect_to=https%3A%2F%2Fsoberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app%2Fauth%2Fcontinue%3Fnext%3D%252Fproviders%252Fclaim%253Ffacility%253D00000000-0000-4000-a000-000000000001`
5. `https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/auth/continue?code=[REDACTED]&next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001` — “Finishing sign-in…” / “One moment while we confirm your account.”
6. During that captured state, code was removed while next remained: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/auth/continue?next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001
7. Automatic landing: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001 — “Claim Your Listing”, “📍 Pre-selected from directory”, “SoberAnchor Demo — Unclaimed”, “This is mine →”. No intervening name/recovery setup.

**R5 claim callback PASS for observed routing.** No manual navigation, false-failure copy or pathname-only flash observed. As with welcome, route-vs-hard-fallback was not instrumented; snapshots do not prove every transient frame. The callback manual link correctly retained claim next in the observed settled callback state.

At step 7 clicked “This is mine →” once. Same full claim URL then showed **“Your Claim”**, **“Claim submitted for SoberAnchor Demo — Unclaimed.”**, and **“Your claim is awaiting review. Check this page for updates. Listing changes aren't available until your claim is approved.”** Reload preserved that exact pending result. Pending claim submission and reload persistence: **PASS at UI level**; Claude to verify committed row shape and IDs.

Reset ledger addition: test6 account created/confirmed; one claim submitted on facility `00000000-0000-4000-a000-000000000001`. Record auth user UUID, provider_account UUID, provider_claim_attempts IDs and any user_setup row via Claude before reset. No name, recovery onboarding or recovery opt-in submitted for test6. No changes made to …0002/…0003.

### Pending dashboard and authenticated continuation — PASS (observed subset)

Clicked outcome “Go to your dashboard →”: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/dashboard?mode=facility&facility=00000000-0000-4000-a000-000000000001

Rendered correct facility, “Pending review”, “Your claim is awaiting review” and “Listing changes and inquiry data aren't available until your claim is approved.” No lead data or edit controls appeared. “✨ Start your recovery journey →” was visible and NOT activated. This is UI gating evidence, not an independent API authorization test.

Authenticated R5 fallback variant: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required&next=%2Fproviders%2Fclaim%3Ffacility%3D00000000-0000-4000-a000-000000000001 automatically returned to https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/claim?facility=00000000-0000-4000-a000-000000000001 and restored the pending outcome. No auth modal or stranded homepage after settlement.

Signed test6 out via menu. Navigated https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/providers/login → https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app/?auth=required&next=%2Fproviders%2Fwelcome; modal “Sign in to SoberAnchor” / “Use the account that manages your listings.” Current tab held here for Travis's demoprovider login. Demoprovider has not been altered. Both callback routing variants are now observed PASS; overall provider-path gates remain incomplete and blocked by previously recorded failures.
