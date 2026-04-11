import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/find/BackButton'

const ACTIVITY_DOT: Record<string, string> = {
  step_completed:     '#27AE60',
  step_uncompleted:   '#D4A574',
  step_work_reviewed: '#D4A574',
  task_assigned:      '#2980B9',
  check_in:           '#2A8A99',
  account_created:    '#888',
}

const ACTIVITY_ICON: Record<string, string> = {
  step_completed:     '✓',
  step_uncompleted:   '↩',
  step_work_reviewed: '📬',
  task_assigned:      '📋',
  check_in:           '💬',
  account_created:    '🎉',
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  const { data: items } = await supabase
    .from('activity_feed')
    .select('id,event_type,title,description,is_read,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Mark all as read
  await supabase
    .from('activity_feed')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const feed = items ?? []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
      <BackButton fallback="/dashboard" label="← Back to Dashboard" />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--navy)', margin: '20px 0 4px' }}>Activity Feed</h1>
      <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 24 }}>Everything that's happened in your recovery journey</p>

      {feed.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--mid)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>No activity yet</div>
          <div style={{ fontSize: 14 }}>Your feed will fill up as you log check-ins, complete steps, and work with your sponsor.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {feed.map((item, i) => {
            const dot = ACTIVITY_DOT[item.event_type] ?? '#888'
            const icon = ACTIVITY_ICON[item.event_type] ?? '•'
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', gap: 14, padding: '16px 20px',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  borderLeft: !item.is_read ? '3px solid #D4A574' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: `${dot}18`, border: `1.5px solid ${dot}40`, color: dot, fontSize: 12, fontWeight: 700 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{item.title}</div>
                  {item.description && (
                    <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#bbb', flexShrink: 0, paddingTop: 2 }}>{relTime(item.created_at)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
