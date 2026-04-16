'use client'

import { useState } from 'react'
import TaskCard, { type TaskCardData } from './TaskCard'

interface Props {
  name: string
  tasks: TaskCardData[]
  onEditTask: (id: string, updates: { title: string; description: string | null; category: string }) => void
  onDeleteTask: (id: string) => void
  onUngroup: (subsection: string) => void
  onReorder: (orderedIds: string[]) => void
}

export default function SubSection({ name, tasks, onEditTask, onDeleteTask, onUngroup, onReorder }: Props) {
  const [confirmUngroup, setConfirmUngroup] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const reordered = [...tasks]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    onReorder(reordered.map(t => t.id))
    setDragIdx(idx)
  }

  function handleDragEnd() {
    setDragIdx(null)
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      background: 'rgba(243,240,236,0.5)',
      padding: '10px 14px',
      marginBottom: 8,
    }}>
      {/* Sub-section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tasks.length > 0 ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{name}</span>
          <span style={{ fontSize: 11, color: 'var(--mid)' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!confirmUngroup ? (
          <button
            onClick={() => setConfirmUngroup(true)}
            title="Ungroup this sub-section"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--mid)', padding: '2px 6px',
            }}
          >
            📤
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--mid)' }}>
              Ungroup? {tasks.length} task{tasks.length !== 1 ? 's' : ''} will move to the main step.
            </span>
            <button
              onClick={() => setConfirmUngroup(false)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onUngroup(name); setConfirmUngroup(false) }}
              style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                border: 'none', background: 'var(--teal)', color: '#fff',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Ungroup
            </button>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task, idx) => (
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
    </div>
  )
}
