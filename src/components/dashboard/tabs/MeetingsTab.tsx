'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MeetingAttendance { id: string; meeting_name: string; fellowship_name: string | null; attended_at: string; checkin_method: string }

interface Props {
  userId: string
  meetingsThisWeek: number
  meetingsTotal: number
  meetingAttendance: MeetingAttendance[]
}

export default function MeetingsTab({ userId, meetingsThisWeek, meetingsTotal, meetingAttendance }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [meetingName, setMeetingName] = useState('')
  const [fellowshipName, setFellowshipName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState(false)
  const [localTotal, setLocalTotal] = useState(meetingsTotal)
  const [localThisWeek, setLocalThisWeek] = useState(meetingsThisWeek)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openForm() {
    setSaving(false)
    setError(null)
    setMeetingName('')
    setFellowshipName('')
    setNotes('')
    setShowForm(true)
  }

  function toggleForm() {
    if (showForm) { setShowForm(false) } else { openForm() }
  }

  async function handleLog() {
    if (!meetingName.trim()) { setError('Please enter the meeting name.'); return }
    setSaving(true); setError(null)
    const supabase = createClient()
    try {
      const { error: err } = await supabase.from('meeting_attendance').insert({
        user_id: userId,
        meeting_name: meetingName.trim(),
        fellowship_name: fellowshipName.trim() || null,
        notes: notes.trim() || null,
        checkin_method: 'manual',
      }).select()
      if (err) {
        console.error('meeting_attendance insert error:', err)
        setError('Failed to log. Please try again.')
        return
      }
      setShowForm(false)
      setMeetingName('')
      setFellowshipName('')
      setNotes('')
      setLocalTotal(t => t + 1)
      const now = new Date()
      const dow = now.getDay()
      const daysSinceMonday = dow === 0 ? 6 : dow - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - daysSinceMonday)
      monday.setHours(0, 0, 0, 0)
      if (now >= monday) setLocalThisWeek(w => w + 1)
      setSuccessToast(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setSuccessToast(false), 2500)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const methodIcon: Record<string, string> = { manual: '✍️', directory: '📍', geolocation: '📡', qr_code: '📲' }

  return (
    <div>
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

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p style={{ fontSize: '13px', color: 'var(--mid)' }}>Auto-logged when you check in from the Meeting Finder, or add manually.</p>
        <div className="flex items-center gap-3">
          {successToast && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#27AE60' }}>Meeting logged!</span>
          )}
          <button onClick={toggleForm} className="font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors" style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--navy)', border: 'none', cursor: 'pointer' }}>
            {showForm ? '✕ Cancel' : '+ Log Meeting'}
          </button>
        </div>
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
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
              className="w-full rounded-xl text-dark outline-none" style={{ border: '1.5px solid var(--border)', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            {error && <div style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</div>}
            <div className="flex gap-2">
              <button onClick={handleLog} disabled={saving} className="font-semibold text-white rounded-lg" style={{ fontSize: '14px', padding: '9px 20px', background: '#2A8A99', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Log Meeting'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg" style={{ fontSize: '14px', padding: '9px 16px', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {meetingAttendance.length === 0 ? (
        <div className="text-center py-16 text-mid">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No meetings logged yet</div>
          <div style={{ fontSize: '14px' }}>Log manually above, or use Meeting Check-in to find and log meetings near you.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meetingAttendance.map(m => (
            <div key={m.id} className="card-hover rounded-[14px] flex items-center gap-4 px-4 py-3.5 bg-white border border-[var(--border)]">
              <span style={{ fontSize: '18px' }}>{methodIcon[m.checkin_method] ?? '📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dark truncate" style={{ fontSize: '14px' }}>{m.meeting_name}</div>
                {m.fellowship_name && <div style={{ fontSize: '12px', color: 'var(--mid)', marginTop: '1px' }}>{m.fellowship_name}</div>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mid)', flexShrink: 0 }}>{fmtDate(m.attended_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
