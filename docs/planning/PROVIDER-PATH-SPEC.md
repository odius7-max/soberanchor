# Provider Path — Build Spec v2 (post-review)

*Claude, 2026-09-18. Supersedes `provider-path-plan.md` §-for-§ where amended. Normative inputs, all in `docs/planning/`: `provider-path-plan.md` (v1), `provider-path-plan-review.md` (Codex amendments A1–A4, ADOPTED IN FULL except one fixture correction below), `entry-point-map.md`, `competitor-door-teardown.md`. Covers ODI-78 + ODI-76 + ODI-66 R1/R2. One branch (suggested: `feat/provider-path`, slug ≤ 26 chars per the Vercel alias limit). Ground-truth every file at current main before editing.*

## 0. Core separation (A1 — the spine of this spec)

Four distinct concepts; never conflate:

1. **Entry intent** — where the user came in (signup context). A bootstrap hint only.
2. **Workspace state** — persisted per user: `primary_workspace` ('member'|'provider', default 'member', a UX preference NEVER an authorization role), `provider_started_at`, `recovery_enabled_at` (timestamps; null = not enabled), `last_workspace`.
3. **Setup completion** — existing `onboarding_completed` stays recovery-only. Provider setup completion tracked independently (`provider_setup_completed_at` or equivalent).
4. **Authorization** — active provider_account + facility ownership, exactly as today. Workspace state grants ZERO access to facilities or leads; a suspended account is never reactivated by any workspace write; no role/workspace write may bypass the atomic claim endpoint or its rate limit.

**Storage:** preferred home is `user_profiles` — but FIRST verify its SELECT RLS policies. If profiles are readable beyond the owner, put workspace/setup fields (including the pre-claim `organization_name`) in a new self-only `user_setup` table instead. Implementer verifies live policies and states the choice in the build report.

**All writes via one idempotent, authenticated `initializeWorkspace`-style operation**, invoked only from (a) recorded new-signup intent or (b) explicit user action. Never from a GET/render (links get prefetched and revisited). Transition rules exactly per the review's A1 table — highlights: existing members following claim links keep member primary and full recovery state (provider workspace enables on explicit action, dual by addition); existing providers signing in generically never see the recovery first-setup modal because a display name is missing; refresh/prefetch/rejected claim/malformed link never overwrite anything.

**Wrong-door semantics (two different corrections):** "I chose the wrong signup path" during first setup with zero data written in the origin workspace → switch `primary_workspace` and clear the unused enablement (a correction, not dual). "I want both" (provider opts into recovery, or member claims a facility) → additive enablement, primary unchanged (dual by capability).

## 1. Continuations (A3)

- Allowlist adds **exact `/providers/welcome`, zero query parameters**. No prefix widening. Same shared validator across middleware/auth/callback; all existing rejection rules intact.
- Add **destination classification**: `claim` vs `provider-welcome`. Fix the two stale assumptions: `isClaimContinuation()` must not classify welcome as claim; AuthModal's claim-copy trigger must key on classification, not `continuation !== null`. Welcome gets generic provider-auth copy (never implies a facility was selected).
- Cancel destinations, deterministic: welcome → `/for-providers`; facility claim → `/find/<UUID>` (existing `claimCancelHref()` semantics — **this IS the R1 fix**; no new `from`/referrer carrier); generic claim → `/for-providers`.
- **R5 preservation (non-negotiable):** `/auth/continue` stays ungated and the sole callback navigation owner; 3s hard-nav fallback and 8s no-session recovery intact; `next` preserved in manual/error exits; NO profile writes, dashboard redirects, or query cleanup inside the callback's session event — workspace initialization happens at the destination via the idempotent op; `/providers/welcome` is an ordinary authenticated destination (auth-guarded with continuation-preserving redirect), NOT a second callback owner, NOT auto-added to SELF_ROUTING_PATHS.
- **R2**, scoped: reconstruct the auth prompt only on intended entry surfaces (never on `/auth/continue` while PKCE settles); session resolution completes before choosing signed-in/out behavior; ONE owner for cancellation/query cleanup (audit the existing close-effect `next` removal vs any new replacement — no races); cancellation never immediately reopens the R2 prompt; successful auth never triggers cancellation navigation; occurrence identity includes validated destination + auth mode so claim/welcome intents can't conflate; cancel → Back → retry keeps working.

## 2. Entry matrix (A2 — full coverage)

| ID | Build requirement |
|---|---|
| E01/E17 | Quiet signup-mode link "Here for your facility? Provider sign-up →" swaps modal intent via a **single modal intent/continuation update operation** (the modal snapshots `next` once — don't mutate URL under it). A specific claim continuation always outranks generic welcome; login/signup toggles retain it. Not a build dependency for login mode. |
| E08 | Three authenticated states: provider/dual → "Go to your dashboard" (facility mode); provider-intent-no-claim → welcome/empty workspace; member-only → explicit "Set up a provider account" action. Signed-out → provider-context modal (claim `next` if in flight, else welcome). No modal in any authenticated state; no wrong-CTA flash during auth loading (render neutral until session resolves). |
| NEW door | /for-providers "Create your provider account →" — session-aware (signed-in users are routed, never asked to sign up again); in-flight claim outranks welcome. |
| E09 | Email-request form and its honest mailto handoff RETAINED as-is; it is not the signup door. "My facility isn't listed" from the welcome funnel lands here; no implication it creates a listing or account. |
| E10/E11 | Split: specific claims keep their facility and their established uninterrupted path (name setup deferrable for direct claims — least disruptive). Generic `/providers/claim` currently bounces existing owners to the dashboard: the welcome funnel's "add another location" must run a facility search that selects a UUID *before* navigating, not blind-hand-off to the generic route. |
| E14 | `/providers/login` → provider-context modal; preserves a supplied valid claim `next`, else exact welcome; routes signed-in users without a modal. |
| E15 | `/providers/dashboard`: add provider-intent/no-claim handling (welcome/empty shell); preserve explicit facility selection, ownership errors, and inactive-account handling as distinct states. |
| E16 | Generic protected routes: post-auth default honors the workspace resolver (§3) even without `next`. Do NOT build arbitrary deep-link continuation. |
| E18 | Password reset landing uses the same workspace resolver; covers provider-intent/no-claim users; no reset-specific role rules. |
| E02–E06, E12, E13 | Member experience unchanged AND regression-checked: existing provider-only users entering these shared doors are never reclassified or recovery-onboarded. |
| E07 | Nav dropdown, Profile, Settings become workspace-appropriate too — the label change alone doesn't hide recovery fields from a provider's Profile/Settings. |

## 3. Onboarding + shells (A4)

- **Provider welcome** (`/providers/welcome`): name + optional organization (stored per §0's verified home; on a later claim, map saved values into the provider account through the existing server operation's contact/organization fields — trusted server-side mapping, never a duplicate provider_account) → funnel: facility search → existing claim flow; "not listed" → E09 form.
- **Both recovery onboarding implementations** get the quiet switch: the modal "Almost There!" first-setup AND the dashboard OnboardingCard (they are separate code paths; the email callback bypasses the modal one).
- **Fix `intent=onboard`:** the provider shell's "Start your recovery journey →" must actually launch recovery onboarding (consumer implemented), set `recovery_enabled_at`, preserve provider primary and all facilities.
- **Workspace resolver — one function, one precedence:** validated pending continuation → explicit eligible workspace/intent (URL `mode=`) → persisted eligible `last_workspace` → `primary_workspace` → safe eligible fallback. Facility authorization and pending/rejected/suspended status checked separately before any private data loads.
- **DashboardShell sync:** current one-time `useState(defaultMode)` must reconcile with later prop/URL changes, back/forward, and the legacy `tab=sponsees` effect; define valid modes explicitly; sponsor eligibility preserved (decide: `last_workspace` covers member/provider; sponsor mode remains a member-mode sub-state). Never persist the first default render as a user-chosen last mode before preferences load; persist only intentional changes, keyed per auth user (no shared localStorage key).
- **`isProvider` split:** current AuthContext/dashboard boolean = "active provider account." Introduce a separate "provider workspace available" signal for the empty/setup shell. The existing boolean keeps guarding leads/edit/facility data. Never merge them.
- Provider setup writes refresh both server-rendered dashboard and client AuthContext (no stale nav); neutral loading fallbacks so a provider's first render never flashes recovery onboarding; account label shows organization when present, else name ("Provider | {org or name}").

## 4. Migration & fixtures

- Snapshot before/after. By verified UUID: auth `0bc90dee-5f79-4c7a-a6b4-c75894419451` / provider_account `17cc7fa8-6080-42b0-b83b-94b6257405e2` (the standing demoprovider) → `primary_workspace='provider'`, provider enabled, recovery NOT enabled (its recovery-shell artifacts from the cold signup may be left; enablement stays null until opted in). All other existing users → member primary, recovery enabled, untouched otherwise. Inventory first for any other provider/dual accounts rather than assuming one. Extend the ODI-74 baseline ledger with the new fields. Claude runs the migration; Claude Code ships schema only.
- **Fixture correction to review gate 5:** …0003 is NOT ownerless — it is deliberately owned by the demoprovider (multi-location baseline, ODI-74, 2026-09-17, post-dating the review's pinned SHA). Gate 5 becomes: preserve the ODI-74 baseline exactly (…0001 unclaimed/basic; …0002 enhanced + …0003 premium both owned by demoprovider; tier/media/insurance staging intact). The rest of gate 5 stands: fixture names are not authorization data.

## 5. Acceptance

All eight of the review's regression gates (with gate 5 as corrected above), plus plan v1 §8's headline cases, plus: no wrong-CTA flash on /for-providers during session loading; provider Profile/Settings show no recovery fields; prefetching /providers/welcome while signed in as a member changes nothing; the R5 email-callback trace (welcome variant AND claim variant) passes end-to-end with a fresh identity. `npm run build` passes; preview URL; three-way verification before merge (Astra runtime, Claude DB/fixtures, Claude Code build).

## 6. Out of scope

ODI-77 rework · ODI-53 editor · invitation `next` continuation (separate issue) · pricing/tier copy · Sponsor Pro surfaces · any change to claim ownership, RLS, or billing models.
