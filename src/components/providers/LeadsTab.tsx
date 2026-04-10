'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface Lead { id:string; first_name:string|null; phone:string|null; insurance_provider:string|null; seeking:string|null; who_for:string|null; notes:string|null; status:string; created_at:string }

interface Props { tier: string; leads: Lead[]; onGoToPlan: () => void }

const SEEKING: Record<string,string> = { inpatient:'Inpatient', outpatient:'Outpatient', detox:'Detox', sober_living:'Sober Living', therapy:'Therapy', unsure:'Not sure yet' }
const WHO: Record<string,string> = { self:'Themselves', family:'Family member', friend:'Friend', professional:'Client' }

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{bg:string;border:string;color:string;label:string}> = {
    new:       { bg:'#E8F5E9', border:'#A5D6A7', color:'#27AE60',  label:'New' },
    contacted: { bg:'#FFF8E1', border:'#FFE082', color:'#F57F17',  label:'Contacted' },
    converted: { bg:'#E3F2FD', border:'#90CAF9', color:'#1565C0',  label:'Converted' },
    closed:    { bg:'var(--warm-gray)', border:'var(--border)', color:'var(--mid)', label:'Closed' },
  }
  const s = map[status] ?? map.closed
  return <span style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

export default function LeadsTab({ tier, leads, onGoToPlan }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  if (tier === 'basic') {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, letterSpacing: '-0.75px' }}>Leads</h1>
        <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 24 }}>People who&apos;ve requested information about your facility.</p>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📩</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)', marginBottom: 8, letterSpacing: '-0.5px' }}>Unlock Lead Capture</h2>
          <p style={{ color: 'var(--mid)', fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
            Upgrade to Enhanced to add a &quot;Contact This Facility&quot; form to your listing. Leads are delivered straight to your dashboard — no middleman, no fulfillment work.
          </p>
          <button onClick={onGoToPlan}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            View Plans &amp; Upgrade →
          </button>
        </div>
      </div>
    )
  }

  const counts = { all: leads.length, new: 0, contacted: 0, converted: 0, closed: 0 }
  for (const l of leads) { if (l.status in counts) (counts as Record<string,number>)[l.status]++ }
  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  async function updateStatus(lead: Lead, newStatus: string) {
    setUpdating(lead.id)
    const supabase = createClient()
    await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)
    setUpdating(null)
    router.refresh()
  }

  const FILTERS: [string, string][] = [['all','All'], ['new','New'], ['contacted','Contacted'], ['converted','Converted'], ['closed','Closed']]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, letterSpacing: '-0.75px' }}>Leads</h1>
      <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 24 }}>People who&apos;ve requested information about your facility.</p>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ background: filter === val ? 'var(--navy)' : 'var(--warm-gray)', color: filter === val ? '#fff' : 'var(--dark)', border: `1px solid ${filter === val ? 'var(--navy)' : 'var(--border)'}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {label}{val !== 'all' && counts[val as keyof typeof counts] > 0 ? ` (${counts[val as keyof typeof counts]})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--mid)', fontSize: 15 }}>
          No {filter === 'all' ? '' : filter + ' '}leads yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(lead => (
            <div key={lead.id} style={{
              background: '#fff',
              border: `1px solid ${lead.status === 'new' ? 'rgba(39,174,96,0.3)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '20px 24px',
              borderLeft: `4px solid ${lead.status === 'new' ? '#27AE60' : 'transparent'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--navy)' }}>{lead.first_name ?? 'Anonymous'}</span>
                    <StatusBadge status={lead.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '4px 24px', fontSize: 14, color: 'var(--dark)' }}>
                    {lead.phone && <div><span style={{ color: 'var(--mid)' }}>Phone: </span>{lead.phone}</div>}
                    {lead.insurance_provider && <div><span style={{ color: 'var(--mid)' }}>Insurance: </span>{lead.insurance_provider}</div>}
                    {lead.seeking && <div><span style={{ color: 'var(--mid)' }}>Looking for: </span>{SEEKING[lead.seeking] ?? lead.seeking}</div>}
                    {lead.who_for && <div><span style={{ color: 'var(--mid)' }}>Who for: </span>{WHO[lead.who_for] ?? lead.who_for}</div>}
                  </div>
                  {lead.notes && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--mid)', fontStyle: 'italic' }}>&ldquo;{lead.notes}&rdquo;</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(lead.created_at)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {lead.status === 'new' && (
                      <button onClick={() => updateStatus(lead, 'contacted')} disabled={updating === lead.id}
                        style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: updating === lead.id ? 0.6 : 1 }}>
                        {updating === lead.id ? '…' : 'Mark Contacted'}
                      </button>
                    )}
                    {lead.status === 'contacted' && (
                      <button onClick={() => updateStatus(lead, 'converted')} disabled={updating === lead.id}
                        style={{ background: 'none', color: 'var(--navy)', border: '1.5px solid var(--navy)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: updating === lead.id ? 0.6 : 1 }}>
                        {updating === lead.id ? '…' : 'Mark Converted'}
                      </button>
                    )}
                    {(lead.status === 'new' || lead.status === 'contacted') && (
                      <button onClick={() => updateStatus(lead, 'closed')} disabled={updating === lead.id}
                        style={{ background: 'none', color: 'var(--mid)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: updating === lead.id ? 0.6 : 1 }}>
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
