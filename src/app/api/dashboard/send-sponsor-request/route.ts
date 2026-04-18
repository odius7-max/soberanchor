import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sponsor-initiated: current user (sponsor) sends a request to the sponsee.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as
      | { sponseeUserId?: string; fellowshipId?: string | null }
      | null

    const sponseeUserId = body?.sponseeUserId
    const fellowshipId = body?.fellowshipId ?? null

    if (typeof sponseeUserId !== 'string' || !sponseeUserId) {
      return NextResponse.json({ error: 'Missing sponseeUserId' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Per-fellowship duplicate check (DB constraint is the backstop, this gives a clear message)
    const dupQuery = admin
      .from('sponsor_relationships')
      .select('id, status')
      .eq('sponsor_id', user.id)
      .eq('sponsee_id', sponseeUserId)
      .in('status', ['active', 'pending'])

    const { data: existing } = fellowshipId
      ? await dupQuery.eq('fellowship_id', fellowshipId)
      : await dupQuery.is('fellowship_id', null)

    if (existing && existing.length > 0) {
      const s = existing[0].status
      if (s === 'active')  return NextResponse.json({ error: 'You are already sponsoring this person in this program.' }, { status: 400 })
      if (s === 'pending') return NextResponse.json({ error: 'A request is already pending for this program.' }, { status: 400 })
    }

    const { error } = await admin
      .from('sponsor_relationships')
      .insert({ sponsor_id: user.id, sponsee_id: sponseeUserId, fellowship_id: fellowshipId ?? null, status: 'pending' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify the sponsee (best-effort)
    try {
      const [{ data: sponsorProfile }, fellowshipRes] = await Promise.all([
        admin.from('user_profiles').select('display_name').eq('id', user.id).single(),
        fellowshipId
          ? admin.from('fellowships').select('abbreviation').eq('id', fellowshipId).single()
          : Promise.resolve({ data: null }),
      ])
      await sendNotification(sponseeUserId, 'sponsor_connection_request', {
        requesterName: (sponsorProfile as { display_name: string | null } | null)?.display_name ?? 'Someone',
        fellowship:    (fellowshipRes.data as { abbreviation: string } | null)?.abbreviation ?? null,
      })
    } catch { /* non-fatal */ }

    revalidatePath('/dashboard')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/dashboard/send-sponsor-request] error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}
