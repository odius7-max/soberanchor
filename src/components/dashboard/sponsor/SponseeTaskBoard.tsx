'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SponsorTask } from '@/app/actions/sponsorTasks'

const CATEGORY_META: Record<string, { color: string; bg: string; icon: string; placeholder: string }> = {
  reading:    { color: '#3a7ca5', bg: 'rgba(58,124,165,0.1)',  icon: '📖', placeholder: 'What stood out? Any reflections?' },
  writing:    { color: '#d4a017', bg: 'rgba(212,160,23,0.12)', icon: '✏️', placeholder: 'Your response…' },
  reflection: { color: '#8b6bb8', bg: 'rgba(139,107,184,0.12)', icon: '💭', placeholder: 'Your thoughts…' },
  action:     { color: '#38a169', bg: 'rgba(56,161,105,0.12)', icon: '✅', placeholder: 'Notes on what you did…' },
  meeting:    { color: '#2A8A99', bg: 'rgba(42,138,153,0.1)',  icon: '🤝', placeholder: 'How did the meeting go?' },
  amends:     { color: '#c0392b', bg: 'rgba(192,57,43,0.08)',  icon: '💛', placeholder: 'Reflections on this amends…' },
  service:    { color: '#9A7B54', bg: 'rgba(154,123,84,0.1)',  icon: '🙌', placeholder: 'What service did you do?' },
  prayer:     { color: '#8b6bb8', bg: 'rgba(139,107,184,0.1)', icon: '🙏', placeholder: 'Any reflections?' },
  meditation: { color: '#8b6bb8', bg: 'rgba(139,107,184,0.1)', icon: '🧘', placeholder: 'Any reflections?' },
  custom:     { color: 'var(--mid)', bg: 'var(--warm-gray)', icon: '⭐', placeholder: 'Notes…' },
}

function fmtDate(s: string) {
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Due-date red window: overdue or due within 2 days
function dueDateStyle(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed') return null
  const due = new Date(dueDate + 'T00:00:00').getTime()
  const now = new Date(new Date().toDateString()).getTime()
  const daysUntil = Math.floor((due - now) / 86400000)
  if (daysUntil < 0) return { color: '#c0392b', label: 'OVERDUE', urgent: true }
  if (daysUntil <= 2) return { color: '#c0392b', label: null, urgent: true }
  return null
}

function isNew(task: SponsorTask): boolean {
  if (task.status !== 'assigned') return false
  const assignedMs = new Date(task.assigned_at).getTime()
  return (Date.now() - assignedMs) < 24 * 60 * 60 * 1000
}

interface Props {
  userId: string
}

function TaskRow({
  task,
  onUpdate,
}: {
  task: SponsorTask
  onUpdate: (id: string, status: 'assigned' | 'in_progress' | 'completed', note?: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(task.sponsee_note ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [completing, setCompleting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => () => { isMountedRef.current = false }, [])

  const isCompleted = task.status === 'completed'
  const isReviewed = !!task.reviewed_at
  const cat = CATEGORY_META[task.category] ?? CATEGORY_META.custom
  const dueStyle = dueDateStyle(task.due_date, task.status)
  const fresh = isNew(task)

  function handleToggleExpand() {
    const willExpand = !expanded
    setExpanded(willExpand)
    if (willExpand && task.status === 'assigned') {
      onUpdate(task.id, 'in_progress')
    }
  }

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
        borderTop: dueStyle?.urgent ? '1.5px solid rgba(192,57,43,0.25)' : '1px solid var(--border)',
        borderRight: dueStyle?.urgent ? '1.5px solid rgba(192,57,43,0.25)' : '1px solid var(--border)',
        borderBottom: dueStyle?.urgent ? '1.5px solid rgba(192,57,43,0.25)' : '1px solid var(--border)',
        borderLeft: `3px solid ${cat.color}`,
        background: isCompleted ? 'var(--warm-gray)' : dueStyle?.urgent ? 'rgba(192,57,43,0.02)' : '#fff',
        padding: '13px 15px',
        opacity: isCompleted ? 0.75 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <button
          onClick={() => { if (isCompleted) onUpdate(task.id, 'assigned'); else handleToggleExpand() }}
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
            border: isCompleted
              ? 'none'
              : expanded
                ? '2px solid var(--teal)'
                : dueStyle?.urgent ? '2px solid rgba(192,57,43,0.4)' : '2px solid var(--border)',
            background: isCompleted ? '#27AE60' : '#fff',
            color: '#fff', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isCompleted ? '✓' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: isCompleted ? 'var(--mid)' : 'var(--navy)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}>
              {cat.icon} {task.title}
            </span>
            {fresh && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                padding: '2px 7px', borderRadius: 20,
                background: 'rgba(240,192,64,0.25)', color: '#9A7B54',
              }}>
                NEW
              </span>
            )}
            {dueStyle?.label && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: 'rgba(192,57,43,0.1)', color: '#c0392b',
              }}>
                {dueStyle.label}
              </span>
            )}
            {task.status === 'in_progress' && !dueStyle?.urgent && !isCompleted && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: 'rgba(42,138,153,0.1)', color: 'var(--teal)',
              }}>
                IN PROGRESS
              </span>
            )}
            {isCompleted && isReviewed && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: 'rgba(39,174,96,0.12)', color: '#27AE60',
              }}>
                ✓ REVIEWED BY SPONSOR
              </span>
            )}
          </div>

          {task.description && !isCompleted && (
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>{task.description}</div>
          )}

          {task.sponsor_note && (
            <div style={{ fontSize: 12, color: isReviewed ? '#27AE60' : 'var(--teal)', marginTop: 3, fontStyle: 'italic' }}>
              {isReviewed ? 'Sponsor feedback' : 'Sponsor note'}: {task.sponsor_note}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {task.due_date && (
              <span style={{ color: dueStyle ? '#c0392b' : 'var(--mid)', fontWeight: dueStyle ? 700 : 400 }}>
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

          {isCompleted && task.sponsee_note && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--mid)', fontStyle: 'italic', lineHeight: 1.5 }}>
              &ldquo;{task.sponsee_note}&rdquo;
            </div>
          )}

          {expanded && !isCompleted && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  Your response
                </span>
                {saveState === 'saving' && <span style={{ fontSize: 10, color: 'var(--mid)' }}>Saving…</span>}
                {saveState === 'saved' && <span style={{ fontSize: 10, color: '#27AE60', fontWeight: 600 }}>✓ Saved</span>}
              </div>
              <textarea
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder={cat.placeholder}
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

        {!isCompleted && (
          <button
            onClick={handleToggleExpand}
            title={expanded ? 'Collapse' : task.status === 'in_progress' ? 'Continue task' : 'Start task'}
            style={{
              background: (expanded || task.status === 'in_progress') ? 'rgba(42,138,153,0.1)' : 'none',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              color: (expanded || task.status === 'in_progress') ? 'var(--teal)' : 'var(--mid)',
              flexShrink: 0, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' as const,
            }}
          >
            {expanded ? '▲ Hide' : task.status === 'in_progress' ? '▶ In Progress' : 'Start'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SponseeTaskBoard({ userId }: Props) {
  const [tasks, setTasks] = useState<SponsorTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor_tasks')
      .select('*')
      .eq('sponsee_id', userId)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => {
        setTasks((data ?? []) as SponsorTask[])
        setLoading(false)
      })
  }, [userId])

  async function handleUpdate(id: string, status: 'assigned' | 'in_progress' | 'completed', note?: string) {
    setTasks(prev => prev.map(t =>
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

    const supabase = createClient()
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
      if (note !== undefined) updates.sponsee_note = note.trim() || null
    } else {
      updates.completed_at = null
    }

    const { error } = await supabase.from('sponsor_tasks').update(updates).eq('id', id)
    if (error) {
      const { data } = await supabase
        .from('sponsor_tasks')
        .select('*')
        .eq('sponsee_id', userId)
        .order('assigned_at', { ascending: false })
      if (data) setTasks(data as SponsorTask[])
    }
  }

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--mid)', padding: '12px 0' }}>Loading tasks…</div>
  }

  const active = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  if (tasks.length === 0) return null

  return (
    <div>
      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {active.map(task => <TaskRow key={task.id} task={task} onUpdate={handleUpdate} />)}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 6 }}>
            Completed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completed.map(task => <TaskRow key={task.id} task={task} onUpdate={handleUpdate} />)}
          </div>
        </>
      )}
    </div>
  )
}
