'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

export interface FellowshipOption {
  id: string
  name: string
  abbreviation: string
}

export interface EditableMeeting {
  id: string
  name: string
  fellowship_id: string | null
  day_of_week: string | null
  start_time: string | null
  location_name: string | null
  format: string
}

interface Props {
  userId: string
  fellowships: FellowshipOption[]
  editMeeting: EditableMeeting | null
  onClose: () => void
  onSaved: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function kebab(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function AddCustomMeetingModal({ userId, fellowships, editMeeting, onClose, onSaved }: Props) {
  const isEdit = !!editMeeting

  const [name, setName]               = useState(editMeeting?.name ?? '')
  const [fellowshipId, setFellowshipId] = useState(editMeeting?.fellowship_id ?? '')
  const [dayOfWeek, setDayOfWeek]     = useState(editMeeting?.day_of_week ?? '')
  const [time, setTime]               = useState(
    editMeeting?.start_time ? editMeeting.start_time.slice(0, 5) : ''
  )
  const [locationName, setLocationName] = useState(editMeeting?.location_name ?? '')
  const [format, setFormat]           = useState<'in_person' | 'online' | 'hybrid'>(
    (editMeeting?.format as 'in_person' | 'online' | 'hybrid') ?? 'in_person'
  )
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!name.trim())   { setError('Meeting name is required.'); return }
    if (!fellowshipId)  { setError('Please select a fellowship.'); return }
    setError('')
    setSaving(true)

    const supabase = createClient()
    const payload = {
      name:          name.trim(),
      fellowship_id: fellowshipId,
      day_of_week:   dayOfWeek || null,
      start_time:    time || null,
      location_name: locationName.trim() || null,
      format,
      source:        'user' as const,
      created_by:    userId,
    }

    if (isEdit) {
      const { error: err } = await supabase
        .from('meetings')
        .update(payload)
        .eq('id', editMeeting!.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const slug = `${kebab(name.trim()).slice(0, 44)}-${Math.random().toString(36).slice(2, 8)}`
      const { error: err } = await supabase
        .from('meetings')
        .insert({ ...payload, slug })
      if (err) { setError(err.message); setSaving(false); return }
    }

    onSaved()
  }

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit meeting' : 'Add custom meeting'}
        style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--navy)' }}>
            {isEdit ? 'Edit meeting' : 'Add custom meeting'}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: '22px', lineHeight: 1, cursor: 'pointer', color: 'var(--mid)', padding: '2px 6px' }}
          >
            ×
          </button>
        </div>

        {/* Meeting name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Meeting name <span style={{ color: '#E74C3C' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tuesday Night NA"
            maxLength={120}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Fellowship */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Fellowship <span style={{ color: '#E74C3C' }}>*</span>
          </label>
          <select
            value={fellowshipId}
            onChange={e => setFellowshipId(e.target.value)}
            style={{ ...inputStyle, background: '#fff' }}
          >
            <option value="">Select fellowship…</option>
            {fellowships.map(f => (
              <option key={f.id} value={f.id}>
                {f.abbreviation} — {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Day + Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>
              Day <OptLabel />
            </label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(e.target.value)}
              style={{ ...inputStyle, background: '#fff' }}
            >
              <option value="">Any day</option>
              {DAYS.map(d => (
                <option key={d} value={d.toLowerCase()}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Time <OptLabel />
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Location name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Location name <OptLabel />
          </label>
          <input
            type="text"
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            placeholder="e.g. Community Center"
            maxLength={120}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Format */}
        <div style={{ marginBottom: '26px' }}>
          <label style={labelStyle}>Format</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['in_person', 'online', 'hybrid'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid',
                  background:   format === f ? 'var(--navy)' : 'var(--warm-gray)',
                  borderColor:  format === f ? 'var(--navy)' : 'var(--border)',
                  color:        format === f ? '#fff' : 'var(--dark)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {f === 'in_person' ? 'In-Person' : f === 'online' ? 'Online' : 'Hybrid'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: '#E74C3C', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px',
            fontSize: '15px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            background: 'var(--navy)', border: 'none', color: '#fff',
            fontFamily: 'var(--font-body)', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save meeting'}
        </button>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function OptLabel() {
  return (
    <span style={{ fontWeight: 400, color: 'var(--mid)' }}> (optional)</span>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'var(--dark)', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '10px',
  border: '1.5px solid var(--border)', fontSize: '14px',
  fontFamily: 'var(--font-body)', color: 'var(--dark)',
  background: '#fff', boxSizing: 'border-box', outline: 'none',
}
