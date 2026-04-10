'use client'

import { useState, useTransition } from 'react'
import { respondToSponsorRequest } from '@/app/dashboard/actions'

export interface PendingRequest {
  id: string
  sponsorId: string
  sponsorName: string
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PendingRequests({ requests }: { requests: PendingRequest[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)

  const visible = requests.filter(r => !dismissed.has(r.id))
  if (visible.length === 0) return null

  function respond(id: string, accept: boolean) {
    setActiveId(id)
    startTransition(async () => {
      await respondToSponsorRequest(id, accept)
      setDismissed(prev => new Set([...prev, id]))
      setActiveId(null)
    })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {visible.map(req => {
        const loading = activeId === req.id && isPending
        return (
          <div
            key={req.id}
            style={{
              background: 'linear-gradient(135deg, rgba(0,51,102,0.04) 0%, rgba(42,138,153,0.06) 100%)',
              border: '1.5px solid rgba(42,138,153,0.25)',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#2A8A99,#003366)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, fontWeight: 700,
              }}>
                {req.sponsorName[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                  <span style={{ color: 'var(--teal)' }}>{req.sponsorName}</span> wants to be your sponsor
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
                  Sent {timeAgo(req.createdAt)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => respond(req.id, true)}
                disabled={loading}
                style={{
                  background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)',
                }}>
                {loading ? '…' : 'Accept'}
              </button>
              <button
                onClick={() => respond(req.id, false)}
                disabled={loading}
                style={{
                  background: '#fff', color: 'var(--mid)', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)',
                }}>
                Decline
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
