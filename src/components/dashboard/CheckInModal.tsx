'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logCheckInActivity } from '@/app/dashboard/activity/actions'
import MoodScale from './checkin/MoodScale'
import MeetingChips from './checkin/MeetingChips'
import CustomMeetingForm from './checkin/CustomMeetingForm'
import type { CheckinFormState, MoodKey, NewCustomMeeting, SaveResult } from './checkin/checkin-types'
import { CHECKIN_COPY } from '@/lib/copy/checkin'
import CelebrationPanel from './checkin/CelebrationPanel'

interface Props {
  userId: string
  onClose: () => void
}

type Phase = 'form' | 'celebration'

async function computeStreak(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('check_ins')
    .select('check_in_date')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: false })
    .limit(60)
  if (!data?.length) return 1
  let streak = 1
  let prev = new Date(data[0].check_in_date + 'T00:00:00')
  for (let i = 1; i < data.length; i++) {
    const cur = new Date(data[i].check_in_date + 'T00:00:00')
    const diff = Math.round((prev.getTime() - cur.getTime()) / 86_400_000)
    if (diff === 1) { streak++; prev = cur } else break
  }
  return streak
}

export default function CheckInModal({ userId, onClose }: Props) {
  const router = useRouter()
  const backdropRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  const [phase, setPhase] = useState<Phase>('form')
  const [form, setForm] = useState<CheckinFormState>({
    mood: null, meeting: null, newCustom: null, note: '',
  })
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [mounted, setMounted] = useState(false)

  // Portal mount guard
  useEffect(() => { setMounted(true) }, [])

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Initial focus on first mood chip
  useEffect(() => {
    if (mounted) firstFocusRef.current?.focus()
  }, [mounted])

  function handleClose() {
    router.refresh()
    onClose()
  }

  function handleCustomSave(custom: NewCustomMeeting & { name: string }) {
    setForm(f => ({
      ...f,
      newCustom: custom,
      meeting: { kind: 'custom', id: '', name: custom.name },
    }))
    setShowCustomForm(false)
  }

  async function handleSave() {
    if (!form.mood) { setError('Please select how you\'re feeling.'); return }
    setSubmitting(true)
    setError(null)
    const supabase = createClient()

    // 1. Insert check_in
    const { error: ciError } = await supabase.from('check_ins').insert({
      user_id: userId,
      mood: form.mood,
      sober_today: true,
      notes: form.note.trim() || null,
    })
    if (ciError) { setError('Failed to save. Please try again.'); setSubmitting(false); return }

    // 2. If a custom meeting was created and "save to my meetings" — upsert first to get id
    let resolvedMeetingId: string | null = null
    if (form.newCustom?.saveToMyMeetings) {
      const { data: cm } = await supabase
        .from('user_custom_meetings')
        .insert({
          user_id: userId,
          name: form.newCustom.name,
          type: form.newCustom.type,
          recurrence: form.newCustom.recurrence,
          day_of_week: form.newCustom.dayOfWeek ?? null,
          is_private: form.newCustom.isPrivate,
        })
        .select('id')
        .single()
      if (cm) resolvedMeetingId = cm.id
    }

    // 3. If meeting selected — insert meeting_attendance
    const meetingName = form.meeting?.name ?? form.newCustom?.name ?? null
    if (meetingName) {
      const isPublic = form.meeting?.kind === 'public'
      const isCustomSaved = !!resolvedMeetingId
      const isExistingCustom = form.meeting?.kind === 'custom' && form.meeting.id

      await supabase.from('meeting_attendance').insert({
        user_id: userId,
        meeting_id: isPublic ? form.meeting!.id : null,
        custom_meeting_id: isCustomSaved
          ? resolvedMeetingId
          : isExistingCustom
            ? form.meeting!.id
            : null,
        meeting_name: meetingName,
        attended_at: new Date().toISOString(),
        checkin_method: 'dashboard_quick',
        notes: form.note.trim() || null,
      })
    }

    // 4. Activity log (fire-and-forget)
    logCheckInActivity({ userId, mood: form.mood })

    // 5. Compute streak
    const streak = await computeStreak(userId)

    setSaveResult({ streak, mood: form.mood, meetingName })
    setSubmitting(false)

    setPhase('celebration')
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  if (!mounted) return null

  const modal = (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100 }}
      onMouseDown={e => { if (e.target === backdropRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
    >
      <div
        className="w-full sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{
          maxWidth: 480,
          background: '#fff',
          boxShadow: '0 24px 64px rgba(0,51,102,0.18)',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {phase === 'celebration' && saveResult ? (
          <CelebrationPanel
            mood={saveResult.mood}
            streak={saveResult.streak}
            meetingName={saveResult.meetingName}
            onClose={handleClose}
            onKeepGoing={handleClose}
          />
        ) : (
          <>
            {/* Header */}
            <div
              className="flex items-start justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div id="checkin-title" className="font-bold text-navy" style={{ fontSize: 17 }}>
                  {CHECKIN_COPY.title(dateLabel)}
                </div>
                <div className="text-mid" style={{ fontSize: 12, marginTop: 2 }}>
                  {CHECKIN_COPY.subtitle}
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close — return to today's practice"
                title="Close — return to today's practice"
                style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Mood */}
              <div>
                <div className="font-semibold text-navy mb-3" style={{ fontSize: 14 }}>
                  {CHECKIN_COPY.moodQ}
                </div>
                <MoodScale
                  value={form.mood}
                  onChange={mood => setForm(f => ({ ...f, mood }))}
                  firstButtonRef={firstFocusRef}
                />
              </div>

              {/* Meeting */}
              <div>
                <div className="font-semibold text-navy mb-3" style={{ fontSize: 14 }}>
                  {CHECKIN_COPY.meetingQOptional}
                </div>
                {showCustomForm ? (
                  <CustomMeetingForm
                    onSave={handleCustomSave}
                    onCancel={() => setShowCustomForm(false)}
                  />
                ) : (
                  <MeetingChips
                    userId={userId}
                    value={form.meeting ?? (form.meeting === null ? null : 'none')}
                    onChange={v => {
                      if (v === 'none') setForm(f => ({ ...f, meeting: null, newCustom: null }))
                      else setForm(f => ({ ...f, meeting: v, newCustom: null }))
                    }}
                    onCustom={() => { setShowCustomForm(true); setForm(f => ({ ...f, meeting: null })) }}
                  />
                )}
                {form.newCustom && !showCustomForm && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
                    ✓ {form.newCustom.name}
                    <button
                      onClick={() => { setForm(f => ({ ...f, meeting: null, newCustom: null })); setShowCustomForm(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 12, marginLeft: 8 }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label htmlFor="checkin-note" className="font-semibold text-navy block mb-2" style={{ fontSize: 14 }}>
                  {CHECKIN_COPY.noteQ}
                </label>
                <textarea
                  id="checkin-note"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Anything on your mind…"
                  rows={3}
                  className="w-full rounded-xl text-dark resize-none outline-none"
                  style={{ border: '1.5px solid var(--border)', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4 }}>
                  {CHECKIN_COPY.noteHelper}
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 13, color: 'var(--red-alert)', fontWeight: 500 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleSave}
                disabled={submitting || !form.mood}
                className="w-full rounded-xl font-semibold text-white"
                style={{
                  padding: '13px',
                  fontSize: 15,
                  background: 'var(--teal)',
                  border: 'none',
                  opacity: submitting || !form.mood ? 0.55 : 1,
                  cursor: submitting || !form.mood ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {submitting ? CHECKIN_COPY.saving : CHECKIN_COPY.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
