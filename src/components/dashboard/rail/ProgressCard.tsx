interface Props {
  currentStep: number
  completedSteps: number
  allStepsDone: boolean
  journalCount: number
  stepWorkCount: number
  meetingsThisWeek: number
  meetingsTotal: number
}

export default function ProgressCard({ currentStep, completedSteps, allStepsDone, journalCount, stepWorkCount, meetingsThisWeek, meetingsTotal }: Props) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '16px 18px', marginBottom: 12 }}>
      <div className="font-semibold text-navy" style={{ fontSize: 13, marginBottom: 12 }}>Progress</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--mid)' }}>Step work</span>
          <span className="font-semibold text-navy">
            {allStepsDone ? 'All 12 complete' : `Step ${currentStep} · In progress`}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--mid)' }}>Journal entries</span>
          <span className="font-semibold text-navy">{journalCount} total</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--mid)' }}>Meetings this week</span>
          <span className="font-semibold text-navy">{meetingsThisWeek} logged</span>
        </div>
      </div>
    </div>
  )
}
