'use client'

import { useState, useRef, useEffect } from 'react'
import TaskCard, { type TaskCardData } from './TaskCard'
import SubSection from './SubSection'

interface Props {
  stepNumber: number
  stepName: string
  tasks: TaskCardData[]
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onEditTask: (id: string, updates: { title: string; description: string | null; category: string }) => void
  onDeleteTask: (id: string) => void
  onReorder: (stepNumber: number, orderedIds: string[]) => void
  onCreateTask: (stepNumber: number, title: string, description: string | null, category: string, subsection: string | null) => void
  onUngroupSubsection: (stepNumber: number, subsection: string) => void
}

export default function StepAccordion({
  stepNumber, stepName, tasks, isActive, isExpanded, onToggle,
  onEditTask, onDeleteTask, onReorder, onCreateTask, onUngroupSubsection,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('reflection')
  const [showAddSubsection, setShowAddSubsection] = useState(false)
  const [newSubsectionName, setNewSubsectionName] = useState('')

  // Separate tasks into ungrouped and grouped by subsection
  const ungroupedTasks = tasks.filter(t => !t.subsection)
  const subsections = new Map<string, TaskCardData[]>()
  for (const t of tasks) {
    if (t.subsection) {
      const list = subsections.get(t.subsection) ?? []
      list.push(t)
      subsections.set(t.subsection, list)
    }
  }

  const taskCount = tasks.length

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const reordered = [...ungroupedTasks]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    // Include subsection tasks at the end (they keep their own order)
    const allIds = [...reordered.map(t => t.id)]
    for (const [, subTasks] of subsections) {
      allIds.push(...subTasks.map(t => t.id))
    }
    onReorder(stepNumber, allIds)
    setDragIdx(idx)
  }

  function handleDragEnd() {
    setDragIdx(null)
  }

  function handleAddTask() {
    if (!newTitle.trim()) return
    onCreateTask(stepNumber, newTitle.trim(), newDesc.trim() || null, newCategory, null)
    setNewTitle('')
    setNewDesc('')
    setNewCategory('reflection')
    setShowAddForm(false)
  }

  function handleAddSubsection() {
    if (!newSubsectionName.trim()) return
    // Subsections are virtual — we just need the name. It'll show up when tasks are assigned to it.
    // For now, create a placeholder task in the subsection.
    setNewSubsectionName('')
    setShowAddSubsection(false)
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: isActive ? '2px solid var(--teal)' : '1px solid var(--border)',
        background: isExpanded ? '#fff' : 'var(--warm-gray)',
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 12, color: isActive ? 'var(--teal)' : 'var(--mid)',
          transition: 'transform 0.2s', display: 'inline-block',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>
          ▶
        </span>

        {/* Step name */}
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', flex: 1, minWidth: 0 }}>
          Step {stepNumber}: {stepName}
        </span>

        {/* Active badge */}
        {isActive && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.3)',
            color: '#f0c040', letterSpacing: '0.5px', textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            Active
          </span>
        )}

        {/* Task count */}
        <span style={{
          fontSize: 12, fontWeight: 600, flexShrink: 0,
          color: taskCount > 0 ? 'var(--teal)' : 'var(--mid)',
        }}>
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>

        {/* Teal dots for steps with tasks */}
        {!isExpanded && taskCount > 0 && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {Array.from({ length: Math.min(taskCount, 5) }).map((_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }} />
            ))}
            {taskCount > 5 && <span style={{ fontSize: 10, color: 'var(--mid)' }}>+{taskCount - 5}</span>}
          </div>
        )}
      </button>

      {/* Body */}
      {isExpanded && (
        <div ref={contentRef} style={{ padding: '0 18px 16px' }}>
          {taskCount === 0 && !showAddForm ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mid)', fontSize: 13 }}>
              No tasks for this step yet.
            </div>
          ) : (
            <>
              {/* Ungrouped tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ungroupedTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <TaskCard task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                  </div>
                ))}
              </div>

              {/* Subsections */}
              {Array.from(subsections.entries()).map(([name, subTasks]) => (
                <div key={name} style={{ marginTop: 10 }}>
                  <SubSection
                    name={name}
                    tasks={subTasks}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onUngroup={sub => onUngroupSubsection(stepNumber, sub)}
                    onReorder={ids => onReorder(stepNumber, [
                      ...ungroupedTasks.map(t => t.id),
                      ...ids,
                      ...Array.from(subsections.entries())
                        .filter(([n]) => n !== name)
                        .flatMap(([, t]) => t.map(tt => tt.id)),
                    ])}
                  />
                </div>
              ))}
            </>
          )}

          {/* Add sub-section link */}
          {showAddSubsection ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input
                type="text"
                value={newSubsectionName}
                onChange={e => setNewSubsectionName(e.target.value)}
                placeholder="Sub-section name (e.g. Resentments)"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubsection()
                  if (e.key === 'Escape') { setShowAddSubsection(false); setNewSubsectionName('') }
                }}
                style={{
                  flex: 1, fontSize: 13, padding: '6px 10px', borderRadius: 8,
                  border: '1.5px solid var(--border)', fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddSubsection}
                disabled={!newSubsectionName.trim()}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                  border: 'none', background: newSubsectionName.trim() ? 'var(--teal)' : '#ccc',
                  color: '#fff', cursor: newSubsectionName.trim() ? 'pointer' : 'default',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddSubsection(false); setNewSubsectionName('') }}
                style={{
                  fontSize: 12, color: 'var(--mid)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px',
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSubsection(true)}
              style={{
                display: 'block', marginTop: 10, fontSize: 12, color: 'var(--mid)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              + Add sub-section
            </button>
          )}

          {/* Add task form */}
          {showAddForm ? (
            <div style={{
              marginTop: 12, border: '1.5px dashed var(--teal)', borderRadius: 12,
              padding: '14px 16px', background: 'rgba(42,157,143,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                + Add task to Step {stepNumber}
              </div>
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Task title (required)"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAddTask() }}
                  style={{
                    width: '100%', fontSize: 14, fontWeight: 600, color: 'var(--navy)',
                    padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                    background: '#fff', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Instructions for sponsee (optional)"
                  rows={2}
                  style={{
                    width: '100%', fontSize: 13, color: 'var(--dark)',
                    padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                    background: '#fff', fontFamily: 'var(--font-body)', outline: 'none',
                    boxSizing: 'border-box', resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  style={{
                    fontSize: 13, padding: '7px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: '#fff',
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <option value="reading">📖 Reading</option>
                  <option value="writing">✏️ Writing</option>
                  <option value="reflection">💭 Reflection</option>
                  <option value="action">✅ Action</option>
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setShowAddForm(false); setNewTitle(''); setNewDesc('') }}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTitle.trim()}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8,
                    border: 'none', background: newTitle.trim() ? 'var(--teal)' : '#ccc',
                    color: '#fff', cursor: newTitle.trim() ? 'pointer' : 'default',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Add to Step {stepNumber}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'block', width: '100%', marginTop: 12,
                padding: '10px', borderRadius: 10,
                border: '1.5px dashed rgba(42,157,143,0.3)', background: 'transparent',
                color: 'var(--teal)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,157,143,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              + Add task
            </button>
          )}
        </div>
      )}
    </div>
  )
}
