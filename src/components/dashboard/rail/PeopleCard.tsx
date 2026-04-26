'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddSponseeModal from '../AddSponseeModal'
import UpgradeToProModal from '../UpgradeToProModal'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/hooks/useSponsorAccess'
import type { ActiveSponsor, SponseeFull } from '../DashboardShell'

interface Props {
  userId: string
  displayName: string
  activeSponsors: ActiveSponsor[]
  sponsees: SponseeFull[]
  isAvailableSponsor: boolean  // user has toggled "accept new sponsees" on
  canSponsor: boolean           // gate satisfied (marked ready or all steps done)
}

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 12px',
  background: '#fff',
  color: 'var(--teal)',
  border: '1px solid var(--teal)',
  borderRadius: 8,
  cursor: 'pointer',
  textAlign: 'center',
}

const unlinkBtn: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--mid)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
  padding: '2px 4px',
}

const fellowshipChip: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 7px',
  borderRadius: 20,
  background: 'rgba(42,138,153,0.1)',
  color: 'var(--teal)',
  border: '1px solid rgba(42,138,153,0.2)',
  flexShrink: 0,
}

const SPONSEE_DISPLAY_LIMIT = 3

export default function PeopleCard({ userId, displayName, activeSponsors, sponsees, isAvailableSponsor, canSponsor }: Props) {
  const router = useRouter()
  const [showFindSponsor, setShowFindSponsor] = useState(false)
  const [showAddSponsee, setShowAddSponsee] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  // Pre-check at intent: if a Free sponsor at cap clicks "+ Invite sponsee",
  // we open UpgradeToProModal directly instead of walking them through the
  // search form only to disable Send. AddSponseeModal's Send-disable + the
  // server 402 remain as defensive fallbacks.
  const { canAddSponsee } = useSubscription(userId)

  const hasSponsor = activeSponsors.length > 0
  const visibleSponsees = sponsees.slice(0, SPONSEE_DISPLAY_LIMIT)
  const overflowSponsees = Math.max(0, sponsees.length - SPONSEE_DISPLAY_LIMIT)

  // Direct client-side UPDATE — RLS enforces participant-only writes.
  // Matches the pattern used in TasksTab and OverviewTab.
  async function endRelationship(relationshipId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('sponsor_relationships')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', relationshipId)
    if (error) throw new Error(error.message)
  }

  async function unlinkSponsor(relationshipId: string, sponsorName: string) {
    if (!confirm(`End your sponsor relationship with ${sponsorName}?`)) return
    setUnlinking(relationshipId)
    try {
      await endRelationship(relationshipId)
      router.refresh()
    } catch (err) {
      console.error('[PeopleCard] unlinkSponsor failed', err)
      alert(`Could not end relationship: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUnlinking(null)
    }
  }

  async function unlinkSponsee(sponseeId: string, sponseeName: string, relationshipIds: string[]) {
    if (relationshipIds.length === 0) {
      alert(`No active relationship found for ${sponseeName}. This may indicate a data issue — please refresh the page.`)
      return
    }
    if (!confirm(`End your sponsor relationship with ${sponseeName}?`)) return
    setUnlinking(sponseeId)
    try {
      await Promise.all(relationshipIds.map(id => endRelationship(id)))
      router.refresh()
    } catch (err) {
      console.error('[PeopleCard] unlinkSponsee failed', err)
      alert(`Could not end relationship: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUnlinking(null)
    }
  }

  return (
    <>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: '16px 18px',
          marginBottom: 12,
        }}
      >
        <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>People</div>

        {/* Sponsor rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {hasSponsor ? (
            activeSponsors.map(s => (
              <div
                key={s.relationshipId}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{ color: 'var(--mid)', flexShrink: 0 }}>Sponsor:</span>
                  <span className="font-semibold text-navy" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                  {s.fellowshipAbbr && <span style={fellowshipChip}>{s.fellowshipAbbr}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => unlinkSponsor(s.relationshipId, s.name)}
                  disabled={unlinking === s.relationshipId}
                  style={{ ...unlinkBtn, cursor: unlinking === s.relationshipId ? 'wait' : 'pointer', opacity: unlinking === s.relationshipId ? 0.5 : 1 }}
                  aria-label={`Unlink sponsor ${s.name}`}
                >
                  {unlinking === s.relationshipId ? '…' : 'Unlink'}
                </button>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>Sponsor</span>
              <span style={{ color: 'var(--mid)', fontSize: 12 }}>None yet</span>
            </div>
          )}
        </div>

        {/* Sponsees — show whenever user has any active sponsees, regardless of availability flag.
            The is_available_sponsor flag controls whether they accept NEW sponsees, not whether
            existing ones render. */}
        {sponsees.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>Sponsees</span>
              <span style={{ color: 'var(--mid)', fontSize: 12 }}>
                {isAvailableSponsor ? 'Accepting' : 'Not accepting'} · <span className="font-semibold text-navy">{sponsees.length}</span>
              </span>
            </div>
            {visibleSponsees.map(s => {
              const relIds = s.relationships.map(r => r.id)
              const abbrs = s.fellowshipAbbrs.filter(a => !!a)
              return (
                <div
                  key={s.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{ color: 'var(--mid)', flexShrink: 0 }}>—</span>
                    <span className="font-semibold text-navy" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                    {abbrs.slice(0, 2).map(a => <span key={a} style={fellowshipChip}>{a}</span>)}
                  </div>
                  <button
                    type="button"
                    onClick={() => unlinkSponsee(s.id, s.name, relIds)}
                    disabled={unlinking === s.id}
                    style={{ ...unlinkBtn, cursor: unlinking === s.id ? 'wait' : 'pointer', opacity: unlinking === s.id ? 0.5 : 1 }}
                    aria-label={`Unlink sponsee ${s.name}`}
                  >
                    {unlinking === s.id ? '…' : 'Unlink'}
                  </button>
                </div>
              )
            })}
            {overflowSponsees > 0 && (
              <a
                href="/dashboard?tab=sponsees"
                style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}
              >
                + {overflowSponsees} more →
              </a>
            )}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {isAvailableSponsor && canSponsor && (
            <button
              type="button"
              onClick={() => {
                if (!canAddSponsee) {
                  setShowUpgradeModal(true)
                  return
                }
                setShowAddSponsee(true)
              }}
              style={secondaryBtn}
            >
              + Invite sponsee
            </button>
          )}
          {isAvailableSponsor && !canSponsor && (
            <div style={{ fontSize: 11, color: 'var(--mid)' }}>
              You can invite sponsees once your sponsor marks you ready or you complete your steps.
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowFindSponsor(true)}
            style={{
              fontSize: 13,
              color: 'var(--teal)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            + Add {hasSponsor ? 'another sponsor' : 'a sponsor'}
            {hasSponsor && (
              <span style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 400, marginLeft: 6 }}>
                for another fellowship
              </span>
            )}
          </button>
        </div>
      </div>

      {showFindSponsor && (
        <AddSponseeModal
          userId={userId}
          mode="find_sponsor"
          onClose={() => setShowFindSponsor(false)}
          sponsorName={displayName}
        />
      )}
      {showAddSponsee && (
        <AddSponseeModal
          userId={userId}
          mode="add_sponsee"
          onClose={() => setShowAddSponsee(false)}
          sponsorName={displayName}
        />
      )}
      {showUpgradeModal && (
        <UpgradeToProModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  )
}
