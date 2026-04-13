'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MeetingAttendance {
  id: string
  meeting_name: string
  fellowship_name: string | null
  location_name: string | null
  attended_at: string
  checkin_method: string
  notes: string | null
}

interface FellowshipOption {
  id: string
  name: string
  abbreviation: string | null
}

interface Props {
  userId: string
  meetingsThisWeek: number
  meetingsTotal: number
  meetingAttendance: MeetingAttendance[]
  fellowships: FellowshipOption[]
}

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

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  record: MeetingAttendance
  fellowships: FellowshipOption[]
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--navy)' }}>
            Edit meeting log
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '22px', lineHeight: 1, cursor: 'pointer', color: 'var(--mid)', padding: '2px 6px' }}>
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
            value={meetingName}
            onChange={e => setMeetingName(e.target.value)}
            maxLength={120}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#2A8A99')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Fellowship */}
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

        {/* Date attended */}
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

        {/* Location */}
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

        {/* Notes */}
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

// ─── Delete confirmation ───────────────────────────────────────────────────────

interface DeleteConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmProps) {
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
          Remove this meeting log?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--mid)', marginBottom: '24px' }}>
          This can&apos;t be undone.
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
            Remove
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

export default function MeetingsTab({ userId, meetingsThisWeek, meetingsTotal, meetingAttendance, fellowships }: Props) {
  const router = useRouter()

  // Local attendance list for optimistic updates
  const [records, setRecords] = useState<MeetingAttendance[]>(meetingAttendance)

  // Log form
  const [showForm, setShowForm] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [fellowshipName, setFellowshipName] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Stats
  const [localTotal, setLocalTotal] = useState(meetingsTotal)
  const [localThisWeek, setLocalThisWeek] = useState(meetingsThisWeek)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit / Delete
  const [editRecord, setEditRecord] = useState<MeetingAttendance | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<MeetingAttendance | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Close kebab menu on any outside click
  useEffect(() => {
    function handleClick() { setOpenMenuId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Log form ───────────────────────────────────────────────────────────────

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

  // ── Edit ───────────────────────────────────────────────────────────────────

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

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!deleteRecord) return
    const target = deleteRecord
    setDeleteRecord(null)

    // Optimistic remove
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

  // ── Render ─────────────────────────────────────────────────────────────────

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const methodIcon: Record<string, string> = { manual: '✍️', directory: '📍', geolocation: '📡', qr_code: '📲' }

  return (
    <div>
      {/* Stat cards */}
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

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p style={{ fontSize: '13px', color: 'var(--mid)' }}>Auto-logged when you check in from the Meeting Finder, or add manually.</p>
        <div className="flex items-center gap-3">
          {toast && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: toast.ok ? '#27AE60' : '#E74C3C' }}>
              {toast.msg}
            </span>
          )}
          <button
            onClick={toggleForm}
            className="font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors"
            style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--navy)', border: 'none', cursor: 'pointer' }}
          >
            {showForm ? '✕ Cancel' : '+ Log Meeting'}
          </button>
        </div>
      </div>

      {/* Log form */}
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

      {/* Meeting list */}
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
              style={{ position: 'relative' }}
            >
              <span style={{ fontSize: '18px' }}>{methodIcon[m.checkin_method] ?? '📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dark truncate" style={{ fontSize: '14px' }}>{m.meeting_name}</div>
                {m.fellowship_name && (
                  <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '1px' }}>{m.fellowship_name}</div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mid)', flexShrink: 0 }}>{fmtDate(m.attended_at)}</div>

              {/* Kebab menu */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id) }}
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
                    onClick={e => e.stopPropagation()}
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

      {/* Edit modal */}
      {editRecord && (
        <EditMeetingModal
          record={editRecord}
          fellowships={fellowships}
          onClose={() => setEditRecord(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteRecord && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteRecord(null)}
        />
      )}
    </div>
  )
}
