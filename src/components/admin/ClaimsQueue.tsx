'use client'

import { useState, useTransition } from 'react'
import { approveClaim, rejectClaim } from '@/app/admin/actions'

interface Claim {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string | null
  is_verified: boolean
  updated_at: string
  provider_accounts: {
    id: string
    contact_name: string | null
    contact_email: string | null
  } | null
}

function extractDomain(url: string | null): string {
  if (!url) return ''
  try {
    const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname
    return hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase().replace(/^www\./, '')
  }
}

function DomainMatch({ email, website }: { email: string | null; website: string | null }) {
  const emailDomain = email?.split('@')[1]?.toLowerCase() ?? ''
  const websiteDomain = extractDomain(website)
  if (!emailDomain || !websiteDomain) return null
  const match = emailDomain === websiteDomain
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: match ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)',
      color: match ? '#27AE60' : '#C0392B',
      border: `1px solid ${match ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.3)'}`,
      marginLeft: 6,
    }}>
      {match ? '✓ Domain match' : '⚠ Domain mismatch'}
    </span>
  )
}

type Filter = 'pending' | 'verified' | 'all'

export default function ClaimsQueue({ claims }: { claims: Claim[] }) {
  const [filter, setFilter] = useState<Filter>('pending')
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const filtered = claims.filter(c => {
    if (filter === 'pending') return !c.is_verified
    if (filter === 'verified') return c.is_verified
    return true
  })

  const counts = {
    pending: claims.filter(c => !c.is_verified).length,
    verified: claims.filter(c => c.is_verified).length,
    all: claims.length,
  }

  function handleApprove(id: string) {
    setActionId(id)
    startTransition(async () => {
      await approveClaim(id)
      setActionId(null)
    })
  }

  function handleReject(id: string) {
    if (!confirm('Reject this claim? The provider will be unlinked from this facility.')) return
    setActionId(id)
    startTransition(async () => {
      await rejectClaim(id)
      setActionId(null)
    })
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {(['pending', 'verified', 'all'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--navy)' : '#fff',
              color: filter === f ? '#fff' : 'var(--mid)',
              border: `1px solid ${filter === f ? 'var(--navy)' : 'var(--border)'}`,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', textTransform: 'capitalize',
            }}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '40px', textAlign: 'center', color: 'var(--mid)', fontSize: 15 }}>
          No {filter === 'all' ? '' : filter} claims.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 140px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
            {['Facility', 'Provider', 'Contact Email', 'Claimed', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {filtered.map((c, i) => {
            const loading = actionId === c.id && isPending
            const emailDomain = c.provider_accounts?.contact_email?.split('@')[1]?.toLowerCase() ?? ''
            const websiteDomain = extractDomain(c.website)
            const domainMismatch = emailDomain && websiteDomain && emailDomain !== websiteDomain

            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 140px',
                gap: 16, padding: '16px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: domainMismatch ? 'rgba(231,76,60,0.025)' : '#fff',
                alignItems: 'center',
              }}>
                {/* Facility */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {c.city && c.state ? `${c.city}, ${c.state}` : c.city ?? '—'}
                    {c.website && <span> · <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>{extractDomain(c.website)}</a></span>}
                  </div>
                </div>

                {/* Provider */}
                <div style={{ fontSize: 13, color: 'var(--dark)' }}>
                  {c.provider_accounts?.contact_name ?? '—'}
                </div>

                {/* Email */}
                <div>
                  <div style={{ fontSize: 13, color: 'var(--dark)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
                    {c.provider_accounts?.contact_email ?? '—'}
                    <DomainMatch email={c.provider_accounts?.contact_email ?? null} website={c.website} />
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(c.updated_at)}</div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {!c.is_verified ? (
                    <>
                      <button onClick={() => handleApprove(c.id)} disabled={loading}
                        style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {loading ? '…' : 'Approve'}
                      </button>
                      <button onClick={() => handleReject(c.id)} disabled={loading}
                        style={{ background: '#fff', color: '#C0392B', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#27AE60', fontWeight: 600 }}>✓ Verified</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
