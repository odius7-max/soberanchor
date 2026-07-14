/**
 * Slim persistent crisis affordance shown across the /find directory family.
 * Calm-authoritative (navy-dark bg, gold-tint link) — not alarming red — per
 * spec research on distressed users. No SAMHSA referral copy here.
 */
export default function CrisisStrip() {
  return (
    <div
      role="region"
      aria-label="Crisis support"
      style={{ background: 'var(--navy-dark)', color: '#fff' }}
    >
      <div className="max-w-[1120px] mx-auto px-6 py-2.5 min-h-[44px] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13.5px] leading-tight">
        <span className="font-medium">Need immediate support?</span>
        <span style={{ color: 'rgba(255,255,255,0.85)' }}>
          Call or text{' '}
          <a
            href="tel:988"
            aria-label="Call 988 Suicide and Crisis Lifeline"
            className="inline-block font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm px-0.5"
            style={{ color: '#ffd98a', outlineColor: '#ffd98a' }}
          >
            988
          </a>
          {' '}— free, confidential, 24/7.
        </span>
      </div>
    </div>
  )
}
