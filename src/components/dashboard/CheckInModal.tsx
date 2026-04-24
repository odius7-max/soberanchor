'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logCheckInActivity } from '@/app/dashboard/activity/actions'
import MoodScale from './checkin/MoodScale'
import MeetingChips from './checkin/MeetingChips'
import type { CheckinFormState, MoodKey, SaveResult } from './checkin/checkin-types'
import { CHECKIN_COPY } from '@/lib/copy/checkin'
import CelebrationPanel from './checkin/CelebrationPanel'
import AddMeetingModal from './meetings/AddMeetingModal'
import type { FellowshipOption, UserCustomMeeting } from './meetings/types'

interface Props {
  userId: string
  onClose: () => void
  hasActiveSponsor?: boolean
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

export default function CheckInModal({ userId, onClose, hasActiveSponsor = false }: Props) {
  const router = useRouter()
  const backdropRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  const [phase, setPhase] = useState<Phase>('form')
  const [form, setForm] = useState<CheckinFormState>({
    mood: null, meeting: null, newCustom: null, note: '', isSharedWithSponsor: hasActiveSponsor,
  })
  const [existingCheckInId, setExistingCheckInId] = useState<string | null>(null)
  // Phase R: free-text entry. When non-empty it wins over a chip selection.
  const [freeTextName, setFreeTextName] = useState<string>('')
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [fellowships, setFellowships] = useState<FellowshipOption[]>([])
  const [primaryFellowshipId, setPrimaryFellowshipId] = useState<string | null>(null)
  const [savedMeetingsVersion, setSavedMeetingsVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [mounted, setMounted] = useState(false)
  const [moodError, setMoodError] = useState(false)
  const moodSectionRef = useRef<HTMLDivElement>(null)

  // Portal mount guard
  useEffect(() => { setMounted(true) }, [])

  // Load today's existing check-in for same-day edit mode
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    createClient()
      .from('check_ins')
      .select('id,mood,notes')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingCheckInId(data.id)
          setForm(f => ({
            ...f,
            mood: (data.mood as CheckinFormState['mood']) ?? null,
            note: (data.notes as string) ?? '',
          }))
        }
      })
  }, [userId])

  // Phase R: load user's fellowships + primary for AddMeetingModal pill defaults.
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: milestones } = await supabase
        .from('sobriety_milestones')
        .select('fellowship_id, is_primary, fellowships(id, name, abbreviation)')
        .eq('user_id', userId)
        .not('fellowship_id', 'is', null)
      if (!milestones) return
      const seen = new Set<string>()
      const opts: FellowshipOption[] = []
      let primary: string | null = null
      for (const row of milestones as any[]) {
        const f = row.fellowships as { id: string; name: string; abbreviation: string | null } | null
        if (f && !seen.has(f.id)) {
          seen.add(f.id)
          opts.push(f)
        }
        if (row.is_primary && row.fellowship_id) primary = row.fellowship_id
      }
      setFellowships(opts)
      setPrimaryFellowshipId(primary ?? opts[0]?.id ?? null)
    })()
  }, [userId])

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

  // Phase R: after AddMeetingModal saves, treat the row as the active selection
  // and bump the MRU list so it shows up immediately.
  function handleMeetingSaved(m: UserCustomMeeting) {
    setForm(f => ({
      ...f,
      newCustom: null,
      meeting: { key: `cus:${m.id}`, kind: 'custom', id: m.id, name: m.name },
    }))
    setFreeTextName('')
    setShowAddMeeting(false)
    setSavedMeetingsVersion(v => v + 1)
  }

  async function handleSave() {
    if (!form.mood) { setMoodError(true); return }
    setMoodError(false)
    setSubmitting(true)
    setError(null)
    const supabase = createClient()

    // 1. Insert or update check_in
    const sharedWithSponsor = hasActiveSponsor
    const ciPayload = {
      mood: form.mood,
      sober_today: true,
      notes: form.note.trim() || null,
      is_shared_with_sponsor: sharedWithSponsor,
    }
    const ciResult = existingCheckInId
      ? await supabase.from('check_ins').update(ciPayload).eq('id', existingCheckInId).eq('user_id', userId)
      : await supabase.from('check_ins').insert({ user_id: userId, ...ciPayload })
    if (ciResult.error) { setError('Failed to save. Please try again.'); setSubmitting(false); return }

    // 2. Resolve the meeting being logged.
    // Phase R priority order:
    //   a) free-text input wins if the user typed something (text-only row)
    //   b) otherwise use the selected chip (custom_meeting_id, bump MRU)
    //   c) 'none' means "No meeting today" - no attendance row
    //   d) null means user didn't touch meetings - leave existing rows alone
    const trimmedText = freeTextName.trim()
    const chipPicked = form.meeting && form.meeting !== 'none' ? form.meeting : null
    const userInteractedWithMeetings = !!trimmedText || form.meeting !== null

    if (existingCheckInId && userInteractedWithMeetings) {
      const today = new Date().toISOString().slice(0, 10)
      await supabase
        .from('meeting_attendance')
        .delete()
        .eq('user_id', userId)
        .eq('checkin_method', 'dashboard_quick')
        .gte('attended_at', `${today}T00:00:00Z`)
        .lte('attended_at', `${today}T23:59:59Z`)
    }

    const meetingName = trimmedText || chipPicked?.name || null
    const selectedCustomId = !trimmedText && chipPicked?.kind === 'custom' && chipPicked.id
      ? chipPicked.id
      : null

    if (meetingName) {
      await supabase.from('meeting_attendance').insert({
        user_id: userId,
        meeting_id: null, // Phase R dropped the public-directory pick path here
        custom_meeting_id: selectedCustomId,
        meeting_name: meetingName,
        attended_at: new Date().toISOString(),
        checkin_method: 'dashboard_quick',
        notes: form.note.trim() || null,
      })

      // Bump MRU stamp so this meeting surfaces first next time.
      if (selectedCustomId) {
        await supabase
          .from('user_custom_meetings')
          .update({ last_attended_at: new Date().toISOString() })
          .eq('id', selectedCustomId)
          .eq('user_id', userId)
      }
    }

    // 3. Activity log (fire-and-forget)
    logCheckInActivity({ userId, mood: form.mood })

    // 4. Compute streak
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
                aria-label="Close - return to today's practice"
                title="Close - return to today's practice"
                style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                x
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Mood */}
              <div ref={moodSectionRef}>
                <div className="font-semibold text-navy mb-3" style={{ fontSize: 14 }}>
                  {CHECKIN_COPY.moodQ} <span style={{ color: 'var(--red-alert)', fontWeight: 500 }} aria-hidden="true">*</span>
                </div>
                <div
                  style={{
                    border: moodError ? '1.5px solid var(--red-alert)' : '1.5px solid transparent',
                    background: moodError ? 'var(--red-alert-bg, #FEE)' : 'transparent',
                    borderRadius: 12,
                    padding: moodError ? 10 : 0,
                    transition: 'border-color 0.15s, background 0.15s, padding 0.15s',
                  }}
                >
                  <MoodScale
                    value={form.mood}
                    onChange={mood => {
                      setForm(f => ({ ...f, mood }))
                      if (mood) setMoodError(false)
                    }}
                    firstButtonRef={firstFocusRef}
                  />
                </div>
                {moodError && (
                  <div
                    role="alert"
                    style={{ fontSize: 13, color: 'var(--red-alert)', fontWeight: 500, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span aria-hidden="true">{'\u26A0'}</span>
                    <span>Select how you&rsquo;re feeling to save your check-in.</span>
                  </div>
                )}
              </div>

              {/* Sharing notice */}
              <div style={{ fontSize: 12, color: 'var(--mid)', padding: '2px 0' }}>
                {hasActiveSponsor
                  ? 'Shared with your sponsor - this is how we stay accountable.'
                  : 'Private to you.'}
              </div>

              {/* Meeting - Phase R: entry-first */}
              <div>
                <label htmlFor="checkin-meeting-entry" className="font-semibold text-navy block mb-3" style={{ fontSize: 14 }}>
                  {CHECKIN_COPY.meetingEntryLabel}
                </label>
                <input
                  id="checkin-meeting-entry"
                  value={freeTextName}
                  onChange={e => {
                    setFreeTextName(e.target.value)
                    if (e.target.value && form.meeting && form.meeting !== 'none') {
                      setForm(f => ({ ...f, meeting: null }))
                    }
                  }}
                  placeholder={CHECKIN_COPY.meetingEntryPlaceholder}
                  className="w-full rounded-xl text-dark outline-none"
                  style={{ border: '1.5px solid var(--border)', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <div style={{ marginTop: 12 }}>
                  <MeetingChips
                    key={savedMeetingsVersion}
                    userId={userId}
                    value={form.meeting}
                    onChange={v => {
                      setForm(f => ({ ...f, meeting: v, newCustom: null }))
                      if (v && v !== 'none') setFreeTextName('')
                    }}
                    onAdd={() => setShowAddMeeting(true)}
                  />
                </div>
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
                  placeholder="Anything on your mind..."
                  rows={3}
                  className="w-full rounded-xl text-dark resize-none outline-none"
                  style={{ border: '1.5px solid var(--border)', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4 }}>
                  {hasActiveSponsor ? CHECKIN_COPY.noteHelperShared : CHECKIN_COPY.noteHelperPrivate}
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
                onClick={() => {
                  if (submitting) return
                  if (!form.mood) {
                    // Flag the mood section with an inline field-level error
                    // (like the "insecure password" pattern) and scroll it into view,
                    // rather than leaving the user staring at a silent disabled button.
                    setMoodError(true)
                    moodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    return
                  }
                  handleSave()
                }}
                aria-disabled={submitting}
                className="w-full rounded-xl font-semibold text-white"
                style={{
                  padding: '13px',
                  fontSize: 15,
                  background: form.mood ? 'var(--teal)' : 'var(--mid)',
                  border: 'none',
                  opacity: submitting ? 0.55 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                {submitting
                  ? (existingCheckInId ? CHECKIN_COPY.updating : CHECKIN_COPY.saving)
                  : !form.mood
                    ? 'Pick a mood to save'
                    : (existingCheckInId ? CHECKIN_COPY.update : CHECKIN_COPY.save)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(
    <>
      {modal}
      {showAddMeeting && (
        <AddMeetingModal
          userId={userId}
          availableFellowships={fellowships}
          primaryFellowshipId={primaryFellowshipId}
          prefill={{ name: freeTextName.trim() || undefined }}
          onClose={() => setShowAddMeeting(false)}
          onSave={handleMeetingSaved}
        />
      )}
    </>,
    document.body,
  )
}
