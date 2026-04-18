import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ExistingRelationship, SearchResult } from '@/app/dashboard/sponsor-search-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { email?: string } | null
    const rawEmail = body?.email
    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const normalized = rawEmail.trim().toLowerCase()

    if (user.email?.toLowerCase() === normalized) {
      const result: SearchResult = { found: false, reason: 'self' }
      return NextResponse.json(result)
    }

    const admin = createAdminClient()

    // Search auth.users by email — admin API bypasses RLS
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const found = users.find(u => u.email?.toLowerCase() === normalized)
    if (!found) {
      const result: SearchResult = { found: false, reason: 'not_found' }
      return NextResponse.json(result)
    }

    // Must have a member profile (not just a provider account)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('display_name')
      .eq('id', found.id)
      .maybeSingle()

    if (!profile) {
      const result: SearchResult = { found: false, reason: 'no_profile' }
      return NextResponse.json(result)
    }

    // Fetch all active/pending relationships between these two users in either direction.
    const [relsRes, fellowshipsRes] = await Promise.all([
      admin
        .from('sponsor_relationships')
        .select('id, sponsor_id, sponsee_id, fellowship_id, status')
        .or(
          `and(sponsor_id.eq.${user.id},sponsee_id.eq.${found.id}),` +
          `and(sponsor_id.eq.${found.id},sponsee_id.eq.${user.id})`
        )
        .in('status', ['active', 'pending']),
      admin.from('fellowships').select('id, abbreviation'),
    ])

    const abbrMap: Record<string, string> = Object.fromEntries(
      (fellowshipsRes.data ?? []).map((f: { id: string; abbreviation: string }) => [f.id, f.abbreviation])
    )

    const existingRelationships: ExistingRelationship[] = (relsRes.data ?? []).map(rel => ({
      relationshipId:  rel.id as string,
      direction:       rel.sponsor_id === user.id ? 'you_are_sponsor' : 'they_are_sponsor',
      fellowshipId:    rel.fellowship_id as string | null,
      fellowshipAbbr:  rel.fellowship_id ? (abbrMap[rel.fellowship_id as string] ?? null) : null,
      status:          rel.status as 'active' | 'pending',
    }))

    const result: SearchResult = {
      found: true,
      userId: found.id,
      email: found.email ?? rawEmail,
      displayName: (profile as { display_name: string | null }).display_name,
      existingRelationships,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/dashboard/search-user] error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}
