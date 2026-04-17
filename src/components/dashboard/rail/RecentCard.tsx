import type { CheckIn } from '../DashboardShell'

interface Props {
  recentCheckIns: CheckIn[]
}

function relativeTime(dateStr: string): string {
  const hours = Math.round((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 3_600_000)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

const MOOD_EMOJI: Record<string, string> = {
  struggling: '😖', hard: '😕', okay: '😐', good: '🙂', great: '😊',
}

export default function RecentCard({ recentCheckIns }: Props) {
  const recent = recentCheckIns.slice(0, 3)
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '16px 18px' }}>
      <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>Recent Check-ins</div>
      {recent.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--mid)' }}>No check-ins yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map(ci => (
            <div key={ci.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>
                {MOOD_EMOJI[ci.mood ?? ''] ?? '📅'} {ci.mood ?? 'logged'}
              </span>
              <span suppressHydrationWarning style={{ color: 'var(--mid)', fontSize: 12 }}>
                {relativeTime(ci.check_in_date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
