'use client'
import { MOODS, type MoodKey } from './checkin-types'

interface Props {
  value: MoodKey | null
  onChange: (mood: MoodKey) => void
}

// Border/bg colors per mood when selected
const MOOD_COLORS: Record<MoodKey, { border: string; bg: string }> = {
  struggling: { border: 'var(--red-alert)',  bg: 'var(--red-alert-bg)' },
  hard:       { border: 'var(--red-alert)',  bg: 'var(--red-alert-bg)' },
  okay:       { border: 'var(--teal)',       bg: 'var(--teal-bg)' },
  good:       { border: 'var(--teal)',       bg: 'var(--teal-bg)' },
  great:      { border: 'var(--gold-hero)',  bg: 'rgba(240,192,64,0.08)' },
}

export default function MoodScale({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="How are you today?"
      style={{ display: 'flex', gap: 6 }}
    >
      {MOODS.map(m => {
        const selected = value === m.key
        const colors = MOOD_COLORS[m.key]
        return (
          <button
            key={m.key}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m.key)}
            style={{
              flex: 1,
              minWidth: 52,
              height: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: 12,
              border: selected ? `2px solid ${colors.border}` : '1px solid var(--border)',
              background: selected ? colors.bg : 'var(--warm-gray)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              padding: 0,
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{m.emoji}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: selected ? 700 : 500,
                color: selected ? colors.border : 'var(--mid)',
                lineHeight: 1,
              }}
            >
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
