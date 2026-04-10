'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [isProvider, setIsProvider] = useState(false)

  // Supabase puts the recovery token in the URL hash.
  // onAuthStateChange fires with event=PASSWORD_RECOVERY once the client
  // parses the hash and establishes a short-lived session.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        // Detect user type to redirect correctly after reset
        if (session?.user) {
          const { data } = await supabase
            .from('provider_accounts')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle()
          setIsProvider(!!data)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password) { setError('Enter a new password.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push(isProvider ? '/providers/dashboard' : '/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid var(--border)', borderRadius: 8,
    fontSize: 14, fontFamily: 'var(--font-body)',
    background: '#fff', outline: 'none', boxSizing: 'border-box', color: 'var(--dark)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, textDecoration: 'none' }}>
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <path d="M32 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="var(--navy)" strokeWidth="2.5"/>
          <path d="M32 20v32" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M20 44c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M24 36h16" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>SoberAnchor</span>
      </Link>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: 8 }}>
          Set New Password
        </h1>

        {!ready ? (
          <div>
            <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 20 }}>
              Verifying your reset link…
            </p>
            <p style={{ fontSize: 13, color: 'var(--mid)' }}>
              If nothing happens, the link may have expired.{' '}
              <Link href="/providers/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                Request a new one →
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoFocus
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            {error && <p style={{ color: '#C0392B', fontSize: 13, fontWeight: 500 }}>{error}</p>}
            <button
              onClick={handleReset}
              disabled={loading}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)', marginTop: 4 }}
            >
              {loading ? 'Saving…' : 'Set New Password →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
