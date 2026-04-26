'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AcceptAtCapModal from './AcceptAtCapModal'

export interface PendingRequest {
  id: string
  otherId: string
  otherName: string
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

interface Props {
  requests: PendingRequest[]
  /** as_sponsee = sponsor is asking me; as_sponsor = sponsee is asking me */
  perspective: 'as_sponsee' | 'as_sponsor'
}

export default function PendingRequests({ requests, perspective }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [capModal, setCapModal] = useState<{ requesterName: string | null } | null>(null)
  const [capacityError, setCapacityError] = useState<string | null>(null)

  const visible = requests.filter(r => !dismissed.has(r.id))
  if (visible.length === 0 && !capModal && !capacityError) return null

  // Routed through /api/dashboard/respond-sponsor-request so the cap check
  // (get_subscription_state.can_add_sponsee on the prospective sponsor) runs
  // server-side. The route handles conflict detection and sibling cleanup.
  function respond(id: string, accept: boolean) {
    setActiveId(id)
    setCapacityError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/dashboard/respond-sponsor-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipId: id, accept }),
        })
        const data = await res.json().catch(() => ({}))

        if (res.status === 402 && accept) {
          // Cap reached. Sponsor side gets the contextual upgrade modal;
          // sponsee side gets a friendly inline capacity message. Either way
          // we leave the request visible so the user can retry after acting.
          if (data.error === 'sponsee_limit_reached' && perspective === 'as_sponsor') {
            setCapModal({ requesterName: data.requesterName ?? null })
          } else {
            setCapacityError(data.message ?? 'This request can’t be accepted right now.')
          }
          return
        }

        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)

        setDismissed(prev => new Set([...prev, id]))
        router.refresh()
      } catch (err) {
        console.error('[PendingRequests] respond failed', err)
        alert(`Could not ${accept ? 'accept' : 'decline'} request: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setActiveId(null)
      }
    })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {capacityError && (
        <div style={{ background: 'rgba(255,193,7,0.08)', border: '1.5px solid rgba(255,193,7,0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--navy)', lineHeight: 1.55 }}>
          {capacityError}
        </div>
      )}
      {capModal && (
        <AcceptAtCapModal
          requesterName={capModal.requesterName}
          onClose={() => setCapModal(null)}
        />
      )}
      {visible.map(req => {
        const loading = activeId === req.id && isPending
        const label = perspective === 'as_sponsee'
          ? <><span style={{ color: 'var(--teal)' }}>{req.otherName}</span> wants to be your sponsor</>
          : <><span style={{ color: 'var(--teal)' }}>{req.otherName}</span> is requesting you as their sponsor</>

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
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#2A8A99,#003366)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, fontWeight: 700,
              }}>
                {req.otherName[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                  {label}
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
