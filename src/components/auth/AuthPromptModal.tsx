'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/context/AuthContext'

export default function AuthPromptModal() {
  const { authPrompt, closeAuthPrompt, openAuthModal } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!authPrompt) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeAuthPrompt() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [authPrompt, closeAuthPrompt])

  if (!authPrompt || !mounted) return null

  const modal = (
    <div
      onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) closeAuthPrompt() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: '36px 28px 28px',
          maxWidth: 400, width: '100%',
          boxShadow: '0 24px 64px rgba(0,51,102,0.18)',
          position: 'relative', textAlign: 'center',
        }}
      >
        {/* Close */}
        <button
          onClick={closeAuthPrompt}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 18, lineHeight: 1, padding: 4 }}
        >✕</button>

        {/* Icon */}
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚓</div>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          color: 'var(--navy)', margin: '0 0 10px', letterSpacing: '-0.3px', lineHeight: 1.2,
        }}>
          {authPrompt.title}
        </h2>

        {/* Body */}
        <p style={{
          fontSize: 15, color: 'var(--mid)', lineHeight: 1.6,
          margin: '0 0 28px',
        }}>
          {authPrompt.body}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { closeAuthPrompt(); openAuthModal('signup') }}
            style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'var(--teal)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              letterSpacing: '0.1px',
            }}
          >
            Create Account →
          </button>
          <button
            onClick={() => { closeAuthPrompt(); openAuthModal('login') }}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: '#fff', color: 'var(--navy)',
              border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Sign In
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 16, lineHeight: 1.5 }}>
          Free forever · No credit card · Delete anytime
        </p>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
