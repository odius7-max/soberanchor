# ODI-40 consolidated runtime findings

Report date: September 16, 2026 Pacific. Final probe: September 17 04:18:47 UTC.

Candidate: https://soberanchor-git-fix-claim-flow-e2e-odius7-maxs-projects.vercel.app

Expected candidate/source commit: fdd6a4c7af0e7db6f233d3f69c67dbcf0c68a43a. Local source HEAD verified; deployment identity supplied by Travis. Only three synthetic demo facilities and the controlled test identity were used. Database is shared production. No implementation fixes, merge, or reset performed.

## Decision summary

CURRENT R5 DISPOSITION — attempt 4 on Vercel-verified 7b63098a4f1288c7a5f1c356464196f57c17ac42: automatic same-browser email callback to preselected …0001 PASS; Pending submission PASS; authenticated auth=required + next automatic return PASS. No failure copy or pathname-only callback observed in samples. Client routing vs 3-second fallback is undetermined due to sampling interval; no claim of continuous frame coverage. [Full current trace and reset ledger](2026-09-16-email-callback-attempt4.md). Earlier attempt-3 failure/hold below is historical and superseded for R5. Other R1/R2/R3 findings were not retested in this callback pass. Three-way sign-off/reset remain separate; no merge performed.

HISTORICAL ATTEMPT 3: Gap 2 failed on fdd6a4c; see [prior trace](2026-09-16-email-callback-attempt3.md). R5 caused callback stall and failed manual recovery. It has since passed on 7b63098 as above. Attempt-3 reset records remain historical: auth e49cbffd-d8ab-4a23-beac-e6071c3608a4; provider 7867c7c2-36b8-4700-a578-4fe4eec3cdc5; attempt 4. Claude reset that fixture before attempt 4; this was test setup, not product behavior.

Latest R3 revisit, after Travis's subsequent “done” confirmation: CONFIRMED on preview. Demo …0002 claim page now shows Verified but wrongly says automatic domain matching caused approval. Dashboard selects …0002 and correctly shows Verified, without that automatic-approval explanation. The earlier 04:24 UTC pending observation is superseded by this completed transition. No claim or admin mutation performed by the agent during either revisit. Earlier reset ledger and DB snapshots are historical; Claude must refresh the ledger after fixture reopening.

Core pending, verified, multi-location, and preview rejection flows pass within the coverage below. Three P2 issues remain for triage: R1/R2 auth continuation and R3 misleading approval copy. R5 adds a proposed P1 for failed automatic email continuation. C5 / earlier runtime R4 is withdrawn. R3 is confirmed after preview-admin approval. Email continuation was directly observed in attempt 3 and failed; explicit navigation allowed downstream Pending completion. This is not merge sign-off.

## Coverage and evidence

| Flow | Result | Evidence / limit |
| --- | --- | --- |
| Signed-out listing claim | PASS | Provider auth prompt retains fixture …0001 continuation. |
| Signup and email delivery | User-confirmed | Travis created the controlled account through UI and received/clicked confirmation. Email screenshot contains correct /auth/continue destination. |
| Email callback → same claim | PASS on 7b63098, attempt 4 | Automatic same-tab confirmation returns to preselected …0001, no manual intervention. Pending submission and authenticated next variant also pass. Mechanism and sub-frame observation limits in attempt-4 report. |
| Cancel → Back → retry | PASS with R1 | Modal reopens on retry; cancellation destination remains wrong. |
| Logout → login continuation | PASS | Observed login-to-claim transition preserves …0001. |
| Reload while login modal open | FAIL, R2 | Modal disappears; retained next can recover through manual Sign In. |
| …0002 pending claim | PASS | Submission confirmation, pending chip, reload, return visit, Back/Forward and facility selection preserved. Claude confirmed pending flags/owner. |
| …0001 domain-matching claim | PASS | Actual UI claim returns Verified; persisted owner/flags independently read during final probe. |
| Multiple locations | PASS | Correct initial selection; switcher changes between verified …0001 and pending …0002; reload retains selection and facility-specific status. |
| Manual approval on candidate | Status PASS; copy FAIL R3 | Travis confirms preview-admin approval; agent observes …0002 Verified on preview claim page/dashboard. Claim page wrongly attributes manual approval to automatic domain matching. |
| Preview rejection | PASS | Travis/Claude confirm admin action and durable record. Agent sees support notice and disabled claim CTA on preview. DB reads confirm …0002 cleared, …0001 verified/owned, account active. |
| Rejected facility re-claim | PASS at UI + RPC | Disabled CTA and support message. Direct claim_facility call returns claim_rejected with no observed data changes. |
| Same-owner retry, step 6 | PASS at RPC level | Two actual claim_facility calls for …0001 return verified + already_owned=true. Recorded fixture fields, provider active state, attempts and rejection rows unchanged. Preview revisit still Verified. Owned UI has no submit CTA; this is not a replay of an authenticated preview HTTP POST. |

RPC evidence: [before/after and responses](2026-09-16-provider-claim-retry-evidence.json). Bounded reproducible probe: [claim-runtime-retry.cjs](claim-runtime-retry.cjs). Probe validates the exact confirmed test user, active account, demo source tags, verified ownership and existing rejection before invoking the operation. It uses existing local service credentials without recording them. It created no new attempt or rejection rows.

## Confirmed defects

### R5 — confirmed-email callback fails to resume claim (ODI-66)

Proposed P1. Full flow step, expected/actual, reproduction, copy, URL chain, proposed fix and reset ledger are in [the direct callback report](2026-09-16-email-callback-attempt3.md). The callback and its manual recovery both fail to consume the retained claim destination; authenticated claim submission succeeds only after explicit agent navigation.

### R1 — auth cancellation drops the originating listing (C1 / ODI-66)

- Flow step: signed-out listing → claim login → Close.
- Expected: return to the originating listing and clear auth intent.
- Actual: Close dismisses the modal and leaves the homepage. Back is needed to recover the listing.
- Repro: sign out on candidate; open /find/00000000-0000-4000-a000-000000000001; click Claim This Listing; close provider login; observe `/`.
- Severity: P2, recoverable navigation interruption.
- Proposed fix: make claim-auth cancellation return to the validated originating listing, preserving ordinary auth cancellation semantics.

### R2 — refreshing claim login hides authentication (C1 / ODI-66)

- Flow step: signed-out claim authentication → full reload.
- Expected: preserve facility and a visible authentication continuation.
- Actual: homepage appears without modal; next still points to the claim. Menu Sign In restores provider-specific prompt.
- Repro: open demo …0001 signed out; click Claim This Listing; wait for provider prompt; reload `/?next=<encoded claim>`; observe no prompt; choose Sign In to recover.
- Severity: P2, recoverable continuation interruption.
- Proposed fix: reconstruct usable auth UI from continuation state after reload while respecting explicit cancellation. Runtime evidence does not establish that an in-memory guard survived reload; root cause remains for triage.

### R3 — manual approval described as automatic domain matching (C4 / ODI-69)

- Flow step: pending domain-mismatch claim → manual approval on preview admin → provider claim confirmation/dashboard.
- Expected: neutral verified or manual-review wording; no assertion of automatic domain matching.
- Actual: claim heading says “Your claim for SoberAnchor Demo — Pending Claim is verified.” Explanation says “We matched your email domain to the listing's website, so your claim was approved automatically. Your listing now shows a verified badge.” Dashboard correctly selects …0002 and shows Verified; no automatic-domain explanation observed there.
- Repro: claim demo …0002 with controlled Gmail identity against example.com website; approve via candidate preview /admin/claims as Travis; revisit candidate /providers/claim?facility=00000000-0000-4000-a000-000000000002; read explanation; follow Go to your dashboard to confirm correct facility/status.
- Severity: P2 — misleading reason for approval; approval status propagation succeeds.
- Proposed fix: neutral wording such as “Your claim has been approved. Your listing now shows a verified badge.” Only state a verification method when persisted evidence supports it. No fix implemented.
- Attribution: this retest supersedes the earlier production-admin observation and the interim pending revisit. Admin action is user-confirmed on preview; resulting provider wording directly observed by the agent on the same preview hostname.

## Withdrawn and historical observations

**C5 / R4 — rejection allowed silent re-claim: WITHDRAWN as a candidate defect.** Original rejection was performed using production's legacy handler. The preview retest clears only …0002, preserves …0001 and the active account, and records durable rejection. Agent additionally confirmed UI support path and RPC rejection enforcement. No candidate P1 remains from this observation.

**R3 attribution history:** the original production-admin approval was excluded from candidate evidence. A subsequent full preview retest now confirms the defect as documented above; the original exclusion is no longer current.

**Process lesson:** record the full deployment URL for every actor, especially admin and provider windows, before each cross-role transition. A shared DB lets legacy production actions affect preview UI and contaminate candidate attribution.

**Deferred enhancement:** richer manual-review details (claimant name/role, verification evidence, reviewer notes, decision history). Requested by Travis; outside this pass.

## Exact reset ledger for Claude

| Record | ID / restoration |
| --- | --- |
| Controlled email | odius7+providertest1@gmail.com |
| Auth user | 59fdecb5-804e-41c6-969e-e48eb5d850f9 |
| Provider account | d0ec2915-e46d-4aa6-bf06-1a6e04a0267e |
| Claim attempts | 1 → …0002; 2 → …0001; 3 → …0002 (legacy-rejection re-claim test) |
| Rejection | 097ba286-6aeb-46bc-b1d4-1b5b957048d2 → …0002 |
| …0001 website | Restore https://example.com/soberanchor-demo from https://gmail.com |
| …0001 / …0002 baseline | Unclaimed, unverified, owner NULL, basic, not featured; demo overrides absent per agreed reset |
| …0003 baseline | Claimed, verified, owner NULL, basic, not featured; preserve pre-existing demo override |

The rejection audit's rejected_by is an existing admin identity, NOT a test identity to delete. Full record is retained in evidence JSON. Final probe independently observed only attempt IDs 1,2,3 for the test auth user and one rejection record. Claude owns the extended reset, related-row inventory and post-reset baseline verification; reset has not been run by this agent.

## Handoff / merge decision

- Triage R1/R2/R3 against the agreed corrected journey; no fixes included here. R3 preview copy retest is complete and failed; status propagation passed.
- R5 automatic continuation retest passes on 7b63098. Runtime hold for that reproduced failure is cleared, with timing/flash observation limits documented. No blanket sign-off of unrelated findings or merge action.
- Step 6 is complete at the underlying live RPC level; HTTP request replay coverage is explicitly absent.
- Claude final DB verification/reset and Travis journey review remain separate sign-offs. Premium appearance, billing, ODI-62 and ODI-50 are outside this pass.
