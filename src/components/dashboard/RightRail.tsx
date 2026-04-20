import ProgressCard from './rail/ProgressCard'
import PeopleCard from './rail/PeopleCard'
import RecentCard from './rail/RecentCard'
import type { ActiveSponsor, SponseeFull, CheckIn } from './DashboardShell'

const SEVERE_MOODS = new Set(['struggling', 'hard', 'crisis'])

interface Props {
  userId: string
  displayName: string
  currentStep: number
  completedSteps: number
  allStepsDone: boolean
  journalCount: number
  stepWorkCount: number
  meetingsThisWeek: number
  meetingsTotal: number
  activeSponsors: ActiveSponsor[]
  sponsees: SponseeFull[]
  isAvailableSponsor: boolean
  canSponsor: boolean
  recentCheckIns: CheckIn[]
  today: string
}

function relH(dateStr: string): string {
  const hours = Math.round((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 3_600_000)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export default function RightRail({ userId, displayName, currentStep, completedSteps, allStepsDone, journalCount, stepWorkCount, meetingsThisWeek, meetingsTotal, activeSponsors, sponsees, isAvailableSponsor, canSponsor, recentCheckIns, today }: Props) {
  // Show sponsor-role rail whenever the user has active sponsees, regardless of availability
  // — someone who stopped taking new sponsees still needs to see alerts on their existing ones.
  const hasSponseesWithAlerts = sponsees.length > 0

  if (hasSponseesWithAlerts) {
    /* ── Sponsor-role right rail ── */
    return (
      <div>
        {/* Your Sponsees */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '16px 18px', marginBottom: 12 }}>
          <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>Your Sponsees</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sponsees.map(s => {
              const latest = s.checkInHistory[0]
              const isAlert = latest?.date === today && SEVERE_MOODS.has(latest?.mood ?? '')
              const daysSilent = latest
                ? Math.floor((new Date(today).getTime() - new Date(latest.date).getTime()) / 86_400_000)
                : null
              const label = isAlert
                ? `${latest!.mood} · ${relH(latest!.date)}`
                : daysSilent !== null && daysSilent >= 3
                  ? `Silent ${daysSilent}d`
                  : s.lastStepWork
                    ? `Step ${s.completedSteps + 1}`
                    : 'No activity'

              return (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <a href={`/my-recovery/sponsor/sponsee/${s.id}`} style={{ color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
                    {s.name}
                  </a>
                  <span style={{ color: isAlert || (daysSilent !== null && daysSilent >= 3) ? 'var(--red-alert)' : 'var(--mid)', fontSize: 12 }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          <a href="/dashboard?tab=sponsees" style={{ display: 'block', marginTop: 10, fontSize: 13, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
            View sponsees tab →
          </a>
        </div>

        {/* People (manage sponsor + sponsee relationships) */}
        <PeopleCard
          userId={userId}
          displayName={displayName}
          activeSponsors={activeSponsors}
          sponsees={sponsees}
          isAvailableSponsor={isAvailableSponsor}
          canSponsor={canSponsor}
        />

        {/* Your Recovery */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '16px 18px' }}>
          <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>Your Recovery</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>Step work</span>
              <span className="font-semibold text-navy">{allStepsDone ? 'All done ✓' : `Step ${currentStep}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--mid)' }}>Meetings this week</span>
              <span className="font-semibold text-navy">{meetingsThisWeek}</span>
            </div>
            {activeSponsors.length > 0 && activeSponsors.map(s => (
              <div key={s.relationshipId} style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--mid)' }}>Sponsor: </span>
                <span className="font-semibold text-navy">{s.name}</span>
                {s.fellowshipAbbr && <span style={{ color: 'var(--mid)' }}> · {s.fellowshipAbbr}</span>}
              </div>
            ))}
            {/* "+ Add a sponsor" CTA moved to PEOPLE card to avoid duplication */}
          </div>
        </div>
      </div>
    )
  }

  /* ── Member-role right rail (default) ── */
  return (
    <div>
      <ProgressCard
        currentStep={currentStep}
        completedSteps={completedSteps}
        allStepsDone={allStepsDone}
        journalCount={journalCount}
        stepWorkCount={stepWorkCount}
        meetingsThisWeek={meetingsThisWeek}
        meetingsTotal={meetingsTotal}
      />
      <PeopleCard
        userId={userId}
        displayName={displayName}
        activeSponsors={activeSponsors}
        sponsees={sponsees}
        isAvailableSponsor={isAvailableSponsor}
        canSponsor={canSponsor}
      />
      <RecentCard recentCheckIns={recentCheckIns} />
    </div>
  )
}
