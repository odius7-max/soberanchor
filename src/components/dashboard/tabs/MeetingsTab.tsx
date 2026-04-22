'use client'

// Phase R.4 — Dashboard Meetings tab rework.
//
// Three sub-tabs:
//   1. "Your meetings"  — user_custom_meetings (active by default; archived
//                          toggle reveals soft-deleted rows)
//   2. "Browse directory" — link-out to /find/meetings (R.5 will rework this
//                          page itself; for now the dashboard just points
//                          members to the existing directory)
//   3. "Log history"    — existing meeting_attendance CRUD (Log / Edit /
//                          Delete). Untouched from pre-R.4 so historical
//                          attendance records stay editable.
//
// Stats cards (This Week / Total Logged) remain at the top across all
// sub-tabs — they measure attendance, which lives in meeting_attendance.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddMeetingModal from '../meetings/AddMeetingModal'
import type { FellowshipOption, UserCustomMeeting } from '../meetings/types'
import { DAY_LABELS, FORMAT_LABELS } from '../meetings/types'

interface MeetingAttendance {
  id: string
  meeting_name: string
  fellowship_name: string | null
  location_name: string | null
  attended_at: string
  checkin_method: string
  notes: string | null
}

interface FellowshipRow {
  id: string
  name: string
  abbreviation: string | null
}

interface Props {
  userId: string
  meetingsThisWeek: number
  meetingsTotal: number
  meetingAttendance: MeetingAttendance[]
  fellowships: FellowshipRow[]
  userCustomMeetings: UserCustomMeeting[]
  primaryFellowshipId: string | null
}

type SubTab = 'your-meetings' | 'directory' | 'history'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function thisWeekMonday(): Date {
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const m = new Date(now)
  m.setDate(now.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function countThisWeek(recs: MeetingAttendance[]): number {
  const monday = thisWeekMonday()
  return recs.filter(r => new Date(r.attended_at) >= monday).length
}

function fmtDayTime(day: number | null, time: string | null): string {
  const dayLabel = day !== null ? DAY_LABELS.find(d => d.value === day)?.long : null
  let timeLabel: string | null = null
  if (time) {
    // Normalize "HH:mm:ss" → "h:mm AM/PM"
    const [hStr, mStr] = time.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      timeLabel = `${h12}:${String(m).padStart(2, '0')} ${period}`
    }
  }
  if (dayLabel && timeLabel) return `${dayLabel} ${timeLabel}`
  if (dayLabel) return dayLabel
  if (timeLabel) return timeLabel
  return 'No set time'
}

function fmtFormat(fmt: UserCustomMeeting['format']): string | null {
  if (!fmt) return null
  return FORMAT_LABELS.find(f => f.value === fmt)?.label ?? null
}

// ─── Shared styles ────────────────────────────────────────────────────────────

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

// ─── Attendance edit modal (unchanged from pre-R.4) ──────────────────────────

interface EditModalProps {
  record: MeetingAttendance
  fellowships: FellowshipRow[]
  onClose: () => void
  onSaved: (updated: Partial<MeetingAttendance>) => void
}

function EditMeetingModal({ record, fellowships, onClose, onSaved }: EditModalProps) {
  const [meetingName, setMeetingName] = useState(record.meeting_name)
  const [fellowship, setFellowship] = useState(record.fellowship_name ?? '')
  const [attendedAt, setAttendedAt] = useState(record.attended_at.slice(0, 10))
  const [locationName, setLocationName] = useState(record.location_name ?? '')
  const [notes, setNotes] = useState(record.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function handleSave() {
    if (!meetingName.trim()) { setError('Meeting name is required.'); return }
    if (!attendedAt) { setError('Date is required.'); return }
    setError('')
    setSaving(true)
    const supabase = createClient()
    try {
      const payload: Partial<MeetingAttendance> = {
        meeting_name: meetingName.trim(),
        fellowship_name: fellowship || null,
        attended_at: attendedAt,
        location_name: locationName.trim() || null,
        notes: notes.trim() || null,
      }
      const { error: err } = await supabase
        .from('meeting_attendance')
        .update(payload)
        .eq('id', record.id)
        .select()
      if (err) {
        console.error('meeting_attendance update error:', err)
        setError('Failed to save. Please try again.')
        return
      }
      onSaved(payload)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit meeting log"
        style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--navy)' }}>
            Edit meeting log
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '22px', lineHeight: 1, cursor: 'pointer', color: 'var(--mid)', padding: '2px 6px' }}>
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Meeting name <span style={{ color: '#E74C3C' }}>*</span>
          </label>
          <input
            type="text"
            value={meetingName}
            onChange={e => setMeetingName(e.target.value)}
            maxLength={120}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Fellowship <span style={{ fontWeight: 400, color: 'var(--mid)' }}>(optional)</span>
          </label>
          <select
            value={fellowship}
            onChange={e => setFellowship(e.target.value)}
            style={{ ...inputStyle, background: '#fff' }}
          >
            <option value="">None</option>
            {fellowships.map(f => (
              <option key={f.id} value={f.abbreviation ?? f.name}>
                {f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Date attended <span style={{ color: '#E74C3C' }}>*</span>
          </label>
          <input
            type="date"
            value={attendedAt}
            onChange={e => setAttendedAt(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Location <span style={{ fontWeight: 400, color: 'var(--mid)' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            placeholder="e.g. Community Center"
            maxLength={120}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div style={{ marginBottom: '26px' }}>
          <label style={labelStyle}>
            Notes <span style={{ fontWeight: 400, color: 'var(--mid)' }}>(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
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
            background: '#2A8A99', border: 'none', color: '#fff',
            fontFamily: 'var(--font-body)', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── Delete confirmation (unchanged from pre-R.4) ────────────────────────────

interface DeleteConfirmProps {
  title?: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: DeleteConfirmProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '380px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--navy)', marginBottom: '10px' }}>
          {title ?? 'Remove this meeting log?'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--mid)', marginBottom: '24px' }}>
          {message ?? "This can't be undone."}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              background: '#E74C3C', border: 'none', color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            {confirmLabel ?? 'Remove'}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              background: 'var(--warm-gray)', border: '1.5px solid var(--border)',
              color: 'var(--dark)', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MeetingsTab({
  userId,
  meetingsThisWeek,
  meetingsTotal,
  meetingAttendance,
  fellowships,
  userCustomMeetings,
  primaryFellowshipId,
}: Props) {
  const router = useRouter()

  // Sub-tab selection. Default = Your meetings (wireframe spec).
  const [subTab, setSubTab] = useState<SubTab>('your-meetings')

  // ── Saved meetings state (user_custom_meetings) ─────────────────────────
  const [savedMeetings, setSavedMeetings] = useState<UserCustomMeeting[]>(userCustomMeetings)
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<UserCustomMeeting | null>(null)
  const [removeMeeting, setRemoveMeeting] = useState<UserCustomMeeting | null>(null)

  const activeMeetings  = savedMeetings.filter(m => m.is_active)
  const archivedMeetings = savedMeetings.filter(m => !m.is_active)

  const fellowshipOptions: FellowshipOption[] = fellowships

  // ── Attendance history state (meeting_attendance) ───────────────────────
  const [records, setRecords] = useState<MeetingAttendance[]>(meetingAttendance)
  const [showForm, setShowForm] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [fellowshipName, setFellowshipName] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [localTotal, setLocalTotal] = useState(meetingsTotal)
  const [localThisWeek, setLocalThisWeek] = useState(meetingsThisWeek)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editRecord, setEditRecord] = useState<MeetingAttendance | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<MeetingAttendance | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Saved meeting handlers ──────────────────────────────────────────────

  function handleAddSaved(saved: UserCustomMeeting) {
    // Insert new or update existing in local list
    setSavedMeetings(prev => {
      const without = prev.filter(m => m.id !== saved.id)
      return [saved, ...without]
    })
    setAddOpen(false)
    setEditingMeeting(null)
    showToast(editingMeeting ? 'Meeting updated' : 'Meeting saved', true)
    router.refresh()
  }

  async function handleRemoveSaved() {
    if (!removeMeeting) return
    const target = removeMeeting
    setRemoveMeeting(null)

    // Optimistic soft-delete
    const prev = savedMeetings
    setSavedMeetings(prev.map(m =>
      m.id === target.id ? { ...m, is_active: false } : m
    ))

    const supabase = createClient()
    const { error: err } = await supabase
      .from('user_custom_meetings')
      .update({ is_active: false })
      .eq('id', target.id)
      .eq('user_id', userId)

    if (err) {
      console.error('user_custom_meetings soft-delete error:', err)
      setSavedMeetings(prev)
      showToast('Failed to remove. Please try again.', false)
      return
    }

    showToast('Meeting archived', true)
    router.refresh()
  }

  async function handleRestoreSaved(m: UserCustomMeeting) {
    const prev = savedMeetings
    setSavedMeetings(prev.map(x =>
      x.id === m.id ? { ...x, is_active: true } : x
    ))
    const supabase = createClient()
    const { error: err } = await supabase
      .from('user_custom_meetings')
      .update({ is_active: true })
      .eq('id', m.id)
      .eq('user_id', userId)
    if (err) {
      console.error('user_custom_meetings restore error:', err)
      setSavedMeetings(prev)
      showToast('Failed to restore. Please try again.', false)
      return
    }
    showToast('Meeting restored', true)
    router.refresh()
  }

  // ── Attendance log handlers ────────────────────────────────────────────

  function openForm() {
    setSaving(false)
    setFormError(null)
    setMeetingName('')
    setFellowshipName('')
    setLogNotes('')
    setShowForm(true)
  }

  function toggleForm() {
    if (showForm) { setShowForm(false) } else { openForm() }
  }

  async function handleLog() {
    if (!meetingName.trim()) { setFormError('Please enter the meeting name.'); return }
    setSaving(true); setFormError(null)
    const supabase = createClient()
    try {
      const { error: err } = await supabase.from('meeting_attendance').insert({
        user_id: userId,
        meeting_name: meetingName.trim(),
        fellowship_name: fellowshipName.trim() || null,
        notes: logNotes.trim() || null,
        checkin_method: 'manual',
      }).select()
      if (err) {
        console.error('meeting_attendance insert error:', err)
        setFormError('Failed to log. Please try again.')
        return
      }
      setShowForm(false)
      setMeetingName('')
      setFellowshipName('')
      setLogNotes('')
      setLocalTotal(t => t + 1)
      const now = new Date()
      if (now >= thisWeekMonday()) setLocalThisWeek(w => w + 1)
      showToast('Meeting logged!', true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function handleEditSaved(updated: Partial<MeetingAttendance>) {
    const updatedRecords = records.map(r =>
      r.id === editRecord!.id ? { ...r, ...updated } : r
    )
    setRecords(updatedRecords)
    setLocalThisWeek(countThisWeek(updatedRecords))
    setEditRecord(null)
    showToast('Meeting updated', true)
    router.refresh()
  }

  async function handleDeleteConfirm() {
    if (!deleteRecord) return
    const target = deleteRecord
    setDeleteRecord(null)

    const prevRecords = records
    const prevTotal = localTotal
    const prevThisWeek = localThisWeek
    const filtered = records.filter(r => r.id !== target.id)
    setRecords(filtered)
    setLocalTotal(t => t - 1)
    setLocalThisWeek(countThisWeek(filtered))

    const supabase = createClient()
    const { error: err } = await supabase
      .from('meeting_attendance')
      .delete()
      .eq('id', target.id)

    if (err) {
      console.error('meeting_attendance delete error:', err)
      setRecords(prevRecords)
      setLocalTotal(prevTotal)
      setLocalThisWeek(prevThisWeek)
      showToast('Failed to remove. Please try again.', false)
      return
    }

    showToast('Meeting removed', true)
    router.refresh()
  }

  // ── Render helpers ──────────────────────────────────────────────────────

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const methodIcon: Record<string, string> = { manual: '✍️', directory: '📍', geolocation: '📡', qr_code: '📲' }

  function fellowshipAbbr(m: UserCustomMeeting): string | null {
    if (!m.fellowship_id) return null
    const f = fellowships.find(x => x.id === m.fellowship_id)
    return f?.abbreviation ?? f?.name ?? null
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Stat cards — unchanged */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="rounded-xl text-center" style={{ background: 'var(--teal-10)', padding: '16px 32px' }}>
          <div className="font-bold text-navy" style={{ fontFamily: 'var(--font-display)', fontSize: '32px', letterSpacing: '-0.75px' }}>{localThisWeek}</div>
          <div style={{ fontSize: '12px', color: 'var(--mid)' }}>This Week</div>
        </div>
        <div className="rounded-xl text-center" style={{ background: 'var(--gold-10)', padding: '16px 32px' }}>
          <div className="font-bold text-navy" style={{ fontFamily: 'var(--font-display)', fontSize: '32px' }}>{localTotal}</div>
          <div style={{ fontSize: '12px', color: 'var(--mid)' }}>Total Logged</div>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div
        role="tablist"
        aria-label="Meetings sections"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '2px solid var(--border)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {([
          { id: 'your-meetings', label: `Your meetings · ${activeMeetings.length}` },
          { id: 'directory',     label: 'Browse directory' },
          { id: 'history',       label: 'Log history' },
        ] as const).map(t => {
          const active = subTab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(t.id)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: active ? 'var(--teal)' : 'var(--mid)',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent',
                marginBottom: '-2px',
                fontFamily: 'var(--font-body)',
              }}
            >
              {t.label}
            </button>
          )
        })}
        {toast && (
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '12px', fontWeight: 600, color: toast.ok ? '#27AE60' : '#E74C3C', paddingBottom: '8px' }}>
            {toast.msg}
          </span>
        )}
      </div>

      {/* ════════ YOUR MEETINGS ════════ */}
      {subTab === 'your-meetings' && (
        <div>
          {/* Hero add CTA */}
          <button
            onClick={() => { setEditingMeeting(null); setAddOpen(true) }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(42,138,153,0.08), rgba(240,192,64,0.08))',
              border: '1.5px dashed var(--teal)',
              borderRadius: '14px',
              padding: '20px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              marginBottom: '16px',
              fontFamily: 'var(--font-body)',
              display: 'block',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: '15px', marginBottom: '4px' }}>
              + Add a meeting you attend
            </div>
            <div style={{ fontSize: '13px', color: 'var(--mid)' }}>
              Build your go-to list — takes 20 seconds and makes check-in one tap.
            </div>
          </button>

          {/* Active list */}
          {activeMeetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--mid)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.35 }}>👥</div>
              <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '15px', marginBottom: '4px' }}>
                No saved meetings yet
              </div>
              <div style={{ fontSize: '13px', maxWidth: 360, margin: '0 auto' }}>
                Add the meetings you attend regularly and we&rsquo;ll have them ready at every check-in.
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] bg-white" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
              {activeMeetings.map((m, idx) => {
                const abbr = fellowshipAbbr(m)
                const fmtLabel = fmtFormat(m.format)
                const meta = [
                  fmtDayTime(m.day_of_week, m.time_local),
                  m.location || null,
                  fmtLabel,
                ].filter(Boolean).join(' · ')
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderBottom: idx < activeMeetings.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="font-semibold text-navy" style={{ fontSize: '14px' }}>{m.name}</span>
                        {abbr && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '20px',
                              background: 'rgba(240,192,64,0.15)',
                              color: '#a67818',
                              border: '1px solid rgba(240,192,64,0.3)',
                            }}
                          >
                            {abbr}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '2px' }}>
                        {meta || 'No schedule set'}
                      </div>
                      {m.topic && (
                        <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '1px', fontStyle: 'italic' }}>
                          {m.topic}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                      <button
                        onClick={() => { setEditingMeeting(m); setAddOpen(true) }}
                        style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setRemoveMeeting(m)}
                        style={{ fontSize: '13px', color: 'var(--mid)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Archived toggle + list */}
          {archivedMeetings.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{
                  fontSize: '13px',
                  color: 'var(--mid)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {showArchived ? '▾' : '▸'} {showArchived ? 'Hide' : 'Show'} archived ({archivedMeetings.length})
              </button>
              {showArchived && (
                <div
                  className="rounded-[14px] bg-white"
                  style={{ border: '1px solid var(--border)', overflow: 'hidden', marginTop: '8px', opacity: 0.8 }}
                >
                  {archivedMeetings.map((m, idx) => {
                    const abbr = fellowshipAbbr(m)
                    const fmtLabel = fmtFormat(m.format)
                    const meta = [
                      fmtDayTime(m.day_of_week, m.time_local),
                      m.location || null,
                      fmtLabel,
                    ].filter(Boolean).join(' · ')
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: idx < archivedMeetings.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', color: 'var(--mid)', textDecoration: 'line-through' }}>{m.name}</span>
                            {abbr && (
                              <span style={{ fontSize: '11px', color: 'var(--mid)' }}>{abbr}</span>
                            )}
                          </div>
                          {meta && (
                            <div style={{ fontSize: '11px', color: 'var(--mid)', marginTop: '2px' }}>{meta}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRestoreSaved(m)}
                          style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)' }}
                        >
                          Restore
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════ BROWSE DIRECTORY ════════ */}
      {subTab === 'directory' && (
        <div
          className="rounded-[14px] bg-white"
          style={{ border: '1px solid var(--border)', padding: '28px 24px' }}
        >
          <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '15px', marginBottom: '6px' }}>
            Looking for a meeting nearby?
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mid)', marginBottom: '18px', lineHeight: 1.55 }}>
            The public meeting finder searches AA listings near you. You can save any meeting you find to your personal list for faster check-ins.
          </div>
          <Link
            href="/find/meetings"
            className="font-semibold text-white rounded-lg"
            style={{
              display: 'inline-block',
              fontSize: '13px',
              padding: '10px 18px',
              background: 'var(--teal)',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Open meeting finder →
          </Link>
        </div>
      )}

      {/* ════════ LOG HISTORY ════════ */}
      {subTab === 'history' && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <p style={{ fontSize: '13px', color: 'var(--mid)' }}>Auto-logged when you check in, or log manually here.</p>
            <button
              onClick={toggleForm}
              className="font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors"
              style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--navy)', border: 'none', cursor: 'pointer' }}
            >
              {showForm ? '✕ Cancel' : '+ Log Meeting'}
            </button>
          </div>

          {showForm && (
            <div className="rounded-[16px] p-5 mb-5 bg-white" style={{ border: '2px solid #2A8A99' }}>
              <div className="font-bold text-navy mb-4" style={{ fontSize: '15px' }}>Log a Meeting</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" value={meetingName} onChange={e => setMeetingName(e.target.value)} placeholder="Meeting name (required)" autoFocus
                  className="w-full rounded-xl text-dark outline-none" style={{ border: '1.5px solid var(--border)', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <input type="text" value={fellowshipName} onChange={e => setFellowshipName(e.target.value)} placeholder="Fellowship (AA, NA, GA…) — optional"
                  className="w-full rounded-xl text-dark outline-none" style={{ border: '1.5px solid var(--border)', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <input type="text" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes (optional)"
                  className="w-full rounded-xl text-dark outline-none" style={{ border: '1.5px solid var(--border)', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                {formError && <div style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{formError}</div>}
                <div className="flex gap-2">
                  <button onClick={handleLog} disabled={saving} className="font-semibold text-white rounded-lg" style={{ fontSize: '14px', padding: '9px 20px', background: '#2A8A99', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving…' : 'Log Meeting'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="rounded-lg" style={{ fontSize: '14px', padding: '9px 16px', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen overlay — closes the kebab menu when clicking outside */}
          {openMenuId && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
              onClick={() => setOpenMenuId(null)}
            />
          )}

          {/* Attendance list */}
          {records.length === 0 ? (
            <div className="text-center py-16 text-mid">
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
              <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No meetings logged yet</div>
              <div style={{ fontSize: '14px' }}>Log manually above, or use Meeting Check-in to find and log meetings near you.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map(m => (
                <div
                  key={m.id}
                  className="card-hover rounded-[14px] flex items-center gap-4 px-4 py-3.5 bg-white border border-[var(--border)]"
                  style={{ position: 'relative', zIndex: openMenuId === m.id ? 51 : 'auto' }}
                >
                  <span style={{ fontSize: '18px' }}>{methodIcon[m.checkin_method] ?? '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark truncate" style={{ fontSize: '14px' }}>{m.meeting_name}</div>
                    {m.fellowship_name && (
                      <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '1px' }}>{m.fellowship_name}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mid)', flexShrink: 0 }}>{fmtDate(m.attended_at)}</div>

                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                      aria-label="Meeting options"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '18px', color: 'var(--mid)', padding: '4px 6px',
                        lineHeight: 1, borderRadius: '6px',
                      }}
                    >
                      ⋮
                    </button>
                    {openMenuId === m.id && (
                      <div
                        style={{
                          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                          background: '#fff', borderRadius: '10px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          border: '1px solid var(--border)',
                          zIndex: 50, minWidth: '120px', overflow: 'hidden',
                        }}
                      >
                        <button
                          onClick={() => { setOpenMenuId(null); setEditRecord(m) }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 14px', fontSize: '14px', fontWeight: 500,
                            color: 'var(--dark)', background: 'none', border: 'none',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--warm-gray)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setOpenMenuId(null); setDeleteRecord(m) }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 14px', fontSize: '14px', fontWeight: 500,
                            color: '#E74C3C', background: 'none', border: 'none',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--warm-gray)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ Modals ══════ */}

      {addOpen && (
        <AddMeetingModal
          userId={userId}
          availableFellowships={fellowshipOptions}
          primaryFellowshipId={primaryFellowshipId}
          mode={editingMeeting ? 'edit' : 'add'}
          initialMeeting={editingMeeting ?? undefined}
          onClose={() => { setAddOpen(false); setEditingMeeting(null) }}
          onSave={handleAddSaved}
        />
      )}

      {removeMeeting && (
        <DeleteConfirmModal
          title="Archive this meeting?"
          message="It'll stop showing up in pickers, but past check-ins will still remember it. You can restore it from the Show archived list."
          confirmLabel="Archive"
          onConfirm={handleRemoveSaved}
          onCancel={() => setRemoveMeeting(null)}
        />
      )}

      {editRecord && (
        <EditMeetingModal
          record={editRecord}
          fellowships={fellowships}
          onClose={() => setEditRecord(null)}
          onSaved={handleEditSaved}
        />
      )}

      {deleteRecord && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteRecord(null)}
        />
      )}
    </div>
  )
}
