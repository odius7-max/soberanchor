'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OverviewTab from './OverviewTab'
import ListingTab from './ListingTab'
import type { FacilityData } from './ListingTab'
import LeadsTab from './LeadsTab'
import type { Lead } from './LeadsTab'
import PlanTab from './PlanTab'

type Tab = 'overview' | 'listing' | 'leads' | 'plan'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'listing',  label: '📋 My Listing' },
  { id: 'leads',    label: '📩 Leads' },
  { id: 'plan',     label: '⭐ Plan & Billing' },
]

const SUPPORT_EMAIL = 'providers@soberanchor.com'

export interface OwnedFacility {
  id: string
  name: string
  is_verified: boolean
}

interface Props {
  facility: FacilityData
  amenities: string[]
  insurance: string[]
  leads: Lead[]
  leadsThisMonth: number
  leadsLastMonth: number
  /** Claim is submitted but not yet approved: status-only, no editing, no leads. */
  pending?: boolean
  /** Every facility this account owns — drives the location switcher. */
  ownedFacilities?: OwnedFacility[]
}

/** Status chip driven by persisted state, so it survives reload and return visits. */
function StatusChip({ verified }: { verified: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
      background: verified ? 'rgba(39,174,96,0.1)' : 'rgba(230,126,34,0.12)',
      color: verified ? '#27AE60' : '#B9770E',
      border: `1px solid ${verified ? 'rgba(39,174,96,0.3)' : 'rgba(230,126,34,0.3)'}`,
    }}>
      {verified ? '✓ Verified' : 'Pending review'}
    </span>
  )
}

export default function ProviderDashboardShell({
  facility, amenities, insurance, leads, leadsThisMonth, leadsLastMonth,
  pending = false, ownedFacilities = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const router = useRouter()

  // Switching locations is a soft navigation: the server re-resolves and
  // re-authorises the selection, and the client re-renders without a full
  // page reload.
  function selectFacility(id: string) {
    if (id === facility.id) return
    router.push(`/dashboard?mode=facility&facility=${id}`)
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
      {/* Facility identity + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {ownedFacilities.length > 1 ? (
          <select
            value={facility.id}
            onChange={e => selectFacility(e.target.value)}
            aria-label="Select a location"
            style={{
              border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px',
              fontSize: 15, fontWeight: 600, color: 'var(--navy)', background: '#fff',
              fontFamily: 'var(--font-body)', maxWidth: '100%',
            }}
          >
            {ownedFacilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        ) : (
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>
            {facility.name}
          </h2>
        )}
        <StatusChip verified={!pending} />
      </div>

      {pending ? (
        /*
          Draft-only-until-approved. The legacy ListingTab still renders edit and
          save controls against tables the provider cannot write, so a pending
          claimant gets status-only content here — not a hidden tab, which would
          still be reachable. Lead data is not loaded server-side either.
        */
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕒</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
            Your claim is awaiting review
          </h3>
          <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 10 }}>
            We&apos;re reviewing your claim for <strong style={{ color: 'var(--navy)' }}>{facility.name}</strong>.
            You&apos;ll see the status here as soon as it&apos;s decided.
          </p>
          <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 20 }}>
            Listing changes and inquiry data aren&apos;t available until your claim is approved.
          </p>
          <a
            href={`/find/${facility.id}`}
            style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
          >
            View your public listing →
          </a>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 18 }}>
            Questions? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? 'rgba(42,138,153,0.08)' : 'transparent',
                  color: activeTab === t.id ? 'var(--teal)' : 'var(--dark)',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: activeTab === t.id ? 600 : 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewTab
              tier={facility.listing_tier}
              facilityName={facility.name}
              leadsThisMonth={leadsThisMonth}
              leadsLastMonth={leadsLastMonth}
              viewsThisMonth={0}
              viewsLastMonth={0}
              contactClicks={0}
              contactClicksLast={0}
              recentLeads={leads}
              onGoToLeads={() => setActiveTab('leads')}
              onGoToPlan={() => setActiveTab('plan')}
            />
          )}
          {activeTab === 'listing' && (
            <ListingTab
              facility={facility}
              amenities={amenities}
              insurance={insurance}
              onGoToPlan={() => setActiveTab('plan')}
            />
          )}
          {activeTab === 'leads' && (
            <LeadsTab
              tier={facility.listing_tier}
              leads={leads}
              onGoToPlan={() => setActiveTab('plan')}
            />
          )}
          {activeTab === 'plan' && (
            <PlanTab tier={facility.listing_tier} />
          )}
        </>
      )}
    </div>
  )
}
