'use client'

import { useState, useEffect } from 'react'

interface Program {
  fellowshipId: string
  fellowshipAbbr: string
}

interface Props {
  programs: Program[]
  defaultFellowshipId: string
  onChange: (fellowshipId: string) => void
  dark?: boolean
}

const STORAGE_KEY = 'sa:selectedFellowship'

export default function ProgramPills({ programs, defaultFellowshipId, onChange, dark = false }: Props) {
  const [selected, setSelected] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultFellowshipId
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored && programs.some(p => p.fellowshipId === stored) ? stored : defaultFellowshipId
  })

  useEffect(() => {
    if (programs.length <= 1) return
    sessionStorage.setItem(STORAGE_KEY, selected)
    onChange(selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  if (programs.length <= 1) return null

  return (
    <div role="tablist" aria-label="Program" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {programs.map(p => {
        const active = p.fellowshipId === selected
        return (
          <button
            key={p.fellowshipId}
            role="tab"
            aria-selected={active}
            onClick={() => setSelected(p.fellowshipId)}
            style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: dark
                ? (active ? '1.5px solid rgba(42,138,153,0.8)' : '1px solid rgba(255,255,255,0.2)')
                : (active ? '1.5px solid var(--teal)' : '1px solid var(--border)'),
              background: dark
                ? (active ? 'rgba(42,138,153,0.18)' : 'transparent')
                : (active ? 'rgba(42,138,153,0.08)' : 'transparent'),
              color: dark
                ? (active ? '#7dd3da' : 'rgba(255,255,255,0.55)')
                : (active ? 'var(--teal)' : 'var(--mid)'),
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              letterSpacing: '0.4px',
            }}
          >
            {p.fellowshipAbbr}
          </button>
        )
      })}
    </div>
  )
}
