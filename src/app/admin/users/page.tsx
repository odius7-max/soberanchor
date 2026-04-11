'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deactivateProvider, reactivateProvider, updateProviderTier } from '@/app/admin/actions'

interface Provider {
  id: string
  contact_name: string | null
  contact_email: string | null
  organization_name: string | null
  subscription_tier: string
  is_active: boolean
  created_at: string
  facilities: { name: string } | null
}

interface Member {
  id: string
  display_name: string | null
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  onboarding_completed: boolean | null
  is_sponsor: boolean
  is_sponsee: boolean
  is_provider: boolean
  provider_tier: string | null
}

type RoleFilter = 'all' | 'sponsor' | 'sponsee' | 'provider'

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function RoleBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
      background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.5px',
      display: 'inline-block',
    }}>
      {label}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    basic: { bg: 'rgba(136,136,136,0.1)', color: 'var(--mid)' },
    enhanced: { bg: 'rgba(42,138,153,0.1)', color: 'var(--teal)' },
    premium: { bg: 'rgba(212,165,116,0.15)', color: 'var(--gold)' },
  }
  const c = colors[tier] ?? colors.basic
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color, textTransform: 'capitalize' }}>
      {tier}
    </span>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'providers' | 'members'>('members')
  const [providers, setProviders] = useState<Provider[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  // Member list controls
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')

  const loadMembers = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter !== 'all') params.set('role', roleFilter)
    params.set('sort', sort)
    const res = await fetch(`/api/admin/members?${params}`)
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : [])
  }, [search, roleFilter, sort])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: prov }] = await Promise.all([
        supabase.from('provider_accounts')
          .select('id, contact_name, contact_email, organization_name, subscription_tier, is_active, created_at, facilities(name)')
          .order('created_at', { ascending: false }),
      ])
      setProviders((prov ?? []) as unknown as Provider[])
      await loadMembers()
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch members when filters change (after initial load)
  useEffect(() => {
    if (!loading) loadMembers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, sort])

  function doAction(id: string, fn: () => Promise<void>) {
    setActionId(id)
    startTransition(async () => {
      await fn()
      setActionId(null)
      const supabase = createClient()
      const { data } = await supabase.from('provider_accounts')
        .select('id, contact_name, contact_email, organization_name, subscription_tier, is_active, created_at, facilities(name)')
        .order('created_at', { ascending: false })
      setProviders((data ?? []) as unknown as Provider[])
    })
  }

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6,
    fontSize: 12, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer',
    color: 'var(--dark)',
  }

  const roleFilterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-body)', border: active ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
    background: active ? 'rgba(42,138,153,0.08)' : '#fff', color: active ? 'var(--teal)' : 'var(--mid)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>Users</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {(['members', 'providers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', color: tab === t ? 'var(--teal)' : 'var(--mid)',
              borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent',
              fontFamily: 'var(--font-body)', textTransform: 'capitalize', marginBottom: -1,
            }}>
            {t} {t === 'providers' ? `(${providers.length})` : `(${members.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--mid)', fontSize: 14 }}>Loading…</div>
      ) : tab === 'members' ? (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontFamily: 'var(--font-body)', width: 260, color: 'var(--dark)',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'sponsor', 'sponsee', 'provider'] as RoleFilter[]).map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} style={roleFilterBtnStyle(roleFilter === r)}>
                  {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}
              style={{ ...roleFilterBtnStyle(false), marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              Joined {sort === 'desc' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1.8fr 2fr 1.4fr 1fr 1fr',
              gap: 12, padding: '12px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--border)',
            }}>
              {['', 'Name', 'Email', 'Roles', 'Joined', 'Last Login'].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {members.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>No members found.</div>
            ) : members.map((m, i) => (
              <div
                key={m.id}
                onClick={() => router.push(`/admin/users/${m.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '28px 1.8fr 2fr 1.4fr 1fr 1fr',
                  gap: 12, padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                {/* Status dot */}
                <div title={m.is_banned ? 'Suspended' : 'Active'}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: m.is_banned ? '#C0392B' : '#27AE60',
                    margin: '0 auto',
                  }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>
                  {m.display_name ?? <span style={{ color: 'var(--mid)', fontWeight: 400, fontStyle: 'italic' }}>No name</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email ?? '—'}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <RoleBadge label="member" color="var(--mid)" />
                  {m.is_sponsor && <RoleBadge label="sponsor" color="var(--teal)" />}
                  {m.is_sponsee && <RoleBadge label="sponsee" color="#7B5EA7" />}
                  {m.is_provider && <RoleBadge label="provider" color="var(--gold)" />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(m.created_at)}</div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(m.last_sign_in_at)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr 140px', gap: 12, padding: '12px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--border)' }}>
            {['Name', 'Email', 'Organization / Facility', 'Tier', 'Active', 'Joined', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {providers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>No providers yet.</div>
          ) : providers.map((p, i) => {
            const busy = actionId === p.id && isPending
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr 140px',
                gap: 12, padding: '14px 20px', alignItems: 'center',
                borderBottom: i < providers.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: p.is_active ? 1 : 0.5,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{p.contact_name ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--mid)', wordBreak: 'break-all' }}>{p.contact_email ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--dark)' }}>
                  {p.organization_name ?? (p.facilities as any)?.name ?? '—'}
                </div>
                <div>
                  <select value={p.subscription_tier} disabled={busy}
                    onChange={e => doAction(p.id, () => updateProviderTier(p.id, e.target.value))}
                    style={inputStyle}>
                    <option value="basic">Basic</option>
                    <option value="enhanced">Enhanced</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div style={{ fontSize: 12, color: p.is_active ? '#27AE60' : '#C0392B', fontWeight: 600 }}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(p.created_at)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.is_active ? (
                    <button onClick={() => doAction(p.id, () => deactivateProvider(p.id))} disabled={busy}
                      style={{ fontSize: 11, color: '#C0392B', background: 'none', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                      Deactivate
                    </button>
                  ) : (
                    <button onClick={() => doAction(p.id, () => reactivateProvider(p.id))} disabled={busy}
                      style={{ fontSize: 11, color: '#27AE60', background: 'none', border: '1px solid rgba(39,174,96,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                      Reactivate
                    </button>
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
