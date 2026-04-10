'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleFacilityVerified, toggleFacilityFeatured, updateFacilityTier, deleteFacility } from '@/app/admin/actions'

interface Facility {
  id: string
  name: string
  city: string | null
  state: string | null
  facility_type: string
  listing_tier: string
  is_claimed: boolean
  is_verified: boolean
  is_featured: boolean
  lead_count?: number
}

const TIER_LABELS: Record<string, string> = { basic: 'Basic', enhanced: 'Enhanced', premium: 'Premium' }
const TYPE_LABELS: Record<string, string> = {
  treatment: 'Treatment', sober_living: 'Sober Living', therapist: 'Therapist',
  venue: 'Venue', outpatient: 'Outpatient', telehealth: 'Telehealth',
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? 'var(--teal)' : 'var(--border)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        position: 'absolute', top: 2, left: on ? 20 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function FacilityTable({ facilities }: { facilities: Facility[] }) {
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const filtered = facilities.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function doAction(id: string, fn: () => Promise<void>) {
    setActionId(id)
    startTransition(async () => {
      await fn()
      setActionId(null)
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    doAction(id, () => deleteFacility(id))
  }

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or city…"
          style={{
            padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: 14, fontFamily: 'var(--font-body)', width: 300, outline: 'none', color: 'var(--dark)',
          }}
        />
        <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--mid)' }}>{filtered.length} facilities</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px 80px 80px 100px', gap: 12, padding: '12px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--border)' }}>
          {['Facility', 'Type', 'Tier', 'Claimed', 'Verified', 'Featured', 'Leads', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>No facilities found.</div>
        ) : filtered.map((f, i) => {
          const loading = actionId === f.id && isPending
          return (
            <div key={f.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px 80px 80px 100px',
              gap: 12, padding: '14px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              background: '#fff',
            }}>
              {/* Name */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{f.city && f.state ? `${f.city}, ${f.state}` : f.city ?? '—'}</div>
              </div>

              {/* Type */}
              <div style={{ fontSize: 12, color: 'var(--dark)' }}>{TYPE_LABELS[f.facility_type] ?? f.facility_type}</div>

              {/* Tier */}
              <div>
                <select
                  value={f.listing_tier}
                  disabled={loading}
                  onChange={e => doAction(f.id, () => updateFacilityTier(f.id, e.target.value))}
                  style={{
                    padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6,
                    fontSize: 12, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer',
                    color: f.listing_tier === 'premium' ? 'var(--gold)' : f.listing_tier === 'enhanced' ? 'var(--teal)' : 'var(--mid)',
                    fontWeight: 600,
                  }}>
                  <option value="basic">Basic</option>
                  <option value="enhanced">Enhanced</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* Claimed */}
              <div style={{ fontSize: 12, color: f.is_claimed ? '#27AE60' : 'var(--mid)', fontWeight: 600 }}>
                {f.is_claimed ? '✓' : '—'}
              </div>

              {/* Verified toggle */}
              <div>
                <Toggle
                  on={f.is_verified}
                  disabled={loading}
                  onChange={() => doAction(f.id, () => toggleFacilityVerified(f.id, f.is_verified))}
                />
              </div>

              {/* Featured toggle */}
              <div>
                <Toggle
                  on={f.is_featured}
                  disabled={loading}
                  onChange={() => doAction(f.id, () => toggleFacilityFeatured(f.id, f.is_featured))}
                />
              </div>

              {/* Lead count */}
              <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: f.lead_count ? 600 : 400 }}>
                {f.lead_count ?? 0}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <Link href={`/admin/facilities/${f.id}`}
                  style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none', padding: '5px 10px', border: '1px solid rgba(42,138,153,0.3)', borderRadius: 6 }}>
                  Edit
                </Link>
                <button onClick={() => handleDelete(f.id, f.name)} disabled={loading}
                  style={{ fontSize: 12, color: '#C0392B', fontWeight: 600, background: 'none', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Del
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
