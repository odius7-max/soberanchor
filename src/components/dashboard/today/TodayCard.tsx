'use client'
import { useEffect, useState } from 'react'
import { useTodayQueue } from './useTodayQueue'
import TodayItem from './TodayItem'
import CaughtUpState from './CaughtUpState'
import { TODAY_COPY } from '@/lib/copy/today'
import { getTodayDateStr } from '@/lib/today-window'
import type { TodayItemData } from './today-queue-types'

interface Props {
  items: TodayItemData[]
  overflowCount: number
  caughtUp: boolean
  onCheckIn?: () => void
  caughtUpSummaryParts?: string[]
}

// Persist "user dismissed caught-up for today" across page loads, keyed by date
// so the preference naturally expires when tomorrow's queue rolls in.
const CAUGHT_UP_DISMISS_KEY_PREFIX = 'today_caughtup_dismissed_'

export default function TodayCard({ items: initialItems, overflowCount, caughtUp: initialCaughtUp, onCheckIn, caughtUpSummaryParts }: Props) {
  const { items, caughtUp } = useTodayQueue(initialItems)
  // When true, render the item list even though everything is done, so users
  // can review/revisit completed items instead of being stuck on the caught-up card.
  const [forceShowList, setForceShowList] = useState(false)

  // Rehydrate the dismissal preference on mount. Brief flash of caught-up → list
  // is acceptable and avoids SSR/CSR hydration mismatch warnings.
  useEffect(() => {
    try {
      const key = CAUGHT_UP_DISMISS_KEY_PREFIX + getTodayDateStr()
      if (localStorage.getItem(key) === '1') setForceShowList(true)
    } catch { /* localStorage may be blocked (private mode, etc.) — fall back to default */ }
  }, [])

  function handleViewList() {
    setForceShowList(true)
    try {
      const key = CAUGHT_UP_DISMISS_KEY_PREFIX + getTodayDateStr()
      localStorage.setItem(key, '1')
    } catch { /* non-fatal — UI still flips via state */ }
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const isCaughtUp = (caughtUp || initialCaughtUp) && !forceShowList
  if (isCaughtUp) {
    return (
      <CaughtUpState
        summaryParts={caughtUpSummaryParts}
        onViewList={items.length > 0 ? handleViewList : undefined}
      />
    )
  }

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
