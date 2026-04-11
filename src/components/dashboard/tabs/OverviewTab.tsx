'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddSponseeModal from '@/components/dashboard/AddSponseeModal'

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
  great:      { emoji: '😊', label: 'great',      color: '#27AE60' },
  good:       { emoji: '🙂', label: 'good',       color: '#2A8A99' },
  okay:       { emoji: '😐', label: 'okay',       color: '#D4A574' },
  struggling: { emoji: '😔', label: 'struggling', color: '#E67E22' },
  crisis:     { emoji: '😰', label: 'crisis',     color: '#C0392B' },
}

interface CheckIn { id: string; check_in_date: string; mood: string | null; notes: string | null; sober_today: boolean; meetings_attended: number }
interface MeetingAttendance { id: string; meeting_name: string; fellowship_name: string | null; attended_at: string }
interface ReadingAssignment { id: string; title: string; source: string | null; is_completed: boolean; due_date: string | null; created_at: string }

interface Props {
  userId: string
  currentStep: number
  journalCount: number
  stepWorkCount: number
  recentCheckIns: CheckIn[]
  meetingsThisWeek: number
  meetingsTotal: number
  recentMeetings: MeetingAttendance[]
  readingAssignments: ReadingAssignment[]
  activeSponsor: string | null
  isAvailableSponsor: boolean
  onCheckIn: () => void
  onJournal: () => void
}

export default function OverviewTab({ userId, currentStep, journalCount, stepWorkCount, recentCheckIns, meetingsThisWeek, meetingsTotal, recentMeetings, readingAssignments, activeSponsor, isAvailableSponsor, onCheckIn, onJournal }: Props) {
  const router = useRouter()
  const step = STEPS[currentStep - 1]
  const [toggling, setToggling] = useState<string | null>(null)
  const [sponsorAvailable, setSponsorAvailable] = useState(isAvailableSponsor)
  const [togglingRole, setTogglingRole] = useState(false)
  const [showFindSponsor, setShowFindSponsor] = useState(false)

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

  function fmtDate(s: string) {
    return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const card = "rounded-[16px] p-5 bg-white border border-border card-hover"

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

      {/* Current Focus */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>📖 Current Focus</h3>
          <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.2)', color: '#9A7B54' }}>In Progress</span>
        </div>
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
          <button className="flex-1 font-semibold text-white rounded-lg transition-colors hover:bg-navy-dark" style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--navy)', border: 'none', cursor: 'pointer' }}>
            Continue Step Work →
          </button>
          <button onClick={onJournal} className="font-semibold rounded-lg transition-colors hover:bg-[var(--navy-10)]" style={{ fontSize: '13px', padding: '8px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>
            Journal
          </button>
        </div>
        <div className="flex justify-between mt-3" style={{ fontSize: '12px', color: 'var(--mid)' }}>
          <span>✓ Steps 1–{currentStep - 1} complete</span>
          <span>Steps {currentStep + 1}–12 ahead</span>
        </div>
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
                  <span className="font-semibold text-navy" style={{ fontSize: '13px' }}>{fmtDate(ci.check_in_date)}</span>
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
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>👥 Meeting Log</h3>
          <span style={{ fontSize: '11px', color: 'var(--mid)', background: 'var(--warm-gray)', padding: '4px 10px', borderRadius: '8px' }}>Auto-synced</span>
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
            <div style={{ fontSize: '12px', color: 'var(--mid)', flexShrink: 0, marginLeft: '8px' }}>{fmtDate(m.attended_at)}</div>
          </div>
        ))}
      </div>

      {/* Role indicator */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy" style={{ fontSize: '15px' }}>🤝 Your Role</h3>
        </div>

        {/* Sponsee status */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div className="font-semibold text-dark" style={{ fontSize: '13px' }}>Sponsee</div>
            <div className="text-mid" style={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
              {activeSponsor ? <>Working with <span className="font-semibold" style={{ color: 'var(--teal)' }}>{activeSponsor}</span></> : 'No active sponsor'}
            </div>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
            background: activeSponsor ? 'rgba(42,138,153,0.1)' : 'rgba(136,136,136,0.08)',
            color: activeSponsor ? 'var(--teal)' : 'var(--mid)',
            border: `1px solid ${activeSponsor ? 'rgba(42,138,153,0.2)' : 'var(--border)'}`,
            whiteSpace: 'nowrap' as const,
          }}>
            {activeSponsor ? 'Active' : 'Unlinked'}
          </span>
        </div>

        {/* Sponsor status */}
        <div className="flex items-center justify-between py-3">
          <div style={{ flex: 1, paddingRight: '12px' }}>
            <div className="font-semibold text-dark" style={{ fontSize: '13px' }}>Sponsor</div>
            <div className="text-mid" style={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
              {sponsorAvailable ? 'Accepting sponsees — Sponsor View unlocked' : 'Toggle on when you\'re ready to sponsor others'}
            </div>
          </div>
          <button
            onClick={toggleSponsorAvailability}
            disabled={togglingRole}
            aria-label={sponsorAvailable ? 'Disable sponsor availability' : 'Enable sponsor availability'}
            style={{
              flexShrink: 0,
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              cursor: togglingRole ? 'wait' : 'pointer',
              background: sponsorAvailable ? 'var(--teal)' : '#D1CCC7',
              position: 'relative', transition: 'background 0.2s', opacity: togglingRole ? 0.6 : 1,
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

        {!activeSponsor && (
          <div className="mt-3">
            <button
              onClick={() => setShowFindSponsor(true)}
              className="font-semibold text-white rounded-lg transition-colors hover:bg-navy-dark"
              style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--navy)', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              🔍 Find a Sponsor
            </button>
          </div>
        )}
      </div>

      {showFindSponsor && <AddSponseeModal mode="find_sponsor" onClose={() => setShowFindSponsor(false)} />}

      {/* Tasks from Sponsor */}
      <div className={card}>
        <h3 className="font-bold text-navy mb-4" style={{ fontSize: '15px' }}>📋 Tasks from Sponsor</h3>
        {readingAssignments.length === 0 ? (
          <div className="text-mid text-center py-6" style={{ fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
            No tasks assigned yet.
          </div>
        ) : readingAssignments.slice(0, 4).map((task, i) => (
          <div key={task.id} className="flex gap-3 items-start py-2.5" style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <button
              onClick={() => toggleTask(task.id, task.is_completed)}
              disabled={toggling === task.id}
              className="flex items-center justify-center flex-shrink-0 rounded-md transition-colors"
              style={{ width: '22px', height: '22px', marginTop: '1px', background: task.is_completed ? '#27AE60' : '#fff', border: task.is_completed ? '2px solid #27AE60' : '2px solid #D0CBC4', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
            >
              {task.is_completed ? '✓' : ''}
            </button>
            <div className="flex-1">
              <div style={{ fontSize: '14px', fontWeight: 500, color: task.is_completed ? 'var(--mid)' : 'var(--dark)', textDecoration: task.is_completed ? 'line-through' : 'none' }}>{task.title}</div>
              <div style={{ fontSize: '12px', color: '#bbb', marginTop: '1px' }}>{task.due_date ? `Due ${fmtDate(task.due_date)}` : `Assigned ${fmtDate(task.created_at)}`}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
