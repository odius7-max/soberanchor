'use client'

import { useState, useRef } from 'react'
import TaskCard, { type TaskCardData } from './TaskCard'
import SubSection from './SubSection'
import AddTaskZone from './AddTaskZone'
import type { ExampleTask } from './ExampleTaskPicker'
import type { LibraryPickerTask } from './LibraryTaskPicker'

interface Props {
  stepNumber: number
  stepName: string
  tasks: TaskCardData[]
  examples: ExampleTask[]
  libraryTasks: LibraryPickerTask[]
  existingTitles: Set<string>
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onEditTask: (id: string, updates: { title: string; description: string | null; category: string }) => void
  onDeleteTask: (id: string) => void
  onReorder: (stepNumber: number, orderedIds: string[]) => void
  onCreateTask: (stepNumber: number, title: string, description: string | null, category: string, subsection: string | null) => void
  onAddFromExamples: (examples: { title: string; description: string | null; category: string }[]) => void
  onAddFromLibrary: (tasks: { title: string; description: string | null; category: string }[]) => void
  onUngroupSubsection: (stepNumber: number, subsection: string) => void
  onSetSubsection: (taskId: string, subsection: string | null) => void
}

export default function StepAccordion({
  stepNumber, stepName, tasks, examples, libraryTasks, existingTitles,
  isActive, isExpanded, onToggle,
  onEditTask, onDeleteTask, onReorder, onCreateTask,
  onAddFromExamples, onAddFromLibrary, onUngroupSubsection, onSetSubsection,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [showAddZone, setShowAddZone] = useState(false)
  const [showAddSubsection, setShowAddSubsection] = useState(false)
  const [newSubsectionName, setNewSubsectionName] = useState('')
  // Track empty sub-sections that have been created but have no tasks yet
  const [emptySubsections, setEmptySubsections] = useState<string[]>([])

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
  // Merge in empty sub-sections so they render even with 0 tasks
  for (const name of emptySubsections) {
    if (!subsections.has(name)) {
      subsections.set(name, [])
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

  function handleAddSubsection() {
    const name = newSubsectionName.trim()
    if (!name) return
    // Don't allow duplicate names
    if (subsections.has(name)) {
      setNewSubsectionName('')
      setShowAddSubsection(false)
      return
    }
    setEmptySubsections(prev => [...prev, name])
    setNewSubsectionName('')
    setShowAddSubsection(false)
  }

  // When a sub-section is ungrouped, also remove it from emptySubsections
  function handleUngroupSubsection(sub: string) {
    setEmptySubsections(prev => prev.filter(s => s !== sub))
    onUngroupSubsection(stepNumber, sub)
  }

  // Move a task into a sub-section
  function handleMoveToSubsection(taskId: string, subsection: string) {
    onSetSubsection(taskId, subsection)
    // Clean up empty subsections list if a task is now in it
    setEmptySubsections(prev => prev.filter(s => s !== subsection))
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
        <span style={{
          fontSize: 12, color: isActive ? 'var(--teal)' : 'var(--mid)',
          transition: 'transform 0.2s', display: 'inline-block',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>
          ▶
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', flex: 1, minWidth: 0 }}>
          Step {stepNumber}: {stepName}
        </span>
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
        <span style={{
          fontSize: 12, fontWeight: 600, flexShrink: 0,
          color: taskCount > 0 ? 'var(--teal)' : 'var(--mid)',
        }}>
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>
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
          {taskCount === 0 && !showAddZone ? (
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
                    onDragStart={(e) => { e.dataTransfer.setData('text/task-id', task.id); handleDragStart(idx) }}
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
                    onUngroup={handleUngroupSubsection}
                    onReorder={ids => onReorder(stepNumber, [
                      ...ungroupedTasks.map(t => t.id),
                      ...ids,
                      ...Array.from(subsections.entries())
                        .filter(([n]) => n !== name)
                        .flatMap(([, t]) => t.map(tt => tt.id)),
                    ])}
                    onDrop={taskId => handleMoveToSubsection(taskId, name)}
                    onAddTask={(title, desc, cat) => onCreateTask(stepNumber, title, desc, cat, name)}
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

          {/* Add Task Zone (Phase 2: three source accordions) */}
          {showAddZone ? (
            <AddTaskZone
              stepNumber={stepNumber}
              examples={examples}
              libraryTasks={libraryTasks}
              existingTitles={existingTitles}
              onClose={() => setShowAddZone(false)}
              onAddFromExamples={(exs) => {
                onAddFromExamples(exs.map(e => ({ title: e.title, description: e.description, category: e.category })))
              }}
              onAddFromLibrary={(items) => {
                onAddFromLibrary(items.map(t => ({ title: t.title, description: t.description, category: t.category })))
              }}
              onCreateNew={(task) => {
                onCreateTask(stepNumber, task.title, task.description, task.category, null)
              }}
            />
          ) : (
            <button
              onClick={() => setShowAddZone(true)}
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
