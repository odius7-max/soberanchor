'use client'
import { useTodayQueue } from './useTodayQueue'
import TodayItem from './TodayItem'
import CaughtUpState from './CaughtUpState'
import { TODAY_COPY } from '@/lib/copy/today'
import type { TodayItemData } from './today-queue-types'

interface Props {
  items: TodayItemData[]
  overflowCount: number
  caughtUp: boolean
  onCheckIn?: () => void
  caughtUpSummaryParts?: string[]
}

export default function TodayCard({ items: initialItems, overflowCount, caughtUp: initialCaughtUp, onCheckIn, caughtUpSummaryParts }: Props) {
  const { items, caughtUp } = useTodayQueue(initialItems)

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  if (caughtUp || initialCaughtUp) return <CaughtUpState summaryParts={caughtUpSummaryParts} />

  return (
    <div
      style={{
        borderRadius: 12,
        background: '#fff',
        boxShadow: 'var(--shadow-card)',
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div className="today-label">{TODAY_COPY.headline}</div>
          <div
            suppressHydrationWarning
            style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4, lineHeight: 1.5 }}
          >
            {TODAY_COPY.subtitle}
          </div>
        </div>
        <div
          suppressHydrationWarning
          style={{ fontSize: 13, color: 'var(--mid)', flexShrink: 0, marginTop: 2 }}
        >
          {dateLabel}
        </div>
      </div>

      {/* Items */}
      <div>
        {items.map(item => (
          <TodayItem
            key={item.id}
            item={item}
            onCheckIn={item.id === 'checkin' ? onCheckIn : undefined}
          />
        ))}
        {overflowCount > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--teal)',
              fontWeight: 600,
            }}
          >
            {TODAY_COPY.overflowMore(overflowCount)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--mid)',
        }}
      >
        {TODAY_COPY.footer}
      </div>
    </div>
  )
}
