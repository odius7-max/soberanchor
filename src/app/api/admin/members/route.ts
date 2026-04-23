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

export async function GET(request: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() ?? ''
  const role = searchParams.get('role') ?? ''
  const sort = searchParams.get('sort') ?? 'desc'

  const [
    { data: profiles },
    { data: authData },
    { data: sponsorRels },
    { data: providerAccounts },
    { data: subscriptions },
  ] = await Promise.all([
    admin.from('user_profiles').select('id, display_name, is_available_sponsor, onboarding_completed, created_at'),
    admin.auth.admin.listUsers(),
    admin.from('sponsor_relationships').select('sponsor_id, sponsee_id, status'),
    admin.from('provider_accounts').select('auth_user_id, subscription_tier, is_active'),
    admin.from('user_subscriptions').select('user_id, plan'),
  ])

  const authUsers = authData?.users ?? []
  const rels = sponsorRels ?? []
  const providers = providerAccounts ?? []
  const subMap = new Map((subscriptions ?? []).map(s => [s.user_id, s.plan as string]))

  let members = (profiles ?? []).map(p => {
    const au = authUsers.find(u => u.id === p.id)
    const isBanned = au?.banned_until != null && new Date(au.banned_until) > new Date()
    const isSponsor = rels.some(r => r.sponsor_id === p.id && r.status === 'active')
    const isSponsee = rels.some(r => r.sponsee_id === p.id && r.status === 'active')
    const providerAccount = providers.find(pa => pa.auth_user_id === p.id)
    return {
      id: p.id,
      display_name: p.display_name,
      email: au?.email ?? null,
      created_at: p.created_at,
      last_sign_in_at: au?.last_sign_in_at ?? null,
      onboarding_completed: p.onboarding_completed,
      is_banned: isBanned,
      is_sponsor: isSponsor,
      is_sponsee: isSponsee,
      is_provider: !!providerAccount,
      provider_tier: providerAccount?.subscription_tier ?? null,
      plan: subMap.get(p.id) ?? 'free',
    }
  })

  if (search) {
    members = members.filter(m =>
      m.display_name?.toLowerCase().includes(search) ||
      m.email?.toLowerCase().includes(search)
    )
  }
  if (role === 'sponsor') members = members.filter(m => m.is_sponsor)
  else if (role === 'sponsee') members = members.filter(m => m.is_sponsee)
  else if (role === 'provider') members = members.filter(m => m.is_provider)

  members.sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sort === 'asc' ? diff : -diff
  })

  return NextResponse.json(members)
}
