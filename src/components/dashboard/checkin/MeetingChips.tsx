'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CHECKIN_COPY } from '@/lib/copy/checkin'
import type { MeetingChipData, SelectedMeeting } from './checkin-types'

interface Props {
  userId: string
  value: SelectedMeeting | null | 'none'
  onChange: (v: SelectedMeeting | 'none' | null) => void
  onCustom: () => void
}

interface RawAttendance {
  meeting_id: string | null
  custom_meeting_id: string | null
  meeting_name: string
  attended_at: string
}

function buildChips(rows: RawAttendance[]): MeetingChipData[] {
  const map = new Map<string, { name: string; kind: 'public' | 'custom'; id: string; dates: string[] }>()

  for (const r of rows) {
    const key = r.meeting_id
      ? `pub:${r.meeting_id}`
      : r.custom_meeting_id
        ? `cus:${r.custom_meeting_id}`
        : `txt:${r.meeting_name}`

    const existing = map.get(key)
    if (existing) {
      existing.dates.push(r.attended_at)
    } else {
      map.set(key, {
        name: r.meeting_name,
        kind: r.meeting_id ? 'public' : 'custom',
        id: (r.meeting_id ?? r.custom_meeting_id ?? '') as string,
        dates: [r.attended_at],
      })
    }
  }

  const now = Date.now()
  const scored = Array.from(map.entries()).map(([key, v]) => {
    const freq = v.dates.length
    const lastMs = Math.max(...v.dates.map(d => new Date(d).getTime()))
    const daysSinceLast = (now - lastMs) / 86_400_000
    const score = freq * 10 - daysSinceLast

    // "usual" if attended in at least 3 of the last 4 weeks
    const weekNums = v.dates.map(d => {
      const ms = new Date(d).getTime()
      return Math.floor((now - ms) / (7 * 86_400_000))
    })
    const recentWeeks = new Set(weekNums.filter(w => w < 4))
    const isUsual = recentWeeks.size >= 3

    return { key, name: v.name, kind: v.kind as 'public' | 'custom', id: v.id, score, isUsual }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 3).map(s => ({
    key: s.key,
    kind: s.kind,
    id: s.id,
    name: s.name,
    isUsual: s.isUsual,
  }))
}

export default function MeetingChips({ userId, value, onChange, onCustom }: Props) {
  const [chips, setChips] = useState<MeetingChipData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString()

    supabase
      .from('meeting_attendance')
      .select('meeting_id, custom_meeting_id, meeting_name, attended_at')
      .eq('user_id', userId)
      .gte('attended_at', ninetyDaysAgo)
      .order('attended_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setChips(buildChips((data ?? []) as RawAttendance[]))
        setLoading(false)
      })
  }, [userId])

  function isSelected(chip: MeetingChipData) {
    if (value === 'none') return false
    if (!value) return false
    // Match by the chip's unique key. Comparing id+kind alone would highlight
    // every text-only attendance row at once (they all share id='' + kind='custom').
    return value.key === chip.key
  }

  function select(chip: MeetingChipData) {
    if (chip.kind === 'public' || chip.kind === 'custom') {
      if (isSelected(chip)) {
        onChange(null) // deselect
      } else {
        onChange({ key: chip.key, kind: chip.kind, id: chip.id ?? '', name: chip.name })
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse" style={{ height: 44, borderRadius: 10, background: 'var(--warm-gray)' }} />
        ))}
      </div>
    )
  }

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    borderRadius: 10,
    border: selected ? '2px solid var(--teal)' : '1px solid var(--border)',
    background: selected ? 'var(--teal-bg)' : 'var(--warm-gray)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'border-color 0.12s, background 0.12s',
  })

  const noMeetingSelected = value === 'none'

  return (
    <div role="radiogroup" aria-label="Meeting today?" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chips.map(chip => (
        <button
          key={chip.key}
          role="radio"
          aria-checked={isSelected(chip)}
          onClick={() => select(chip)}
          style={chipStyle(isSelected(chip))}
        >
          <span style={{ fontSize: 14, color: isSelected(chip) ? 'var(--navy)' : 'var(--dark)', fontWeight: isSelected(chip) ? 600 : 400, flex: 1 }}>
            {chip.name}
          </span>
          {chip.isUsual && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--teal-bg)', border: '1px solid var(--teal)', color: 'var(--teal)' }}>
              {CHECKIN_COPY.usualBadge}
            </span>
          )}
          {chip.kind === 'custom' && !chip.isUsual && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'var(--navy-10)', color: 'var(--mid)' }}>
              {CHECKIN_COPY.personalBadge}
            </span>
          )}
        </button>
      ))}

      {/* + Custom meeting — action button, not a radio selection */}
      <button
        type="button"
        onClick={onCustom}
        style={chipStyle(false)}
      >
        <span style={{ fontSize: 14, color: 'var(--teal)', fontWeight: 500 }}>
          {CHECKIN_COPY.customLabel}
        </span>
      </button>

      {/* No meeting today */}
      <button
        role="radio"
        aria-checked={noMeetingSelected}
        onClick={() => onChange(noMeetingSelected ? null : 'none')}
        style={chipStyle(noMeetingSelected)}
      >
        <span style={{ fontSize: 14, color: noMeetingSelected ? 'var(--navy)' : 'var(--mid)', fontWeight: noMeetingSelected ? 600 : 400 }}>
          {CHECKIN_COPY.noMeeting}
        </span>
      </button>
    </div>
  )
}
