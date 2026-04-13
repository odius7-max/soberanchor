'use client'

import { useState, useTransition } from 'react'
import AssignTaskModal from './AssignTaskModal'
import type { SponsorTask } from '@/app/actions/sponsorTasks'
import { deleteTask } from '@/app/actions/sponsorTasks'
import { useRouter } from 'next/navigation'

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
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(task: SponsorTask): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date + 'T00:00:00') < new Date(new Date().toDateString())
}

interface Props {
  sponseeId: string
  sponseeName: string
  relationshipId: string
  initialTasks: SponsorTask[]
}

export default function SponseeTasksSection({ sponseeId, sponseeName, relationshipId, initialTasks }: Props) {
  const router = useRouter()
  const [showModal, setShowModal]       = useState(false)
  const [tasks, setTasks]               = useState<SponsorTask[]>(initialTasks)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [, startTransition]             = useTransition()

  const active    = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  function handleAssigned() {
    // Refresh server data
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    setDeletingId(id)
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
    startTransition(() => { router.refresh() })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
          📋 Tasks
          {active.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(42,138,153,0.1)', color: 'var(--teal)', verticalAlign: 'middle' }}>
              {active.length} active
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          + Assign Task
        </button>
      </div>

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--mid)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14 }}>No tasks assigned yet.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click &quot;Assign Task&quot; to give {sponseeName} something to work on.</div>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {active.map(task => {
            const overdue = isOverdue(task)
            return (
              <div
                key={task.id}
                style={{
                  borderRadius: 12, border: overdue ? '1.5px solid rgba(192,57,43,0.3)' : '1px solid var(--border)',
                  background: overdue ? 'rgba(192,57,43,0.03)' : '#fff',
                  padding: '13px 15px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{CATEGORY_ICONS[task.category] ?? '⭐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{task.title}</span>
                    {overdue && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#c0392b', whiteSpace: 'nowrap' }}>
                        OVERDUE
                      </span>
                    )}
                    {task.status === 'in_progress' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(42,138,153,0.1)', color: 'var(--teal)', whiteSpace: 'nowrap' }}>
                        IN PROGRESS
                      </span>
                    )}
                    {task.is_recurring && task.recurrence_interval && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mid)', padding: '2px 7px', borderRadius: 20, background: 'var(--warm-gray)' }}>
                        🔄 {task.recurrence_interval}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>{task.description}</div>
                  )}
                  {task.sponsor_note && (
                    <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 3, fontStyle: 'italic' }}>
                      Note: {task.sponsor_note}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>Assigned {fmtDate(task.assigned_at.slice(0, 10))}</span>
                    {task.due_date && (
                      <span style={{ color: overdue ? '#c0392b' : 'var(--mid)', fontWeight: overdue ? 700 : 400 }}>
                        · Due {fmtDate(task.due_date)}
                      </span>
                    )}
                    {task.sponsee_note && (
                      <span style={{ color: 'var(--navy)', fontStyle: 'italic' }}>· Note: &ldquo;{task.sponsee_note}&rdquo;</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={deletingId === task.id}
                  title="Delete task"
                  style={{
                    background: 'none', border: 'none', cursor: deletingId === task.id ? 'wait' : 'pointer',
                    color: 'var(--mid)', fontSize: 16, padding: 4, flexShrink: 0, opacity: 0.6,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
            Completed ({completed.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completed.map(task => (
              <div
                key={task.id}
                style={{
                  borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--warm-gray)', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{CATEGORY_ICONS[task.category] ?? '⭐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)', textDecoration: 'line-through' }}>{task.title}</div>
                  {task.sponsee_note && (
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2, fontStyle: 'italic' }}>
                      &ldquo;{task.sponsee_note}&rdquo;
                    </div>
                  )}
                  {task.completed_at && (
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                      Completed {fmtDate(task.completed_at.slice(0, 10))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={deletingId === task.id}
                  title="Delete task"
                  style={{
                    background: 'none', border: 'none', cursor: deletingId === task.id ? 'wait' : 'pointer',
                    color: 'var(--mid)', fontSize: 14, padding: 4, flexShrink: 0, opacity: 0.4,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <AssignTaskModal
          sponseeId={sponseeId}
          sponseeName={sponseeName}
          relationshipId={relationshipId}
          onClose={() => setShowModal(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}
