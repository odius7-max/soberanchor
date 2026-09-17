'use client'

import {
  PROVIDER_TIERS,
  PROVIDER_SUPPORT_EMAIL,
  upgradeMailto,
} from '@/lib/provider-tiers'

interface Props { tier: string }

/**
 * Plan & Billing (ODI-75).
 *
 * The ladder, prices and features all come from @/lib/provider-tiers now. This
 * tab previously carried its own copy of them and had drifted a long way from
 * what /for-providers publishes:
 *   - paid prices quoted roughly 50% above the published ones
 *   - "Verified badge ✓" sold as an Enhanced perk, when it ships free with any
 *     approved claim
 *   - "Featured badge ⭐" listed under Enhanced, when Featured is Premium-only
 *   - priority placement in organic results promised to Premium, which
 *     contradicts the published policy that payment never influences ranking
 * The last one was the serious one: it promised paying providers something the
 * product deliberately refuses to sell.
 */

const FAQS: [string, string][] = [
  [
    'How do inquiries work?',
    'Enhanced and Premium listings include a callback-request form on your listing page. When a family submits it, their details go straight to you — and only to you. We never sell, share, or broker inquiries. Claimed listings show your real phone number and website on every tier, so families can always reach you directly.',
  ],
  [
    'Can I cancel anytime?',
    'Yes. Month-to-month, no contracts, no hidden fees. Cancel whenever you like and your free claimed listing stays exactly where it is.',
  ],
  [
    'Does paying improve our search ranking?',
    'No. Organic results are ordered by relevance and data quality, never by payment. Premium buys clearly-labeled Featured placement in a separate band — paid listings still appear in organic results at their natural position.',
  ],
  [
    "What's the Featured badge?",
    'Premium listings appear in a clearly-labeled Featured band and carry a Featured badge on the listing page. It is labeled sponsorship, and it never changes the organic ordering underneath.',
  ],
  [
    'How do I upgrade?',
    'Self-serve billing is not live yet. The Upgrade button opens a pre-filled email to our team in your mail app — you still need to send it. Once we have it we will get back to you to arrange billing and switch the tier over.',
  ],
]

export default function PlanTab({ tier }: Props) {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, letterSpacing: '-0.75px' }}>Plan &amp; Billing</h1>
      <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 32 }}>Choose the right plan to grow your visibility and inquiries.</p>

      {/* Tier cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
        {PROVIDER_TIERS.map(t => {
          const isCurrent = tier === t.id
          return (
            <div key={t.id} className="card-hover" style={{
              background: '#fff',
              border: `${t.recommended ? 2 : 1}px solid ${t.recommended ? 'var(--teal)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 14,
              padding: 24,
              flex: '1 1 220px',
              position: 'relative',
              opacity: isCurrent ? 0.75 : 1,
            }}>
              {t.recommended && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Recommended</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--navy)', marginBottom: 4, lineHeight: 1, letterSpacing: '-1.0px' }}>
                {t.price === 0 ? 'Free' : `$${t.price}`}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--mid)' }}>
                  {t.price === 0 ? ' forever' : '/mo'}
                </span>
              </div>
              {t.regularPrice && (
                <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 4 }}>
                  Founding Partner rate · regularly ${t.regularPrice}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', marginTop: 6 }}>{t.tagline}</div>
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', margin: '16px 0', paddingTop: 16 }}>
                {t.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ color: '#27AE60', flexShrink: 0, fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.5 }}>{t.footnote}</div>
              {isCurrent ? (
                <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1.5px solid var(--border)', color: 'var(--mid)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'var(--font-body)' }}>Current Plan</button>
              ) : t.price === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--mid)', textAlign: 'center', padding: '11px 0' }}>
                  Included with every claimed listing
                </div>
              ) : (
                /* No billing integration yet: this opens a draft the provider
                   still has to send. Say so on the button rather than implying
                   the upgrade is submitted. */
                <a href={upgradeMailto(t)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: t.recommended ? 'var(--teal)' : 'none', color: t.recommended ? '#fff' : 'var(--navy)', border: t.recommended ? 'none' : '1.5px solid var(--navy)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', lineHeight: 1.3 }}>
                  Email us to upgrade to {t.name}
                </a>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: -24, marginBottom: 40, lineHeight: 1.6 }}>
        Founding Partner rates are locked for 12 months. Outpatient-only programs receive 50% off all paid tiers.
        Every listing — free or paid — always shows your real phone number, website and SAMHSA-sourced services.
      </p>

      {/* FAQ */}
      <div className="card-hover" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 28 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 16, letterSpacing: '-0.5px' }}>Frequently Asked Questions</h3>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none', padding: '16px 0' }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)', marginBottom: 6 }}>{q}</div>
            <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.65 }}>{a}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 8, paddingTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: 'var(--mid)' }}>Questions about your plan?</div>
          <a href={`mailto:${PROVIDER_SUPPORT_EMAIL}`}
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
            {PROVIDER_SUPPORT_EMAIL} →
          </a>
        </div>
      </div>
    </div>
  )
}
