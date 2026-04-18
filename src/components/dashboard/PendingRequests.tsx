'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  const visible = requests.filter(r => !dismissed.has(r.id))
  if (visible.length === 0) return null

  // Direct client-side Supabase — RLS enforces participant-only writes.
  // Same pattern as PeopleCard's unlink flow.
  async function respondDirect(id: string, accept: boolean): Promise<void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const nowIso = new Date().toISOString()
    const update: Record<string, unknown> = accept
      ? { status: 'active', started_at: nowIso }
      : { status: 'ended', ended_at: nowIso }

    const { error } = await supabase
      .from('sponsor_relationships')
      .update(update)
      .eq('id', id)
    if (error) throw new Error(error.message)

    // If we're accepting AS the sponsor, flip is_available_sponsor so the
    // Sponsees tab becomes available.
    if (accept && perspective === 'as_sponsor') {
      await supabase
        .from('user_profiles')
        .update({ is_available_sponsor: true })
        .eq('id', user.id)
    }
  }

  function respond(id: string, accept: boolean) {
    setActiveId(id)
    startTransition(async () => {
      try {
        await respondDirect(id, accept)
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
