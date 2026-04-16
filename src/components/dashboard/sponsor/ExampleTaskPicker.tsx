'use client'

import { useState, useEffect } from 'react'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  reading:    { bg: 'rgba(58,124,165,0.08)', text: '#3a7ca5' },
  writing:    { bg: 'rgba(212,160,23,0.08)', text: '#9A7B54' },
  reflection: { bg: 'rgba(139,107,184,0.08)', text: '#8b6bb8' },
  action:     { bg: 'rgba(56,161,105,0.08)', text: '#38a169' },
}

export interface ExampleTask {
  id: string
  title: string
  description: string | null
  category: string
}

interface Props {
  examples: ExampleTask[]
  existingTitles: Set<string>
  onAdd: (tasks: ExampleTask[]) => void
}

export default function ExampleTaskPicker({ examples, existingTitles, onAdd }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filter out already-added examples
  const available = examples.filter(e => !existingTitles.has(e.title))
  const alreadyAdded = examples.filter(e => existingTitles.has(e.title))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    const tasks = examples.filter(e => selected.has(e.id))
    onAdd(tasks)
    setSelected(new Set())
  }

  return (
    <div>
      {available.length === 0 && alreadyAdded.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--mid)', fontSize: 13 }}>
          All example tasks have been added to this step.
        </div>
      )}

      {available.length === 0 && alreadyAdded.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--mid)', fontSize: 13 }}>
          No example tasks available for this step.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {available.map(ex => {
          const cat = CATEGORY_COLORS[ex.category] ?? CATEGORY_COLORS.reflection
          const isSelected = selected.has(ex.id)
          return (
            <label
              key={ex.id}
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
                onChange={() => toggle(ex.id)}
                style={{ accentColor: 'var(--teal)', marginTop: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: ex.description ? 3 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{ex.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: cat.bg, color: cat.text, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {ex.category}
                  </span>
                </div>
                {ex.description && (
                  <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>{ex.description}</div>
                )}
              </div>
            </label>
          )
        })}

        {/* Already added items */}
        {alreadyAdded.map(ex => {
          const cat = CATEGORY_COLORS[ex.category] ?? CATEGORY_COLORS.reflection
          return (
            <div
              key={ex.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 10, opacity: 0.5,
                border: '1px solid var(--border)', background: 'var(--warm-gray)',
              }}
            >
              <input type="checkbox" checked disabled style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mid)' }}>{ex.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: cat.bg, color: cat.text, textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {ex.category}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mid)' }}>already added</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add selected button */}
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
