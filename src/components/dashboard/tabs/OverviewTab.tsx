'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddSponseeModal from '@/components/dashboard/AddSponseeModal'
import UpgradeToProModal from '@/components/dashboard/UpgradeToProModal'
import { markActivityRead } from '@/app/dashboard/activity/actions'
import { removeSponsorRelationship } from '@/app/dashboard/actions'
import { useSubscription } from '@/hooks/useSponsorAccess'
import type { ActiveSponsor } from '@/components/dashboard/DashboardShell'
import type { SponsorTask } from '@/app/actions/sponsorTasks'

const TASK_ICONS: Record<string, string> = {
  reading: '📖', writing: '✏️', action: '✅', meeting: '🤝',
  amends: '💛', service: '🙌', prayer: '🙏', meditation: '🧘',
  reflection: '💭', custom: '⭐',
}

const STEPS = [
  { n: 1, s: 'Powerlessness', desc: 'We admitted we were powerless over our addiction' },
  { n: 2, s: 'Hope', desc: 'Came to believe a Power greater than ourselves could restore us' },
  { n: 3, s: 'Decision', desc: 'Made a decision to turn our will and lives over' },
  { n: 4, s: 'Inventory', desc: 'Made a searching and fearless moral inventory' },
  { n: 5, s: 'Admission', desc: 'Admitted to God, ourselves, and another human being' },
  { n: 6, s: 'Readiness', desc: 'Were entirely ready to have God remove all these defects' },
  { n: 7, s: 'Humility', desc: 'Humbly asked Him to remove our shortcomings' },
  { n: 8, s: 'Amends List', desc: 'Made a list of all persons we had harmed' },
  { n: 9, s: 'Amends', desc: 'Made direct amends to such people wherever possible' },
  { n: 10, s: 'Daily Inventory', desc: 'Continued to take personal inventory' },
  { n: 11, s: 'Spiritual Growth', desc: 'Sought through prayer and meditation to improve contact' },
  { n: 12, s: 'Service', desc: 'Having had a spiritual awakening, we tried to carry the message' },
]

const MOOD_META: Record<string, { emoji: string; label: string; color: string }> = {
  great:      { emoji: '😊', label: 'great',      color: '#38a169' },
  good:       { emoji: '🙂', label: 'good',       color: '#38a169' },
  okay:       { emoji: '😐', label: 'okay',       color: '#D4A574' },
  struggling: { emoji: '😔', label: 'struggling', color: '#E67E22' },
  crisis:     { emoji: '😰', label: 'crisis',     color: '#C0392B' },
}

interface CheckIn { id: string; check_in_date: string; mood: string | null; notes: string | null; sober_today: boolean; meetings_attended: number }
interface MeetingAttendance { id: string; meeting_name: string; fellowship_name: string | null; attended_at: string }
interface ReadingAssignment { id: string; title: string; source: string | null; is_completed: boolean; due_date: string | null; created_at: string }
interface ActivityItem { id: string; event_type: string; title: string; description: string | null; is_read: boolean; created_at: string }

interface Props {
  userId: string
  activeFellowshipId?: string | null
  currentStep: number
  completedSteps: number
  allStepsDone: boolean
  journalCount: number
  stepWorkCount: number
  recentCheckIns: CheckIn[]
  meetingsThisWeek: number
  meetingsTotal: number
  recentMeetings: MeetingAttendance[]
  readingAssignments: ReadingAssignment[]
  activeSponsors: ActiveSponsor[]
  isAvailableSponsor: boolean
  canSponsor: boolean
  activityItems: ActivityItem[]
  displayName?: string
  onCheckIn: () => void
  onJournal: () => void
  onViewTasks: () => void
}

export default function OverviewTab({ userId, activeFellowshipId, currentStep, completedSteps, allStepsDone, journalCount, stepWorkCount, recentCheckIns, meetingsThisWeek, meetingsTotal, recentMeetings, readingAssignments, activeSponsors, isAvailableSponsor, canSponsor, activityItems, displayName, onCheckIn, onJournal, onViewTasks }: Props) {
  const router = useRouter()
  const step = STEPS[currentStep - 1]
  const [mounted, setMounted] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [sponsorAvailable, setSponsorAvailable] = useState(isAvailableSponsor)
  const [togglingRole, setTogglingRole] = useState(false)
  const [showFindSponsor, setShowFindSponsor] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  async function handleUnlink(relationshipId: string) {
    setUnlinking(relationshipId)
    try {
      await removeSponsorRelationship(relationshipId)
      router.refresh()
    } finally {
      setUnlinking(null)
    }
  }
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { refresh: refreshAccess } = useSubscription(userId)

  const unreadCount = activityItems.filter(i => !i.is_read).length

  // Fetch active sponsor tasks for the Tasks card
  const [sponsorTasks, setSponsorTasks] = useState<SponsorTask[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor_tasks')
      .select('*')
      .eq('sponsee_id', userId)
      .neq('status', 'completed')
      .order('assigned_at', { ascending: false })
      .then(({ data }) => setSponsorTasks((data ?? []) as SponsorTask[]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Mark all unread as read after rendering
  useEffect(() => {
    if (unreadCount > 0) markActivityRead(userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set mounted flag so time-dependent values (relTime, overdue) only compute
  // on the client — prevents React hydration error #418 from UTC vs local-timezone drift.
  useEffect(() => setMounted(true), [])

  async function toggleSponsorAvailability() {
    const next = !sponsorAvailable
    setTogglingRole(true)
    const supabase = createClient()
    await supabase.from('user_profiles').update({ is_available_sponsor: next }).eq('id', userId)
    setSponsorAvailable(next)
    setTogglingRole(false)
    router.refresh()
  }

  async function toggleTask(id: string, current: boolean) {
    setToggling(id)
    const supabase = createClient()
    await supabase.from('reading_assignments').update({ is_completed: !current, completed_at: !current ? new Date().toISOString() : null }).eq('id', id)
    router.refresh()
    setToggling(null)
  }

  async function continueStepWork() {
    setNavigating(true)
    try {
      const supabase = createClient()
      let wbQuery = supabase.from('program_workbooks').select('id, slug').eq('is_active', true).order('step_number').order('sort_order')
      if (activeFellowshipId) wbQuery = wbQuery.eq('fellowship_id', activeFellowshipId)
      const [{ data: workbooks }, { data: entries }] = await Promise.all([
        wbQuery,
        supabase.from('step_work_entries').select('workbook_id, review_status').eq('user_id', userId),
      ])
      const entryMap = new Map((entries ?? []).map(e => [e.workbook_id, e.review_status]))
      const first = (workbooks ?? []).find(w => {
        const status = entryMap.get(w.id)
        return !status || status === 'draft' || status === 'needs_revision'
      })
      router.push('/dashboard/step-work/' + (first?.slug ?? 'aa-step-1-reading'))
    } catch {
      router.push('/dashboard/step-work/aa-step-1-reading')
    } finally {
      setNavigating(false)
    }
  }

  function fmtDate(s: string) {
    return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    return fmtDate(iso)
  }

  const ACTIVITY_DOT: Record<string, string> = {
    step_completed:     '#27AE60',
    step_uncompleted:   '#D4A574',
    step_work_reviewed: '#D4A574',
    task_assigned:      '#2980B9',
    check_in:           '#2A8A99',
    account_created:    '#888',
    reminder:           '#2A8A99',
  }

  const ACTIVITY_ICON: Record<string, string> = {
    step_completed:     '✓',
    step_uncompleted:   '↩',
    step_work_reviewed: '📬',
    task_assigned:      '📋',
    check_in:           '💬',
    account_created:    '🎉',
    reminder:           '🔔',
  }

  const card = "rounded-[16px] p-5 bg-white border border-border card-hover"

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

      {/* Current Focus */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>📖 Current Focus</h3>
          {allStepsDone
            ? <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.25)', color: '#1e8a4a' }}>Completed</span>
            : <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.2)', color: '#9A7B54' }}>In Progress</span>
          }
        </div>
        {activeFellowshipId === null ? (
          /* Tracking-only milestone — no program selected */
          <div className="text-center" style={{ padding: '20px 8px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🌱</div>
            <div className="font-semibold text-navy" style={{ fontSize: '15px', marginBottom: '6px' }}>Just tracking days</div>
            <div className="text-mid" style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              No program selected for this milestone. Edit it to link a fellowship and unlock step work.
            </div>
            <button onClick={onJournal} className="font-semibold rounded-lg transition-colors hover:bg-[var(--navy-10)]" style={{ fontSize: '13px', padding: '8px 16px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>
              Journal
            </button>
          </div>
        ) : allStepsDone ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#27AE60,#1e8a4a)', fontSize: '22px' }}>✓</div>
              <div>
                <div className="font-bold text-navy" style={{ fontSize: '16px' }}>All 12 Steps Complete</div>
                <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>Having had a spiritual awakening as a result of these steps</div>
              </div>
            </div>
            <div className="text-mid mb-4" style={{ fontSize: '13px', lineHeight: 1.6 }}>
              You have <strong className="text-navy">{journalCount} journal {journalCount === 1 ? 'entry' : 'entries'}</strong> and <strong className="text-navy">{stepWorkCount} submitted step work {stepWorkCount === 1 ? 'entry' : 'entries'}</strong>.
            </div>
            <div className="flex gap-2">
              <button onClick={onJournal} className="flex-1 font-semibold rounded-lg transition-colors hover:bg-[var(--navy-10)]" style={{ fontSize: '13px', padding: '8px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>
                Journal
              </button>
            </div>
            <div className="mt-3 text-center" style={{ fontSize: '12px', color: '#1e8a4a', fontWeight: 600 }}>
              ✓ All 12 of 12 steps complete
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#D4A574,#c49564)', fontSize: '20px' }}>{currentStep}</div>
              <div>
                <div className="font-bold text-navy" style={{ fontSize: '16px' }}>Step {currentStep}: {step?.s}</div>
                <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>{step?.desc}</div>
              </div>
            </div>
            <div className="text-mid mb-4" style={{ fontSize: '13px', lineHeight: 1.6 }}>
              You have <strong className="text-navy">{journalCount} journal {journalCount === 1 ? 'entry' : 'entries'}</strong> and <strong className="text-navy">{stepWorkCount} submitted step work {stepWorkCount === 1 ? 'entry' : 'entries'}</strong>.
            </div>
            <div className="flex gap-2">
              <button onClick={continueStepWork} disabled={navigating} className="flex-1 font-semibold text-white rounded-lg transition-colors hover:bg-navy-dark" style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--navy)', border: 'none', cursor: navigating ? 'wait' : 'pointer', opacity: navigating ? 0.7 : 1 }}>
                {navigating ? 'Loading…' : 'Continue Step Work →'}
              </button>
              <button onClick={onJournal} className="font-semibold rounded-lg transition-colors hover:bg-[var(--navy-10)]" style={{ fontSize: '13px', padding: '8px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>
                Journal
              </button>
            </div>
            <div className="flex justify-between mt-3" style={{ fontSize: '12px', color: 'var(--mid)' }}>
              <span>✓ {completedSteps} of 12 steps complete</span>
              <span>{12 - completedSteps} ahead</span>
            </div>
          </>
        )}
      </div>

      {/* Recent Check-ins */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>💬 Recent Check-ins</h3>
          <button onClick={onCheckIn} className="font-semibold transition-colors hover:bg-warm-gray" style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '8px', background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--dark)', cursor: 'pointer' }}>+ Check In</button>
        </div>
        {recentCheckIns.length === 0 ? (
          <div className="text-mid text-center py-6" style={{ fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
            No check-ins yet. How are you doing today?
          </div>
        ) : recentCheckIns.map((ci, i) => {
          const m = ci.mood ? MOOD_META[ci.mood] : null
          return (
            <div key={ci.id} className="flex gap-3 py-3" style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{m?.emoji ?? '😶'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span suppressHydrationWarning className="font-semibold text-navy" style={{ fontSize: '13px' }}>{fmtDate(ci.check_in_date)}</span>
                  {m && <span className="font-semibold" style={{ fontSize: '11px', color: m.color }}>{m.label}</span>}
                </div>
                <div className="text-mid truncate" style={{ fontSize: '13px', marginTop: '2px' }}>{ci.notes ?? <span style={{ color: '#ccc' }}>No notes</span>}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Meeting Log */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>👥 Meeting Log</h3>
            <span style={{ fontSize: '11px', color: 'var(--mid)', background: 'var(--warm-gray)', padding: '4px 10px', borderRadius: '8px' }}>Auto-synced</span>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl text-center" style={{ background: 'var(--teal-10)', padding: '14px 16px' }}>
            <div className="font-bold text-navy" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '-0.75px' }}>{meetingsThisWeek}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)', fontWeight: 500 }}>This Week</div>
          </div>
          <div className="flex-1 rounded-xl text-center" style={{ background: 'var(--gold-10)', padding: '14px 16px' }}>
            <div className="font-bold text-navy" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '-0.75px' }}>{meetingsTotal}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)', fontWeight: 500 }}>Total</div>
          </div>
        </div>
        {recentMeetings.length === 0 ? (
          <div className="text-mid text-center py-2" style={{ fontSize: '13px' }}>No meetings logged yet. Use Meeting Check-in to log attendance.</div>
        ) : recentMeetings.map((m, i) => (
          <div key={m.id} className="flex justify-between items-center py-2.5" style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div>
              <div className="font-medium text-dark" style={{ fontSize: '13px' }}>{m.meeting_name}</div>
              {m.fellowship_name && <div style={{ fontSize: '11px', color: 'var(--mid)', marginTop: '1px' }}>{m.fellowship_name}</div>}
            </div>
            <div suppressHydrationWarning style={{ fontSize: '12px', color: 'var(--mid)', flexShrink: 0, marginLeft: '8px' }}>{fmtDate(m.attended_at)}</div>
          </div>
        ))}
      </div>

      {/* Role indicator */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>🤝 Your Role</h3>
        </div>

        {/* Sponsee status */}
        <div className="py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="font-semibold text-dark" style={{ fontSize: '13px', marginBottom: '6px' }}>Sponsee</div>
          {activeSponsors.length === 0 ? (
            <div className="text-mid" style={{ fontSize: '12px', lineHeight: 1.4 }}>No active sponsor</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeSponsors.map(s => (
                <div key={s.relationshipId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.fellowshipAbbr && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: 'rgba(42,138,153,0.1)', color: 'var(--teal)', border: '1px solid rgba(42,138,153,0.2)', flexShrink: 0 }}>
                        {s.fellowshipAbbr}
                      </span>
                    )}
                    <span className="font-semibold truncate" style={{ fontSize: '12px', color: 'var(--teal)' }}>{s.name}</span>
                  </div>
                  <button
                    onClick={() => handleUnlink(s.relationshipId)}
                    disabled={unlinking === s.relationshipId}
                    style={{ fontSize: '11px', color: 'var(--mid)', background: 'none', border: 'none', cursor: unlinking === s.relationshipId ? 'wait' : 'pointer', flexShrink: 0, padding: '2px 4px', opacity: unlinking === s.relationshipId ? 0.5 : 1 }}
                  >
                    {unlinking === s.relationshipId ? '…' : 'Unlink'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sponsor status */}
        <div className="flex items-center justify-between py-3">
          <div style={{ flex: 1, paddingRight: '12px' }}>
            <div className="font-semibold text-dark" style={{ fontSize: '13px' }}>Sponsor</div>
            <div className="text-mid" style={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
              {sponsorAvailable
                ? 'Accepting sponsees — Sponsor View unlocked'
                : canSponsor
                  ? 'Toggle on when you\'re ready to sponsor others'
                  : 'Your sponsor can mark you ready, or it unlocks automatically when you complete your steps.'}
            </div>
          </div>
          <button
            onClick={canSponsor ? toggleSponsorAvailability : undefined}
            disabled={togglingRole || !canSponsor}
            aria-label={sponsorAvailable ? 'Disable sponsor availability' : 'Enable sponsor availability'}
            style={{
              flexShrink: 0,
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              cursor: !canSponsor ? 'not-allowed' : togglingRole ? 'wait' : 'pointer',
              background: sponsorAvailable ? 'var(--teal)' : '#D1CCC7',
              position: 'relative', transition: 'background 0.2s',
              opacity: togglingRole || !canSponsor ? 0.45 : 1,
            }}>
            <span style={{
              position: 'absolute', top: '3px',
              left: sponsorAvailable ? '23px' : '3px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={() => setShowFindSponsor(true)}
            className="font-semibold rounded-lg transition-colors"
            style={{ fontSize: '13px', padding: '8px 16px', background: '#fff', color: '#1a2332', border: '2px solid #d0d5dd', cursor: 'pointer', width: '100%' }}
          >
            {activeSponsors.length > 0 ? '+ Add a Sponsor' : '🔍 Find Your Sponsor'}
          </button>
        </div>
      </div>

      {showFindSponsor && <AddSponseeModal userId={userId} mode="find_sponsor" onClose={() => setShowFindSponsor(false)} sponsorName={displayName} />}
      {showUpgradeModal && (
        <UpgradeToProModal
          onClose={() => { setShowUpgradeModal(false); refreshAccess() }}
        />
      )}

      {/* Recent Activity */}
      <div className={card} style={{ position: 'relative' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>🔔 Recent Activity</h3>
          {unreadCount > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(212,165,116,0.15)', border: '1px solid rgba(212,165,116,0.35)', color: '#9A7B54' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {activityItems.length === 0 ? (
          <div className="text-mid text-center py-6" style={{ fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
            No activity yet — your feed will fill up as you use the app.
          </div>
        ) : activityItems.slice(0, 5).map((item, i) => {
          const dot = ACTIVITY_DOT[item.event_type] ?? '#888'
          const icon = ACTIVITY_ICON[item.event_type] ?? '•'
          const unread = !item.is_read
          return (
            <div
              key={item.id}
              className="flex gap-3 py-3"
              style={{
                borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                borderLeft: unread ? `3px solid #D4A574` : '3px solid transparent',
                paddingLeft: unread ? '10px' : '0',
                marginLeft: unread ? '-3px' : '0',
                transition: 'border-left-color 0.3s',
              }}
            >
              <div className="flex items-center justify-center flex-shrink-0 rounded-full" style={{ width: '28px', height: '28px', background: `${dot}18`, border: `1.5px solid ${dot}40`, color: dot, fontSize: '11px', fontWeight: 700 }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold" style={{ fontSize: '13px', color: unread ? 'var(--navy)' : 'var(--dark)' }}>{item.title}</div>
                {item.description && (
                  <div className="truncate" style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '2px' }}>{item.description}</div>
                )}
              </div>
              <div suppressHydrationWarning style={{ fontSize: '11px', color: '#bbb', flexShrink: 0, marginLeft: '4px', paddingTop: '1px' }}>{relTime(item.created_at)}</div>
            </div>
          )
        })}
        <a
          href="/dashboard/activity"
          style={{ display: 'block', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--teal)', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', textDecoration: 'none' }}
        >
          View all activity →
        </a>
      </div>

      {/* Tasks from sponsor */}
      {activeSponsors.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>
              📋 My Tasks
              {sponsorTasks.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(42,138,153,0.1)', color: 'var(--teal)', verticalAlign: 'middle' }}>
                  {sponsorTasks.length} active
                </span>
              )}
            </h3>
            {sponsorTasks.length > 0 && (
              <button
                onClick={onViewTasks}
                style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '8px', background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--dark)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
              >
                All tasks
              </button>
            )}
          </div>

          {sponsorTasks.length === 0 ? (
            <div className="text-center py-6">
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontSize: '14px', color: 'var(--mid)' }}>No tasks assigned yet.</div>
              <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '4px' }}>Your sponsor will assign tasks here.</div>
            </div>
          ) : (
            <>
              {sponsorTasks.slice(0, 3).map((task, i) => {
                // Gate on mounted — new Date().toDateString() is timezone-sensitive;
                // server (UTC) and client (local) can disagree on "today" near midnight.
                const overdue = mounted && task.due_date && task.status !== 'completed'
                  ? new Date(task.due_date + 'T00:00:00') < new Date(new Date().toDateString())
                  : false
                return (
                  <div
                    key={task.id}
                    onClick={onViewTasks}
                    className="flex items-start gap-3 py-3 rounded-lg hover:bg-[var(--warm-gray)] -mx-2 px-2"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{TASK_ICONS[task.category] ?? '⭐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>{task.title}</span>
                        {overdue && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}>OVERDUE</span>
                        )}
                        {task.status === 'in_progress' && !overdue && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: 'rgba(42,138,153,0.1)', color: 'var(--teal)' }}>IN PROGRESS</span>
                        )}
                      </div>
                      {task.due_date && (
                        <div style={{ fontSize: '11px', color: overdue ? '#c0392b' : 'var(--mid)', marginTop: '2px', fontWeight: overdue ? 700 : 400 }}>
                          Due {fmtDate(task.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {sponsorTasks.length > 3 && (
                <button
                  onClick={onViewTasks}
                  style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--teal)', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  View all {sponsorTasks.length} tasks →
                </button>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
