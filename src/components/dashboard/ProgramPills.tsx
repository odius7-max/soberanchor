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
}

const STORAGE_KEY = 'sa:selectedFellowship'

export default function ProgramPills({ programs, defaultFellowshipId, onChange }: Props) {
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
    <div role="tablist" aria-label="Program" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      {programs.map(p => {
        const active = p.fellowshipId === selected
        return (
          <button
            key={p.fellowshipId}
            role="tab"
            aria-selected={active}
            onClick={() => setSelected(p.fellowshipId)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              border: active ? '1.5px solid var(--teal)' : '1px solid var(--border)',
              background: active ? 'rgba(42,138,153,0.08)' : 'transparent',
              color: active ? 'var(--teal)' : 'var(--mid)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {p.fellowshipAbbr}
          </button>
        )
      })}
    </div>
  )
}
