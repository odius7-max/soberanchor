'use client'

import { useState } from 'react'

interface Props {
  shareUrl: string
  meetingName: string
  dayOfWeek: string | null
  startTime: string | null   // "HH:MM:SS"
  durationMinutes: number | null
  locationName: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function nextOccurrence(day: string | null, timeStr: string | null): Date | null {
  if (!day || !timeStr) return null
  const targetDay = DAYS.indexOf(day)
  if (targetDay === -1) return null
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  let diff = (targetDay - now.getDay() + 7) % 7
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  if (diff === 0 && d < now) diff = 7
  d.setDate(now.getDate() + diff)
  return d
}

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export default function MeetingActions({ shareUrl, meetingName, dayOfWeek, startTime, durationMinutes, locationName }: Props) {
  const [copied, setCopied] = useState(false)
  const [calOpen, setCalOpen] = useState(false)

  function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: meetingName, url: shareUrl }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }

  function googleCalUrl(): string {
    const start = nextOccurrence(dayOfWeek, startTime)
    if (!start) return '#'
    const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: meetingName,
      dates: `${fmt(start)}/${fmt(end)}`,
      location: locationName,
      recur: 'RRULE:FREQ=WEEKLY',
    })
    return `https://calendar.google.com/calendar/render?${params}`
  }

  function downloadICS() {
    const start = nextOccurrence(dayOfWeek, startTime)
    if (!start) return
    const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60000)
    const uid = `meeting-${Date.now()}@soberanchor.com`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SoberAnchor//Meetings//EN',
      'BEGIN:VEVENT',
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      'RRULE:FREQ=WEEKLY',
      `SUMMARY:${meetingName}`,
      `LOCATION:${locationName}`,
      `URL:${shareUrl}`,
      `UID:${uid}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meetingName.replace(/\s+/g, '-').toLowerCase()}.ics`
    a.click()
    URL.revokeObjectURL(url)
    setCalOpen(false)
  }

  const btn: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 10,
    border: '1.5px solid var(--border)',
    background: '#fff',
    color: 'var(--navy)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Share */}
      <button onClick={share} style={btn}>
        {copied ? '✓ Link copied!' : '🔗 Share this meeting'}
      </button>

      {/* Add to Calendar */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setCalOpen(o => !o)} style={btn}>
          📅 Add to Calendar
        </button>
        {calOpen && (
          <>
            {/* backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
              onClick={() => setCalOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,51,102,0.13)',
                overflow: 'hidden',
                zIndex: 10,
              }}
            >
              <a
                href={googleCalUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setCalOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--navy)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border)',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--warm-gray)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 17 }}>📆</span>
                Google Calendar
              </a>
              <button
                onClick={downloadICS}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--navy)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--warm-gray)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 17 }}>🍎</span>
                Apple / iCal (.ics)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
