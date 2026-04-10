'use client'

import { useState } from 'react'
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

interface Props {
  facility: FacilityData
  amenities: string[]
  insurance: string[]
  leads: Lead[]
  leadsThisMonth: number
  leadsLastMonth: number
}

export default function ProviderDashboardShell({ facility, amenities, insurance, leads, leadsThisMonth, leadsLastMonth }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
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
    </div>
  )
}
