'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

interface Props {
  requesterName: string | null
  onClose: () => void
}

export default function AcceptAtCapModal({ requesterName, onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  const name = requesterName?.trim() || 'This person'

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

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '0 0 14px', textAlign: 'center' }}>
          {name} is waiting for you to sponsor them
        </h2>

        <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, margin: '0 0 18px', textAlign: 'center' }}>
          Free supports 1 active sponsee at a time, and you&apos;re at your limit. To accept this request, either:
        </p>

        <ul style={{ background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 12, padding: '14px 20px 14px 34px', margin: '0 0 20px', fontSize: 13, color: 'var(--dark)', lineHeight: 1.7 }}>
          <li><strong>Upgrade to Pro</strong> for unlimited sponsees, or</li>
          <li><strong>End your current sponsorship</strong> from your dashboard, then come back here.</li>
        </ul>

        <Link
          href="/upgrade"
          style={{ display: 'block', background: 'var(--teal)', color: '#fff', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: 10, letterSpacing: '-0.2px', textDecoration: 'none', textAlign: 'center' }}
        >
          See Pro pricing
        </Link>
        <Link
          href="/dashboard"
          style={{ display: 'block', background: '#fff', color: 'var(--navy)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: 14, textDecoration: 'none', textAlign: 'center' }}
        >
          Manage current sponsorship →
        </Link>

        <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
          {name === 'This person' ? 'Their' : `${name}'s`} request stays in your inbox until you decide.
        </p>
      </div>
    </div>,
    document.body
  )
}
