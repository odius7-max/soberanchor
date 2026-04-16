'use client'

import { useState } from 'react'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  reading:    { bg: 'rgba(58,124,165,0.08)', text: '#3a7ca5' },
  writing:    { bg: 'rgba(212,160,23,0.08)', text: '#9A7B54' },
  reflection: { bg: 'rgba(139,107,184,0.08)', text: '#8b6bb8' },
  action:     { bg: 'rgba(56,161,105,0.08)', text: '#38a169' },
}

export interface LibraryPickerTask {
  id: string
  title: string
  description: string | null
  category: string
  step_number: number
}

interface Props {
  tasks: LibraryPickerTask[]
  onAdd: (tasks: LibraryPickerTask[]) => void
}

export default function LibraryTaskPicker({ tasks, onAdd }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    const toAdd = tasks.filter(t => selected.has(t.id))
    onAdd(toAdd)
    setSelected(new Set())
  }

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
        Your library is empty. Create tasks or add examples — they&apos;ll appear here for reuse.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map(task => {
          const cat = CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.reflection
          const isSelected = selected.has(task.id)
          return (
            <label
              key={task.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(42,157,143,0.04)' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(task.id)}
                style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: task.description ? 3 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{task.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: cat.bg, color: cat.text, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {task.category}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--mid)' }}>from Step {task.step_number}</span>
                </div>
                {task.description && (
                  <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>{task.description}</div>
                )}
              </div>
            </label>
          )
        })}
      </div>

      {selected.size > 0 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleAdd}
            style={{
              fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8,
              border: 'none', background: 'var(--teal)', color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Add {selected.size} Selected
          </button>
        </div>
      )}
    </div>
  )
}
