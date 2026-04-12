import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let name: string, feed_url: string, region: string | null
  try {
    const body = await req.json()
    name = body.name?.trim()
    feed_url = body.feed_url?.trim()
    region = body.region?.trim() || null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!name || !feed_url) {
    return NextResponse.json({ error: 'name and feed_url are required' }, { status: 400 })
  }

  // Basic URL validation
  try { new URL(feed_url) } catch {
    return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: feed, error } = await admin
    .from('meeting_feed_sources')
    .insert({
      name,
      feed_url,
      region,
      feed_type: 'meeting_guide',
      fellowship_id: 'f0000000-0000-0000-0000-000000000001', // AA default
    })
    .select()
    .single()

  if (error) {
    const msg = error.message?.includes('unique') ? 'A feed with that URL already exists.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ feed })
}
