import Link from 'next/link'

export const metadata = { title: 'Upgrade to Sponsor Pro — SoberAnchor' }

export default function UpgradePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white, #f8f6f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%', padding: '48px 40px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,51,102,0.10)' }}>
        {/* Anchor icon */}
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#2A8A99,#1a6b78)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 4px 16px rgba(42,138,153,0.25)' }}>
          <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
            <path d="M32 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="#fff" strokeWidth="2.5"/>
            <path d="M32 22v28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M20 42c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 34h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Pro</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '0 0 12px' }}>
          Payment processing coming soon
        </h1>
        <p style={{ fontSize: 15, color: 'var(--mid)', lineHeight: 1.7, margin: '0 0 32px' }}>
          We&apos;re setting up secure payment processing for Sponsor Pro subscriptions.{' '}
          <strong style={{ color: 'var(--navy)' }}>Your trial data is safe</strong> — all your sponsee connections, notes, and history will be there when billing goes live.
        </p>

        <div style={{ background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>Coming soon</div>
          {['$7 / month', '$59 / year — save ~30%'].map(plan => (
            <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--dark)', fontWeight: 500 }}>{plan}</span>
            </div>
          ))}
        </div>

        <Link
          href="/my-recovery?tab=sponsees"
          style={{ display: 'inline-block', background: 'var(--navy)', color: '#fff', borderRadius: 10, padding: '12px 32px', fontSize: 14, fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.2px' }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  )
}
