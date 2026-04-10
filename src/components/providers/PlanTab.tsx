'use client'

interface Props { tier: string }

const TIERS = [
  {
    id: 'basic',
    label: 'Basic',
    price: 0,
    features: ['Listed in directory', 'Basic listing info visible', 'Phone & website displayed', '1 photo', 'Edit description & contact info'],
  },
  {
    id: 'enhanced',
    label: 'Enhanced',
    price: 149,
    recommended: true,
    features: ['Everything in Basic', 'Lead capture form & inbox 📩', 'Featured badge ⭐', 'Verified badge ✓', 'Up to 10 photos', 'Respond to reviews', 'Basic analytics dashboard'],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 399,
    features: ['Everything in Enhanced', 'Top-of-results placement', 'Unlimited photos', 'Full analytics dashboard', 'Event posting', 'Priority support'],
  },
]

const FAQS = [
  ['How do leads work?', 'Enhanced and Premium listings include a "Contact This Facility" form on your listing page. When someone submits it, their info appears in your Leads inbox instantly. Basic listings show your phone and website so people can contact you directly, but don\'t include lead capture or tracking.'],
  ['Can I cancel anytime?', 'Yes. No contracts, no hidden fees. Downgrade to Basic (free) whenever you want and your listing stays active in the directory.'],
  ['What\'s the Featured badge?', 'Enhanced and Premium listings get a gold "Featured" badge on your listing card in search results, making it stand out visually from basic listings.'],
  ['How does top placement work?', 'Premium listings appear at the top of relevant search and directory results in your market, before Enhanced and Basic listings. This can dramatically increase your listing views.'],
  ['How do I upgrade?', 'Click the Upgrade button on any plan card and we\'ll reach out within one business day to get you set up. Stripe integration is coming soon for self-serve billing.'],
]

export default function PlanTab({ tier }: Props) {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Plan & Billing</h1>
      <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 32 }}>Choose the right plan to grow your visibility and leads.</p>

      {/* Tier cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
        {TIERS.map(t => {
          const isCurrent = tier === t.id
          return (
            <div key={t.id} style={{
              background: '#fff',
              border: `${t.recommended ? 2 : 1}px solid ${t.recommended ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: 24,
              flex: '1 1 220px',
              position: 'relative',
              opacity: isCurrent ? 0.75 : 1,
            }}>
              {t.recommended && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Recommended</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--navy)', marginBottom: 4, lineHeight: 1 }}>
                {t.price === 0 ? 'Free' : `$${t.price}`}
                {t.price > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--mid)' }}>/mo</span>}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
                {t.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 2.1, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#27AE60', flexShrink: 0, fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1.5px solid var(--border)', color: 'var(--mid)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'var(--font-body)' }}>Current Plan</button>
              ) : (
                <a href="mailto:providers@soberanchor.com?subject=Upgrade%20to%20{t.label}%20plan"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.recommended ? 'var(--teal)' : 'none', color: t.recommended ? '#fff' : 'var(--navy)', border: t.recommended ? 'none' : '1.5px solid var(--navy)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
                  {tier === 'basic' ? 'Upgrade' : tier === 'enhanced' && t.id === 'premium' ? 'Upgrade' : 'Contact Us'}
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 16 }}>Frequently Asked Questions</h3>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', padding: '16px 0' }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)', marginBottom: 6 }}>{q}</div>
            <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.65 }}>{a}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: 'var(--mid)' }}>Questions about your plan?</div>
          <a href="mailto:providers@soberanchor.com"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
            providers@soberanchor.com →
          </a>
        </div>
      </div>
    </div>
  )
}
