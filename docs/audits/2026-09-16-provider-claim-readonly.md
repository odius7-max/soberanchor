# Provider claim audit — initial read-only findings

Date: 2026-09-16
Surface: https://soberanchor.com (production)
Source: local HEAD and GitHub main both verified as 5e440b80570410086589c7b4821e1b9983e5be82 during this pass. Local branch name is feat/pdp-tier-rendering, but HEAD equals main and audited claim/auth files have no diff against origin/main. Production deployment SHA was not independently retrieved; live checks below anchor behavioral findings.

## Scope and boundaries

Concurrent-work note: by the end of this pass, middleware.ts had an external uncommitted CSRF change consistent with ODI-62. I did not modify or revert it. Its claim redirect still targets /?auth=required without continuation. Source line references below refer to the audited commit, before that concurrent change.

Completed step 1 (claim/auth code trace) and the signed-out portion of step 2 using only the three demo listing URLs. No account was created, credentials entered, claim submitted, SQL run, admin action taken, or application code changed. Local audit documentation and explicitly requested Linear findings are the only writes. All environments share production data. No controlled email/test session was supplied; authenticated and write-dependent scenarios remain pending. This is not an end-to-end claim certification.

ODI-62 anonymous search and ODI-50 provider copy are concurrent work owned by Claude; neither surface was exercised or re-diagnosed. Premium rendering, tiers, lead capture and billing are excluded. No test billing exists.

## Evidence and coverage

- Demo …0001: public fictional listing loads; claim href includes its exact UUID. Clicking while signed out shows login on the homepage and loses the claim destination. Also observed at a 390×844 mobile viewport.
- Demo …0002: starts unclaimed, as specified. First claim entry opens login. Opening signup shows generic recovery/privacy copy. Cancel → browser Back → claim again leaves /?auth=required with no modal. Reload restores login. No claim was submitted.
- Demo …0003: public page displays Verified and no claim CTA. This verifies flag rendering only; it proves neither ownership nor authenticated provider access. User reports provider_account_id is NULL.
- Login/signup/confirmation success, logout/login replay, claim persistence, RLS enforcement, ownership linking, approval/rejection and notifications: NOT runtime tested.
- Screenshots were visually inspected in the browser tool output for the repeat-entry dead end and mobile listing CTA. This report contains reproducible observations, not archived screenshot files.

## What the code actually does with a claim

1. Public listing links to /providers/claim?facility=<UUID>.
2. Middleware and the page auth guard send signed-out users to /?auth=required, dropping facility context.
3. Root AuthQueryOpener opens login once for that URL key, then removes auth. AuthModal has no return-destination parameter and uses /dashboard after login, signup confirmation and onboarding.
4. An authenticated claim page can seed the selected facility from the query. An account already linked to any facility is redirected to /dashboard before that preselection is processed.
5. Clicking This is mine directly calls claimFacility: read authenticated email and facility website, compare domains, find/create provider_accounts, then update facilities.provider_account_id, is_claimed=true and is_verified=<domain match>.
6. The intended pending state is a claimed but unverified facilities row linked to provider_accounts. Admin /admin/claims reads claimed facilities; ClaimsQueue labels unverified rows pending. Absence of a claims table does not mean submission necessarily goes nowhere. Persistence remains unverified because this pass permits no writes.
7. Approval sets is_verified=true. Rejection clears claim/verification/ownership and deactivates the provider account. The reviewed claim/approval/rejection functions contain no explicit notification dispatch; database-side hooks were not inspected.
8. /dashboard includes a facility mode, but defaults to recovery mode for recovery-onboarded users. /providers/dashboard also exists. A provider account is currently created during claiming, not as a separate provider signup flow.

## Defects for triage

P1 = blocks or materially undermines the claim journey; P2 = confusing or incomplete journey. Source-confirmed findings are clearly separated from production browser reproductions.

### C1 — Claim authentication loses the selected facility and resumes at member dashboard

- **Severity:** P1 — high
- **Flow step:** Listing → authentication → resume claim
- **Evidence:** Live reproduction of context loss; post-login destination confirmed in source, not exercised with credentials.
- **Expected:** Signing in or registering from a listing preserves the facility and resumes that claim. Cancelling returns to that listing.
- **Actual:** The claim link includes ?facility=<UUID>, but middleware redirects to /?auth=required. AuthQueryOpener removes auth; no claim destination survives. AuthModal sends existing users, completed onboarding, and email confirmation to /dashboard. Signup copy is recovery-focused. Dashboard supports facility mode, but this does not restore an unfinished claim.
- **Source:** middleware.ts:49–52; src/app/providers/claim/page.tsx:14; src/components/auth/AuthModal.tsx:89–105, 125–150, 162–181; src/context/AuthContext.tsx:29–30.

**Reproduction / verification procedure**

1. While signed out, open https://soberanchor.com/find/00000000-0000-4000-a000-000000000001.
2. Click Claim This Listing.
3. Observe the homepage/login modal and loss of facility context.
4. Inspect AuthModal afterAuth, signup emailRedirectTo, and handleOnboarding: each continues to /dashboard. Credential submission was deliberately not run.

**Proposed fix:** Carry a validated same-origin claim destination and facility UUID through login, signup, confirmation, and onboarding. Resume the selected claim after session establishment. Use provider-specific context and contact onboarding for this entry; keep recovery setup optional. Preserve the listing on cancellation.

### C2 — Repeating Claim This Listing leaves auth=required with no login modal

- **Severity:** P1 — high
- **Flow step:** Cancel authentication → return to listing → retry claim
- **Evidence:** Reproduced on production without signing in; screenshot and accessibility state inspected.
- **Expected:** Every new claim attempt by a signed-out visitor opens a usable authentication prompt.
- **Actual:** First entry opens login. After dismissing, going Back, and clicking the same CTA again, the page stays at /?auth=required with no modal. Reload restores the modal. AuthQueryOpener.handledFor permanently remembers the pathname/auth key for that mount and returns before opening or clearing the query on a repeat.
- **Source:** src/components/auth/AuthQueryOpener.tsx:28–49; src/app/providers.tsx:17–20 keeps the opener in the shared root.

**Reproduction / verification procedure**

1. Open https://soberanchor.com/find/00000000-0000-4000-a000-000000000002 signed out.
2. Click Claim This Listing; login opens.
3. Dismiss using Escape (if in signup, return to sign-in first).
4. Use browser Back to return to the demo listing without reloading.
5. Click Claim This Listing again.
6. Observe /?auth=required and no modal. Reload restores the prompt.
The user's exact logout/login variant remains untested.

**Proposed fix:** Make deduplication scoped to the current auth-query occurrence, resetting when that query is absent or navigation changes. Do not suppress a later legitimate auth attempt. Verify cancel/back/retry and logout/login/retry after fixing; preserve claim intent as in C1.

### C3 — Claim submission ignores facility-link errors and redirects even when nothing was saved

- **Severity:** P1 — high
- **Flow step:** Confirm claim → persist provider ownership
- **Evidence:** Source-confirmed error-handling defect. No failed write was induced on production; current RLS behavior is not established.
- **Expected:** Proceed only when the facility was linked successfully. Report failure with a retry path; avoid leaving a partial provider account.
- **Actual:** claimFacility creates/reuses provider_accounts, awaits facilities.update, discards its result, then always routes to /dashboard. An error or zero updated rows is not detected, so a failed claim can leave an account with no facility and no explanation.
- **Source:** src/components/providers/ClaimFlow.tsx:96–125.

**Reproduction / verification procedure**

Read src/components/providers/ClaimFlow.tsx claimFacility, lines 96–125: compare the account existence check with the unchecked facility update. Follow-up test after approval: with only a synthetic fixture, simulate a rejected/zero-row update and verify that navigation incorrectly proceeds. This fault injection has NOT been executed.

**Proposed fix:** Use a server-enforced, atomic claim operation with ownership/availability checks, or explicitly handle and reconcile partial writes. Check returned errors and require exactly the intended facility to be linked before advancing. Provide clear recoverable errors and safe repeat submission.

### C4 — Pending claims have no submission confirmation or review status at the destination

- **Severity:** P2 — medium
- **Flow step:** Submit non-domain-matching claim → pending review → return visit
- **Evidence:** Source-confirmed missing completion path; actual persistence and authenticated UI await approved fixture writes.
- **Expected:** Show Claim submitted for the selected facility, Pending review status, what happens next, and a way to return to that status. Distinguish approved, pending, and failed outcomes.
- **Actual:** Nonmatching domains set is_claimed=true and is_verified=false, then use the same /dashboard redirect as auto-verification. ClaimFlow has an unused 'done' step. Admin ClaimsQueue treats unverified claimed facilities as pending, but the provider overview receives no verification state. ListingTab exposes a generic verified yes/no rather than a review journey. For recovery-onboarded providers, DashboardShell defaults to recovery mode.
- **Source:** src/components/providers/ClaimFlow.tsx:7, 94–125; src/app/admin/claims/page.tsx:9–13; src/components/admin/ClaimsQueue.tsx:56–65; src/components/providers/ProviderDashboardShell.tsx:64–77; src/components/providers/ListingTab.tsx:259–260; src/components/dashboard/DashboardShell.tsx:118–120.

**Reproduction / verification procedure**

Trace a nonmatching email-domain path in ClaimFlow (lines 80–125), then the admin queue and dashboard props/default mode. After approval, submit only demo …0002, verify persisted state, reload, and inspect provider status. No submission or admin transition was performed in this pass.

**Proposed fix:** Add an explicit claim outcome/status view tied to the selected facility and persisted state. Route claim completion to facility context, including for dual-role users. Explain review steps and retain status across visits; define approval/rejection messaging before implementing notifications.

## Corrected journey proposed for agreement

Listing → sign in/create account with the facility visibly retained → confirm email if required → return to the same claim → confirm provider contact/authority → submit once → confirmed persisted pending/approved outcome → facility workspace and a visible review status. Cancelling returns to the originating listing. Login retry, refresh, back and forward must preserve a usable continuation. Recovery participation remains optional; dual-role users enter the facility context when they arrive from a claim.

Before implementation, agree on domain-match auto-verification versus manual review, what evidence is required, what pending providers can edit, and the review/status messages. The destination may remain inside the unified dashboard if it reliably selects the intended facility mode; a separate dashboard is not required by these findings.

## Next pass after findings agreement

- Use a controlled email supplied by Travis and a dedicated test session. Account creation and claims change production data, so they remain outside this read-only pass.
- Account signup alone does not create provider_accounts in the reviewed code; decide how the real demo claim will create it before requesting ownership-link SQL for …0003. Never infer ownership from fixture flags.
- Verify auth/login/logout/confirmation and the exact reported repeat-login failure. Submit only …0002 to verify the pending representation and error handling. Capture targeted persisted state and queue outcome without browsing unrelated production records.
- Read actual database policies/triggers to establish whether direct client updates are allowed and whether availability, domain verification, ownership races and notification rules are enforced. No security bypass is asserted from frontend code alone.
- Test recovery-onboarded versus provider-only destinations, repeated claims, rejected/inactive account retry, and attempts to claim a second demo facility. ClaimFlow reuses accounts without checking is_active; runtime effects need verification.
- Test approved/rejected return visits and mobile authenticated claim controls. Mobile work in this pass covered only signed-out listing/entry, not a full responsive audit.
- Expand the reset procedure after observing actual writes: the supplied reset does not clear provider_account_id, remove newly created provider_accounts/auth profiles, or restore every possible claimed-demo mutation. Scope any cleanup to explicit synthetic IDs and dedicated test identities; do not run the supplied SQL blindly.

## Review gate

No fixes are implemented. Findings and the corrected journey are ready for review; remaining authenticated/write tests are explicitly outstanding.

## Linear triage

Filed in Flow QA — Systematic Audit, labeled Bug, Backlog, and related to ODI-40 per the user's requested destination. The project's existing description suggests owning-surface projects for bugs; these follow the explicit request instead and can be moved during triage.

- C1: [ODI-66](https://linear.app/odius7/issue/ODI-66/claim-qa-c1-claim-authentication-loses-the-selected-facility-and) — P1 — high
- C2: [ODI-67](https://linear.app/odius7/issue/ODI-67/claim-qa-c2-repeating-claim-this-listing-leaves-authrequired-with-no) — P1 — high
- C3: [ODI-68](https://linear.app/odius7/issue/ODI-68/claim-qa-c3-claim-submission-ignores-facility-link-errors-and) — P1 — high
- C4: [ODI-69](https://linear.app/odius7/issue/ODI-69/claim-qa-c4-pending-claims-have-no-submission-confirmation-or-review) — P2 — medium
