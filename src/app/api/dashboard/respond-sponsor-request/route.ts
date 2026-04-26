import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Server-side accept/decline for pending sponsor_relationships rows.
//
// Replaces the direct client-side update in PendingRequests for the accept
// path so we can gate on get_subscription_state.can_add_sponsee. (Decline
// could stay client-side under RLS, but routing both through one endpoint
// keeps the call sites symmetric.)
//
// Cap rule lives in the prospective sponsor — i.e. the row's sponsor_id —
// regardless of which side is calling. This catches the edge case where a
// Free sponsor sent a request when they had 0 sponsees, took on a different
// sponsee elsewhere in the meantime, and the original sponsee now tries to
// accept (perspective='as_sponsee').

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  relationshipId?: string
  accept?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as Body | null
    const relationshipId = body?.relationshipId
    const accept = body?.accept

    if (typeof relationshipId !== 'string' || !relationshipId) {
      return NextResponse.json({ error: 'Missing relationshipId' }, { status: 400 })
    }
    if (typeof accept !== 'boolean') {
      return NextResponse.json({ error: 'Missing accept boolean' }, { status: 400 })
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // Load the row first — need sponsor_id for the cap check, sponsee_id for
    // conflict detection, and to verify the caller is actually a participant.
    const { data: row } = await admin
      .from('sponsor_relationships')
      .select('id, sponsor_id, sponsee_id, fellowship_id, status')
      .eq('id', relationshipId)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 })
    }
    if (user.id !== row.sponsor_id && user.id !== row.sponsee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Decline ────────────────────────────────────────────────────────────
    if (!accept) {
      const { error } = await admin
        .from('sponsor_relationships')
        .update({ status: 'ended', ended_at: nowIso })
        .eq('id', relationshipId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── Accept ─────────────────────────────────────────────────────────────
    // Entitlement check on the prospective sponsor (always row.sponsor_id).
    const { data: subState } = await admin.rpc('get_subscription_state', {
      p_user_id: row.sponsor_id,
    })

    if (subState && !subState.can_add_sponsee) {
      // Look up requester name so the modal can address them by name.
      // Requester = the *other* participant from the current user's perspective.
      const requesterId = user.id === row.sponsor_id ? row.sponsee_id : row.sponsor_id
      const { data: requesterProfile } = await admin
        .from('user_profiles')
        .select('display_name')
        .eq('id', requesterId)
        .maybeSingle()

      const callerIsSponsor = user.id === row.sponsor_id
      return NextResponse.json({
        error: callerIsSponsor ? 'sponsee_limit_reached' : 'sponsor_at_capacity',
        message: callerIsSponsor
          ? 'Free tier supports 1 active sponsee. Upgrade to Pro for unlimited.'
          : 'This sponsor has reached their sponsee capacity right now.',
        requesterName: (requesterProfile as { display_name: string | null } | null)?.display_name ?? null,
        sponsee_count: subState.sponsee_count,
        is_pro:        subState.is_pro,
      }, { status: 402 })
    }

    // Pre-check active conflict on (sponsee_id, fellowship_id) — mirrors the
    // existing client-side guard. If an active row already exists for the
    // pair, silently end this pending and return ok (the sponsee already has
    // a sponsor for this program).
    const conflictQ = admin
      .from('sponsor_relationships')
      .select('id')
      .eq('sponsee_id', row.sponsee_id)
      .eq('status', 'active')
    const { data: existingActive } = row.fellowship_id
      ? await conflictQ.eq('fellowship_id', row.fellowship_id).maybeSingle()
      : await conflictQ.is('fellowship_id', null).maybeSingle()

    if (existingActive) {
      const { error } = await admin
        .from('sponsor_relationships')
        .update({ status: 'ended', ended_at: nowIso })
        .eq('id', relationshipId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, conflictResolved: true })
    }

    // Promote pending → active.
    const { error: acceptErr } = await admin
      .from('sponsor_relationships')
      .update({ status: 'active', started_at: nowIso })
      .eq('id', relationshipId)

    if (acceptErr) {
      // Defensive: a concurrent accept can still trip the unique constraint.
      // Translate to silent-end rather than surfacing a Postgres error.
      const msg = acceptErr.message || ''
      if (/duplicate key|unique constraint/i.test(msg)) {
        await admin
          .from('sponsor_relationships')
          .update({ status: 'ended', ended_at: nowIso })
          .eq('id', relationshipId)
        return NextResponse.json({ ok: true, conflictResolved: true })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Auto-end sibling pending rows for the same (sponsor, sponsee, fellowship)
    // so a second "Accept" card never appears for an already-active pair.
    {
      const siblingQ = admin
        .from('sponsor_relationships')
        .update({ status: 'ended', ended_at: nowIso })
        .eq('sponsor_id', row.sponsor_id)
        .eq('sponsee_id', row.sponsee_id)
        .eq('status', 'pending')
        .neq('id', relationshipId)
      const { error: sibErr } = row.fellowship_id
        ? await siblingQ.eq('fellowship_id', row.fellowship_id)
        : await siblingQ.is('fellowship_id', null)
      if (sibErr) console.warn('[respond-sponsor-request] sibling cleanup failed', sibErr)
    }

    // If the accepter IS the sponsor, flip is_available_sponsor=true so the
    // Sponsees tab unhides for them. Mirrors the existing client behavior.
    if (user.id === row.sponsor_id) {
      await admin
        .from('user_profiles')
        .update({ is_available_sponsor: true })
        .eq('id', user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/dashboard/respond-sponsor-request] error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}
