# Provider-path runtime fixes — Claude Code handoff

Tested preview: https://soberanchor-git-feat-provider-path-odius7-maxs-projects.vercel.app

Tested SHA: `d49ef3cc65026e8baa03773fc26ee4cf710ff25d`. Detailed repros and URL chains: `docs/audits/2026-09-18-provider-path-d49ef3c-gates.md`.

Travis reports the first three fixes are already in progress. This file records the additional P1 for the same fix commit; it does not claim those fixes have landed.

1. **PP-R1 (P2):** claim-auth cancel must return to the deterministic listing destination, not strip `next` and remain on the homepage.
2. **PP-R2 (P2):** signed-out reload with valid claim `next` must restore a visible way forward, scoped away from `/auth/continue` and respecting cancellation.
3. **PP-COPY (P2):** provider signup must use provider reassurance instead of the recovery/journal/sponsor paragraph.
4. **PP-DEFAULT (P1): provider-first signup persists member-primary.** This is a merge blocker, not a resolver-display fix.

## Fix 4 evidence

Fresh welcome signup `odius7+providertest5@gmail.com`, auth UUID `39113c5f-8ba7-40be-b6a4-dc104ccdeb3c`, completed email confirmation and provider setup. Callback correctly reached `/providers/welcome`. After saving setup, `/dashboard` displayed recovery onboarding, Journal/Step Work and a sobriety-date prompt without recovery opt-in.

Claude's DB verification, relayed by Travis:

- `user_setup.primary_workspace='member'` — incorrect for this fresh provider-intent signup.
- Provider started and setup completed both recorded at `22:12:52` (timezone not supplied).
- `recovery_enabled_at=NULL`.
- Organization `TEST Provider Path QA`.
- Profile display name `TEST Provider Five`; recovery `onboarding_completed=false`.

## Required correction

Trace provider signup intent across account creation, email confirmation and destination initialization. At the tested SHA, AuthModal signup supplies the email redirect but no provider-intent metadata, and `complete-provider-setup` enables provider/setup completion without choosing a primary workspace. Diagnose the full missing bootstrap wiring; changing the resolver to ignore member-primary would hide the cause and break established members.

Apply preference initialization through the existing authenticated single writer, with trustworthy recorded new-signup intent and idempotent semantics. Only a fresh provider-intent bootstrap sets provider-primary. **A missing user_setup row alone is not evidence of a new provider:** existing row-less accounts are legitimate legacy members. Existing members entering welcome or claiming a facility must keep member-primary and their recovery state. Preserve the callback as the sole navigation owner; do not introduce preference writes into its session event or any GET/render. Preserve existing setup and claim authorization rules.

Include this in the same fix commit as the other three, as requested. Do not repair test5's row as a substitute for verifying the product fix. Claude owns that controlled repair after fix verification; Astra will then re-check the resolved dashboard. A repaired historical row proves rendering only—fresh provider-intent bootstrap still needs its own verification.

## Retest essentials

- Fresh provider signup via welcome and via specific claim: provider-primary, recovery not enabled, no recovery prompts by default.
- Callback retains exact destination and still navigates automatically.
- Repeated initialization is a no-op for established state.
- Existing row-less member entering provider setup/claim retains member primary; additive enablement only.
- Test5 after Claude's separately recorded repair: facility/empty provider default; setup/name/organization preserved.
- Preserve …0001 test6 pending claim and …0002/…0003 demoprovider baseline until Claude resets them.

Separate recorded observation **PP-NAME (P2):** provider welcome initially prefilled “Friend.” Track explicitly; it is not resolved merely by changing primary workspace.
