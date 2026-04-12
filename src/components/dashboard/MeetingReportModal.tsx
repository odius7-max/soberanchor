'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getSponseeMeetingReport, type MeetingReportEntry } from '@/app/dashboard/actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const dow = d.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtMDD(d: Date): string {
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
}

const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const RANGES = [7, 30, 60, 90]
const TEAL = '#2A8A99'
const AMBER = '#D4A574'
const BAR_MAX_H = 40

interface WeekRow {
  monday: Date
  dayCounts: number[]   // [mon,tue,wed,thu,fri,sat,sun]
  total: number
}

interface TopMeeting {
  key: string
  name: string
  fellowship: string | null
  count: number
  slug: string | null
}

function buildGrid(entries: MeetingReportEntry[], days: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rangeStart = new Date(today)
  rangeStart.setDate(today.getDate() - days + 1)

  // Filter to range
  const inRange = entries.filter(e => {
    const d = new Date(e.attendedAt)
    d.setHours(0, 0, 0, 0)
    return d >= rangeStart && d <= today
  })

  // Counts per calendar date
  const dayCount: Record<string, number> = {}
  for (const e of inRange) {
    const ds = e.attendedAt.slice(0, 10)
    dayCount[ds] = (dayCount[ds] ?? 0) + 1
  }
  const maxDay = inRange.length > 0 ? Math.max(...Object.values(dayCount)) : 1

  // Build calendar weeks
  const firstMonday = getMonday(rangeStart)
  const todayMonday = getMonday(today)
  const weeks: WeekRow[] = []
  const cur = new Date(firstMonday)
  while (cur <= todayMonday) {
    const dayCounts: number[] = []
    let total = 0
    for (let i = 0; i < 7; i++) {
      const day = new Date(cur)
      day.setDate(cur.getDate() + i)
      const count = dayCount[dateStr(day)] ?? 0
      dayCounts.push(count)
      total += count
    }
    weeks.push({ monday: new Date(cur), dayCounts, total })
    cur.setDate(cur.getDate() + 7)
  }

  // Stats
  const totalMeetings = inRange.length
  const perWeekAvg = days > 0 ? (totalMeetings / (days / 7)) : 0

  // This week (Mon–Sun containing today)
  const thisWeekStart = dateStr(todayMonday)
  const thisWeekCount = inRange.filter(e => e.attendedAt.slice(0, 10) >= thisWeekStart).length

  // Unique groups: distinct meeting_id (or meeting_name for manual entries)
  const uniqueKeys = new Set(inRange.map(e => e.meetingId ?? `n:${e.meetingName}`))
  const uniqueGroups = uniqueKeys.size

  // Top 3 meetings by attendance
  const groupMap: Record<string, TopMeeting> = {}
  for (const e of inRange) {
    const key = e.meetingId ?? `n:${e.meetingName}`
    if (!groupMap[key]) {
      groupMap[key] = { key, name: e.meetingName, fellowship: e.fellowshipName, count: 0, slug: e.meetingSlug }
    }
    groupMap[key].count++
    if (e.meetingSlug && !groupMap[key].slug) groupMap[key].slug = e.meetingSlug
  }
  const topMeetings = Object.values(groupMap).sort((a, b) => b.count - a.count).slice(0, 3)

  return { inRange, dayCount, maxDay, weeks, totalMeetings, perWeekAvg, thisWeekCount, uniqueGroups, topMeetings, today, rangeStart }
}

// ─── Modal body ───────────────────────────────────────────────────────────────

interface ModalBodyProps {
  sponseeName: string
  onClose: () => void
  allEntries: MeetingReportEntry[]
  loading: boolean
  fetchError: string | null
}

function ModalBody({ sponseeName, onClose, allEntries, loading, fetchError }: ModalBodyProps) {
  const router = useRouter()
  const [range, setRange] = useState(30)

  const {
    inRange, maxDay, weeks, totalMeetings, perWeekAvg, thisWeekCount,
    uniqueGroups, topMeetings, today,
  } = buildGrid(allEntries, range)

  const todayDow = today.getDay()
  // Amber "This week" if 0 meetings and it's Wed (3) through Sun (0)
  const isWedOrLater = todayDow >= 3 || todayDow === 0

  // Scroll lock + Escape
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="md:rounded-[20px] md:mx-4"
        style={{
          background: 'var(--background)', width: '100%', maxWidth: 580,
          maxHeight: '90vh', overflowY: 'auto', position: 'relative',
          padding: '20px 16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>{sponseeName}</div>
            <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 1 }}>Meeting report</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--mid)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
          >×</button>
        </div>

        {/* Range tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: range === r ? TEAL : 'var(--warm-gray)',
              color: range === r ? '#fff' : 'var(--mid)',
            }}>{r}d</button>
          ))}
        </div>

        {/* Loading / error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 14 }}>Loading…</div>
        )}
        {fetchError && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#e57373', fontSize: 14 }}>{fetchError}</div>
        )}

        {!loading && !fetchError && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
              {([
                { label: 'Total meetings', value: String(totalMeetings), amber: false },
                { label: 'Per week avg', value: perWeekAvg.toFixed(1), amber: perWeekAvg < 2.0 && totalMeetings > 0 },
                { label: 'Unique groups', value: String(uniqueGroups), amber: false },
                { label: 'This week', value: String(thisWeekCount), amber: thisWeekCount === 0 && isWedOrLater },
              ] as { label: string; value: string; amber: boolean }[]).map(({ label, value, amber }) => (
                <div key={label} style={{ background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: amber ? AMBER : 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {inRange.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--mid)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No meetings recorded in the last {range} days</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Meeting attendance is logged via the Meeting Check-in tab.</div>
              </div>
            ) : (
              <>
                {/* Weekly grid */}
                <div style={{ marginBottom: 4 }}>
                  {weeks.map((week, wi) => {
                    const prevTotal = wi > 0 ? weeks[wi - 1].total : null
                    const isDeclining = prevTotal !== null && week.total < prevTotal
                    const isCurrentWeek = wi === weeks.length - 1
                    const useAmber = isCurrentWeek && weeks.length > 1 && week.total < perWeekAvg

                    return (
                      <div key={dateStr(week.monday)}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '4px 0' }}>
                          {/* Week label */}
                          <div style={{ width: 56, flexShrink: 0, fontSize: 9, color: 'var(--mid)', paddingBottom: 2, lineHeight: 1.4 }}>
                            Week of<br /><span style={{ fontWeight: 700 }}>{fmtMDD(week.monday)}</span>
                          </div>

                          {/* 7 bars */}
                          <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'flex-end', height: BAR_MAX_H }}>
                            {week.dayCounts.map((count, di) => {
                              const barH = count > 0 ? Math.max(8, Math.round((count / maxDay) * BAR_MAX_H)) : 0
                              const barColor = useAmber ? AMBER : TEAL
                              const day = new Date(week.monday)
                              day.setDate(week.monday.getDate() + di)
                              const ds = dateStr(day)
                              const isToday = ds === dateStr(today)
                              const isFuture = day > today

                              return (
                                <div key={di} style={{ flex: 1, height: BAR_MAX_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                                  {/* Track */}
                                  <div style={{
                                    position: 'absolute', inset: 0, borderRadius: 3,
                                    background: 'var(--warm-gray)',
                                    opacity: isFuture ? 0.3 : 0.7,
                                  }} />
                                  {/* Filled bar */}
                                  {barH > 0 && (
                                    <div style={{
                                      position: 'absolute', bottom: 0, left: 0, right: 0,
                                      height: barH, borderRadius: 3, background: barColor,
                                      opacity: isFuture ? 0.4 : 1,
                                    }} />
                                  )}
                                  {/* Today ring */}
                                  {isToday && (
                                    <div style={{
                                      position: 'absolute', inset: 0, borderRadius: 3,
                                      border: `2px solid ${TEAL}`, pointerEvents: 'none',
                                    }} />
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Weekly total */}
                          <div style={{ width: 24, textAlign: 'right', fontWeight: 700, fontSize: 13, color: isDeclining ? AMBER : 'var(--navy)', paddingBottom: 2, flexShrink: 0 }}>
                            {week.total}
                          </div>
                        </div>

                        {/* Day-of-week labels shown once, below the first row */}
                        {wi === 0 && (
                          <div style={{ display: 'flex', gap: 3, marginLeft: 62, marginRight: 30, marginBottom: 6, marginTop: 2 }}>
                            {DOW_LABELS.map((lbl, i) => (
                              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{lbl}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Running average */}
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--mid)', marginBottom: 20, marginTop: 4 }}>
                  Avg: {perWeekAvg.toFixed(1)} meetings/week
                </div>

                {/* Most attended */}
                {topMeetings.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                      Most Attended
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {topMeetings.map(m => (
                        <div
                          key={m.key}
                          onClick={() => m.slug && router.push(`/find/meetings/${m.slug}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 12px',
                            cursor: m.slug ? 'pointer' : 'default',
                          }}
                        >
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.name}
                          </div>
                          {m.fellowship && (
                            <div style={{ fontSize: 10, fontWeight: 700, background: 'rgba(42,138,153,0.12)', color: TEAL, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {m.fellowship}
                            </div>
                          )}
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {m.count}x
                          </div>
                          {m.slug && (
                            <span style={{ fontSize: 12, color: 'var(--mid)', flexShrink: 0 }}>→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Portal wrapper ───────────────────────────────────────────────────────────

interface Props {
  sponseeId: string
  sponseeName: string
  onClose: () => void
}

export default function MeetingReportModal({ sponseeId, sponseeName, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [allEntries, setAllEntries] = useState<MeetingReportEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    getSponseeMeetingReport(sponseeId)
      .then(data => { setAllEntries(data); setLoading(false) })
      .catch(e => { setFetchError((e as Error).message ?? 'Failed to load'); setLoading(false) })
  }, [sponseeId])

  if (!mounted) return null
  return createPortal(
    <ModalBody
      sponseeName={sponseeName}
      onClose={onClose}
      allEntries={allEntries}
      loading={loading}
      fetchError={fetchError}
    />,
    document.body
  )
}
