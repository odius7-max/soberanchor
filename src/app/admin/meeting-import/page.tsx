import { createAdminClient } from '@/lib/supabase/admin'
import MeetingImportClient from './MeetingImportClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Meeting Import — SoberAnchor Admin' }

async function getFeeds() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('meeting_feed_sources')
    .select('id, name, region, feed_url, feed_type, is_active, last_synced_at, last_sync_count, last_sync_errors, created_at')
    .order('created_at', { ascending: true })
  return data ?? []
}

export default async function MeetingImportPage() {
  const feeds = await getFeeds()
  return <MeetingImportClient initialFeeds={feeds} />
}
