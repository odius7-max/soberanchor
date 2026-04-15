'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface CheckInReportEntry {
  check_in_date: string
  mood: string | null
  sober_today: boolean
  meetings_attended: number | null
  called_sponsor: boolean | null
  notes: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES = [7, 30, 60, 90] as const
type Range = (typeof RANGES)[number]

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MOOD_STYLE: Record<string, { bg: string; emoji: string; label: string }> = {
  great:      { bg: '#E1F5EE', emoji: '😊', label: 'Great' },
  good:       { bg: '#EAF3DE', emoji: '🙂', label: 'Good' },
  okay:       { bg: '#FAEEDA', emoji: '😐', label: 'Okay' },
  struggling: { bg: '#FAECE7', emoji: '😔', label: 'Struggling' },
  crisis:     { bg: '#FCEBEB', emoji: '😰', label: 'Crisis' },
}

const MOOD_COLOR: Record<string, string> = {
  great: '#27AE60', good: '#2A8A99', okay: '#D4A574',
  struggling: '#E67E22', crisis: '#C0392B',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CalDay = {
  date: Date
  dateStr: string
  inRange: boolean
  ci: CheckInReportEntry | null
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function buildCalendar(checkIns: CheckInReportEntry[], days: number): CalDay[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rangeStart = new Date(today)
  rangeStart.setDate(today.getDate() - days + 1)

  const byDate: Record<string, CheckInReportEntry> = {}
  for (const ci of checkIns) byDate[ci.check_in_date] = ci

  // Monday of week containing rangeStart (0=Sun → go back 6; 1=Mon → 0; etc.)
  const startDow = rangeStart.getDay()
  const backDays = startDow === 0 ? 6 : startDow - 1
  const gridStart = new Date(rangeStart)
  gridStart.setDate(rangeStart.getDate() - backDays)

  // Sunday of week containing today
  const todayDow = today.getDay()
  const fwdDays = todayDow === 0 ? 0 : 7 - todayDow
  const gridEnd = new Date(today)
  gridEnd.setDate(today.getDate() + fwdDays)

  const weeks: CalDay[][] = []
  const cur = new Date(gridStart)
  while (cur <= gridEnd) {
    const week: CalDay[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(cur)
      const dateStr = day.toISOString().slice(0, 10)
      const inRange = day >= rangeStart && day <= today
      week.push({ date: day, dateStr, inRange, ci: inRange ? (byDate[dateStr] ?? null) : null })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function calcBestStreak(checkIns: CheckInReportEntry[], days: number): number {
  if (!checkIns.length) return 0
  const dateSet = new Set(checkIns.map(ci => ci.check_in_date))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - days + 1)
  let best = 0, streak = 0
  const d = new Date(start)
  while (d <= today) {
    if (dateSet.has(d.toISOString().slice(0, 10))) { streak++; best = Math.max(best, streak) }
    else streak = 0
    d.setDate(d.getDate() + 1)
  }
  return best
}

function fmtFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div style={{
      background: alert ? 'rgba(212,165,116,0.09)' : 'var(--warm-gray)',
      border: `1px solid ${alert ? 'rgba(212,165,116,0.4)' : 'transparent'}`,
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '1.5px',
        textTransform: 'uppercase', marginBottom: 3,
        color: alert ? '#8B6914' : 'var(--mid)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
        letterSpacing: '-0.5px', lineHeight: 1.1,
        color: alert ? '#D4A574' : 'var(--navy)',
      }}>
        {value}
      </div>
    </div>
  )
}

function CheckInDetail({ ci, dateStr }: { ci: CheckInReportEntry; dateStr: string }) {
  const moodStyle = ci.mood ? MOOD_STYLE[ci.mood] : null
  const moodColor = ci.mood ? MOOD_COLOR[ci.mood] : undefined
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>
          {moodStyle?.emoji ?? '✓'}
        </span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
            {fmtFullDate(dateStr)}
          </div>
          {moodStyle && (
            <div style={{ fontSize: 13, color: moodColor, fontWeight: 600, marginTop: 2 }}>
              {moodStyle.label}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: ci.notes ? 12 : 0 }}>
        {/* Sober today — critical metric */}
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
          background: ci.sober_today ? 'rgba(39,174,96,0.09)' : 'rgba(192,57,43,0.09)',
          color: ci.sober_today ? '#1a7a45' : '#b02a37',
          border: `1px solid ${ci.sober_today ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`,
        }}>
          {ci.sober_today ? '✓ Sober today' : '✗ Not sober today'}
        </span>

        {/* Meetings */}
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
          background: 'var(--warm-gray)', color: 'var(--dark)', border: '1px solid var(--border)',
        }}>
          {ci.meetings_attended ?? 0} meeting{(ci.meetings_attended ?? 0) !== 1 ? 's' : ''} attended
        </span>

        {/* Called sponsor */}
        {ci.called_sponsor !== null && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            background: 'var(--warm-gray)', color: 'var(--dark)', border: '1px solid var(--border)',
          }}>
            {ci.called_sponsor ? '✓ Called sponsor' : '✗ Didn\'t call sponsor'}
          </span>
        )}
      </div>

      {ci.notes && (
        <div style={{
          fontSize: 13, color: 'var(--dark)', lineHeight: 1.6,
          borderTop: '1px solid var(--border)', paddingTop: 12,
          fontStyle: 'italic', marginTop: 4,
        }}>
          &ldquo;{ci.notes}&rdquo;
        </div>
      )}
    </div>
  )
}

// ─── Modal Body (the actual content — separated from portal wrapper) ──────────

interface ContentProps {
  sponseeId: string
  sponseeName: string
  onClose: () => void
}

function ModalBody({ sponseeId, sponseeName, onClose }: ContentProps) {
  const [range, setRange] = useState<Range>(30)
  const [allData, setAllData] = useState<CheckInReportEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalDay | null>(null)

  // Fetch all check-ins once on mount; range filtering is client-side
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('check_ins')
      .select('check_in_date,mood,sober_today,meetings_attended,called_sponsor,notes')
      .eq('user_id', sponseeId)
      .order('check_in_date', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setAllData((data ?? []) as CheckInReportEntry[])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [sponseeId])

  // Derive range-filtered slice for stats
  const rangeStartStr = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - range + 1)
    return d.toISOString().slice(0, 10)
  }, [range])
  const data = useMemo(
    () => allData.filter(ci => ci.check_in_date >= rangeStartStr),
    [allData, rangeStartStr]
  )

  const isPending = loading

  // Body scroll lock + Escape
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const calendar = useMemo(() => buildCalendar(allData, range), [allData, range])
  const bestStreak = useMemo(() => calcBestStreak(allData, range), [allData, range])
  const soberNo = data.filter(ci => !ci.sober_today).length
  const rate = Math.round((data.length / range) * 100)

  function handleCell(day: CalDay) {
    if (!day.inRange) return
    setSelected(prev => prev?.dateStr === day.dateStr ? null : day)
  }

  return (
    // Backdrop
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="md:p-4"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Modal container */}
      <div
        className="md:rounded-[20px] md:max-h-[calc(100vh-32px)]"
        style={{
          background: '#fff',
          width: '100%', maxWidth: 640,
          height: '100%',
          maxHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,51,102,0.24)',
          overflow: 'hidden',
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: '#fff',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 3 }}>
              {sponseeName}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', margin: 0, letterSpacing: '-0.5px' }}>
              Check-in Report
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 20, lineHeight: 1, padding: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 32px', flex: 1 }}>

          {/* Range tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--warm-gray)', borderRadius: 10, padding: 4 }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                disabled={isPending}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 600,
                  border: 'none', borderRadius: 7, cursor: isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  background: range === r ? '#fff' : 'transparent',
                  color: range === r ? 'var(--navy)' : 'var(--mid)',
                  boxShadow: range === r ? '0 1px 4px rgba(0,51,102,0.1)' : 'none',
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {r}d
              </button>
            ))}
          </div>

          {/* Summary stats — 4 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
            <StatCard label="Total Check-ins" value={data.length} />
            <StatCard label="Check-in Rate" value={`${rate}%`} />
            <StatCard label="Best Streak" value={`${bestStreak}d`} />
            <StatCard label="Not Sober" value={soberNo} alert={soberNo > 0} />
          </div>

          {/* Calendar area */}
          <div style={{ position: 'relative' }}>

            {/* Loading shimmer */}
            {isPending && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: 'rgba(255,255,255,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 600 }}>Loading…</div>
              </div>
            )}

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
              {DAY_HEADERS.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--mid)', padding: '2px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {calendar.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                  {week.map((day, di) => {
                    const ms = day.ci?.mood ? MOOD_STYLE[day.ci.mood] : null
                    const isSelected = selected?.dateStr === day.dateStr
                    const isToday = day.dateStr === new Date().toISOString().slice(0, 10)

                    return (
                      <div
                        key={di}
                        onClick={() => handleCell(day)}
                        title={
                          !day.inRange ? ''
                            : day.ci ? `${day.dateStr}: ${ms?.label ?? 'Checked in'}`
                            : `${day.dateStr}: No check-in`
                        }
                        style={{
                          minHeight: 40,
                          borderRadius: 8,
                          border: isToday && day.inRange ? '1.5px solid var(--teal)' : '1.5px solid transparent',
                          background: !day.inRange
                            ? 'transparent'
                            : day.ci
                              ? (ms?.bg ?? 'rgba(42,138,153,0.12)')
                              : 'var(--warm-gray)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: day.inRange ? 'pointer' : 'default',
                          fontSize: day.ci ? 15 : 11,
                          color: day.ci ? 'inherit' : (day.inRange ? 'var(--mid)' : 'transparent'),
                          fontWeight: day.ci ? 400 : 500,
                          outline: isSelected && !isPending ? '2px solid var(--navy)' : 'none',
                          outlineOffset: 1,
                          transform: isSelected ? 'scale(0.93)' : 'scale(1)',
                          transition: 'transform 0.1s',
                        }}
                      >
                        {!day.inRange
                          ? null
                          : day.ci
                            ? (ms?.emoji ?? '✓')
                            : day.date.getDate()
                        }
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Color legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: selected ? 16 : 0 }}>
              {Object.entries(MOOD_STYLE).map(([key, s]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: s.bg, flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }} />
                  <span style={{ fontSize: 11, color: 'var(--mid)' }}>{s.emoji} {s.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--warm-gray)', flexShrink: 0, border: '1px solid var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--mid)' }}>No check-in</span>
              </div>
            </div>

          </div>{/* end calendar area */}

          {/* Selected day detail panel */}
          {selected && (
            <div style={{
              marginTop: 16,
              background: selected.ci ? 'rgba(42,138,153,0.04)' : 'var(--warm-gray)',
              border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              {selected.ci ? (
                <CheckInDetail ci={selected.ci} dateStr={selected.dateStr} />
              ) : (
                <div style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', padding: '4px 0' }}>
                  No check-in recorded for {fmtFullDate(selected.dateStr)}.
                </div>
              )}
            </div>
          )}

        </div>{/* end scrollable body */}
      </div>
    </div>
  )
}

// ─── Portal Wrapper (default export) ─────────────────────────────────────────

interface Props {
  sponseeId: string
  sponseeName: string
  onClose: () => void
}

export default function CheckInReportModal({ sponseeId, sponseeName, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <ModalBody sponseeId={sponseeId} sponseeName={sponseeName} onClose={onClose} />,
    document.body
  )
}
