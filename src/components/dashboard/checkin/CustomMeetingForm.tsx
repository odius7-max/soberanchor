'use client'
import { useState } from 'react'
import type { NewCustomMeeting } from './checkin-types'

interface Props {
  onSave: (meeting: NewCustomMeeting & { name: string }) => void
  onCancel: () => void
}

type MeetingType = NewCustomMeeting['type']
type Recurrence = NewCustomMeeting['recurrence']

const TYPES: { value: MeetingType; label: string }[] = [
  { value: 'personal',  label: 'Personal' },
  { value: 'public',    label: 'Public' },
  { value: 'sponsor',   label: 'Sponsor' },
  { value: 'other',     label: 'Other' },
]

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'once',    label: 'Just today' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'daily',   label: 'Daily' },
]

const radioStyle = (selected: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 8,
  border: selected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
  background: selected ? 'var(--teal-bg)' : '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: selected ? 600 : 400,
  color: selected ? 'var(--navy)' : 'var(--dark)',
})

export default function CustomMeetingForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<MeetingType>('personal')
  const [recurrence, setRecurrence] = useState<Recurrence>('once')
  const [saveToMyMeetings, setSaveToMyMeetings] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), type, recurrence, saveToMyMeetings, isPrivate })
  }

  return (
    <div
      style={{
        background: 'var(--warm-gray)',
        borderRadius: 12,
        padding: '16px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Custom meeting</div>

      {/* Name */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', display: 'block', marginBottom: 6 }}>
          Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Coffee with friend, Church group…"
          className="sa-input"
          style={{ fontSize: 13 }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />
      </div>

      {/* Type */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 6 }}>Type</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)} style={radioStyle(type === t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 6 }}>Recurs</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RECURRENCES.map(r => (
            <button key={r.value} onClick={() => setRecurrence(r.value)} style={radioStyle(recurrence === r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={saveToMyMeetings}
            onChange={e => setSaveToMyMeetings(e.target.checked)}
            style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: 'var(--dark)' }}>Save to my meetings for next time</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: 'var(--dark)' }}>Private — share count only with sponsor</span>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: name.trim() ? 'var(--teal)' : 'rgba(42,138,153,0.35)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default' }}
        >
          Save meeting
        </button>
      </div>
    </div>
  )
}
