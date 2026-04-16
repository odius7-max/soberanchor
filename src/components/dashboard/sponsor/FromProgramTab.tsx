'use client'

import { useState, useMemo } from 'react'
import { assignFromLibrary, type SponsorTask } from '@/app/actions/sponsorTasks'

interface LibraryTaskRow {
  id: string
  step_number: number
  title: string
  description: string | null
  category: string
  sort_order: number
  subsection: string | null
}

interface StepInfo {
  step_number: number
  name: string
}

interface Props {
  library: LibraryTaskRow[]
  steps: StepInfo[]
  currentStep: number | null
  assignedLibraryIds: Set<string>
  assignedMeta: Record<string, { assignedAt: string; completedAt: string | null }>
  sponseeId: string
  relationshipId: string
  onAssigned: (tasks: SponsorTask[]) => void
  onCancel: () => void
}

const CATEGORY_META: Record<string, { color: string; bg: string; label: string }> = {
  reading:    { color: '#3a7ca5', bg: 'rgba(58,124,165,0.1)',  label: 'Reading'    },
  writing:    { color: '#d4a017', bg: 'rgba(212,160,23,0.12)', label: 'Writing'    },
  reflection: { color: '#8b6bb8', bg: 'rgba(139,107,184,0.12)', label: 'Reflection' },
  action:     { color: '#38a169', bg: 'rgba(56,161,105,0.12)', label: 'Action'     },
}

function fmtDate(s: string) {
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function FromProgramTab({
  library, steps, currentStep, assignedLibraryIds, assignedMeta,
  sponseeId, relationshipId, onAssigned, onCancel,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(() => {
    const s = new Set<number>()
    if (currentStep) s.add(currentStep)
    return s
  })
  const [dueDate, setDueDate] = useState('')
  const [sponsorNote, setSponsorNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group tasks by step
  const tasksByStep = useMemo(() => {
    const map = new Map<number, LibraryTaskRow[]>()
    for (const t of library) {
      const arr = map.get(t.step_number) ?? []
      arr.push(t)
      map.set(t.step_number, arr)
    }
    for (const [, arr] of map) arr.sort((a, b) => a.sort_order - b.sort_order)
    return map
  }, [library])

  // Per-step assigned counts for header display
  const stepAssignedCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const t of library) {
      if (assignedLibraryIds.has(t.id)) {
        counts.set(t.step_number, (counts.get(t.step_number) ?? 0) + 1)
      }
    }
    return counts
  }, [library, assignedLibraryIds])

  function toggleStep(step: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  function toggleSelect(taskId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  async function handleAssign() {
    if (selected.size === 0) return
    setSaving(true)
    setError(null)
    const result = await assignFromLibrary({
      sponseeId,
      relationshipId,
      libraryTaskIds: Array.from(selected),
      dueDate: dueDate || null,
      sponsorNote: sponsorNote.trim() || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onAssigned(result.tasks)
  }

  if (library.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
          Your program is empty
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>
          Build your task library from the Program Builder, then come back here to assign.
        </div>
        <a
          href="/dashboard/sponsees/program"
          style={{
            display: 'inline-block', marginTop: 14,
            fontSize: 12, fontWeight: 700, color: 'var(--teal)',
            padding: '8px 14px', borderRadius: 8,
            border: '1.5px solid var(--teal)', textDecoration: 'none',
          }}
        >
          Open Program Builder →
        </a>
      </div>
    )
  }

  // Always include the sponsee's current step (even if empty) + any step with library tasks.
  // Current step is pinned to the top so it's the first thing the sponsor sees.
  const stepsToRender = (() => {
    const withTasks = steps.filter(s => tasksByStep.has(s.step_number))
    const currentStepInfo = currentStep ? steps.find(s => s.step_number === currentStep) : null
    const alreadyIncluded = currentStepInfo && withTasks.some(s => s.step_number === currentStep)
    const base = alreadyIncluded || !currentStepInfo ? withTasks : [currentStepInfo, ...withTasks]
    return base.sort((a, b) => {
      if (a.step_number === currentStep) return -1
      if (b.step_number === currentStep) return 1
      return a.step_number - b.step_number
    })
  })()

  return (
    <div style={{ padding: '14px 24px 20px' }}>
      {/* Step accordions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stepsToRender.map(step => {
          const tasks = tasksByStep.get(step.step_number) ?? []
          const isCurrent = step.step_number === currentStep
          const isExpanded = expandedSteps.has(step.step_number)
          const assignedCount = stepAssignedCounts.get(step.step_number) ?? 0

          return (
            <div key={step.step_number} style={{
              border: isCurrent ? '1.5px solid var(--teal)' : '1px solid var(--border)',
              borderRadius: 12,
              background: isCurrent ? 'rgba(42,157,143,0.03)' : '#fff',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => toggleStep(step.step_number)}
                style={{
                  width: '100%', textAlign: 'left' as const, background: 'none', border: 'none',
                  padding: '12px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--mid)', width: 10 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  Step {step.step_number} · {step.name}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                    padding: '2px 7px', borderRadius: 20,
                    background: 'rgba(240,192,64,0.18)', color: '#9A7B54',
                  }}>
                    CURRENT STEP
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mid)' }}>
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  {assignedCount > 0 && ` · ${assignedCount} assigned`}
                </span>
              </button>

              {isExpanded && tasks.length === 0 && (
                <div style={{ padding: '4px 16px 16px' }}>
                  <div style={{
                    borderRadius: 10,
                    border: '1px dashed var(--border)',
                    background: 'rgba(42,157,143,0.03)',
                    padding: '14px 16px',
                    fontSize: 12, color: 'var(--mid)', lineHeight: 1.55,
                  }}>
                    You haven&apos;t created any tasks for Step {step.step_number} yet.{' '}
                    <a
                      href="/dashboard/sponsees/program"
                      style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Build tasks in the Program Builder
                    </a>
                    {' '}or use the <strong style={{ color: 'var(--navy)' }}>Custom Task</strong> tab to create one on the fly.
                  </div>
                </div>
              )}

              {isExpanded && tasks.length > 0 && (
                <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tasks.map(task => {
                    const alreadyAssigned = assignedLibraryIds.has(task.id)
                    const meta = assignedMeta[task.id]
                    const isSelected = selected.has(task.id)
                    const cat = CATEGORY_META[task.category] ?? CATEGORY_META.reflection
                    return (
                      <label
                        key={task.id}
                        style={{
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          padding: '10px 12px', borderRadius: 10,
                          background: alreadyAssigned ? 'var(--warm-gray)' : isSelected ? 'rgba(42,157,143,0.06)' : '#fff',
                          borderTop: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                          borderRight: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                          borderBottom: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                          borderLeft: `3px solid ${cat.color}`,
                          cursor: alreadyAssigned ? 'default' : 'pointer',
                          opacity: alreadyAssigned ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={alreadyAssigned}
                          onChange={() => toggleSelect(task.id)}
                          style={{ marginTop: 2, accentColor: 'var(--teal)', cursor: alreadyAssigned ? 'default' : 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                              {task.title}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                              background: cat.bg, color: cat.color,
                            }}>
                              {cat.label}
                            </span>
                            {task.subsection && (
                              <span style={{ fontSize: 10, color: 'var(--mid)' }}>· {task.subsection}</span>
                            )}
                          </div>
                          {task.description && (
                            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>
                              {task.description}
                            </div>
                          )}
                          {alreadyAssigned && meta && (
                            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 3, fontStyle: 'italic' }}>
                              {meta.completedAt
                                ? `Completed ${fmtDate(meta.completedAt)}`
                                : `Assigned ${fmtDate(meta.assignedAt)}`}
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Due date + sponsor note shared across selection */}
      {selected.size > 0 && (
        <div style={{
          marginTop: 16, padding: '14px',
          borderRadius: 12, border: '1px solid var(--border)',
          background: 'rgba(42,157,143,0.03)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
                Due date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  width: '100%', fontSize: 13, padding: '8px 11px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: '#fff',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
                Note to sponsee (optional)
              </label>
              <textarea
                value={sponsorNote}
                onChange={e => setSponsorNote(e.target.value)}
                placeholder="Context or encouragement just for them…"
                rows={2}
                style={{
                  width: '100%', fontSize: 13, padding: '8px 11px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: '#fff',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const,
                  resize: 'vertical' as const,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 12, fontSize: 13, color: '#c0392b' }}>{error}</div>}

      {/* Footer */}
      <div style={{
        marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <span style={{ fontSize: 13, color: 'var(--mid)' }}>
          {selected.size} task{selected.size !== 1 ? 's' : ''} selected
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: '1.5px solid var(--border)', borderRadius: 9,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={selected.size === 0 || saving}
            style={{
              background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 20px', fontSize: 13, fontWeight: 700,
              cursor: selected.size === 0 || saving ? 'not-allowed' : 'pointer',
              opacity: selected.size === 0 || saving ? 0.5 : 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? 'Assigning…' : `Assign ${selected.size || ''} Task${selected.size !== 1 ? 's' : ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}
