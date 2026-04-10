'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'login' | 'signup' | 'forgot' | 'forgot_sent'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-body)',
  background: '#fff', outline: 'none', boxSizing: 'border-box', color: 'var(--dark)',
}
const focusTeal = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--teal)')
const blurGray  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--border)')

export default function ProviderLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function go(s: Step) { setError(null); setStep(s) }

  async function afterLogin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Authentication failed.'); setLoading(false); return }
    const { data: existing } = await supabase
      .from('provider_accounts').select('id').eq('auth_user_id', user.id).maybeSingle()
    router.push(existing ? '/providers/dashboard' : '/providers/claim')
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) { setError(err.message); setLoading(false); return }
    await afterLogin()
  }

  async function handleSignup() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user && !data.session) {
      // Email confirmation required
      setLoading(false)
      go('login')
      setError('Account created! Check your email to confirm, then sign in.')
      return
    }
    await afterLogin()
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('forgot_sent')
  }

  const TITLES: Record<Step, string> = {
    login: 'Provider Sign In',
    signup: 'Create Provider Account',
    forgot: 'Reset Password',
    forgot_sent: 'Check Your Inbox',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, textDecoration: 'none' }}>
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <path d="M32 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="var(--navy)" strokeWidth="2.5"/>
          <path d="M32 20v32" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M20 44c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M24 36h16" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>SoberAnchor</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', background: 'rgba(42,138,153,0.1)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 20, padding: '2px 10px' }}>Provider Portal</span>
      </Link>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420 }}>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: 24 }}>
          {TITLES[step]}
        </h1>

        {/* ── Login ── */}
        {step === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@yourfacility.com" autoFocus
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            {error && <p style={{ color: '#C0392B', fontSize: 13, fontWeight: 500 }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
              <button onClick={() => go('signup')}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Create account
              </button>
              <button onClick={() => go('forgot')}
                style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Forgot password?
              </button>
            </div>
          </div>
        )}

        {/* ── Sign up ── */}
        {step === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourfacility.com" autoFocus
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                placeholder="••••••••"
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            {error && <p style={{ color: '#C0392B', fontSize: 13, fontWeight: 500 }}>{error}</p>}
            <button onClick={handleSignup} disabled={loading}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
            <button onClick={() => go('login')}
              style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: 13, textAlign: 'center' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot password ── */}
        {step === 'forgot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 4, lineHeight: 1.5 }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleForgot()}
                placeholder="you@yourfacility.com" autoFocus
                style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
            </div>
            {error && <p style={{ color: '#C0392B', fontSize: 13, fontWeight: 500 }}>{error}</p>}
            <button onClick={handleForgot} disabled={loading}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button onClick={() => go('login')}
              style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: 13, textAlign: 'center' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot sent ── */}
        {step === 'forgot_sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <p style={{ fontSize: 15, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 12 }}>
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
            </p>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20 }}>
              Check your spam folder if you don&apos;t see it within a minute.
            </p>
            <button onClick={() => go('login')}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              ← Back to sign in
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
