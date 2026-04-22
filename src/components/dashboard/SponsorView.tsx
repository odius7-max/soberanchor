'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AddSponseeModal from './AddSponseeModal'
import PendingRequests from './PendingRequests'
import type { PendingRequest } from './PendingRequests'
import { createClient } from '@/lib/supabase/client'
import type { SponseeFull, SponseeCheckIn } from './DashboardShell'
import { useSponsorAccess } from '@/hooks/useSponsorAccess'
import Link from 'next/link'
import CheckInReportModal from './CheckInReportModal'
import StepWorkReportModal from './StepWorkReportModal'
import MeetingReportModal from './MeetingReportModal'

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_META: Record<string, { emoji: string; label: string; color: string }> = {
  great:      { emoji: '😊', label: 'Great',      color: '#38a169' },
  good:       { emoji: '🙂', label: 'Good',       color: '#38a169' },
  okay:       { emoji: '😐', label: 'Okay',       color: '#D4A574' },
  struggling: { emoji: '😔', label: 'Struggling', color: '#E67E22' },
  crisis:     { emoji: '😰', label: 'Crisis',     color: '#C0392B' },
}

const MILESTONE_DAYS = [7, 14, 21, 30, 60, 90, 120, 180, 270, 365, 500, 730, 1000, 1095, 1461, 1826, 2557, 3650]

// ─── Utilities ───────────────────────────────────────────────────────────────

function calcDays(d: string | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000)
}

function daysSince(d: string | null): number {
  if (!d) return Infinity
  return Math.floor((Date.now() - new Date(d.includes('T') ? d : d + 'T00:00:00').getTime()) / 86400000)
}

function relDate(d: string | null): string {
  if (!d) return 'Never'
  const days = daysSince(d)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function fmtDate(d: string): string {
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtShort(d: string): string {
  return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function calcStreak(history: SponseeCheckIn[]): { current: number; longest: number } {
  if (!history.length) return { current: 0, longest: 0 }
  const dateSet = new Set(history.map(h => h.date))

  let current = 0
  const cursor = new Date()
  while (true) {
    if (dateSet.has(cursor.toISOString().slice(0, 10))) {
      current++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  const sorted = Array.from(dateSet).sort()
  let longest = sorted.length > 0 ? 1 : 0
  let streak = sorted.length > 0 ? 1 : 0
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i] + 'T00:00:00').getTime() - new Date(sorted[i - 1] + 'T00:00:00').getTime()) / 86400000
    )
    if (diff === 1) { streak++; longest = Math.max(longest, streak) }
    else streak = 1
  }
  return { current, longest }
}

function fmtMilestoneLabel(days: number): string {
  if (days < 365) return `${days} Days`
  const years = Math.round(days / 365)
  return `${years} Year${years !== 1 ? 's' : ''}`
}

function getNextMilestone(sobrietyDate: string | null) {
  const days = calcDays(sobrietyDate)
  if (days === null) return null
  const next = MILESTONE_DAYS.find(m => m > days)
  if (!next) return null
  const daysAway = next - days
  const target = new Date()
  target.setDate(target.getDate() + daysAway)
  return {
    label: fmtMilestoneLabel(next),
    daysAway,
    targetDate: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

// ─── Mood Trend ───────────────────────────────────────────────────────────────

function MoodTrend({ history }: { history: SponseeCheckIn[] }) {
  const [page, setPage] = useState(0)
  const [popover, setPopover] = useState<{ date: string; ci: SponseeCheckIn } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const maxPage = 3 // 4 pages × 14 days = 56 days (within our 60-day fetch window)

  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 480)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const dotSize = isNarrow ? 20 : 26
  const dotGap = isNarrow ? 2 : 3
  const dotFontSize = isNarrow ? 11 : 14

  const dateMap = useMemo(() => {
    const m: Record<string, SponseeCheckIn> = {}
    for (const ci of history) m[ci.date] = ci
    return m
  }, [history])

  // Build 14 date strings for the current page, oldest on left → newest on right
  const days = useMemo(() => {
    const result: string[] = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - (page * 14 + i))
      result.push(d.toISOString().slice(0, 10))
    }
    return result
  }, [page])

  useEffect(() => {
    if (!popover) return
    function close(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setPopover(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [popover])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
        14-Day Mood Trend
      </div>

      {/* Navigation row: ‹ date range › */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <button
          onClick={() => { setPage(p => Math.min(p + 1, maxPage)); setPopover(null) }}
          disabled={page >= maxPage}
          aria-label="Previous 14 days"
          style={{ background: 'none', border: 'none', cursor: page >= maxPage ? 'not-allowed' : 'pointer', color: page >= maxPage ? 'var(--border)' : 'var(--mid)', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}
        >‹</button>
        <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 600 }}>
          {fmtShort(days[0])} — {fmtShort(days[13])}
        </div>
        <button
          onClick={() => { setPage(p => Math.max(p - 1, 0)); setPopover(null) }}
          disabled={page === 0}
          aria-label="Next 14 days"
          style={{ background: 'none', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--border)' : 'var(--mid)', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}
        >›</button>
      </div>

      {/* Dots row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: dotGap, justifyContent: 'center' }}>
        {days.map((date, idx) => {
          const ci = dateMap[date]
          const mood = ci?.mood ? MOOD_META[ci.mood] : null
          const isActive = popover?.date === date

          return (
            <div key={date} style={{ display: 'flex', alignItems: 'center', gap: dotGap }}>
              {/* Dashed divider between week 1 (idx 0-6) and week 2 (idx 7-13) */}
              {idx === 7 && (
                <div style={{ height: 22, width: 0, borderLeft: '1.5px dashed var(--border)', marginLeft: 2, marginRight: 2 }} />
              )}
              <button
                onClick={() => ci ? setPopover(p => p?.date === date ? null : { date, ci }) : undefined}
                title={ci ? `${date}: ${mood?.label ?? 'checked in'}` : `${date}: no check-in`}
                style={{
                  width: dotSize, height: dotSize, borderRadius: '50%',
                  border: 'none', padding: 0,
                  cursor: ci ? 'pointer' : 'default',
                  background: ci
                    ? (mood ? mood.color + '28' : 'rgba(42,138,153,0.14)')
                    : 'var(--warm-gray)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: ci ? dotFontSize : 7,
                  outline: isActive ? '2px solid var(--teal)' : 'none',
                  outlineOffset: 1,
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.12s',
                  color: ci ? 'inherit' : 'var(--mid)',
                }}
              >
                {ci ? (mood?.emoji ?? '✓') : '·'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Popover */}
      {popover && (
        <div
          ref={popoverRef}
          style={{
            background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '14px 16px', marginTop: 10,
            boxShadow: '0 4px 20px rgba(0,51,102,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: popover.ci.notes ? 10 : 0 }}>
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
              {MOOD_META[popover.ci.mood ?? '']?.emoji ?? '✓'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>
                {fmtDate(popover.date)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
                {popover.ci.mood && (
                  <span style={{ color: MOOD_META[popover.ci.mood]?.color ?? 'var(--mid)', fontWeight: 600 }}>
                    {MOOD_META[popover.ci.mood]?.label}
                  </span>
                )}
                <span>{popover.ci.soberToday ? '✓ Sober today' : '✗ Not sober today'}</span>
                <span>{popover.ci.meetingsAttended} meeting{popover.ci.meetingsAttended !== 1 ? 's' : ''} attended</span>
                {popover.ci.calledSponsor !== null && (
                  <span>{popover.ci.calledSponsor ? '✓ Called sponsor' : '✗ Didn\'t call sponsor'}</span>
                )}
              </div>
            </div>
          </div>
          {popover.ci.notes && (
            <div style={{
              fontSize: 13, color: 'var(--dark)', lineHeight: 1.6,
              borderTop: '1px solid var(--border)', paddingTop: 10,
              fontStyle: 'italic',
            }}>
              &ldquo;{popover.ci.notes}&rdquo;
            </div>
          )}
          {!popover.ci.notes && !popover.ci.mood && (
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>No additional details recorded.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sponsee Card ─────────────────────────────────────────────────────────────

function SponseeCard({ sponsee }: { sponsee: SponseeFull }) {
  const router = useRouter()
  const [showNote, setShowNote] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showStepWorkReport, setShowStepWorkReport] = useState(false)
  const [showMeetingReport, setShowMeetingReport] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [localNote, setLocalNote] = useState(sponsee.latestNote)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastCheckIn = sponsee.checkInHistory[0] ?? null
  const mood = lastCheckIn?.mood ? MOOD_META[lastCheckIn.mood] : null
  const days = calcDays(sponsee.sobrietyDate)
  const streak = useMemo(() => calcStreak(sponsee.checkInHistory), [sponsee.checkInHistory])
  const nextM = useMemo(() => getNextMilestone(sponsee.sobrietyDate), [sponsee.sobrietyDate])
  const pct = sponsee.totalSteps > 0 ? Math.round((sponsee.completedSteps / sponsee.totalSteps) * 100) : 0
  const allDone = sponsee.completedSteps >= sponsee.totalSteps && sponsee.totalSteps > 0

  const daysSinceCheckIn = daysSince(lastCheckIn?.date ?? null)
  const daysSinceStepWork = daysSince(sponsee.lastStepWork?.date ?? null)

  const hasAlert = daysSinceCheckIn > 2 || sponsee.pendingReviews > 2
  const isOnTrack = daysSinceCheckIn <= 1 && sponsee.pendingReviews === 0

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    if (showNote) textareaRef.current?.focus()
  }, [showNote])

  async function handleSaveNote() {
    if (!noteText.trim() || isSaving) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')
      const { error } = await supabase.from('sponsor_notes').insert({
        sponsor_id: user.id,
        sponsee_id: sponsee.id,
        note_text: noteText.trim(),
      })
      if (error) throw new Error(error.message)
      setLocalNote({ text: noteText.trim(), createdAt: new Date().toISOString() })
      setNoteText('')
      setShowNote(false)
      showToast('Note saved')
    } catch {
      showToast('Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-[22px] relative" style={{
      border: '1px solid var(--border)',
      borderLeft: hasAlert ? '3px solid #D4A574' : '1px solid var(--border)',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--navy)', color: '#fff',
          borderRadius: 8, padding: '6px 14px',
          fontSize: 12, fontWeight: 600, zIndex: 10,
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#2A8A99,#003366)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700,
          }}>
            {sponsee.name[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>{sponsee.name}</div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 6px' }}>
              {(sponsee.fellowshipAbbrs ?? (sponsee.fellowshipAbbr ? [sponsee.fellowshipAbbr] : [])).map(abbr => (
                <span key={abbr} style={{
                  background: 'rgba(42,138,153,0.1)', color: 'var(--teal)',
                  borderRadius: 5, padding: '1px 6px', fontWeight: 700, fontSize: 11,
                }}>
                  {abbr}
                </span>
              ))}
              <span>{days !== null ? `${days.toLocaleString()} days sober` : 'No sobriety date'}</span>
              {sponsee.sobrietyDate && <span style={{ color: 'var(--border)' }}>·</span>}
              {sponsee.sobrietyDate && (
                <span>
                  Since {new Date(sponsee.sobrietyDate + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        {mood && (
          <span title={`Last mood: ${mood.label}`} style={{ fontSize: 24, flexShrink: 0 }}>
            {mood.emoji}
          </span>
        )}
      </div>

      {/* ── Alert badges ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {sponsee.pendingReviews > 0 && (
          <span style={{
            background: 'rgba(212,165,116,0.12)', color: '#8B6914',
            border: '1px solid rgba(212,165,116,0.45)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            {sponsee.pendingReviews} step{sponsee.pendingReviews !== 1 ? 's' : ''} awaiting review
          </span>
        )}
        {sponsee.overdueTasks > 0 && (
          <span style={{
            background: 'rgba(192,57,43,0.07)', color: '#c0392b',
            border: '1px solid rgba(192,57,43,0.22)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            {sponsee.overdueTasks} task{sponsee.overdueTasks !== 1 ? 's' : ''} overdue
          </span>
        )}
        {sponsee.activeTasks > 0 && sponsee.overdueTasks === 0 && (
          <span style={{
            background: 'rgba(42,138,153,0.07)', color: 'var(--teal)',
            border: '1px solid rgba(42,138,153,0.2)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            📋 {sponsee.activeTasks} active task{sponsee.activeTasks !== 1 ? 's' : ''}
          </span>
        )}
        {daysSinceCheckIn > 2 && daysSinceCheckIn !== Infinity && (
          <span style={{
            background: 'rgba(220,53,69,0.07)', color: '#b02a37',
            border: '1px solid rgba(220,53,69,0.22)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            No check-in in {daysSinceCheckIn} days
          </span>
        )}
        {daysSinceCheckIn === Infinity && (
          <span style={{
            background: 'rgba(220,53,69,0.07)', color: '#b02a37',
            border: '1px solid rgba(220,53,69,0.22)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            No check-ins yet
          </span>
        )}
        {isOnTrack && (
          <span style={{
            background: 'rgba(39,174,96,0.08)', color: '#1a7a45',
            border: '1px solid rgba(39,174,96,0.25)', borderRadius: 20,
            padding: '3px 10px', fontSize: 11, fontWeight: 700,
          }}>
            ✓ On track
          </span>
        )}
      </div>

      {/* ── Vitals — 3 columns ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
        <div
          onClick={() => setShowReport(true)}
          title="View check-in report"
          style={{ background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>Last Check-in</div>
            <span style={{ fontSize: 11, color: 'var(--mid)', opacity: 0.65, lineHeight: 1 }}>🔍</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: daysSinceCheckIn > 2 ? '#D4A574' : 'var(--navy)' }}>
            {relDate(lastCheckIn?.date ?? null)}
          </div>
          {lastCheckIn?.mood && (
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
              {MOOD_META[lastCheckIn.mood]?.emoji} {MOOD_META[lastCheckIn.mood]?.label}
            </div>
          )}
        </div>

        <div onClick={() => setShowStepWorkReport(true)} title="View step work report"
          style={{ background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>Last Step Work</div>
            <span style={{ fontSize: 11, color: 'var(--mid)', opacity: 0.65, lineHeight: 1 }}>🔍</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: daysSinceStepWork > 5 ? '#D4A574' : 'var(--navy)' }}>
            {relDate(sponsee.lastStepWork?.date ?? null)}
          </div>
          {sponsee.lastStepWork?.title && (
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sponsee.lastStepWork.title}
            </div>
          )}
        </div>

        <div onClick={() => setShowMeetingReport(true)} title="View meeting report"
          style={{ background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>Last Meeting</div>
            <span style={{ fontSize: 11, color: 'var(--mid)', opacity: 0.65, lineHeight: 1 }}>🔍</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>
            {relDate(sponsee.lastMeeting?.date ?? null)}
          </div>
          {sponsee.lastMeeting?.name && (
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sponsee.lastMeeting.name}
            </div>
          )}
        </div>
      </div>

      {/* ── Vitals row 2 — 2 columns ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <div style={{ background: 'rgba(212,165,116,0.07)', border: '1px solid rgba(212,165,116,0.2)', borderRadius: 10, padding: '10px 11px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Next Milestone</div>
          {nextM ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>{nextM.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                In {nextM.daysAway} day{nextM.daysAway !== 1 ? 's' : ''} · {nextM.targetDate}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>
              {days !== null && days >= 3650 ? '10+ years 🏆' : days !== null && days > 0 ? 'Long-term recovery!' : 'No date set'}
            </div>
          )}
        </div>

        <div style={{ background: 'rgba(42,138,153,0.06)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 10, padding: '10px 11px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Check-in Streak</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>
            {streak.current} day{streak.current !== 1 ? 's' : ''} current
          </div>
          <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
            Longest: {streak.longest} day{streak.longest !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── 14-day mood trend ── */}
      <MoodTrend history={sponsee.checkInHistory} />

      {/* ── Step progress bar ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--mid)' }}>
          <span>
            {allDone
              ? `All ${sponsee.totalSteps} steps complete`
              : `Step ${Math.min(sponsee.completedSteps + 1, sponsee.totalSteps)} of ${sponsee.totalSteps}`}
          </span>
          <span style={{ fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={{ height: 7, background: 'var(--warm-gray)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${Math.max(pct > 0 ? Math.max(pct, 3) : 0, 0)}%`,
            background: pct < 25 ? '#D4A574' : 'linear-gradient(90deg,#2A8A99,#003366)',
            transition: 'width 0.4s',
          }} />
        </div>
      </div>

      {/* ── Latest sponsor note ── */}
      {localNote && !showNote && (
        <div style={{ borderLeft: '3px solid var(--teal)', paddingLeft: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--mid)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>Your Note · {new Date(localNote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {sponsee.noteCount > 1 && (
              <span style={{ fontWeight: 500, opacity: 0.7, textTransform: 'none', letterSpacing: 0 }}>· {sponsee.noteCount} notes</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6, fontStyle: 'italic' }}>
            &ldquo;{localNote.text}&rdquo;
          </div>
        </div>
      )}

      {/* ── Inline add note ── */}
      {showNote && (
        <div style={{ marginBottom: 14 }}>
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setShowNote(false); setNoteText('') } }}
            placeholder="Add a private sponsor note…"
            rows={3}
            style={{
              width: '100%', borderRadius: 8,
              border: '1.5px solid var(--teal)',
              padding: '10px 12px', fontSize: 13,
              fontFamily: 'var(--font-body)', resize: 'vertical',
              outline: 'none', boxSizing: 'border-box', color: 'var(--dark)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowNote(false); setNoteText('') }}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                color: 'var(--mid)', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              disabled={isSaving || !noteText.trim()}
              style={{
                background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7,
                padding: '6px 18px', fontSize: 12, fontWeight: 600,
                cursor: isSaving || !noteText.trim() ? 'not-allowed' : 'pointer',
                opacity: isSaving || !noteText.trim() ? 0.6 : 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              {isSaving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push(`/dashboard/step-work/pending?sponsee=${sponsee.id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--teal)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
            background: sponsee.pendingReviews > 0 ? '#ffbe3d' : '#27AE60',
          }} />
          Review Step Work{sponsee.pendingReviews > 0 ? ` (${sponsee.pendingReviews})` : ''}
        </button>

        <button
          onClick={() => router.push(`/my-recovery/sponsor/sponsee/${sponsee.id}`)}
          style={{
            background: 'none', color: 'var(--navy)', border: '1.5px solid var(--navy)',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          View Profile
        </button>

        <button
          onClick={() => setShowNote(v => !v)}
          style={{
            background: 'none', color: 'var(--mid)', border: '1.5px solid var(--border)',
            borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Add Note{sponsee.noteCount > 0 && !localNote ? ` · ${sponsee.noteCount}` : ''}
        </button>

      </div>

      {/* Check-in report modal (portal) */}
      {showReport && (
        <CheckInReportModal
          sponseeId={sponsee.id}
          sponseeName={sponsee.name}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Step work report modal (portal) */}
      {showStepWorkReport && (
        <StepWorkReportModal
          sponseeId={sponsee.id}
          sponseeName={sponsee.name}
          fellowshipId={sponsee.relationships[0]?.fellowshipId ?? null}
          onClose={() => setShowStepWorkReport(false)}
        />
      )}

      {/* Meeting report modal (portal) */}
      {showMeetingReport && (
        <MeetingReportModal
          sponseeId={sponsee.id}
          sponseeName={sponsee.name}
          onClose={() => setShowMeetingReport(false)}
        />
      )}
    </div>
  )
}

// ─── Main SponsorView ─────────────────────────────────────────────────────────

interface Props {
  sponsees: SponseeFull[]
  pendingRequests: PendingRequest[]
  displayName?: string
  userId: string
}

export default function SponsorView({ sponsees, pendingRequests, displayName, userId }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const { status, daysRemaining } = useSponsorAccess(userId)

  const today = new Date().toISOString().slice(0, 10)
  const pendingTotal = sponsees.reduce((s, sp) => s + sp.pendingReviews, 0)
  const checkInsToday = sponsees.filter(sp => sp.checkInHistory[0]?.date === today).length

  // Sort: alerted cards first, then oldest check-in date first within each group
  const sorted = useMemo(() => [...sponsees].sort((a, b) => {
    const aAlert = daysSince(a.checkInHistory[0]?.date ?? null) > 2 || a.pendingReviews > 2
    const bAlert = daysSince(b.checkInHistory[0]?.date ?? null) > 2 || b.pendingReviews > 2
    if (aAlert !== bAlert) return aAlert ? -1 : 1
    const aDate = a.checkInHistory[0]?.date ?? '0000-00-00'
    const bDate = b.checkInHistory[0]?.date ?? '0000-00-00'
    return aDate < bDate ? -1 : aDate > bDate ? 1 : 0
  }), [sponsees])

  // ─── Reusable inner content ───────────────────────────────────────────────
  const dashboardContent = (
    <>
      <PendingRequests requests={pendingRequests} perspective="as_sponsor" />

      {/* ── Summary stats row ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 130, borderRadius: 14, padding: '18px 20px', background: 'linear-gradient(135deg,#003366,#1a4a5e)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>Active Sponsees</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15 }}>{sponsees.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: 130, borderRadius: 14, padding: '18px 20px', background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 2 }}>Pending Reviews</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15, color: pendingTotal > 0 ? '#D4A574' : 'var(--navy)' }}>{pendingTotal}</div>
        </div>
        <div style={{ flex: 1, minWidth: 130, borderRadius: 14, padding: '18px 20px', background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 2 }}>Checked In Today</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15, color: '#2A8A99' }}>{checkInsToday}</div>
        </div>
      </div>

      {/* ── Header + add button ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, margin: 0 }}>Your Sponsees</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/dashboard/sponsees/program"
            style={{
              background: '#fff', color: 'var(--navy)',
              border: '1.5px solid var(--border)', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            Task Library →
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add Sponsee
          </button>
        </div>
      </div>

      {/* ── Sponsee cards ── */}
      {sponsees.length === 0 ? (
        <div style={{ borderRadius: 16, border: '1px solid var(--border)', padding: '40px 24px', textAlign: 'center', background: '#fff' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 16, marginBottom: 6 }}>No active sponsees yet</div>
          <div style={{ fontSize: 14, color: 'var(--mid)' }}>Click &quot;Add Sponsee&quot; to connect with someone you&apos;re sponsoring.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {sorted.map(sp => (<SponseeCard key={sp.id} sponsee={sp} />))}
        </div>
      )}
    </>
  )

  return (
    <div>
      {/* ── Trial active banner (green) ── */}
      {status === 'trialing' && daysRemaining > 7 && (
        <div style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 500 }}>
            Sponsor Pro trial — <strong>{daysRemaining} days remaining</strong>
          </span>
          <span style={{ background: '#27AE60', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '1px', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Pro</span>
        </div>
      )}

      {/* ── Trial warning banner (amber) ── */}
      {status === 'trialing' && daysRemaining <= 7 && (
        <div style={{ background: 'rgba(212,165,116,0.1)', border: '1.5px solid rgba(212,165,116,0.5)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#a0692a', fontWeight: 500 }}>
            Your trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>. Subscribe to keep your tools.
          </span>
          <Link href="/upgrade" style={{ background: 'var(--navy)', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Expired locked overlay ── */}
      {status === 'expired' ? (
        <div>
          {/* Blurred teaser strip */}
          <div style={{ overflow: 'hidden', maxHeight: 170, borderRadius: 14, marginBottom: 0, position: 'relative' }}>
            <div style={{ filter: 'blur(5px)', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
                {[['Active Sponsees', String(sponsees.length), 'linear-gradient(135deg,#003366,#1a4a5e)', '#fff', 'rgba(255,255,255,0.55)'],
                  ['Pending Reviews', String(pendingTotal), '#fff', pendingTotal > 0 ? '#D4A574' : 'var(--navy)', 'var(--mid)'],
                  ['Checked In Today', String(checkInsToday), '#fff', '#2A8A99', 'var(--mid)']
                ].map(([label, value, bg, color, labelColor]) => (
                  <div key={label} style={{ flex: 1, minWidth: 130, borderRadius: 14, padding: '18px 20px', background: bg, border: bg === '#fff' ? '1px solid var(--border)' : undefined }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: color, letterSpacing: '-1px', lineHeight: 1.15 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Gradient fade */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, transparent, #f8f6f3)' }} />
          </div>

          {/* Lock screen */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 28px', textAlign: 'center', marginTop: 8 }}>
            {/* Anchor icon */}
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#2A8A99,#1a6b78)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(42,138,153,0.25)' }}>
              <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
                <path d="M32 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="#fff" strokeWidth="2.5"/>
                <path d="M32 22v28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M20 42c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M24 34h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.4px', margin: '0 0 8px' }}>
              Your sponsee data is safe
            </h2>
            <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              Subscribe to access your dashboard, mood trends, step work reviews, and reports.
            </p>

            {/* Pricing cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, textAlign: 'left' }}>
              {/* Monthly — featured */}
              <div style={{ border: '2px solid var(--teal)', borderRadius: 14, padding: '20px 18px', background: 'rgba(42,138,153,0.03)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Monthly</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.5px', lineHeight: 1 }}>$9.99</div>
                <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>per month</div>
              </div>
              {/* Annual */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '20px 18px', background: '#fff' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Annual</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.5px', lineHeight: 1 }}>$79.99</div>
                <div style={{ fontSize: 12, color: '#27AE60', marginTop: 4, fontWeight: 600 }}>Save 33%</div>
              </div>
            </div>

            <Link href="/upgrade" style={{ display: 'block', background: 'var(--teal)', color: '#fff', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.2px', marginBottom: 12, textAlign: 'center' }}>
              Subscribe to Sponsor Pro
            </Link>
            <p style={{ fontSize: 12, color: 'var(--mid)', margin: '0 0 28px' }}>
              Linking with sponsees and marking steps complete is always free.
            </p>

            {/* Mission section */}
            <div style={{ background: 'rgba(0,51,102,0.03)', border: '1px solid rgba(0,51,102,0.08)', borderRadius: 14, padding: '20px 20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
                  <path d="M32 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="var(--navy)" strokeWidth="2.5"/>
                  <path d="M32 20v28" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M20 40c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M24 32h16" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Why we charge</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.65, margin: '0 0 14px' }}>
                Sponsorship is free — and always will be. These tools take real resources to build and maintain. We&apos;re not a venture-backed startup or a corporation. We&apos;re a family in recovery who built what we wished existed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  'Your subscription covers servers, development, and support — nothing more',
                  'A portion of every subscription is donated to recovery community organizations',
                  'No ads. No data selling. No investors to answer to. Just people helping people',
                  'Sponsee accounts, meetings, step work, and the full directory are free forever',
                ].map(point => (
                  <div key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>{point}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--mid)', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>
                &ldquo;We built SoberAnchor because Angel couldn&apos;t find what she needed during her own recovery. Your support lets us keep building it for everyone else.&rdquo; — Angel &amp; Travis Johnson, co-founders
              </p>
            </div>
          </div>
        </div>
      ) : (
        dashboardContent
      )}

      {showAddModal && <AddSponseeModal userId={userId} onClose={() => setShowAddModal(false)} sponsorName={displayName} />}
    </div>
  )
}
