'use client'
import Link from 'next/link'
import type { TodayItemData } from './today-queue-types'

interface Props {
  item: TodayItemData
  onCheckIn?: () => void
}

export default function TodayItem({ item, onCheckIn }: Props) {
  const iconBg =
    item.variant === 'gold' ? 'var(--gold-10)' :
    item.variant === 'alert' ? 'var(--red-alert-bg)' :
    'var(--teal-bg)'

  const ctaColor =
    item.variant === 'gold' ? 'var(--gold)' :
    item.variant === 'alert' ? 'var(--red-alert)' :
    'var(--teal)'

  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        opacity: item.completed ? 0.5 : 1,
        width: '100%',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
        aria-hidden
      >
        {item.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--navy)',
            textDecoration: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.label}
        </div>
        {item.sub && (
          <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
            {item.sub}
          </div>
        )}
      </div>

      {item.completed ? (
        <div style={{ fontSize: 14, color: 'var(--mid)', flexShrink: 0 }}>✓</div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: ctaColor, flexShrink: 0 }}>
          {item.cta}
        </div>
      )}
    </div>
  )

  if (item.id === 'checkin' && onCheckIn) {
    return (
      <button
        onClick={onCheckIn}
        style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
        aria-label={item.label}
      >
        {inner}
      </button>
    )
  }

  if (item.href && !item.completed) {
    return (
      <Link href={item.href} style={{ all: 'unset', display: 'block', cursor: 'pointer' }}>
        {inner}
      </Link>
    )
  }

  return <div>{inner}</div>
}
