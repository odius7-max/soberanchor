'use client'

import { useEffect, useRef, useState } from 'react'

interface Option { value: string; label: string }

interface Props {
  options: Option[]          // non-empty options only (no "Any X" sentinel)
  selected: string[]
  onChange: (vals: string[]) => void
  defaultLabel: string       // shown when nothing selected, e.g. "Any Day"
  fieldLabel: string         // used in count label, e.g. "Day" → "Day (2)"
}

export default function MultiSelectDropdown({ options, selected, onChange, defaultLabel, fieldLabel }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  const isActive = selected.length > 0
  const label = isActive ? `${fieldLabel} (${selected.length})` : defaultLabel

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
          border: `1.5px solid ${isActive ? 'var(--teal)' : 'var(--border)'}`,
          background: isActive ? 'rgba(42,138,153,0.06)' : '#fff',
          color: isActive ? 'var(--teal)' : 'var(--dark)',
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {label}
        <svg
          width="9" height="5" viewBox="0 0 10 6" fill="none" aria-hidden
          style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.5 }}
        >
          <path d="M0 0l5 6 5-6z" fill="currentColor"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            background: '#fff', border: '1.5px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            minWidth: 170, zIndex: 200, padding: '5px 0',
            maxHeight: 280, overflowY: 'auto',
          }}
        >
          {options.map(opt => {
            const checked = selected.includes(opt.value)
            return (
              <div
                key={opt.value}
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => toggle(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
                  background: checked ? 'rgba(42,138,153,0.05)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLDivElement).style.background = 'var(--warm-gray)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = checked ? 'rgba(42,138,153,0.05)' : 'transparent' }}
              >
                {/* Visual checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${checked ? 'var(--teal)' : '#C8C3BD'}`,
                  background: checked ? 'var(--teal)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.1s, background 0.1s',
                }}>
                  {checked && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: 'var(--dark)', fontFamily: 'var(--font-body)' }}>
                  {opt.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
