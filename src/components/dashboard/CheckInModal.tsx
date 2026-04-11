'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logCheckInActivity } from '@/app/dashboard/activity/actions'

type Mood = 'great' | 'good' | 'okay' | 'struggling' | 'crisis'

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'great',      emoji: '😊', label: 'Great',      color: '#27AE60' },
  { value: 'good',       emoji: '🙂', label: 'Good',       color: '#2A8A99' },
  { value: 'okay',       emoji: '😐', label: 'Okay',       color: '#D4A574' },
  { value: 'struggling', emoji: '😔', label: 'Struggling', color: '#E67E22' },
  { value: 'crisis',     emoji: '😰', label: 'Crisis',     color: '#C0392B' },
]

interface Props {
  userId: string
  onClose: () => void
}

export default function CheckInModal({ userId, onClose }: Props) {
  const router = useRouter()
  const [mood, setMood] = useState<Mood | null>(null)
  const [soberToday, setSoberToday] = useState(true)
  const [meetings, setMeetings] = useState(0)
  const [notes, setNotes] = useState('')
  const [calledSponsor, setCalledSponsor] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  async function handleSubmit() {
    if (!mood) { setError("Please select how you're feeling."); return }
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('check_ins').insert({
      user_id: userId,
      mood,
      sober_today: soberToday,
      meetings_attended: meetings,
      notes: notes.trim() || null,
      called_sponsor: calledSponsor,
    })
    if (err) { setError('Failed to save. Please try again.'); setSubmitting(false); return }
    logCheckInActivity({ userId, mood }) // fire-and-forget
    router.refresh()
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: '460px', background: '#fff', boxShadow: '0 24px 64px rgba(0,51,102,0.18)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="font-bold text-navy" style={{ fontSize: '17px' }}>Daily Check-In</div>
            <div className="text-mid" style={{ fontSize: '12px', marginTop: '1px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button onClick={onClose} className="text-mid hover:text-dark transition-colors" style={{ fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div className="font-semibold text-navy mb-3" style={{ fontSize: '14px' }}>How are you feeling today?</div>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)} className="flex-1 flex flex-col items-center gap-1 rounded-xl py-3 transition-all"
                  style={{ background: mood === m.value ? `${m.color}18` : 'var(--warm-gray)', border: `2px solid ${mood === m.value ? m.color : 'transparent'}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: '22px' }}>{m.emoji}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: mood === m.value ? m.color : 'var(--mid)' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setSoberToday(v => !v)} className="flex items-center gap-2 rounded-xl px-4 py-3 flex-1 transition-all"
              style={{ background: soberToday ? 'rgba(39,174,96,0.08)' : 'rgba(192,57,43,0.08)', border: `1.5px solid ${soberToday ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`, cursor: 'pointer' }}>
              <span style={{ fontSize: '18px' }}>{soberToday ? '✅' : '❌'}</span>
              <div className="text-left">
                <div style={{ fontSize: '12px', fontWeight: 700, color: soberToday ? '#27AE60' : '#C0392B' }}>{soberToday ? 'Sober Today' : 'Not Sober'}</div>
                <div style={{ fontSize: '11px', color: 'var(--mid)' }}>tap to toggle</div>
              </div>
            </button>
            <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 flex-1" style={{ background: 'var(--warm-gray)', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--mid)', marginBottom: '6px' }}>Meetings Today</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setMeetings(v => Math.max(0, v - 1))} style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark)' }}>−</button>
                <span className="font-bold text-navy" style={{ fontSize: '20px', minWidth: '20px', textAlign: 'center' }}>{meetings}</span>
                <button onClick={() => setMeetings(v => v + 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark)' }}>+</button>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="rounded-md flex items-center justify-center transition-colors flex-shrink-0"
              style={{ width: '22px', height: '22px', background: calledSponsor ? '#2A8A99' : '#fff', border: calledSponsor ? '2px solid #2A8A99' : '2px solid #D0CBC4', color: '#fff', fontSize: '13px' }}
              onClick={() => setCalledSponsor(v => !v)}
            >
              {calledSponsor ? '✓' : ''}
            </div>
            <input type="checkbox" className="sr-only" checked={calledSponsor} onChange={e => setCalledSponsor(e.target.checked)} />
            <span style={{ fontSize: '14px', color: 'var(--dark)' }}>Called or texted my sponsor today</span>
          </label>

          <div>
            <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: '14px' }}>Notes <span className="font-normal text-mid">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How was your day? Any wins, struggles, or gratitude?"
              rows={3}
              className="w-full rounded-xl text-dark resize-none outline-none"
              style={{ border: '1.5px solid var(--border)', padding: '12px 14px', fontSize: '14px', fontFamily: 'inherit', lineHeight: 1.55 }}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && <div style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</div>}

          {mood === 'crisis' && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }}>
              <div style={{ fontSize: '13px', color: '#C0392B', fontWeight: 600 }}>You&apos;re not alone. Crisis support:</div>
              <div style={{ fontSize: '13px', color: 'var(--dark)', marginTop: '4px' }}>SAMHSA Helpline: <strong>1-800-662-4357</strong> (free, 24/7)</div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl font-semibold transition-colors" style={{ padding: '12px', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer', fontSize: '14px' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !mood}
            className="flex-1 rounded-xl font-semibold text-white transition-colors"
            style={{ padding: '12px', fontSize: '14px', background: '#2A8A99', border: 'none', opacity: submitting || !mood ? 0.6 : 1, cursor: submitting || !mood ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Saving…' : 'Save Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}
