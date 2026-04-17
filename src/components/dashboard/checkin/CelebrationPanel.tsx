'use client'

import { useEffect, useRef, useState } from 'react'
import type { MoodKey } from './checkin-types'
import { TODAY_COPY } from '@/lib/copy/today'

interface Props {
  mood: MoodKey
  streak: number
  meetingName: string | null
  onClose: () => void
  onKeepGoing: () => void
  sponsorContact?: string | null
}

const isRough = (mood: MoodKey) => mood === 'struggling' || mood === 'hard'
const showStreak = (mood: MoodKey) => !isRough(mood)

// 20 confetti pieces — deterministic positions/delays/colors
const CONFETTI_COLORS = [
  'var(--teal)', 'var(--teal-light)', 'var(--gold)', 'var(--gold-light)',
  'var(--navy)', '#fff', 'var(--teal)', 'var(--gold)',
]
const ROUGH_COLORS = [
  'var(--teal)', 'var(--teal-light)', 'var(--gold)', 'var(--gold-light)',
]

const PIECES = Array.from({ length: 20 }, (_, i) => ({
  left: `${5 + i * 4.5}%`,
  delay: `${(i * 0.12).toFixed(2)}s`,
  colorIdx: i % 8,
  size: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5,
}))

export default function CelebrationPanel({
  mood, streak, meetingName, onClose, onKeepGoing, sponsorContact,
}: Props) {
  const rough = isRough(mood)
  const dismissSecs = rough ? 12 : 8
  const [remaining, setRemaining] = useState(dismissSecs)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const paused = useRef(false)

  function clearTimers() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function startTimers() {
    clearTimers()
    intervalRef.current = setInterval(() => {
      if (!paused.current) setRemaining(r => r - 1)
    }, 1000)
    timerRef.current = setTimeout(() => {
      if (!paused.current) onClose()
    }, dismissSecs * 1000)
  }

  useEffect(() => {
    startTimers()
    return clearTimers
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function pause() { paused.current = true; clearTimers() }
  function resume() {
    paused.current = false
    timerRef.current = setTimeout(onClose, remaining * 1000)
    intervalRef.current = setInterval(() => {
      if (!paused.current) setRemaining(r => r - 1)
    }, 1000)
  }

  const headline = TODAY_COPY[`celebrate${mood.charAt(0).toUpperCase() + mood.slice(1)}` as keyof typeof TODAY_COPY] as string
  const callout = rough
    ? (mood === 'struggling' ? TODAY_COPY.calloutStruggling : TODAY_COPY.calloutHard)
    : null

  const colors = rough ? ROUGH_COLORS : CONFETTI_COLORS

  return (
    <div
      className="celeb-fadein"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 28px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minHeight: 320,
      }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      {/* Confetti */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: p.left,
              animationDelay: p.delay,
              background: colors[p.colorIdx % colors.length],
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      {/* Close × */}
      <button
        onClick={onClose}
        aria-label="Close — return to today's practice"
        title="Close — return to today's practice"
        style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 22, color: 'var(--mid)', lineHeight: 1,
          minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Anchor emoji */}
      <div style={{ fontSize: 48, marginBottom: 12, marginTop: 8 }}>⚓</div>

      {/* Headline */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--navy)',
          letterSpacing: '-0.3px',
          marginBottom: 12,
          lineHeight: 1.25,
        }}
      >
        {headline}
      </div>

      {/* Streak badge (positive moods only) */}
      {showStreak(mood) && streak >= 2 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(240,192,64,0.12)',
            border: '1px solid rgba(240,192,64,0.4)',
            color: 'var(--navy)',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          🔥 {TODAY_COPY.celebrateStreakBadge(streak)}
        </div>
      )}

      {/* Rough-day callout */}
      {callout && (
        <div
          style={{
            background: 'var(--teal-bg)',
            border: '1px solid var(--teal-20)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 14,
            color: 'var(--navy)',
            lineHeight: 1.6,
            marginBottom: 20,
            textAlign: 'left',
          }}
        >
          {callout}
        </div>
      )}

      {/* Summary line (non-rough) */}
      {!rough && meetingName && (
        <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20 }}>
          Logged · {meetingName}
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {rough && mood === 'struggling' && sponsorContact ? (
          <a
            href={`tel:${sponsorContact}`}
            style={{
              display: 'block',
              padding: '13px',
              borderRadius: 12,
              background: 'var(--teal)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              textAlign: 'center',
            }}
            onClick={onClose}
          >
            {TODAY_COPY.ctaCallSponsor}
          </a>
        ) : (
          <button
            onClick={onKeepGoing}
            style={{
              padding: '13px',
              borderRadius: 12,
              background: 'var(--teal)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {TODAY_COPY.ctaKeepGoing}
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: '11px',
            borderRadius: 12,
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--mid)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {TODAY_COPY.ctaDoneForToday}
        </button>
      </div>

      {/* Auto-dismiss note */}
      <div
        aria-live="polite"
        style={{ fontSize: 11, color: 'var(--mid)', marginTop: 16 }}
      >
        {rough ? TODAY_COPY.autoDismissRough : TODAY_COPY.autoDismissDefault}
        {remaining < dismissSecs && ` (${remaining}s)`}
      </div>
    </div>
  )
}
