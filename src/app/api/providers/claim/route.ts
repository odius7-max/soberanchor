import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFreshProviderSignup } from '@/lib/workspace-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/providers/claim — ODI-68 / CLAIM-FLOW-SPEC §1.
 *
 * The client used to write facilities + provider_accounts directly, which RLS
 * correctly refused (facilities is SELECT-only; provider_accounts has no INSERT
 * policy). Rather than opening those tables up, the whole operation moved here
 * and into one database transaction: public.claim_facility().
 *
 * Everything that decides the outcome — actor identity, email, verification,
 * availability — is derived server-side. The body carries a facility id and
 * optional contact details, nothing else.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Bounded contact fields. Anything not listed here is ignored outright.
const CONTACT_FIELDS = ['contact_name', 'contact_phone', 'organization_name'] as const
const MAX_CONTACT_LEN = 120

const NEW_CLAIMS_PER_HOUR = 5

export const SUPPORT_EMAIL = 'providers@soberanchor.com'

type Failure = { status: number; code: string; message: string }

const FAILURES: Record<string, Failure> = {
  invalid_input: {
    status: 400,
    code: 'invalid_input',
    message: 'That request was not valid. Please reload the page and try again.',
  },
  not_found: {
    status: 404,
    code: 'not_found',
    message: 'We could not find that listing. It may have been removed.',
  },
  already_claimed: {
    status: 409,
    code: 'already_claimed',
    message: `This listing has already been claimed. If it belongs to you, contact ${SUPPORT_EMAIL} and we'll sort it out.`,
  },
  account_inactive: {
    status: 403,
    code: 'account_inactive',
    message: `Your provider account is suspended, so new claims are on hold. Contact ${SUPPORT_EMAIL} to restore access.`,
  },
  claim_rejected: {
    status: 403,
    code: 'claim_rejected',
    message: `A previous claim for this listing was not approved. Contact ${SUPPORT_EMAIL} to reopen it.`,
  },
  rate_limited: {
    status: 429,
    code: 'rate_limited',
    message: 'Too many claim attempts in the last hour. Please try again later.',
  },
  server_error: {
    status: 500,
    code: 'server_error',
    message: 'Something went wrong on our end. Your claim was not submitted.',
  },
}

function fail(key: keyof typeof FAILURES | string) {
  const f = FAILURES[key] ?? FAILURES.server_error
  return NextResponse.json({ error: f.message, code: f.code }, { status: f.status })
}

/**
 * Same-origin check. A session cookie alone proves the user is signed in, not
 * that *this page* made the request, so a state-changing POST needs an origin
 * it can verify. Browsers always send Origin on POST, so comparing it to the
 * request's own host works on production and on every Vercel preview URL
 * without maintaining an allowlist — and without trusting a wildcard.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return false

  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    return parsed.host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

function readContact(body: Record<string, unknown>) {
  const out: Record<string, string | null> = {}
  for (const key of CONTACT_FIELDS) {
    const raw = body[key]
    if (raw === undefined || raw === null) { out[key] = null; continue }
    if (typeof raw !== 'string') return null           // wrong type → reject the body
    const trimmed = raw.trim()
    if (trimmed.length > MAX_CONTACT_LEN) return null
    out[key] = trimmed || null
  }
  return out
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return fail('invalid_input')

    // ── Actor: from the session, never from the body ──
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to claim a listing.', code: 'unauthenticated' },
        { status: 401 }
      )
    }

    // ── Body ──
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return fail('invalid_input')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_input')

    const record = body as Record<string, unknown>
    const facilityId = record.facility_id
    if (typeof facilityId !== 'string' || !UUID_RE.test(facilityId)) return fail('invalid_input')

    const contact = readContact(record)
    if (!contact) return fail('invalid_input')

    // Auto-verification requires a *confirmed* address. An unconfirmed one is
    // not proof of control over the domain, so it falls through to pending.
    const email = user.email ?? null
    const confirmedEmail = user.email_confirmed_at ? email : null

    // ── The transaction ──
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('claim_facility', {
      p_auth_user_id: user.id,
      p_user_email: confirmedEmail,
      p_facility_id: facilityId,
      p_contact_name: contact.contact_name,
      p_contact_phone: contact.contact_phone,
      p_organization_name: contact.organization_name,
      p_rate_limit: NEW_CLAIMS_PER_HOUR,
    })

    if (error) {
      // Includes a rolled-back transaction from the guarded-update assertion.
      console.error('[providers/claim] RPC failed:', error.message)
      return fail('server_error')
    }

    const result = data as { ok?: boolean; code?: string; facility_id?: string; status?: string } | null
    if (!result || typeof result !== 'object') return fail('server_error')
    if (!result.ok) return fail(result.code ?? 'server_error')

    // PP-DEFAULT, claim variant. A provider whose first act is claiming a
    // facility never passes through provider setup, so without this they too
    // kept the member default. Runs only AFTER the claim has committed, is
    // idempotent, and cannot promote an established member: isFreshProviderSignup
    // requires the signup hint, no existing user_setup row, and no
    // recovery-personal data. Best-effort — a preference write must never fail
    // a committed claim.
    try {
      if (await isFreshProviderSignup(admin, user, false)) {
        const { data: existingSetup } = await admin
          .from('user_setup').select('user_id').eq('user_id', user.id).maybeSingle()
        if (!existingSetup) {
          const stamp = new Date().toISOString()
          await admin.from('user_setup').insert({
            user_id: user.id,
            primary_workspace: 'provider',
            provider_started_at: stamp,
            provider_setup_completed_at: stamp,
            updated_at: stamp,
          })
        }
      }
    } catch (bootstrapErr) {
      console.error('[providers/claim] workspace bootstrap skipped:', bootstrapErr)
    }

    return NextResponse.json(
      { facility_id: result.facility_id, status: result.status },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[providers/claim] Unhandled error:', err)
    return fail('server_error')
  }
}
