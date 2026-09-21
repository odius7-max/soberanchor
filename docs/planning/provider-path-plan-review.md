# Provider-path plan v1 — amendments for the build spec

Reviewed against `provider-path-plan.md`, both discovery inputs, and source at **76092b370c8231ae5c8182537571f4cdc955da32**. This is a source/design review, not runtime verification or a live database-policy check. No code, accounts or fixtures changed.

**Disposition:** agree with the direction and one-branch scope. Amend the state transitions, entry coverage and continuation semantics before producing the build spec. The plan currently conflates entry intent, default workspace, onboarding completion and authorization in ways that could change an existing member's journey or expose an inappropriate provider shell.

## A1 — §2: retain a profile preference, but separate it from capabilities

`user_profiles` is a reasonable home for a default-workspace preference. Prefer a name such as `primary_workspace` over `account_role`; if keeping the proposed name, define it explicitly as a UX preference, never an authorization role. A `member | provider` enum plus no `dual` value is fine. Auth `user_metadata` should not become the authoritative role store: a signup-intent hint can live there, but profile state is the canonical application state. Avoid maintaining two competing defaults.

The proposed *existing* feature-presence flags are insufficient:

- A member can begin provider setup without completing a claim. There is then neither a provider account nor a provider-primary role to represent that additional workspace.
- A provider can opt into recovery but leave setup unfinished. `onboarding_completed=false` cannot distinguish this from never opting in.
- The current recovery card can mark onboarding complete when skipped with a name, and the modal can save a name without marking it complete. Completion is not a reliable consent/intent flag.

**Amendment:** persist workspace enablement separately from completion, for example `provider_started_at` and `recovery_enabled_at` (booleans are also sufficient), plus `last_workspace`. Members get recovery enablement automatically, without a new question. New provider-first accounts get provider enablement and no recovery enablement. Explicit opt-in enables the other workspace; finishing setup changes completion, not primary identity. This state is non-authoritative for access to facilities or leads.

Keep existing `onboarding_completed` as recovery setup completion; do not reuse it for provider setup. Define provider setup completion independently if name/organization is an obligatory resumable step. The organization field also needs a specified storage home: no provider account exists before a first claim. A self-only setup/preferences record is an alternative if expanding `user_profiles` would expose these fields through existing profile SELECT policies. Verify actual policies before choosing; this review has not verified live RLS.

### Required transition rules

| Event | Recommended transition |
|---|---|
| New generic signup | Member-primary; recovery enabled; provider setup not started |
| New provider/claim signup | Provider-primary; provider workspace enabled; recovery not enabled |
| Existing member follows provider/claim link | Preserve member primary and recovery state. Enable provider workspace on explicit setup/claim action; route to requested claim without changing primary identity |
| Existing provider signs in through generic nav | Preserve provider state; no recovery first-setup modal merely because the name is missing |
| Provider explicitly starts recovery | Enable recovery and show incomplete recovery setup; preserve provider primary and all facilities |
| Member explicitly chooses the wrong-door correction during initial setup | Switch default to provider, without deleting any existing recovery data. Specify whether unused recovery enablement is removed; do not infer this from a URL |
| Revisit welcome, refresh, prefetch, rejected claim or malformed facility link | No unconditional primary-role overwrite; no loss of existing capabilities |

“Write provider on claim-page arrival” conflicts with the plan's own member-plus-claim dual-role example. Also, an authenticated GET/render should not silently mutate preference: links can be prefetched and revisited. Define an authenticated, idempotent initialization/update operation, invoked from an explicit action or a recorded new-account signup intent. Distinguish default `member` from an intentionally initialized member state; do not guess newness from a missing name. A validated signup metadata hint is one possible bootstrap mechanism, **not** permission to own facilities.

Migration must use verified current auth UUIDs, not the ambiguous name “demoprovider.” Inventory existing provider accounts and recovery state first. Preserve historical members' recovery access; handle any other existing provider/dual accounts explicitly rather than assuming only one exists. Record before/after values and rollback/reset fields. Historical test IDs may already have been deleted.

## A2 — §3: entry-matrix amendments

| Map ID | Amendment |
|---|---|
| E01 / E17 | AuthModal snapshots `next` only once per opening. Changing only the URL or the modal's copy while it remains open will not update its stored continuation. Specify a single modal intent/continuation update operation for the quiet provider switch. Preserve a specific claim over generic welcome; login/signup toggles must retain it. |
| E08 | “Signed-in” is not synonymous with “provider.” Define three states: existing provider/dual → explicit facility dashboard; provider intent with no claim → welcome/setup or empty provider workspace; member-only → explicit provider-setup action. No login modal in any authenticated state. During auth loading, avoid briefly exposing the wrong CTA. |
| NEW | Provider signup door must also be session-aware. Signed-in users should not be asked to create another account. A claim already in progress outranks the generic welcome target. |
| E09 | Explicitly retain the existing email-request form and its honest mail-app handoff. It is not the new signup door. Define the destination for “My facility isn't listed” and avoid implying the email request automatically creates a listing or account. |
| E10 / E11 | Split these: specific claim must retain its facility; generic `/providers/claim` currently bounces existing owners to facility dashboard. A new welcome funnel for an existing owner seeking an additional location cannot blindly hand off to that generic route. Preserve preselected claim links and specify how a second-location search selects a UUID before navigation. |
| E14 | Provider login alias should preserve a valid specific claim if supplied, otherwise use exact welcome continuation. It must also route signed-in users without a modal. |
| **E15 — missing** | `/providers/dashboard` currently requires an active provider account before defaulting to facility view. Add provider-intent/no-claim handling, preserve explicit facility selection and ownership errors, and keep inactive-account handling distinct. |
| **E16 — missing** | Generic protected routes still return through required-auth. Their post-auth default must honor persisted workspace state even without `next`. Do not accidentally broaden this project into arbitrary deep-link continuation. |
| **E18 — missing** | Password reset currently identifies providers through provider-account existence. Cover provider-first/no-claim users after reset with the same landing resolver. No new reset-specific role rules. |
| E02–E06 / E12 / E13 | No new signup friction or invitation work is needed. However, existing provider-only users arriving through these doors must not be reclassified or recovery-onboarded solely by generic sign-in. “Unchanged” should describe the member experience, not exempt these shared callers from regression checks. |
| E07 | Nav/footer provider marketing links remain intact. Signed-in nav dropdown, Profile and Settings destinations need role-appropriate behavior too; changing the account-button label alone does not hide recovery fields. |

The wrong-door escape in §4 must cover **both** the modal's “Almost There!” first setup and the dashboard's OnboardingCard. They are separate implementations and the email callback may bypass the former. Also distinguish “I chose the wrong signup path” from “I want both workspaces”: converting every mistaken provider signup into a permanently dual account is not a symmetric correction.

## A3 — §2/§6/§9: extend continuation types, not their meaning

Approve exact `/providers/welcome` with **no query parameters**, alongside the existing exact claim shapes. Do not allow a `/providers/*` prefix. Keep canonical reconstruction, origin/backslash/fragment rejection, UUID validation, duplicate-key rejection and the same validator shared across middleware, auth and callback.

Two current assumptions require explicit changes:

1. `isClaimContinuation()` currently means “any validated continuation”; it would incorrectly classify welcome as claim after widening validation.
2. AuthModal uses `continuation !== null` for claim copy. Welcome needs generic provider-auth copy, without claiming that a facility was already selected.

Use destination classification (`claim` versus `provider-welcome`) and separate broad provider context from specific claim context. Welcome cancel → `/for-providers`; facility claim cancel → `/find/<UUID>`; generic claim cancel → `/for-providers`.

### R5 preservation

- Keep `/auth/continue` ungated and the **sole callback navigation owner**. Keep both session-event and existing-session paths, the three-second hard-navigation fallback, the eight-second no-session recovery, and preserved `next` in the manual/error exits.
- `/providers/welcome` is a normal authenticated destination. Add its auth guard and continuation-preserving redirect, **not a new email callback**. The current middleware only gates provider claim/dashboard paths.
- No automatic addition to `SELF_ROUTING_PATHS` is required merely because welcome is a destination. `/auth/continue` remains excluded from AuthHydrationListener. If welcome is deliberately designed to consume auth callback signals and own navigation, it would need that exclusion—but avoid introducing that second owner.
- Do not introduce profile writes, generic dashboard redirects, or query cleanup inside the callback's session event. Settle navigation first; initialize provider setup at the destination through the specified idempotent operation. Preserve `code`/`next` until the callback consumes them.
- R2 reconstruction must be limited to intended entry surfaces, not a global “any page with next opens a modal” rule. Otherwise it could open auth on `/auth/continue?next=…` while PKCE exchange is settling. Loading/session resolution must finish before deciding signed-out versus signed-in behavior.
- Define one owner for modal cancellation/query cleanup. The current close effect removes `next` with a router replacement; a second R1 replacement could race it. Cancellation must not immediately reopen the R2 prompt. Successful auth must not trigger cancellation navigation.
- Keep the handled-occurrence reset that enables cancel → Back → retry. Include the validated destination and auth mode in occurrence identity so different claim/welcome intents cannot be conflated.

For **R1**, use the existing deterministic `claimCancelHref()` semantics. A valid facility already tells us the listing URL. No new arbitrary `from`/referrer carrier is needed. Referrers may be absent or external, and the old C1 wording should not supersede the current deterministic claim-page exit.

## A4 — §5: define one workspace resolver and synchronize it

Recommended precedence: **validated pending continuation → explicit eligible workspace/intent → persisted eligible last workspace → primary workspace → safe eligible fallback**. Facility authorization and pending/rejected/suspended status are checked separately before private data is loaded.

Current `DashboardShell` initializes local `mode` once with `useState(defaultMode)`. A later prop/URL change or `router.refresh()` does not automatically reset it. Also, dashboard parsing currently accepts only `mode=facility`, and a legacy `tab=sponsees` effect can change mode. The build spec must define valid modes, account switching, back/forward behavior, and reconciliation of explicit navigation with mounted state. Do not persist the first default render as a user-selected last mode before preferences load.

Persist intentional mode changes per auth user, never in a global localStorage key shared by different accounts. Decide whether last workspace is only member/provider or also sponsor mode; preserve sponsor eligibility either way. Explicit claim/dashboard facility links must win over a remembered recovery mode. An invalid or unowned explicit facility must retain its error, never silently select a different owned location.

Use separate concepts for **provider workspace available** and **active provider account with authorized facility**. Both AuthContext and dashboard currently derive `isProvider` from an active provider account. Replacing that boolean wholesale with `account_role=provider` would be unsafe: the new role must allow the empty setup shell, not lead/edit access, and must not reactivate a suspended account.

Provider setup must refresh both the server-rendered dashboard and client AuthContext profile fields; otherwise nav/default-shell state can remain stale. Define neutral loading and name fallbacks so a provider's first render does not flash recovery onboarding. Decide whether the label displays person or organization and where that organization is stored before first claim. The current claim client submits only `facility_id`; its server operation already accepts contact/organization fields, so specify trusted mapping of saved setup values if they should populate the provider account. Do not create duplicate provider accounts simply to make the nav work.

## Direct answers to §9

1. **Profiles over auth metadata:** yes for application workspace preferences, after checking actual RLS and missing-profile creation. Metadata may carry initial intent; it must not grant facility privileges. Add separate enablement/completion semantics as A1 describes.
2. **Welcome allowlist:** exact path, zero queries. Keep claim validation unchanged; classify destination types explicitly.
3. **Remember last mode:** compatible in principle, but conflicts with current one-time state initialization and legacy sponsor-tab selection unless A4 defines synchronization and precedence.
4. **Quiet link in login:** signup-only is acceptable for switching *signup intent*, provided generic sign-in resolves the existing user's persisted workspace and signed-in navigation offers provider setup. A quiet provider-login shortcut can be useful for users without established provider state; it must not silently change primary role. Do not make this extra copy a build dependency.
5. **SELF_ROUTING_PATHS:** keep `/auth/continue` as the owner. Welcome needs auth guarding and routing coverage, not callback ownership or an automatic exemption. Preserve all R5 fallback behavior.

## Claim and fixture regression gates for the build spec

1. New provider email confirmation via welcome and via specific claim: correct continuation automatically, no false failure copy, no pathname-only flash. Repeat already-authenticated `/?auth=required&next=…`, reload-only `?next=…`, manual fallback, cancelled auth, and Back/retry. Existing callback timing rules remain intact.
2. Existing recovery member claims a synthetic facility: primary identity and recovery data retained; specific facility wins for that navigation; subsequent default/last-mode rules behave as specified.
3. New provider with no provider account: welcome, partial setup, reload, generic sign-in, reset return and empty dashboard remain provider-oriented without private facility access.
4. Existing same-owner verified retry never downgrades; pending claims never gain leads/edit access; rejection remains facility-specific and durable; inactive account stays inactive. No role update may bypass the atomic claim endpoint or its rate limit.
5. Preserve ownerless flags-only fixture …0003: role migration must not attach it to the demo provider or make it claimable. Preserve tier/media overrides and …0001/…0002 ownership/state except for explicitly staged synthetic test transitions. Fixture *names* are not authorization data.
6. Specific claims still work for a second location; no new welcome/profile-completion redirect may discard the UUID or intercept an existing persisted pending/verified/rejected outcome. Define whether name setup can be deferred for direct claims; keeping the established direct-claim path uninterrupted is the least disruptive choice.
7. Snapshot current synthetic user IDs and profile values before migration; extend the reset ledger for workspace/default/preference/setup fields. Do not reuse old test IDs without checking they still exist. No broad reset of all user profiles.
8. Recovery regressions: generic signup and email callback, modal and card onboarding, saved favorites, invitation entry, sponsor modes, direct protected routes. Provider opt-in to recovery must survive partial setup, refresh, sign-out/in and skip without erasing provider state.

These amendments leave claim ownership and billing models unchanged. They make the new provider-before-claim experience explicit without reintroducing the continuation races or rewriting users' established recovery identity.
