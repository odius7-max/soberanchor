import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: feedId } = await params
  const admin = createAdminClient()

  // Load the feed source to get its name (used as entity_name in meetings)
  const { data: feed, error: feedErr } = await admin
    .from('meeting_feed_sources')
    .select('id, name')
    .eq('id', feedId)
    .single()

  if (feedErr || !feed) {
    return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
  }

  // Delete all API meetings imported from this feed (matched by entity_name)
  const { count, error } = await admin
    .from('meetings')
    .delete({ count: 'exact' })
    .eq('source', 'api')
    .eq('entity_name', feed.name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reset feed stats
  await admin.from('meeting_feed_sources').update({
    last_sync_count: 0,
    last_sync_errors: 0,
    last_synced_at: null,
  }).eq('id', feedId)

  return NextResponse.json({ deleted: count ?? 0 })
}
