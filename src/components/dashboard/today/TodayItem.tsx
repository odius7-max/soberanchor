'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TodayItemData } from './today-queue-types'

interface Props {
  item: TodayItemData
  onCheckIn?: () => void
}

export default function TodayItem({ item, onCheckIn }: Props) {
  const router = useRouter()
  const [locallyHidden, setLocallyHidden] = useState(false)
  const [ackError, setAckError] = useState(false)

  async function handleAcknowledge(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!item.ackCheckInId) return
    setLocallyHidden(true)
    setAckError(false)
    const supabase = createClient()
    const { error } = await supabase.rpc('acknowledge_sponsee_checkin', {
      p_check_in_id: item.ackCheckInId,
    })
    if (error) {
      setLocallyHidden(false)
      setAckError(true)
      return
    }
    router.refresh()
  }

  if (locallyHidden) return null
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
          <div
            style={{
              fontSize: 12,
              color: item.variant === 'alert' && !item.completed ? 'var(--red-alert)' : 'var(--mid)',
              marginTop: 2,
              fontWeight: item.variant === 'alert' && !item.completed ? 600 : 400,
            }}
          >
            {item.sub}
          </div>
        )}
      </div>

      {item.completed ? (
        <div style={{ fontSize: 14, color: 'var(--mid)', flexShrink: 0 }}>✓</div>
      ) : item.ackCheckInId ? (
        <button
          onClick={handleAcknowledge}
          aria-label="Mark as handled"
          title="Mark as handled"
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#fff',
              border: `2px solid ${ackError ? 'var(--red-alert)' : 'var(--red-alert)'}`,
              boxShadow: ackError ? 'none' : '0 0 0 3px var(--red-alert-bg)',
              display: 'block',
            }}
          />
        </button>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: ctaColor, flexShrink: 0 }}>
          {item.cta}
        </div>
      )}
    </div>
  )

  const isModalTrigger =
    item.id === 'checkin' ||
    item.id === 'meeting' ||
    item.id.startsWith('meeting-')
  if (isModalTrigger && onCheckIn) {
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
