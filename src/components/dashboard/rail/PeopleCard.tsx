import type { ActiveSponsor, SponseeFull } from '../DashboardShell'

interface Props {
  activeSponsors: ActiveSponsor[]
  sponsees: SponseeFull[]
  isSponsor: boolean
}

export default function PeopleCard({ activeSponsors, sponsees, isSponsor }: Props) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '16px 18px', marginBottom: 12 }}>
      <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>People</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeSponsors.length > 0 ? (
          activeSponsors.map(s => (
            <div key={s.relationshipId} style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>Sponsor: </span>
              <span className="font-semibold text-navy">{s.name}</span>
              {s.fellowshipAbbr && <span style={{ color: 'var(--mid)' }}> · {s.fellowshipAbbr}</span>}
            </div>
          ))
        ) : (
          <a href="/dashboard?intent=add_sponsor" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
            + Add a sponsor
          </a>
        )}
        {isSponsor && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--mid)' }}>Sponsees</span>
            <span className="font-semibold text-navy">{sponsees.length}</span>
          </div>
        )}
        {isSponsor && (
          <a href="/dashboard?tab=sponsees" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
            Manage relationships →
          </a>
        )}
      </div>
    </div>
  )
}
