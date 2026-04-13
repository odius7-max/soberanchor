'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
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

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  reading:    'What stood out to you? Any reflections?',
  writing:    'Your response...',
  action:     'Notes on what you did...',
  meeting:    'How did the meeting go?',
  amends:     'Reflections on this amends...',
  service:    'What service did you do?',
  prayer:     'Any reflections?',
  meditation: 'Any reflections?',
  reflection: 'Your thoughts...',
  custom:     'Notes...',
}

function fmtDate(s: string) {
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task: SponsorTask): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date + 'T00:00:00') < new Date(new Date().toDateString())
}

// ── Sponsor Task row ──────────────────────────────────────────────────────────

function SponsorTaskRow({
  task,
  onUpdate,
}: {
  task: SponsorTask
  onUpdate: (id: string, status: 'assigned' | 'in_progress' | 'completed', note?: string) => Promise<void>
}) {
  const [expanded, setExpanded]     = useState(false)
  const [note, setNote]             = useState(task.sponsee_note ?? '')
  const [saveState, setSaveState]   = useState<'idle' | 'saving' | 'saved'>('idle')
  const [completing, setCompleting] = useState(false)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const isCompleted = task.status === 'completed'
  const overdue     = isOverdue(task)
  const placeholder = CATEGORY_PLACEHOLDERS[task.category] ?? 'Notes...'

  useEffect(() => () => { isMountedRef.current = false }, [])

  // Unified expand/collapse — called by both checkbox and CTA
  function handleToggleExpand() {
    const willExpand = !expanded
    setExpanded(willExpand)
    // Advance to in_progress only on first expand from assigned
    if (willExpand && task.status === 'assigned') {
      onUpdate(task.id, 'in_progress')
    }
  }

  // Debounced auto-save of the sponsee note
  function handleNoteChange(value: string) {
    setNote(value)
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('sponsor_tasks')
        .update({ sponsee_note: value.trim() || null })
        .eq('id', task.id)
      if (!isMountedRef.current) return
      if (!error) {
        setSaveState('saved')
        setTimeout(() => { if (isMountedRef.current) setSaveState('idle') }, 2000)
      } else {
        console.error('sponsee_note auto-save error:', error)
        setSaveState('idle')
      }
    }, 1000)
  }

  async function handleMarkComplete() {
    setCompleting(true)
    await onUpdate(task.id, 'completed', note || undefined)
    if (isMountedRef.current) {
      setCompleting(false)
      setExpanded(false)
    }
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: overdue ? '1.5px solid rgba(192,57,43,0.25)' : '1px solid var(--border)',
        background: isCompleted ? 'var(--warm-gray)' : overdue ? 'rgba(192,57,43,0.02)' : '#fff',
        padding: '13px 15px',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

        {/* Checkbox — completes if done, otherwise toggles expand panel */}
        <button
          onClick={() => { if (isCompleted) { onUpdate(task.id, 'assigned') } else { handleToggleExpand() } }}
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
            border: isCompleted
              ? 'none'
              : expanded
                ? '2px solid var(--teal)'
                : overdue
                  ? '2px solid rgba(192,57,43,0.4)'
                  : '2px solid var(--border)',
            background: isCompleted ? '#27AE60' : '#fff',
            color: '#fff', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isCompleted ? '✓' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isCompleted ? 'var(--mid)' : 'var(--navy)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {CATEGORY_ICONS[task.category] ?? '⭐'} {task.title}
            </span>
            {overdue && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#c0392b' }}>
                OVERDUE
              </span>
            )}
            {task.status === 'in_progress' && !overdue && !isCompleted && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(42,138,153,0.1)', color: 'var(--teal)' }}>
                IN PROGRESS
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

          {/* Completed: show sponsee note as read-only */}
          {isCompleted && task.sponsee_note && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--mid)', fontStyle: 'italic', lineHeight: 1.5 }}>
              &ldquo;{task.sponsee_note}&rdquo;
            </div>
          )}

          {/* Expanded response panel */}
          {expanded && !isCompleted && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Your response
                </span>
                {saveState === 'saving' && (
                  <span style={{ fontSize: 10, color: 'var(--mid)' }}>Saving…</span>
                )}
                {saveState === 'saved' && (
                  <span style={{ fontSize: 10, color: '#27AE60', fontWeight: 600 }}>✓ Saved</span>
                )}
              </div>
              <textarea
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                autoFocus
                style={{
                  width: '100%', fontSize: 13, padding: '9px 11px', borderRadius: 8,
                  border: '1.5px solid var(--teal)', fontFamily: 'var(--font-body)',
                  resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                  color: 'var(--dark)', lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                    color: 'var(--mid)', fontFamily: 'var(--font-body)', fontWeight: 500,
                  }}
                >
                  Collapse
                </button>
                <button
                  onClick={handleMarkComplete}
                  disabled={completing}
                  style={{
                    background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '7px 16px', fontSize: 12, fontWeight: 700,
                    cursor: completing ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-body)', opacity: completing ? 0.7 : 1,
                  }}
                >
                  {completing ? 'Saving…' : '✓ Mark Complete'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA — same action as checkbox: toggles the expand panel */}
        {!isCompleted && (
          <button
            onClick={handleToggleExpand}
            title={expanded ? 'Collapse' : task.status === 'in_progress' ? 'Continue task' : 'Start task'}
            style={{
              background: (expanded || task.status === 'in_progress') ? 'rgba(42,138,153,0.1)' : 'none',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              color: (expanded || task.status === 'in_progress') ? 'var(--teal)' : 'var(--mid)',
              flexShrink: 0, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            }}
          >
            {expanded ? '▲ Hide' : task.status === 'in_progress' ? '▶ In Progress' : 'Start'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main TasksTab ─────────────────────────────────────────────────────────────

export default function TasksTab({ userId, readingAssignments, hasSponsor }: Props) {
  const router = useRouter()
  const [sponsorTasks, setSponsorTasks] = useState<SponsorTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [toggling, setToggling]         = useState<string | null>(null)
  const [, startTransition]             = useTransition()

  // Fetch sponsor_tasks assigned to this user (re-runs on every mount)
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

  // Part 2 fix: check server action result and revert on error
  async function handleSponsorTaskUpdate(
    id: string,
    status: 'assigned' | 'in_progress' | 'completed',
    note?: string,
  ): Promise<void> {
    // Optimistic update
    setSponsorTasks(prev => prev.map(t =>
      t.id === id
        ? {
            ...t,
            status,
            completed_at: status === 'completed'
              ? new Date().toISOString()
              : status === 'assigned' ? null : t.completed_at,
            sponsee_note: note !== undefined ? note : t.sponsee_note,
          }
        : t
    ))

    const result = await updateTaskStatus({ taskId: id, status, sponseeNote: note })

    if (result.error) {
      // Server action failed — revert by re-fetching fresh DB state
      console.error('[TasksTab] updateTaskStatus failed:', result.error)
      const supabase = createClient()
      const { data } = await supabase
        .from('sponsor_tasks')
        .select('*')
        .eq('sponsee_id', userId)
        .order('assigned_at', { ascending: false })
      if (data) setSponsorTasks(data as SponsorTask[])
      return
    }

    startTransition(() => { router.refresh() })
  }

  const hasTasks   = hasSponsor && (readingAssignments.length > 0 || sponsorTasks.length > 0)
  const hasAnything = hasTasks || (!loadingTasks && sponsorTasks.length > 0)
  void hasAnything // suppress unused warning

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
                  <button
                    onClick={() => toggleReadingTask(task.id, task.is_completed)}
                    disabled={toggling === task.id}
                    className="flex items-center justify-center flex-shrink-0 rounded-lg transition-colors"
                    style={{ width: '26px', height: '26px', marginTop: '1px', background: '#fff', border: '2px solid #D0CBC4', cursor: 'pointer' }}
                  />
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
                    <button
                      onClick={() => toggleReadingTask(task.id, task.is_completed)}
                      disabled={toggling === task.id}
                      className="flex items-center justify-center flex-shrink-0 rounded-lg"
                      style={{ width: '26px', height: '26px', marginTop: '1px', background: '#27AE60', border: '2px solid #27AE60', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                    >✓</button>
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
