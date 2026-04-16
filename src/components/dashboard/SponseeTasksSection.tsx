'use client'

import { useState } from 'react'
import AssignTaskModal from './sponsor/AssignTaskModal'
import EditTaskModal from './AssignTaskModal'
import type { SponsorTask } from '@/app/actions/sponsorTasks'
import { deleteTask, reviewTask } from '@/app/actions/sponsorTasks'

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
  fellowshipId: string | null
  currentStep: number | null
  completedTasksCount: number
  lastSubmittedAt: string | null
  initialTasks: SponsorTask[]
}

export default function SponseeTasksSection({
  sponseeId, sponseeName, relationshipId,
  fellowshipId, currentStep, completedTasksCount, lastSubmittedAt,
  initialTasks,
}: Props) {
  const [showAssign, setShowAssign]     = useState(false)
  const [editingTask, setEditingTask]   = useState<SponsorTask | null>(null)
  const [reviewingTask, setReviewingTask] = useState<SponsorTask | null>(null)
  const [tasks, setTasks]               = useState<SponsorTask[]>(initialTasks)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const active    = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed')

  function handleAssigned(newTasks: SponsorTask[]) {
    setTasks(prev => [...newTasks, ...prev])
  }

  function handleEdited(updated: SponsorTask) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setEditingTask(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    setDeletingId(id)
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
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
          onClick={() => setShowAssign(true)}
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
                    {task.step_number && (
                      <span style={{ fontSize: 10, color: 'var(--mid)' }}>Step {task.step_number}</span>
                    )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditingTask(task)}
                    title="Edit task"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--mid)', fontSize: 13, padding: 4, lineHeight: 1, opacity: 0.7,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deletingId === task.id}
                    title="Delete task"
                    style={{
                      background: 'none', border: 'none', cursor: deletingId === task.id ? 'wait' : 'pointer',
                      color: 'var(--mid)', fontSize: 14, padding: 4, lineHeight: 1, opacity: 0.5,
                    }}
                  >
                    ✕
                  </button>
                </div>
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
            {completed.map(task => {
              const isReviewed = !!task.reviewed_at
              return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)', textDecoration: 'line-through' }}>{task.title}</span>
                      {isReviewed && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                          background: 'rgba(39,174,96,0.12)', color: '#27AE60', letterSpacing: '0.5px',
                        }}>
                          ✓ REVIEWED
                        </span>
                      )}
                    </div>
                    {task.sponsee_note && (
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2, fontStyle: 'italic' }}>
                        &ldquo;{task.sponsee_note}&rdquo;
                      </div>
                    )}
                    {task.sponsor_note && isReviewed && (
                      <div style={{ fontSize: 11, color: '#27AE60', marginTop: 2, fontStyle: 'italic' }}>
                        Your feedback: {task.sponsor_note}
                      </div>
                    )}
                    {task.completed_at && (
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                        Completed {fmtDate(task.completed_at.slice(0, 10))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!isReviewed && (
                      <button
                        onClick={() => setReviewingTask(task)}
                        title="Mark reviewed"
                        style={{
                          background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6,
                          padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                      title="Delete task"
                      style={{
                        background: 'none', border: 'none', cursor: deletingId === task.id ? 'wait' : 'pointer',
                        color: 'var(--mid)', fontSize: 14, padding: 4, opacity: 0.4, lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAssign && (
        <AssignTaskModal
          sponseeId={sponseeId}
          sponseeName={sponseeName}
          relationshipId={relationshipId}
          fellowshipId={fellowshipId}
          currentStep={currentStep}
          completedCount={completedTasksCount}
          lastSubmittedAt={lastSubmittedAt}
          onClose={() => setShowAssign(false)}
          onAssigned={handleAssigned}
        />
      )}

      {editingTask && (
        <EditTaskModal
          sponseeId={sponseeId}
          sponseeName={sponseeName}
          relationshipId={relationshipId}
          editTask={editingTask}
          onClose={() => setEditingTask(null)}
          onAssigned={handleEdited}
        />
      )}

      {reviewingTask && (
        <ReviewTaskModal
          task={reviewingTask}
          sponseeName={sponseeName}
          onClose={() => setReviewingTask(null)}
          onReviewed={(sponsorNote) => {
            setTasks(prev => prev.map(t =>
              t.id === reviewingTask.id
                ? { ...t, reviewed_at: new Date().toISOString(), sponsor_note: sponsorNote ?? t.sponsor_note }
                : t
            ))
            setReviewingTask(null)
          }}
        />
      )}
    </div>
  )
}

// ── Lightweight inline review modal ────────────────────────────────────────

function ReviewTaskModal({
  task, sponseeName, onClose, onReviewed,
}: {
  task: SponsorTask
  sponseeName: string
  onClose: () => void
  onReviewed: (sponsorNote: string | null) => void
}) {
  const [note, setNote] = useState(task.sponsor_note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const trimmed = note.trim() || null
    const result = await reviewTask({ taskId: task.id, sponsorNote: trimmed })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onReviewed(trimmed)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          width: '100%', maxWidth: 440,
          padding: 24,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>
            Mark as Reviewed
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--mid)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 14 }}>
          Leave optional feedback for {sponseeName} on &ldquo;{task.title}&rdquo;.
        </div>
        {task.sponsee_note && (
          <div style={{
            padding: '10px 12px', borderRadius: 8, background: 'var(--warm-gray)',
            fontSize: 12, color: 'var(--mid)', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5,
          }}>
            Their note: &ldquo;{task.sponsee_note}&rdquo;
          </div>
        )}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Feedback or encouragement (optional)…"
          rows={3}
          style={{
            width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 8,
            border: '1.5px solid var(--border)', fontFamily: 'var(--font-body)',
            resize: 'vertical', boxSizing: 'border-box', outline: 'none',
            color: 'var(--dark)', lineHeight: 1.5,
          }}
        />
        {error && <div style={{ fontSize: 13, color: '#c0392b', marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1.5px solid var(--border)', borderRadius: 9,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: '#27AE60', color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 20px', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? 'Saving…' : '✓ Mark Reviewed'}
          </button>
        </div>
      </div>
    </div>
  )
}
