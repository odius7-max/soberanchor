/**
 * Workspace state — PROVIDER-PATH-SPEC §0 / §3 (ODI-78).
 *
 * The spec's spine is that four things are NOT the same thing, and this module
 * exists so they can't be conflated:
 *
 *   1. Entry intent      — where someone signed up. A bootstrap hint, nothing more.
 *   2. Workspace state   — `UserSetup` below. A UX PREFERENCE. Grants no access.
 *   3. Setup completion  — recovery completion stays `user_profiles.onboarding_completed`;
 *                          provider completion is `provider_setup_completed_at` here.
 *   4. Authorization     — active provider_account + facility ownership. Untouched
 *                          by anything in this file.
 *
 * Nothing here may be used to decide whether a user can see facilities or leads.
 * The existing `isProvider` ("active provider account") boolean keeps doing that;
 * see `providerWorkspaceAvailable()` for the strictly weaker shell signal.
 *
 * Storage home: `public.user_setup`, self-read only, writes exclusively through
 * POST /api/workspace/initialize. See the migration for why this is not in
 * user_profiles (sponsor-readable AND sponsor-writable).
 */

export type Workspace = 'member' | 'provider'

/** Modes the dashboard may resolve to. Sponsor is a member-mode sub-state. */
export const VALID_MODES = ['my', 'sponsees', 'facility'] as const
export type DashboardMode = (typeof VALID_MODES)[number]

export interface UserSetup {
  user_id: string
  primary_workspace: Workspace
  last_workspace: Workspace | null
  provider_started_at: string | null
  recovery_enabled_at: string | null
  provider_setup_completed_at: string | null
  organization_name: string | null
}

/** An absent row reads as a plain member — which is what every existing user is. */
export const DEFAULT_SETUP: Omit<UserSetup, 'user_id'> = {
  primary_workspace: 'member',
  last_workspace: null,
  provider_started_at: null,
  recovery_enabled_at: null,
  provider_setup_completed_at: null,
  organization_name: null,
}

export function isWorkspace(v: unknown): v is Workspace {
  return v === 'member' || v === 'provider'
}

/**
 * "Provider workspace available" — may this user see the provider SHELL?
 *
 * Deliberately weaker than authorization (§0 concept 4, A4). True for someone
 * who started provider setup but has never claimed anything; they get an empty
 * workspace, never lead or edit access. NEVER substitute this for the active
 * provider_account check.
 */
export function providerWorkspaceAvailable(
  setup: Pick<UserSetup, 'primary_workspace' | 'provider_started_at'> | null,
  hasActiveProviderAccount: boolean
): boolean {
  if (hasActiveProviderAccount) return true
  if (!setup) return false
  return setup.primary_workspace === 'provider' || setup.provider_started_at !== null
}

/** Recovery workspace is available to anyone who hasn't opted out of it. */
export function recoveryWorkspaceAvailable(
  setup: Pick<UserSetup, 'primary_workspace' | 'recovery_enabled_at'> | null
): boolean {
  if (!setup) return true                       // legacy rows: plain members
  if (setup.recovery_enabled_at !== null) return true
  return setup.primary_workspace === 'member'
}

export interface ResolveInput {
  setup: UserSetup | null
  /** Validated pending continuation destination, if one survived validation. */
  pendingContinuation: 'claim' | 'provider-welcome' | null
  /** Explicit `?mode=` from the URL, already narrowed. */
  explicitMode: DashboardMode | null
  hasActiveProviderAccount: boolean
  isSponsor: boolean
}

/**
 * The ONE workspace resolver (A4). Precedence, highest first:
 *
 *   validated pending continuation
 *   → explicit eligible workspace/intent (?mode=)
 *   → persisted eligible last_workspace
 *   → primary_workspace
 *   → safe eligible fallback
 *
 * Eligibility is checked at every step, so a stale preference can never select
 * a workspace the user can't currently use. Facility authorization and
 * pending/rejected/suspended status are checked SEPARATELY by the caller before
 * any private data loads — this function only picks a shell.
 */
export function resolveWorkspaceMode(input: ResolveInput): DashboardMode {
  const { setup, pendingContinuation, explicitMode, hasActiveProviderAccount, isSponsor } = input
  const providerOk = providerWorkspaceAvailable(setup, hasActiveProviderAccount)
  const recoveryOk = recoveryWorkspaceAvailable(setup)

  const eligible = (m: DashboardMode): boolean =>
    m === 'facility' ? providerOk : m === 'sponsees' ? isSponsor : recoveryOk

  // 1. A continuation the user is actively following outranks every preference.
  if (pendingContinuation && providerOk) return 'facility'

  // 2. Explicit navigation (?mode=) — honoured only if currently eligible.
  if (explicitMode && eligible(explicitMode)) return explicitMode

  // 3/4. Remembered intentional choice, then the standing preference.
  for (const candidate of [setup?.last_workspace, setup?.primary_workspace]) {
    if (candidate === 'provider' && providerOk) return 'facility'
    if (candidate === 'member' && recoveryOk) return 'my'
  }

  // 5. Safe eligible fallback.
  if (recoveryOk) return 'my'
  if (providerOk) return 'facility'
  return 'my'
}
