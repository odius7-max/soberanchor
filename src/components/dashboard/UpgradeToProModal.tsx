'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

interface Props {
  onClose: () => void
}

const FEATURES = [
  'Unlimited sponsees',
  'Custom task templates saved to your library',
  'Scheduled due dates for tasks',
  'Mood trend analytics and full check-in history',
  'Bulk invite and onboarding tools',
  'Priority support from the SoberAnchor team',
]

export default function UpgradeToProModal({ onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,51,102,0.18)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #2A8A99, #1a6b78)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(42,138,153,0.3)' }}>
            <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
              <path d="M32 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="#fff" strokeWidth="2.5"/>
              <path d="M32 22v28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 42c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 34h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '0 0 8px', textAlign: 'center' }}>
          Upgrade to Pro
        </h2>
        <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, margin: '0 0 24px', textAlign: 'center' }}>
          You&apos;ve reached your free sponsee limit. Pro unlocks unlimited sponsees plus power tools &mdash; $7/month or $59/year.
        </p>

        <div style={{ background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(39,174,96,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 2.5" stroke="#27AE60" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        <Link
          href="/upgrade"
          style={{ display: 'block', background: 'var(--teal)', color: '#fff', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: 10, letterSpacing: '-0.2px', textDecoration: 'none', textAlign: 'center' }}
        >
          See pricing
        </Link>
        <button
          onClick={onClose}
          style={{ width: '100%', background: 'none', border: 'none', color: 'var(--mid)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '6px', marginBottom: 20 }}>
          Maybe later
        </button>

        <div style={{ borderLeft: '3px solid var(--teal)', background: 'rgba(42,138,153,0.04)', borderRadius: '0 8px 8px 0', padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.65, margin: 0 }}>
            SoberAnchor is built by people in recovery, for people in recovery. Your subscription keeps the platform running and funds donations to recovery community organizations. No investors. No ads. Just us.
            {' '}<span style={{ fontWeight: 600, color: 'var(--navy)' }}>— Angel &amp; Travis, co-founders</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
