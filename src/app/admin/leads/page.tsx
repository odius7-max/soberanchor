'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  id: string
  first_name: string | null
  phone: string | null
  insurance_provider: string | null
  seeking: string | null
  who_for: string | null
  status: string
  created_at: string
  facilities: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(42,138,153,0.1)', color: 'var(--teal)' },
  contacted: { bg: 'rgba(212,165,116,0.15)', color: 'var(--gold)' },
  converted: { bg: 'rgba(39,174,96,0.1)', color: '#27AE60' },
  closed: { bg: 'rgba(136,136,136,0.1)', color: 'var(--mid)' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.new
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('leads')
        .select('id, first_name, phone, insurance_provider, seeking, who_for, status, created_at, facilities(id, name)')
        .order('created_at', { ascending: false })
      setLeads((data ?? []) as unknown as Lead[])
      setLoading(false)
    }
    load()
  }, [])

  const facilityNames = Array.from(new Set(leads.map(l => (l.facilities as any)?.name).filter(Boolean)))

  const filtered = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (facilityFilter !== 'all' && (l.facilities as any)?.name !== facilityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(l.first_name ?? '').toLowerCase().includes(q) &&
          !(l.phone ?? '').includes(q) &&
          !((l.facilities as any)?.name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    converted: leads.filter(l => l.status === 'converted').length,
    conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0,
  }

  function exportCSV() {
    const headers = ['Name', 'Phone', 'Insurance', 'Seeking', 'Who For', 'Facility', 'Status', 'Date']
    const rows = filtered.map(l => [
      l.first_name ?? '',
      l.phone ?? '',
      l.insurance_provider ?? '',
      l.seeking ?? '',
      l.who_for ?? '',
      (l.facilities as any)?.name ?? '',
      l.status,
      new Date(l.created_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soberanchor-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>Leads Overview</h1>
        </div>
        <button onClick={exportCSV}
          style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 8 }}>
          Export CSV ↓
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Leads', value: stats.total },
          { label: 'New', value: stats.new },
          { label: 'Converted', value: stats.converted },
          { label: 'Conversion Rate', value: `${stats.conversionRate}%` },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, facility…"
          style={{ padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', color: 'var(--dark)', width: 260 }} />

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', color: 'var(--dark)' }}>
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>

        <select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)}
          style={{ padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', color: 'var(--dark)', maxWidth: 240 }}>
          <option value="all">All Facilities</option>
          {facilityNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <span style={{ fontSize: 13, color: 'var(--mid)' }}>{filtered.length} leads</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--mid)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 100px 80px', gap: 12, padding: '12px 20px', background: 'var(--off-white)', borderBottom: '1px solid var(--border)' }}>
            {['Name', 'Facility', 'Phone', 'Seeking', 'Who For', 'Insurance', 'Status', 'Date'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>No leads found.</div>
          ) : filtered.map((l, i) => (
            <div key={l.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1fr 100px 80px',
              gap: 12, padding: '13px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{l.first_name ?? 'Anonymous'}</div>
              <div style={{ fontSize: 12, color: 'var(--dark)' }}>{(l.facilities as any)?.name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>{l.phone ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--dark)', textTransform: 'capitalize' }}>{l.seeking ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--dark)', textTransform: 'capitalize' }}>{l.who_for ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>{l.insurance_provider ?? '—'}</div>
              <div><StatusBadge status={l.status} /></div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(l.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
