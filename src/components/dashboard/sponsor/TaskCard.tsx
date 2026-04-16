'use client'

import { useState, useRef, useEffect } from 'react'

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  reading:    { border: '#3a7ca5', bg: 'rgba(58,124,165,0.08)', text: '#3a7ca5' },
  writing:    { border: '#d4a017', bg: 'rgba(212,160,23,0.08)', text: '#9A7B54' },
  reflection: { border: '#8b6bb8', bg: 'rgba(139,107,184,0.08)', text: '#8b6bb8' },
  action:     { border: '#38a169', bg: 'rgba(56,161,105,0.08)', text: '#38a169' },
}

export interface TaskCardData {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  subsection: string | null
  source: string
}

interface Props {
  task: TaskCardData
  onEdit: (id: string, updates: { title: string; description: string | null; category: string }) => void
  onDelete: (id: string) => void
  flash?: boolean
}

export default function TaskCard({ task, onEdit, onDelete, flash }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description ?? '')
  const [editCategory, setEditCategory] = useState(task.category)
  const titleRef = useRef<HTMLInputElement>(null)

  const cat = CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.reflection

  useEffect(() => {
    if (editing && titleRef.current) titleRef.current.focus()
  }, [editing])

  function startEdit() {
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
    setEditCategory(task.category)
    setEditing(true)
    setConfirmDelete(false)
  }

  function saveEdit() {
    if (!editTitle.trim()) return
    onEdit(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      category: editCategory,
    })
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        style={{
          borderLeft: `4px solid ${CATEGORY_COLORS[editCategory]?.border ?? cat.border}`,
          borderRadius: 12,
          border: `1.5px solid var(--teal)`,
          borderLeftWidth: 4,
          borderLeftColor: CATEGORY_COLORS[editCategory]?.border ?? cat.border,
          background: '#fff',
          padding: '14px 16px',
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <input
            ref={titleRef}
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
            placeholder="Task title"
            style={{
              width: '100%', fontSize: 14, fontWeight: 600, color: 'var(--navy)',
              padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: '#fff', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            style={{
              width: '100%', fontSize: 13, color: 'var(--dark)',
              padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: '#fff', fontFamily: 'var(--font-body)', outline: 'none',
              boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={editCategory}
            onChange={e => setEditCategory(e.target.value)}
            style={{
              fontSize: 12, padding: '5px 8px', borderRadius: 6,
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
            onClick={cancelEdit}
            style={{
              fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            disabled={!editTitle.trim()}
            style={{
              fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8,
              border: 'none', background: editTitle.trim() ? 'var(--teal)' : '#ccc',
              color: '#fff', cursor: editTitle.trim() ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (confirmDelete) {
    return (
      <div
        style={{
          borderLeft: `4px solid #C0392B`,
          borderRadius: 12,
          border: '1.5px solid rgba(192,57,43,0.3)',
          borderLeftWidth: 4,
          borderLeftColor: '#C0392B',
          background: 'rgba(192,57,43,0.03)',
          padding: '14px 16px',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--dark)', marginBottom: 12, lineHeight: 1.6 }}>
          Delete this task? This can&apos;t be undone.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{
              flex: 1, fontSize: 12, fontWeight: 600, padding: '7px', borderRadius: 8,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onDelete(task.id); setConfirmDelete(false) }}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, padding: '7px', borderRadius: 8,
              border: 'none', background: '#C0392B', color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        borderLeft: `4px solid ${cat.border}`,
        borderRadius: 12,
        border: '1px solid var(--border)',
        borderLeftWidth: 4,
        borderLeftColor: cat.border,
        background: '#fff',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        transition: 'box-shadow 0.3s',
        boxShadow: flash ? '0 0 0 2px rgba(240, 192, 64, 0.4)' : 'none',
      }}
    >
      {/* Drag handle */}
      <div
        className="drag-handle"
        style={{
          cursor: 'grab', flexShrink: 0, paddingTop: 2, color: 'var(--mid)',
          fontSize: 14, lineHeight: 1, userSelect: 'none',
        }}
        title="Drag to reorder"
      >
        ⠿
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: task.description ? 4 : 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{task.title}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: cat.bg, color: cat.text, textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {task.category}
          </span>
        </div>
        {task.description && (
          <div
            onClick={() => setExpanded(v => !v)}
            style={{
              fontSize: 13, color: 'var(--mid)', lineHeight: 1.5, cursor: 'pointer',
              ...(expanded ? {} : {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }),
            }}
          >
            {task.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={startEdit}
          title="Edit"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            fontSize: 14, color: 'var(--mid)', lineHeight: 1,
          }}
        >
          ✏️
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          title="Delete"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            fontSize: 14, color: 'var(--mid)', lineHeight: 1,
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
