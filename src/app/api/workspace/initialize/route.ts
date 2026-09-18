import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_SETUP, isWorkspace, type UserSetup, type Workspace } from '@/lib/workspace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/workspace/initialize — the ONE writer for workspace state
 * (PROVIDER-PATH-SPEC §0, ODI-78).
 *
 * Every rule in §0 is enforced here rather than at call sites:
 *
 *  - POST only. A GET/render must never mutate preference: provider links get
 *    prefetched and revisited, and the plan's original "write provider on
 *    claim-page arrival" would have reclassified an existing member who merely
 *    hovered a link.
 *  - Idempotent. Every action is safe to repeat; refresh, prefetch, a rejected
 *    claim and a malformed link all converge on "no change".
 *  - Never widens authorization. Nothing written here grants facility or lead
 *    access, reactivates a suspended provider account, or substitutes for the
 *    atomic claim endpoint and its rate limit. Authorization stays with
 *    provider_accounts + facility ownership.
 *  - Never destroys recovery data. The wrong-door correction switches a
 *    preference and clears an UNUSED enablement; it deletes nothing.
 *
 * Writes use the service role because `user_setup` intentionally has no
 * INSERT/UPDATE policies — that is what makes this route the only writer.
 * The ACTOR always comes from the session, never from the body.
 */

type Action =
  | 'signup'                    // record new-signup intent (first row only)
  | 'enable-provider'           // explicit: "set up a provider account"
  | 'enable-recovery'           // explicit: "start your recovery journey"
  | 'correct-wrong-door'        // "I chose the wrong signup path"
  | 'complete-provider-setup'   // welcome form submitted
  | 'remember-workspace'        // persist an INTENTIONAL mode change

const ACTIONS: Action[] = [
  'signup',
  'enable-provider',
  'enable-recovery',
  'correct-wrong-door',
  'complete-provider-setup',
  'remember-workspace',
]

const MAX_ORG_LEN = 120

function bad(message: string, code = 'invalid_input', status = 400) {
  return NextResponse.json({ error: message, code }, { status })
}

/** Same-origin check, matching the claim endpoint: a session cookie is not proof of origin. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return false
  try {
    const u = new URL(origin)
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return bad('That request was not valid.')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in.', code: 'unauthenticated' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return bad('That request was not valid.')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('That request was not valid.')
    const b = body as Record<string, unknown>

    const action = b.action
    if (typeof action !== 'string' || !ACTIONS.includes(action as Action)) return bad('Unknown action.')

    const admin = createAdminClient()

    // Current state. An absent row is a plain member — which every legacy user is.
    const { data: existing } = await admin
      .from('user_setup').select('*').eq('user_id', user.id).maybeSingle()
    const setup = (existing ?? { user_id: user.id, ...DEFAULT_SETUP }) as UserSetup
    const now = new Date().toISOString()

    const patch: Partial<UserSetup> & { updated_at: string } = { updated_at: now }

    switch (action as Action) {
      case 'signup': {
        // Bootstrap from recorded signup intent. FIRST ROW ONLY — re-running it
        // for an existing user must never rewrite their established identity
        // (A1: an existing member following a provider link keeps member primary).
        if (existing) return NextResponse.json({ ok: true, setup, changed: false })
        const entry = isWorkspace(b.entry) ? (b.entry as Workspace) : 'member'
        patch.primary_workspace = entry
        if (entry === 'provider') patch.provider_started_at = now
        else patch.recovery_enabled_at = now       // members get recovery without being asked
        break
      }

      case 'enable-provider': {
        // Additive ("I want both"). Primary deliberately unchanged: a member who
        // claims a facility stays member-primary — dual by capability.
        if (setup.provider_started_at) return NextResponse.json({ ok: true, setup, changed: false })
        patch.provider_started_at = now
        break
      }

      case 'enable-recovery': {
        // The other half of dual-by-addition. Preserves provider primary and,
        // per the spec, every facility the user owns.
        if (setup.recovery_enabled_at) return NextResponse.json({ ok: true, setup, changed: false })
        patch.recovery_enabled_at = now
        break
      }

      case 'correct-wrong-door': {
        // "I chose the wrong signup path" — a CORRECTION, not dual enablement.
        // Legal only while the origin workspace holds nothing, so it can never
        // strand data. Verified server-side; the client cannot assert it.
        const to = b.to
        if (!isWorkspace(to)) return bad('Unknown workspace.')
        if (to === setup.primary_workspace) return NextResponse.json({ ok: true, setup, changed: false })

        if (to === 'provider') {
          const [{ data: prof }, { count: checkIns }] = await Promise.all([
            admin.from('user_profiles').select('onboarding_completed, sobriety_date').eq('id', user.id).maybeSingle(),
            admin.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          ])
          if (prof?.onboarding_completed === true || prof?.sobriety_date || (checkIns ?? 0) > 0) {
            return NextResponse.json(
              { error: 'You already have recovery data on this account, so we kept it. You can use both workspaces.', code: 'origin_not_empty' },
              { status: 409 }
            )
          }
          patch.primary_workspace = 'provider'
          patch.provider_started_at = setup.provider_started_at ?? now
          patch.recovery_enabled_at = null          // clear the UNUSED enablement
        } else {
          const { data: acct } = await admin
            .from('provider_accounts').select('id').eq('auth_user_id', user.id).maybeSingle()
          if (acct) {
            return NextResponse.json(
              { error: 'This account already manages a listing, so we kept your provider workspace.', code: 'origin_not_empty' },
              { status: 409 }
            )
          }
          patch.primary_workspace = 'member'
          patch.recovery_enabled_at = setup.recovery_enabled_at ?? now
          patch.provider_started_at = null
          patch.organization_name = null
        }
        patch.last_workspace = null                 // stale memory of the wrong door
        break
      }

      case 'complete-provider-setup': {
        const org = b.organization_name
        if (org !== undefined && org !== null) {
          if (typeof org !== 'string' || org.length > MAX_ORG_LEN) return bad('That request was not valid.')
          patch.organization_name = org.trim() || null
        }
        patch.provider_started_at = setup.provider_started_at ?? now
        patch.provider_setup_completed_at = setup.provider_setup_completed_at ?? now
        break
      }

      case 'remember-workspace': {
        // Persist an INTENTIONAL change only. A4: a first default render must
        // never be recorded as a user choice, so callers send this on explicit
        // switching, never on mount.
        const ws = b.workspace
        if (!isWorkspace(ws)) return bad('Unknown workspace.')
        if (setup.last_workspace === ws) return NextResponse.json({ ok: true, setup, changed: false })
        patch.last_workspace = ws
        break
      }
    }

    const { data: saved, error } = await admin
      .from('user_setup')
      .upsert({ ...setup, ...patch }, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) {
      console.error('[workspace/initialize] write failed:', error.message)
      return NextResponse.json({ error: 'Something went wrong.', code: 'server_error' }, { status: 500 })
    }

    return NextResponse.json(
      { ok: true, setup: saved, changed: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[workspace/initialize] unhandled:', err)
    return NextResponse.json({ error: 'Something went wrong.', code: 'server_error' }, { status: 500 })
  }
}
