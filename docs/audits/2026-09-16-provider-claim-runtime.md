# ODI-40 runtime pass — historical observation log

Superseded for current status by [the consolidated report](2026-09-16-provider-claim-final.md). Earlier pending-state handoffs below are historical. C5 / R4 is WITHDRAWN: its admin action used production's legacy handler. R3 approval copy is excluded from confirmed preview defects pending a preview-admin approval retest. Preview rejection and direct RPC same-owner retry now pass; see the consolidated report and JSON evidence.

Preview: https://soberanchor-git-fix-claim-flow-e2e-odius7-maxs-projects.vercel.app
Expected/source commit: fdd6a4c7af0e7db6f233d3f69c67dbcf0c68a43a (local HEAD verified).

Authorized scope: real signup and claim tests using the controlled identity and only demo facilities 00000000-0000-4000-a000-000000000001 / 0002 / 0003; production database shared. No implementation or merge changes.

## Runtime observations

1. Demo …0001 loads on preview without deployment-protection prompt.
2. Signed-out claim entry opens provider-specific login copy and retains next=/providers/claim?facility=…0001 in the URL. PASS for this entry segment only.
3. During the transition toward signup, authentication state changed without agent credential entry or form submission. A subsequent demo claim navigation reached the correctly preselected claim form. Account identity and whether user-driven signup/confirmation occurred remain to be confirmed. Do not classify this as a modal defect or a passed email-confirmation test without that clarification.
4. Travis corrected the controlled test email to odius7+providertest1@gmail.com and confirmed he signed out so the agent can restart the real account-creation path. The earlier authenticated segment is excluded from signup/confirmation evidence. No claims were submitted in that session.

## Confirmed runtime results after controlled signup

- Travis reports creating odius7+providertest1@gmail.com, receiving the confirmation email, clicking it and signing in in this browser. The supplied email screenshot shows /auth/continue with a continuation for demo …0001. Authentication tokens are deliberately not transcribed.
- Agent resumed on the homepage with next pointing to demo …0001; the navigation menu showed Dashboard/Profile/Settings/Sign Out. Automatic return from the confirmation link is NOT established; clarification of the user's intervening navigation is pending. Preserve this observation separately from a confirmed defect.
- Agent navigated to demo …0002, clicked Claim This Listing, then This is mine once. Result: “Claim submitted for SoberAnchor Demo — Pending Claim” and awaiting-review explanation.
- Full claim-page reload retained the pending outcome. Dashboard CTA selected mode=facility and facility=…0002. Dashboard displayed Pending review and status-only content, with no edit or inquiry controls.
- Dashboard reload, browser Back to the claim and Forward to the dashboard all retained the correct facility and pending state. Claude subsequently verified DB persistence via Travis: …0002 has is_claimed=true, is_verified=false, provider_account_id=d0ec2915-e46d-4aa6-bf06-1a6e04a0267e.
- Sign-out initiated for the requested logout/login regression; no second claim submitted.

## Runtime defect R1 — claim-auth cancellation returns to homepage (C1 / ODI-66)

- Flow step: signed-out listing → claim login → Close.
- Expected: cancellation returns to the originating demo listing and clears auth intent.
- Actual: Close dismisses the modal and navigates to the preview homepage `/`, not `/find/…0001`. Browser Back is needed to recover the listing.
- Repro: sign out; open demo …0001; click Claim This Listing; wait for “Sign in to claim your facility”; click Close; observe homepage. Use browser Back to recover the listing.
- Severity: P2 — broken cancellation destination; claim is recoverable via Back.
- Proposed fix: route claim-specific cancellation deterministically to the validated originating listing, keeping normal auth cancellation behavior separate. No fix implemented in this pass.

## C2 and login-retry progress

- After R1, browser Back returned to demo …0001. Clicking Claim This Listing again reopened provider login with the same facility continuation: C2 cancel/back/retry PASSED.
- Existing test email prefilled; Travis asked to enter the existing password and leave the post-login destination untouched. Logout/login resume remains pending that handoff.
- Claude confirmed via Travis that demo …0001 website is now https://gmail.com, original https://example.com/soberanchor-demo recorded for reset. Demo …0001 remains unclaimed; no claim for it submitted by the agent yet. Demo …0003 remains claimed/verified with no owner, untouched.

## Coverage pending

### Step 5 update — manual approval

- Travis reported approving demo …0002 in the admin queue. Provider claim-page revisit now shows Verified; dashboard CTA selects …0002 with a Verified chip. Manual approval propagation PASSED in the browser.
- Travis asked about richer manual-review information; tabled as a future enhancement: claimant name/role, verification evidence, reviewer notes, and decision history. No scope expansion or implementation during this pass.
- Next requested action: reject ONLY …0002, preserving …0001. Claude to verify facility-specific clearing, durable rejection row/ID, active provider account and unchanged …0001; also supply …0001 claim-attempt ID. Rejection not yet observed.

### Runtime defect R3 — manual approval mislabeled as automatic domain match (C4 / ODI-69)

- Flow step: admin approves pending …0002 → provider revisits its claim page.
- Expected: truthful verified confirmation, either neutral or correctly identifying manual approval.
- Actual: the claim page says “We matched your email domain to the listing's website, so your claim was approved automatically.” This fixture was manually approved after the confirmed gmail.com/example.com mismatch.
- Repro: submit …0002 with the controlled Gmail test identity; admin approves it; open /providers/claim?facility=00000000-0000-4000-a000-000000000002 as the claimant; read the verified explanation.
- Severity: P2 — misleading verification explanation; status propagation itself works.
- Proposed fix: use neutral verified copy unless the persisted verification method supports a specific explanation. Do not infer automatic approval from is_verified alone. No fix implemented.

### Step 4 update — verified path and multiple locations

- While the agent was recording Claude's ledger, the browser transitioned from provider login to /providers/claim?facility=…0001. No agent navigation caused this transition. Observed post-login state: correct preselected facility. This passes the observed login-resume segment, not the earlier unobserved email-confirmation exchange.
- After Claude's domain change confirmation, agent clicked This is mine once for …0001. Outcome: “Your claim for SoberAnchor Demo — Unclaimed is verified” with automatic domain-match explanation.
- Dashboard CTA opened facility=…0001 with Verified and that location selected. Switcher listed …0001 and …0002.
- Switching to …0002 yielded Pending review/status-only content. Full reload retained …0002. Switching back selected …0001 and restored Verified. Both locations remained independently accessible.
- Direct owner revisit to …0001 claim page returned persisted Verified immediately, with no submission button. This is a status/revisit check, NOT proof of a repeated POST's idempotency; the normal UI intentionally skips resubmission for an owned facility.
- Second new claim mutation: …0001. Additional provider_claim_attempts ID and post-claim row verification requested from Claude via Travis; do not assume a sequential ID.
- Travis requested to approve ONLY …0002 through the preview admin queue in a separate admin session. Await approval confirmation before checking the new status; rejection comes afterward.

- Signup → email confirmation → /auth/continue → same facility: UNVERIFIED.
- Pending …0002: browser portion PASSED; DB verification PASSED per Claude via Travis. Verified …0001 and multi-location switching: browser PASSED, new DB verification pending. C1/C2 variants partially passed with R1/R2 open. Admin round-trip and same-owner POST retry: outstanding.
- Final DB verification after the remaining mutations and Travis's journey review: outstanding. No merge sign-off.

## Test identity / reset manifest

- Controlled email: odius7+providertest1@gmail.com (real signup/confirmation performed by Travis; IDs verified DB-side by Claude and relayed by Travis).
- Auth user UUID: 59fdecb5-804e-41c6-969e-e48eb5d850f9 (created 03:05Z per Claude).
- Provider account UUID: d0ec2915-e46d-4aa6-bf06-1a6e04a0267e (created 03:07Z per Claude).
- provider_claim_attempts row: id 1, fixture 00000000-0000-4000-a000-000000000002.
- Rejection records: none as of Claude's verification.
- Fixture 00000000-0000-4000-a000-000000000001 website reset: restore https://example.com/soberanchor-demo from test value https://gmail.com. Change performed by Claude, not the agent.
- Agent mutations to application data so far: one claim submission each for demos …0002 and …0001. No SQL or direct database writes. Claim-attempt ID for …0001 pending Claude.

Browser handoff: audit tab 2, signed-out provider login with continuation to /providers/claim?facility=00000000-0000-4000-a000-000000000001. Domain change is confirmed; next dependency is test-account sign-in. Demo …0002 is already pending.


## Runtime defect R2 — refreshing claim login hides the next step (C1)

- Flow step: signed-out claim authentication → browser reload.
- Expected: refresh retains both the selected facility and a visible way to continue authentication without rediscovering Sign In in navigation.
- Actual: reload of /?next=<encoded claim for demo …0001> removes the login modal and shows the homepage. The next value remains. Navigation menu shows Sign In/Get Started, confirming signed-out state; manually choosing Sign In recovers provider-specific copy and retained continuation.
- Repro: open demo …0001 signed out → Claim This Listing → wait for provider login → reload → observe homepage without modal → menu → Sign In restores it.
- Severity: P2 — recoverable interruption in claim continuation.
- Proposed fix: make the auth continuation route/state reconstruct a usable authentication prompt after reload, while distinguishing explicit cancellation. No implementation change made.

Current handoff: test provider signed in; both locations accessible. Awaiting Travis's admin approval of …0002 and Claude's additional claim-attempt ID. No rejection or reset performed yet.

R2 cause note: Claude acknowledged the finding. A guard surviving a full browser reload is not established; the observed URL lacks auth after query cleanup, so a newly mounted AuthQueryOpener has no auth trigger. Preserve the runtime reproduction as evidence and leave root-cause/fix decisions to triage.


## Runtime R4 — rejected demo can be re-claimed without support (investigation open)

- Flow step: admin rejection of demo …0002 → provider return → re-claim.
- Expected: facility-specific rejection leaves …0001 accessible and preserves a durable rejection for this user/…0002; re-claim requires support.
- Actual: after Travis reported rejection, refreshed …0002 dashboard said the listing was not on the account. Its claim page then displayed This is mine rather than a rejection/support notice. One click succeeded and returned …0002 to Pending review. …0001 remained Verified and accessible afterward.
- Repro observed: reject …0002 as admin; reload its selected provider dashboard; visit /providers/claim?facility=00000000-0000-4000-a000-000000000002 as the existing test provider; click This is mine once; observe a successful pending outcome.
- Severity: provisional P1 for the tested workflow — rejection can be bypassed. Attribution to the candidate deployment awaits the admin URL and DB evidence; do not call the cause confirmed.
- Investigation/proposed fix: confirm which admin deployment performed rejection; inspect facility_claim_rejections for auth user 59fdecb5-804e-41c6-969e-e48eb5d850f9 and fixture …0002 plus action failures. If rejection persistence failed, make ownership clearing and durable rejection recording one checked transaction. If deployment mismatch, repeat on the candidate admin deployment before claiming a candidate-code defect. No fixes made.
- Evidence/reset impact: third agent claim submission overall (second submission of …0002) was accepted. …0002 is now pending again; additional attempt ID unknown. Do not assume IDs or reset until Claude records the current state. Auth user/provider account IDs remain in the ledger; active flag and owner identity need refreshed DB verification.
