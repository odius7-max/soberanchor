import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Workspace } from './workspace'

/**
 * Signup-intent bootstrap (PP-DEFAULT).
 *
 * The bug this exists to fix: a provider-first signup ended up member-primary.
 * Three things were missing at once — signUp recorded no intent, the `signup`
 * bootstrap action had no caller anywhere in the app, and
 * `complete-provider-setup` set enablement without ever choosing a primary
 * workspace. So every provider landed on the `member` column default.
 *
 * The deliberate non-fix: making the resolver treat "provider_started_at set"
 * as provider-primary. That would hide the missing wiring and, worse, would
 * flip established members to provider-primary the moment they claimed a
 * facility — the exact reclassification A1 forbids.
 *
 * ── Why the hint is trustworthy ──
 * The intent lives in auth `user_metadata`, written by supabase-js at signUp
 * and read back here from a SERVER-SIDE getUser(). It is a bootstrap hint and
 * nothing more: it never grants facility or lead access, and it is only ever
 * consulted for an account that has no established state.
 *
 * ── Why a missing user_setup row is not enough ──
 * Every legacy account is row-less. Row absence alone would classify the
 * entire existing member base as new providers. So the hint must be present
 * AND the row absent AND the account free of recovery-personal data. Any one
 * of those failing means "not a fresh provider signup", and we fall back to
 * additive enablement with primary untouched.
 */

export const PROVIDER_SIGNUP_INTENT = 'provider'

/** Reads the signup hint from the server-verified user object. */
export function signupIntentOf(user: User): Workspace | null {
  const raw = (user.user_metadata as Record<string, unknown> | null)?.signup_intent
  return raw === 'provider' ? 'provider' : raw === 'member' ? 'member' : null
}

/**
 * True only for a genuinely fresh provider-intent account.
 *
 * `hasSetupRow` is passed in because callers have usually already loaded it.
 */
export async function isFreshProviderSignup(
  admin: SupabaseClient,
  user: User,
  hasSetupRow: boolean
): Promise<boolean> {
  if (hasSetupRow) return false                              // established state already
  if (signupIntentOf(user) !== PROVIDER_SIGNUP_INTENT) return false

  // Second, independent guard: an account carrying recovery-personal data is a
  // member no matter what a stale hint says. Same blocker set as the wrong-door
  // correction, minus saved listings (generic bookmarks).
  const [{ data: prof }, { count: checkIns }, { count: journals }, { count: relationships }] =
    await Promise.all([
      admin.from('user_profiles').select('onboarding_completed, sobriety_date').eq('id', user.id).maybeSingle(),
      admin.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      admin.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      admin.from('sponsor_relationships').select('id', { count: 'exact', head: true })
        .or(`sponsor_id.eq.${user.id},sponsee_id.eq.${user.id}`),
    ])

  return !(
    prof?.onboarding_completed === true ||
    !!prof?.sobriety_date ||
    (checkIns ?? 0) > 0 ||
    (journals ?? 0) > 0 ||
    (relationships ?? 0) > 0
  )
}
