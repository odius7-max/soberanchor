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
  onDrop: (taskId: string) => void
  onAddTask: (title: string, description: string | null, category: string) => void
}

export default function SubSection({ name, tasks, onEditTask, onDeleteTask, onUngroup, onReorder, onDrop, onAddTask }: Props) {
  const [confirmUngroup, setConfirmUngroup] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('reflection')

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

  // Accept drops from ungrouped tasks
  function handleZoneDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleZoneDragLeave() {
    setDragOver(false)
  }

  function handleZoneDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const taskId = e.dataTransfer.getData('text/task-id')
    if (taskId) onDrop(taskId)
  }

  function handleAddTask() {
    if (!newTitle.trim()) return
    onAddTask(newTitle.trim(), newDesc.trim() || null, newCategory)
    setNewTitle('')
    setNewDesc('')
    setNewCategory('reflection')
    setShowAddForm(false)
  }

  return (
    <div
      onDragOver={handleZoneDragOver}
      onDragLeave={handleZoneDragLeave}
      onDrop={handleZoneDrop}
      style={{
        border: dragOver ? '1.5px dashed var(--teal)' : '1px solid var(--border)',
        borderRadius: 10,
        background: dragOver ? 'rgba(42,157,143,0.04)' : 'rgba(243,240,236,0.5)',
        padding: '10px 14px',
        marginBottom: 8,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Sub-section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tasks.length > 0 || showAddForm ? 10 : 0 }}>
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
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map((task, idx) => (
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
      )}

      {/* Empty state */}
      {tasks.length === 0 && !showAddForm && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--mid)', fontSize: 12 }}>
          Drag tasks here or add one below.
        </div>
      )}

      {/* Inline add task for this subsection */}
      {showAddForm ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAddTask(); if (e.key === 'Escape') setShowAddForm(false) }}
              style={{
                flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--navy)',
                padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: '#fff', fontFamily: 'var(--font-body)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{
                fontSize: 11, padding: '5px 6px', borderRadius: 6,
                border: '1px solid var(--border)', background: '#fff',
                fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}
            >
              <option value="reading">📖</option>
              <option value="writing">✏️</option>
              <option value="reflection">💭</option>
              <option value="action">✅</option>
            </select>
          </div>
          <textarea
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Instructions (optional)"
            rows={2}
            style={{
              width: '100%', fontSize: 12, color: 'var(--dark)',
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: '#fff', fontFamily: 'var(--font-body)', outline: 'none',
              boxSizing: 'border-box', resize: 'vertical', marginBottom: 6,
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowAddForm(false); setNewTitle(''); setNewDesc('') }}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
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
                fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 6,
                border: 'none', background: newTitle.trim() ? 'var(--teal)' : '#ccc',
                color: '#fff', cursor: newTitle.trim() ? 'pointer' : 'default',
                fontFamily: 'var(--font-body)',
              }}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'block', marginTop: 6, fontSize: 11, color: 'var(--teal)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontWeight: 600,
          }}
        >
          + Add task
        </button>
      )}
    </div>
  )
}
