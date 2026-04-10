'use client'

const QUOTES = [
  { text: "One day at a time. That's all anyone can do.", attr: "The Program" },
  { text: "You don't have to see the whole staircase, just take the first step.", attr: "Martin Luther King Jr." },
  { text: "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought.", attr: "Unknown" },
  { text: "What lies behind us and what lies before us are small matters compared to what lies within us.", attr: "Ralph Waldo Emerson" },
  { text: "The first step toward change is awareness. The second is acceptance.", attr: "Nathaniel Branden" },
  { text: "You are not your addiction. You are so much more.", attr: "Unknown" },
  { text: "Every morning is a new beginning. Take a deep breath and start again.", attr: "Unknown" },
]

const STEPS = [
  { n: 1, s: 'Powerlessness' }, { n: 2, s: 'Hope' }, { n: 3, s: 'Decision' },
  { n: 4, s: 'Inventory' }, { n: 5, s: 'Admission' }, { n: 6, s: 'Readiness' },
  { n: 7, s: 'Humility' }, { n: 8, s: 'Amends List' }, { n: 9, s: 'Amends' },
  { n: 10, s: 'Daily Inventory' }, { n: 11, s: 'Spiritual Growth' }, { n: 12, s: 'Service' },
]

const MILESTONES = [7, 14, 21, 30, 60, 90, 120, 180, 270, 365, 500, 730, 1000, 1095]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface Props {
  displayName: string
  sobrietyDate: string | null
  currentStep: number
  daysClean: number | null
}

export default function DashboardBanner({ displayName, sobrietyDate, currentStep, daysClean }: Props) {
  const greeting = getGreeting()
  const nextMilestone = daysClean !== null ? (MILESTONES.find(m => m > daysClean) ?? null) : null
  const daysToNext = nextMilestone !== null && daysClean !== null ? nextMilestone - daysClean : null
  const isMilestone = daysClean !== null && MILESTONES.includes(daysClean)
  const quote = QUOTES[(daysClean ?? 0) % QUOTES.length]

  return (
    <div
      className="rounded-[20px] overflow-hidden mb-6 relative"
      style={{ background: 'linear-gradient(145deg,#002244 0%,#003366 35%,#1a4a5e 70%,#2A8A99 100%)', padding: '32px 36px 28px' }}
    >
      <svg aria-hidden="true" className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="none" style={{ height: '120px', width: '100%', opacity: 0.04 }}>
        <path d="M0 60 Q150 0 300 60 Q450 120 600 60 Q750 0 900 60 L900 120 L0 120Z" fill="#fff" />
        <path d="M0 80 Q150 30 300 80 Q450 130 600 80 Q750 30 900 80 L900 120 L0 120Z" fill="#fff" opacity="0.5" />
      </svg>
      <div aria-hidden="true" className="absolute pointer-events-none select-none" style={{ right: '-20px', top: '-20px', opacity: 0.03, fontSize: '200px', lineHeight: 1 }}>⚓</div>

      <div className="relative">
        <div className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '-0.5px' }}>
          {greeting}, {displayName} 👋
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginTop: '2px', marginBottom: '20px' }}>
          {sobrietyDate
            ? <>Sober since <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{new Date(sobrietyDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></>
            : 'Add your sobriety date in settings to track your journey.'}
        </div>

        <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
          <div>
            {daysClean !== null ? (
              <div className="flex items-baseline gap-3">
                <span className="font-bold text-white" style={{ fontFamily: 'var(--font-display)', fontSize: '56px', lineHeight: 1, letterSpacing: '-1.5px' }}>{daysClean}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>days</span>
                {isMilestone && (
                  <span className="rounded-full font-bold" style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(212,165,116,0.2)', border: '1px solid rgba(212,165,116,0.35)', color: '#D4A574' }}>
                    🎉 {daysClean} Days!
                  </span>
                )}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No sobriety date set</div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {nextMilestone !== null && daysToNext !== null && (
              <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', padding: '12px 16px', minWidth: '110px' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Next Milestone</div>
                <div style={{ color: '#D4A574', fontSize: '18px', fontWeight: 700, marginTop: '3px' }}>{nextMilestone} Days</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>{daysToNext} day{daysToNext !== 1 ? 's' : ''} away</div>
              </div>
            )}
            <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', padding: '12px 16px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Currently On</div>
              <div className="text-white" style={{ fontSize: '18px', fontWeight: 700, marginTop: '3px' }}>Step {currentStep}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>{STEPS[currentStep - 1]?.s}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(212,165,116,0.4)', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.85)', fontSize: '17px', fontStyle: 'italic', lineHeight: 1.55, fontWeight: 500 }}>&ldquo;{quote.text}&rdquo;</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px', fontFamily: 'var(--font-body)' }}>— {quote.attr}</div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STEPS.map(({ n, s }) => {
            const isDone = n < currentStep
            const isActive = n === currentStep
            return (
              <div key={n} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: '46px' }}>
                <div
                  className="flex items-center justify-center rounded-lg font-bold"
                  style={{
                    width: '38px', height: '38px', fontSize: '13px',
                    background: isDone ? '#2A8A99' : isActive ? '#D4A574' : 'rgba(255,255,255,0.1)',
                    border: isDone ? '2px solid rgba(255,255,255,0.3)' : isActive ? '2.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(255,255,255,0.15)',
                    color: isDone || isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                    boxShadow: isActive ? '0 0 18px rgba(212,165,116,0.5)' : 'none',
                  }}
                >
                  {isDone ? '✓' : n}
                </div>
                <span className="text-center leading-tight font-semibold" style={{ fontSize: '9px', maxWidth: '50px', color: isDone ? 'rgba(255,255,255,0.6)' : isActive ? '#D4A574' : 'rgba(255,255,255,0.25)' }}>
                  {s}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
