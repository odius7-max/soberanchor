import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return adminIds.includes(user.id) ? user : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const admin = createAdminClient()

  const [
    { data: profile },
    { data: authUser, error: authError },
    { data: asSponsee },
    { data: asSponsor },
    { data: stepWork },
    { data: providerAccount },
    { data: subscription },
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('*, fellowships(id, name, abbreviation)')
      .eq('id', id)
      .single(),
    admin.auth.admin.getUserById(id),
    admin.from('sponsor_relationships')
      .select('id, status, started_at, sponsor_id, user_profiles!sponsor_relationships_sponsor_id_fkey(id, display_name)')
      .eq('sponsee_id', id),
    admin.from('sponsor_relationships')
      .select('id, status, started_at, sponsee_id, user_profiles!sponsor_relationships_sponsee_id_fkey(id, display_name)')
      .eq('sponsor_id', id),
    admin.from('step_work_entries').select('review_status').eq('user_id', id),
    admin.from('provider_accounts')
      .select('id, organization_name, subscription_tier, is_active')
      .eq('auth_user_id', id)
      .maybeSingle(),
    admin.from('user_subscriptions')
      .select('plan, status, granted_by, granted_note, granted_at')
      .eq('user_id', id)
      .maybeSingle(),
  ])

  if (!profile || authError) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const au = authUser.user
  const isBanned = au.banned_until != null && new Date(au.banned_until) > new Date()

  return NextResponse.json({
    id: au.id,
    email: au.email ?? null,
    phone: au.phone ?? null,
    created_at: au.created_at,
    last_sign_in_at: au.last_sign_in_at ?? null,
    is_banned: isBanned,
    banned_until: au.banned_until ?? null,
    display_name: profile.display_name,
    sobriety_date: profile.sobriety_date,
    bio: profile.bio,
    is_available_sponsor: profile.is_available_sponsor,
    onboarding_completed: profile.onboarding_completed,
    current_step: profile.current_step,
    recovery_program: profile.recovery_program,
    city: profile.city,
    state: profile.state,
    primary_fellowship: (profile as any).fellowships ?? null,
    is_sponsor: (asSponsor ?? []).some(r => r.status === 'active'),
    is_sponsee: (asSponsee ?? []).some(r => r.status === 'active'),
    is_provider: !!providerAccount,
    as_sponsor: (asSponsor ?? []).map(r => ({
      id: r.id,
      sponsee_id: r.sponsee_id,
      sponsee_name: (r.user_profiles as any)?.display_name ?? '—',
      status: r.status,
      started_at: r.started_at,
    })),
    as_sponsee: (asSponsee ?? []).map(r => ({
      id: r.id,
      sponsor_id: r.sponsor_id,
      sponsor_name: (r.user_profiles as any)?.display_name ?? '—',
      status: r.status,
      started_at: r.started_at,
    })),
    step_work: {
      total: stepWork?.length ?? 0,
      reviewed: stepWork?.filter(e => e.review_status === 'reviewed').length ?? 0,
      submitted: stepWork?.filter(e => e.review_status === 'submitted').length ?? 0,
      draft: stepWork?.filter(e => e.review_status === 'draft').length ?? 0,
    },
    provider_account: providerAccount ?? null,
    subscription: subscription ? {
      plan:        subscription.plan,
      status:      subscription.status,
      granted_by:  subscription.granted_by,
      granted_note: subscription.granted_note,
      granted_at:  subscription.granted_at,
    } : null,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  if (body.profile && Object.keys(body.profile).length > 0) {
    const { error } = await admin
      .from('user_profiles')
      .update({ ...body.profile, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (typeof body.ban === 'boolean') {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: body.ban ? '87600h' : 'none',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
