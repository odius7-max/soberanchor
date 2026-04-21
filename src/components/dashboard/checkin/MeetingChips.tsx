'use client'

// Phase R.3 — Saved-meeting chips backed by user_custom_meetings.
//
// Before Phase R this component built chips by bucketing the last 90 days of
// meeting_attendance. That produced good "usual" signal but made the source of
// truth ambiguous: public directory hits and text-only rows all competed for
// chip slots. Phase R makes user_custom_meetings the authoritative saved list
// — chips now render that table sorted by last_attended_at DESC (the MRU index
// added in migration 20260420010000).
//
// Same Props surface as the old component so CheckInModal wiring stays small.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CHECKIN_COPY } from '@/lib/copy/checkin'
import type { SelectedMeeting } from './checkin-types'

interface Props {
  userId: string
  value: SelectedMeeting | null | 'none'
  onChange: (v: SelectedMeeting | 'none' | null) => void
  /** Opens the Add-a-meeting modal. CheckInModal prefills the typed name. */
  onAdd: () => void
}

interface SavedMeetingRow {
  id: string
  name: string
  day_of_week: number | null
  time_local: string | null
  last_attended_at: string | null
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatChipMeta(row: SavedMeetingRow): string {
  const parts: string[] = []
  if (row.day_of_week !== null) parts.push(DAY_SHORT[row.day_of_week])
  if (row.time_local) parts.push(row.time_local.slice(0, 5))
  return parts.join(' . ')
}

export default function MeetingChips({ userId, value, onChange, onAdd }: Props) {
  const [rows, setRows] = useState<SavedMeetingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('user_custom_meetings')
      .select('id, name, day_of_week, time_local, last_attended_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_attended_at', { ascending: false, nullsFirst: false })
      .limit(6)
      .then(({ data }) => {
        setRows((data ?? []) as SavedMeetingRow[])
        setLoading(false)
      })
  }, [userId])

  function isSelectedRow(row: SavedMeetingRow) {
    if (!value || value === 'none') return false
    return value.kind === 'custom' && value.id === row.id
  }

  function selectRow(row: SavedMeetingRow) {
    if (isSelectedRow(row)) {
      onChange(null)
      return
    }
    onChange({
      key: `cus:${row.id}`,
      kind: 'custom',
      id: row.id,
      name: row.name,
    })
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse" style={{ height: 44, borderRadius: 10, background: 'var(--warm-gray)' }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            {CHECKIN_COPY.savedMeetingsLabel}
          </div>
          <div role="radiogroup" aria-label="Saved meetings" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(row => {
              const selected = isSelectedRow(row)
              const meta = formatChipMeta(row)
              return (
                <button
                  key={row.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectRow(row)}
                  style={chipStyle(selected)}
                >
                  <span style={{ fontSize: 14, color: selected ? 'var(--navy)' : 'var(--dark)', fontWeight: selected ? 600 : 400, flex: 1 }}>
                    {row.name}
                  </span>
                  {meta && (
                    <span style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500 }}>
                      {meta}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Add-a-meeting CTA - delegates to CheckInModal which opens AddMeetingModal */}
      <button
        type="button"
        onClick={onAdd}
        style={{
          ...chipStyle(false),
          borderStyle: 'dashed',
          background: '#fff',
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--teal)', fontWeight: 500 }}>
          {rows.length > 0 ? CHECKIN_COPY.saveForNextTime : CHECKIN_COPY.addMeetingLabel}
        </span>
      </button>

      {/* No meeting today - below a visual gap to separate from entry path */}
      <div style={{ height: 4 }} />
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
