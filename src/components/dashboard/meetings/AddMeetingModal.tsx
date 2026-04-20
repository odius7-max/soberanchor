'use client'

// Phase R.2 — Quick-add meeting modal.
//
// Reusable modal for entering (or editing) a meeting the user wants to save to
// their personal list. Designed to be the single entry point everywhere —
// check-in flow, dashboard Meetings tab, /meetings page. Writes client-side
// under RLS (user owns their rows).
//
// Required fields: name. Everything else is optional (day, time, format,
// location, topic). Fellowship pills show only when the user participates in
// more than one program — otherwise we default to their primary silently.
//
// Backward-compat note: the underlying table pre-dates Phase R and still has
// type/recurrence/is_private CHECK constraints. We write ('public', weekly|once,
// false) so legacy columns stay valid while the UI only surfaces Phase R fields.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  FellowshipOption,
  MeetingFormat,
  UserCustomMeeting,
} from './types'
import { DAY_LABELS, FORMAT_LABELS } from './types'

interface Props {
  userId: string
  availableFellowships: FellowshipOption[]
  primaryFellowshipId: string | null
  mode?: 'add' | 'edit'
  initialMeeting?: UserCustomMeeting
  prefill?: { name?: string; fellowshipId?: string }
  onClose: () => void
  onSave: (meeting: UserCustomMeeting) => void
}

// Normalize Postgres 'HH:mm:ss' → 'HH:mm' for <input type="time">. Round-trips fine.
function normalizeTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.length >= 5 ? t.slice(0, 5) : t
}

const pillStyle = (selected: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 999,
  border: selected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
  background: selected ? 'var(--teal-bg, rgba(42,138,153,0.08))' : '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: selected ? 600 : 500,
  color: selected ? 'var(--navy)' : 'var(--dark)',
  lineHeight: 1,
  fontFamily: 'var(--font-body)',
})

const daySquareStyle = (selected: boolean): React.CSSProperties => ({
  flex: 1,
  minWidth: 0,
  padding: '10px 0',
  borderRadius: 8,
  border: selected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
  background: selected ? 'var(--teal-bg, rgba(42,138,153,0.08))' : '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: selected ? 700 : 500,
  color: selected ? 'var(--navy)' : 'var(--dark)',
  textAlign: 'center',
  fontFamily: 'var(--font-body)',
})

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--mid)',
  display: 'block',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  color: 'var(--dark)',
}

export default function AddMeetingModal({
  userId,
  availableFellowships,
  primaryFellowshipId,
  mode = 'add',
  initialMeeting,
  prefill,
  onClose,
  onSave,
}: Props) {
  const isEdit = mode === 'edit' && !!initialMeeting
  const nameRef = useRef<HTMLInputElement>(null)

  // ── Form state (seeded from initialMeeting on edit, prefill otherwise) ──
  const [name, setName] = useState<string>(
    initialMeeting?.name ?? prefill?.name ?? ''
  )
  const [fellowshipId, setFellowshipId] = useState<string | null>(
    initialMeeting?.fellowship_id ??
      prefill?.fellowshipId ??
      primaryFellowshipId ??
      (availableFellowships[0]?.id ?? null)
  )
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(
    initialMeeting?.day_of_week ?? null
  )
  const [timeLocal, setTimeLocal] = useState<string>(
    normalizeTime(initialMeeting?.time_local)
  )
  const [format, setFormat] = useState<MeetingFormat | null>(
    initialMeeting?.format ?? null
  )
  const [location, setLocation] = useState<string>(
    initialMeeting?.location ?? ''
  )
  const [topic, setTopic] = useState<string>(initialMeeting?.topic ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Mount effects: autofocus + Escape to close + scroll lock ──
  useEffect(() => {
    nameRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const showFellowshipPills = availableFellowships.length > 1

  const canSave = useMemo(() => name.trim().length > 0 && !saving, [name, saving])

  async function handleSave() {
    if (!canSave) return
    setError(null)
    setSaving(true)
    const supabase = createClient()

    // Legacy columns we must keep valid against existing CHECK constraints.
    const legacy = {
      type: 'public' as const,
      recurrence: (dayOfWeek !== null ? 'weekly' : 'once') as
        | 'weekly'
        | 'once',
      is_private: false,
    }

    const payload = {
      user_id: userId,
      fellowship_id: fellowshipId ?? null,
      name: name.trim(),
      day_of_week: dayOfWeek,
      time_local: timeLocal ? `${timeLocal}:00` : null,
      format: format,
      location: location.trim() || null,
      topic: topic.trim() || null,
      is_active: true,
      ...legacy,
    }

    try {
      if (isEdit && initialMeeting) {
        const { data, error: upErr } = await supabase
          .from('user_custom_meetings')
          .update(payload)
          .eq('id', initialMeeting.id)
          .eq('user_id', userId) // belt + RLS
          .select()
          .single()
        if (upErr) throw upErr
        onSave(data as UserCustomMeeting)
      } else {
        const { data, error: insErr } = await supabase
          .from('user_custom_meetings')
          .insert(payload)
          .select()
          .single()
        if (insErr) throw insErr
        onSave(data as UserCustomMeeting)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not save meeting. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          padding: '32px 28px 28px',
          boxShadow: '0 24px 64px rgba(0,51,102,0.18)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mid)',
            fontSize: 20,
            lineHeight: 1,
            padding: 6,
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--teal)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          My Meetings
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, var(--font-body))',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--navy)',
            letterSpacing: '-0.5px',
            margin: 0,
            marginBottom: 6,
          }}
        >
          {isEdit ? 'Edit meeting' : 'Add a meeting'}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--mid)',
            lineHeight: 1.55,
            margin: 0,
            marginBottom: 22,
          }}
        >
          {isEdit
            ? 'Update the details for this meeting.'
            : 'Add it once — we’ll have it ready next time you check in.'}
        </p>

        {/* Name (required) */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="meeting-name">
            Meeting name
          </label>
          <input
            id="meeting-name"
            ref={nameRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Westminster Men’s Monday Night"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Fellowship pills — only when multi-program */}
        {showFellowshipPills && (
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>Program</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableFellowships.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFellowshipId(f.id)}
                  style={pillStyle(fellowshipId === f.id)}
                >
                  {f.abbreviation ?? f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day of week */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Day</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {DAY_LABELS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() =>
                  setDayOfWeek(prev => (prev === d.value ? null : d.value))
                }
                style={daySquareStyle(dayOfWeek === d.value)}
                title={d.long}
              >
                {d.short}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 6 }}>
            Optional — leave blank for a one-off.
          </div>
        </div>

        {/* Time */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="meeting-time">
            Start time
          </label>
          <input
            id="meeting-time"
            type="time"
            value={timeLocal}
            onChange={e => setTimeLocal(e.target.value)}
            style={{ ...inputStyle, maxWidth: 180 }}
          />
        </div>

        {/* Format */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Format</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FORMAT_LABELS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() =>
                  setFormat(prev => (prev === f.value ? null : f.value))
                }
                style={pillStyle(format === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="meeting-location">
            Location
          </label>
          <input
            id="meeting-location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Address, venue, Zoom link…"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Topic / notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="meeting-topic">
            Topic or notes
          </label>
          <input
            id="meeting-topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Step study, speaker, women’s…"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {error && (
          <div
            style={{
              background: '#FEE',
              border: '1px solid #F5C6CB',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#721C24',
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            type="button"
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#fff',
              color: 'var(--mid)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            disabled={!canSave}
            style={{
              flex: 2,
              padding: '11px',
              borderRadius: 10,
              border: 'none',
              background: canSave ? 'var(--teal)' : 'rgba(42,138,153,0.35)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: canSave ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save meeting'}
          </button>
        </div>
      </div>
    </div>
  )
}
