'use client'

import { PAGE_ANALYTICS_LIVE, getTier, tierPriceQualified } from '@/lib/provider-tiers'

const ENHANCED = getTier('enhanced')
const PREMIUM = getTier('premium')

interface Lead { id:string; first_name:string|null; phone:string|null; insurance_provider:string|null; seeking:string|null; who_for:string|null; status:string; created_at:string }

interface Props {
  tier: string
  facilityName: string
  leadsThisMonth: number
  leadsLastMonth: number
  viewsThisMonth: number
  viewsLastMonth: number
  contactClicks: number
  contactClicksLast: number
  recentLeads: Lead[]
  onGoToLeads: () => void
  onGoToPlan: () => void
}

function StatCard({ label, value, prev, icon }: { label:string; value:number; prev?:number; icon:string }) {
  const pct = prev && prev > 0 ? Math.round(((value - prev) / prev) * 100) : null
  const up = pct !== null && pct >= 0
  return (
    <div className="card-hover" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '24px 20px', flex: '1 1 200px', minWidth: 180 }}>
      <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.75px' }}>{value}</div>
      {pct !== null && (
        <div style={{ fontSize: 12, color: up ? '#27AE60' : '#E53935', marginTop: 6, fontWeight: 500 }}>
          {up ? '↑' : '↓'} {Math.abs(pct)}% vs last month
        </div>
      )}
    </div>
  )
}

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

function RecentLeads({ recentLeads, onGoToLeads }: { recentLeads: Lead[]; onGoToLeads: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', fontWeight: 600, letterSpacing: '-0.5px' }}>Recent Leads</h2>
        <button onClick={onGoToLeads} style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>View all →</button>
      </div>
      {recentLeads.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '32px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
          No leads yet — your listing is live and ready to receive inquiries.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          {recentLeads.slice(0, 3).map((lead, i) => (
            <div key={lead.id} style={{ padding: '16px 20px', borderBottom: i < Math.min(recentLeads.length, 3) - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)', marginBottom: 2 }}>{lead.first_name ?? 'Anonymous'}</div>
                <div style={{ fontSize: 13, color: 'var(--mid)' }}>
                  {lead.seeking ? `Looking for ${SEEKING[lead.seeking] ?? lead.seeking}` : ''}
                  {lead.who_for ? ` · For ${WHO[lead.who_for] ?? lead.who_for}` : ''}
                  {lead.insurance_provider ? ` · ${lead.insurance_provider}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--mid)' }}>{timeAgo(lead.created_at)}</span>
                <StatusBadge status={lead.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function OverviewTab({ tier, facilityName, leadsThisMonth, leadsLastMonth, viewsThisMonth, viewsLastMonth, contactClicks, contactClicksLast, recentLeads, onGoToLeads, onGoToPlan }: Props) {
  const hasAnalytics = tier === 'enhanced' || tier === 'premium'

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, letterSpacing: '-0.75px' }}>Welcome back</h1>
      <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 28 }}>Here&apos;s how <strong style={{ color: 'var(--dark)' }}>{facilityName}</strong> is performing this month.</p>

      {/* ── Basic: no analytics, upgrade CTA ── */}
      {!hasAnalytics && (
        <>
          {/*
            Page-view stats belong to the FREE tier in the locked ladder
            ("Monthly page-view stats" under Claimed), so they must never be
            dangled as an Enhanced-only unlock — which is exactly what this
            card used to do. They also aren't instrumented yet, so nobody gets
            a number. Say both things plainly instead of selling either.
          */}
          <div style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
              Page-view stats are included with your claimed listing
            </div>
            <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
              Monthly view counts come with every claimed listing at no cost. We&apos;re still building
              the measurement behind them, so there are no numbers to show yet — we&apos;d rather show
              you nothing than show you something we haven&apos;t actually counted.
            </div>
          </div>

          {/* Upgrade banner — ladder-true. It previously promised "top
              placement", which contradicts the published policy that payment
              never affects organic ranking. */}
          <div style={{ background: 'linear-gradient(135deg, #002244 0%, #1a4a5e 100%)', borderRadius: 14, padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>Upgrade Your Listing</div>
              <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Make your page yours.</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, maxWidth: 460, lineHeight: 1.6 }}>
                {ENHANCED.name} ({tierPriceQualified(ENHANCED)}) adds your full gallery, branding and inquiry capture.
                {' '}{PREMIUM.name} ({tierPriceQualified(PREMIUM)}) adds clearly-labeled Featured placement.
              </div>
            </div>
            <button onClick={onGoToPlan}
              style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              View Plans →
            </button>
          </div>

          {/* Inquiry capture upsell */}
          <div style={{ background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 14, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)', marginBottom: 4 }}>📩 Want inquiries delivered to your inbox?</div>
              <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
                {ENHANCED.name} adds a callback-request form to your listing. Inquiries go only to you —
                never pooled, shared, or sold. Your phone number and website stay on your listing either way.
              </div>
            </div>
            <button onClick={onGoToPlan}
              style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              Learn More →
            </button>
          </div>
        </>
      )}

      {/* ── Enhanced + Premium: stat cards ── */}
      {hasAnalytics && (
        <>
          {/*
            Inquiry counts are real — they come from the `leads` table. Listing
            views and contact clicks are NOT instrumented; both were rendering a
            hardcoded 0 from the page, which presents an uncounted metric as a
            measurement. Show only what we actually measure (ODI-79).
          */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatCard icon="📩" label="New Leads" value={leadsThisMonth} prev={leadsLastMonth} />
            {PAGE_ANALYTICS_LIVE && (
              <>
                <StatCard icon="👁" label="Listing Views" value={viewsThisMonth} prev={viewsLastMonth} />
                <StatCard icon="📞" label="Contact Clicks" value={contactClicks} prev={contactClicksLast} />
              </>
            )}
          </div>

          {!PAGE_ANALYTICS_LIVE && (
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 28, lineHeight: 1.6 }}>
              Listing views and contact clicks aren&apos;t being measured yet, so we&apos;re not showing a
              number for them. They&apos;ll appear here once the measurement is live.
            </p>
          )}

          {/*
            A "Search Trends" panel used to render here for Premium with five
            hardcoded counts (38 / 27 / 24 / 19 / 15) under the caption
            "Anonymized search data from people looking for help in your area
            this month … updated weekly. Counts reflect unique searches."
            None of it was real and nothing measured it. Removed rather than
            relabelled as sample data: it isn't a tier promise in the locked
            ladder, so there's nothing to hold a placeholder for (ODI-79).
          */}

          <RecentLeads recentLeads={recentLeads} onGoToLeads={onGoToLeads} />
        </>
      )}
    </div>
  )
}
