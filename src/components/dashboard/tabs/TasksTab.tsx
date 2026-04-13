'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateTaskStatus } from '@/app/actions/sponsorTasks'
import type { SponsorTask } from '@/app/actions/sponsorTasks'

interface ReadingAssignment { id: string; title: string; source: string | null; is_completed: boolean; due_date: string | null; created_at: string }

interface Props {
  userId: string
  readingAssignments: ReadingAssignment[]
  hasSponsor: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  reading:    '📖',
  writing:    '✏️',
  action:     '✅',
  meeting:    '🤝',
  amends:     '💛',
  service:    '🙌',
  prayer:     '🙏',
  meditation: '🧘',
  reflection: '💭',
  custom:     '⭐',
}

function fmtDate(s: string) {
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task: SponsorTask): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date + 'T00:00:00') < new Date(new Date().toDateString())
}

// ── Sponsor Task row ────────────────────────────────────────────────────────

function SponsorTaskRow({ task, onUpdate }: { task: SponsorTask; onUpdate: (id: string, status: 'assigned' | 'in_progress' | 'completed', note?: string) => void }) {
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote]                   = useState(task.sponsee_note ?? '')
  const overdue = isOverdue(task)

  const isCompleted  = task.status === 'completed'
  const isInProgress = task.status === 'in_progress'

  return (
    <div
      style={{
        borderRadius: 12,
        border: overdue ? '1.5px solid rgba(192,57,43,0.25)' : '1px solid var(--border)',
        background: isCompleted ? 'var(--warm-gray)' : overdue ? 'rgba(192,57,43,0.02)' : '#fff',
        padding: '13px 15px',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Checkbox */}
        <button
          onClick={() => {
            if (isCompleted) {
              onUpdate(task.id, 'assigned')
            } else {
              setShowNoteInput(true)
            }
          }}
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
            border: isCompleted ? 'none' : overdue ? '2px solid rgba(192,57,43,0.4)' : '2px solid var(--border)',
            background: isCompleted ? '#27AE60' : '#fff',
            color: '#fff', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isCompleted ? '✓' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isCompleted ? 'var(--mid)' : 'var(--navy)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {CATEGORY_ICONS[task.category] ?? '⭐'} {task.title}
            </span>
            {overdue && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}>
                OVERDUE
              </span>
            )}
          </div>

          {task.description && !isCompleted && (
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>{task.description}</div>
          )}

          {task.sponsor_note && !isCompleted && (
            <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 3, fontStyle: 'italic' }}>
              Sponsor note: {task.sponsor_note}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {task.due_date && (
              <span style={{ color: overdue ? '#c0392b' : 'var(--mid)', fontWeight: overdue ? 700 : 400 }}>
                Due {fmtDate(task.due_date)}
              </span>
            )}
            {task.is_recurring && task.recurrence_interval && (
              <span>🔄 {task.recurrence_interval}</span>
            )}
            {task.completed_at && (
              <span>Completed {fmtDate(task.completed_at)}</span>
            )}
          </div>

          {/* Note on completion input */}
          {showNoteInput && !isCompleted && (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={2}
                autoFocus
                style={{
                  width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid var(--teal)', fontFamily: 'var(--font-body)',
                  resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                  color: 'var(--dark)',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  onClick={() => setShowNoteInput(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onUpdate(task.id, 'completed', note || undefined); setShowNoteInput(false) }}
                  style={{ background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Mark Complete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* In-progress toggle */}
        {!isCompleted && !showNoteInput && (
          <button
            onClick={() => onUpdate(task.id, isInProgress ? 'assigned' : 'in_progress')}
            title={isInProgress ? 'Back to assigned' : 'Mark in progress'}
            style={{
              background: isInProgress ? 'rgba(42,138,153,0.1)' : 'none',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              color: isInProgress ? 'var(--teal)' : 'var(--mid)',
              flexShrink: 0, fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {isInProgress ? '▶ In Progress' : 'Start'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main TasksTab ────────────────────────────────────────────────────────────

export default function TasksTab({ userId, readingAssignments, hasSponsor }: Props) {
  const router = useRouter()
  const [sponsorTasks, setSponsorTasks] = useState<SponsorTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [toggling, setToggling]         = useState<string | null>(null)
  const [, startTransition]             = useTransition()

  // Fetch sponsor_tasks assigned to this user
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor_tasks')
      .select('*')
      .eq('sponsee_id', userId)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => {
        setSponsorTasks((data ?? []) as SponsorTask[])
        setLoadingTasks(false)
      })
  }, [userId])

  async function toggleReadingTask(id: string, current: boolean) {
    setToggling(id)
    const supabase = createClient()
    await supabase
      .from('reading_assignments')
      .update({ is_completed: !current, completed_at: !current ? new Date().toISOString() : null })
      .eq('id', id)
    router.refresh()
    setToggling(null)
  }

  async function handleSponsorTaskUpdate(id: string, status: 'assigned' | 'in_progress' | 'completed', note?: string) {
    setSponsorTasks(prev => prev.map(t => t.id === id ? { ...t, status, completed_at: status === 'completed' ? new Date().toISOString() : null, sponsee_note: note !== undefined ? note : t.sponsee_note } : t))
    await updateTaskStatus({ taskId: id, status, sponseeNote: note })
    startTransition(() => { router.refresh() })
  }

  const hasTasks = hasSponsor && (readingAssignments.length > 0 || sponsorTasks.length > 0)
  const hasAnything = hasTasks || (!loadingTasks && sponsorTasks.length > 0)

  if (!hasSponsor && !loadingTasks && sponsorTasks.length === 0) return (
    <div className="text-center py-16 text-mid">
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
      <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No sponsor connected yet</div>
      <div style={{ fontSize: '14px' }}>Once you connect with a sponsor, they can assign tasks here.</div>
    </div>
  )

  if (!loadingTasks && readingAssignments.length === 0 && sponsorTasks.length === 0) return (
    <div className="text-center py-16 text-mid">
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
      <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No tasks yet</div>
      <div style={{ fontSize: '14px' }}>Your sponsor hasn&apos;t assigned any tasks yet. Check back soon.</div>
    </div>
  )

  // Sponsor tasks — split active / completed
  const activeSponsorTasks    = sponsorTasks.filter(t => t.status !== 'completed')
  const completedSponsorTasks = sponsorTasks.filter(t => t.status === 'completed')
  const overdueCount          = activeSponsorTasks.filter(t => isOverdue(t)).length

  // Reading assignments — split
  const pendingReadings   = readingAssignments.filter(t => !t.is_completed)
  const completedReadings = readingAssignments.filter(t => t.is_completed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Sponsor Tasks section ── */}
      {(sponsorTasks.length > 0 || loadingTasks) && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Tasks from your sponsor</div>
            {overdueCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}>
                {overdueCount} overdue
              </span>
            )}
          </div>

          {loadingTasks ? (
            <div style={{ fontSize: 13, color: 'var(--mid)', padding: '12px 0' }}>Loading…</div>
          ) : (
            <>
              {activeSponsorTasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {activeSponsorTasks.map(task => (
                    <SponsorTaskRow key={task.id} task={task} onUpdate={handleSponsorTaskUpdate} />
                  ))}
                </div>
              )}

              {completedSponsorTasks.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                    Completed
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {completedSponsorTasks.map(task => (
                      <SponsorTaskRow key={task.id} task={task} onUpdate={handleSponsorTaskUpdate} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Reading Assignments section ── */}
      {readingAssignments.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Reading assignments</div>

          {pendingReadings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {pendingReadings.map(task => (
                <div key={task.id} className="card-hover rounded-[14px] flex gap-4 items-start px-5 py-4 bg-white border border-[var(--border)]">
                  <button onClick={() => toggleReadingTask(task.id, task.is_completed)} disabled={toggling === task.id}
                    className="flex items-center justify-center flex-shrink-0 rounded-lg transition-colors"
                    style={{ width: '26px', height: '26px', marginTop: '1px', background: '#fff', border: '2px solid #D0CBC4', cursor: 'pointer' }} />
                  <div className="flex-1">
                    <div className="font-medium text-dark" style={{ fontSize: '15px' }}>{task.title}</div>
                    {task.source && <div style={{ fontSize: '13px', color: 'var(--mid)', marginTop: '3px' }}>{task.source}</div>}
                    <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>{task.due_date ? `Due ${fmtDate(task.due_date)}` : `Assigned ${fmtDate(task.created_at)}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedReadings.length > 0 && (
            <>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mid)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Completed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedReadings.map(task => (
                  <div key={task.id} className="rounded-[14px] flex gap-4 items-start px-5 py-4 border border-[var(--border)]" style={{ background: 'var(--warm-gray)' }}>
                    <button onClick={() => toggleReadingTask(task.id, task.is_completed)} disabled={toggling === task.id}
                      className="flex items-center justify-center flex-shrink-0 rounded-lg"
                      style={{ width: '26px', height: '26px', marginTop: '1px', background: '#27AE60', border: '2px solid #27AE60', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>✓</button>
                    <div className="flex-1">
                      <div className="font-medium" style={{ fontSize: '15px', color: 'var(--mid)', textDecoration: 'line-through' }}>{task.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state when only loading */}
      {loadingTasks && readingAssignments.length === 0 && (
        <div className="text-center py-8 text-mid" style={{ fontSize: 14 }}>Loading tasks…</div>
      )}
    </div>
  )
}
