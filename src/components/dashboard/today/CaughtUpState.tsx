'use client'
import { TODAY_COPY } from '@/lib/copy/today'

interface Props {
  summaryParts?: string[]
  /** When provided, renders a text link that reveals the completed list. */
  onViewList?: () => void
}

export default function CaughtUpState({ summaryParts, onViewList }: Props) {
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
      {summaryParts && summaryParts.length > 0 && (
        <>
          <div
            style={{
              width: 200,
              margin: '20px auto 16px',
              borderTop: '1px solid var(--border)',
            }}
          />
          <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>
            {TODAY_COPY.caughtUpSummary(summaryParts)}
          </div>
        </>
      )}
      {onViewList && (
        <button
          onClick={onViewList}
          style={{
            marginTop: 20,
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--teal)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            minHeight: 44,
          }}
        >
          {TODAY_COPY.caughtUpViewList}
        </button>
      )}
    </div>
  )
}
