'use client'
import { TODAY_COPY } from '@/lib/copy/today'

export default function CaughtUpState() {
  return (
    <div
      style={{
        borderRadius: 12,
        background: '#fff',
        boxShadow: 'var(--shadow-card)',
        marginBottom: 20,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 46, marginBottom: 16 }}>🌊</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--navy)',
          letterSpacing: '-0.3px',
          marginBottom: 8,
        }}
      >
        {TODAY_COPY.caughtUpTitle}
      </div>
      <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
        {TODAY_COPY.caughtUpBody}
      </div>
    </div>
  )
}
