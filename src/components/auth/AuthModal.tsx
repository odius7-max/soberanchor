'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

type Step = 'login' | 'signup' | 'forgot' | 'forgot_sent' | 'onboarding'

interface Fellowship {
  id: string
  name: string
  abbreviation: string | null
  approach: string
}

const APPROACH_LABELS: Record<string, string> = {
  twelve_step: '12-Step Programs',
  secular: 'Secular / Non-12-Step',
  faith: 'Faith-Based',
  clinical: 'Clinical / Professional',
  harm_reduction: 'Harm Reduction',
}

const inputCls = "w-full rounded-xl outline-none text-dark"
const inputStyle = { border: '1.5px solid #E8E4DF', padding: '11px 14px', fontSize: '15px', fontFamily: 'inherit' }
const focusTeal = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#2A8A99')
const blurGray  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#E8E4DF')

export default function AuthModal() {
  const { isAuthModalOpen, authModalInitialStep, closeAuthModal, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sobrietyDate, setSobrietyDate] = useState('')
  const [fellowshipId, setFellowshipId] = useState('')
  const [fellowships, setFellowships] = useState<Fellowship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // When modal opens, start at the requested step
  useEffect(() => {
    if (isAuthModalOpen) setStep(authModalInitialStep)
  }, [isAuthModalOpen, authModalInitialStep])

  // Reset state when modal closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setTimeout(() => {
        setStep('login'); setEmail(''); setPassword(''); setConfirm('')
        setDisplayName(''); setSobrietyDate(''); setFellowshipId(''); setError(null); setSuccess(null)
      }, 300)
    }
  }, [isAuthModalOpen])

  // Load fellowships when reaching onboarding
  useEffect(() => {
    if (step === 'onboarding') {
      setTimeout(() => nameRef.current?.focus(), 100)
      createClient()
        .from('fellowships')
        .select('id, name, abbreviation, approach')
        .order('approach').order('name')
        .then(({ data }) => setFellowships((data as Fellowship[]) ?? []))
    }
  }, [step])

  async function afterAuth(userId: string) {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
    if (!prof?.display_name) {
      setStep('onboarding')
    } else {
      closeAuthModal()
      router.refresh()
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) { setError(err.message); return }
    if (data.user) await afterAuth(data.user.id)
  }

  async function handleSignup() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
    setLoading(false)
    if (err) { setError(err.message); return }
    // If email confirmation is required, user won't have a session yet
    if (data.user && !data.session) {
      setError(null)
      // Show a friendly message in the login step
      setStep('login')
      setPassword('')
      setSuccess('Account created! Check your email to confirm, then sign in.')
      return
    }
    if (data.user) await afterAuth(data.user.id)
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('forgot_sent')
  }

  async function handleOnboarding() {
    if (!displayName.trim()) { setError('Please enter a name or alias.'); return }
    setLoading(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please sign in again.'); setLoading(false); return }
    const { error: err } = await supabase.from('user_profiles').upsert({
      id: user.id,
      display_name: displayName.trim(),
      sobriety_date: sobrietyDate || null,
      primary_fellowship_id: fellowshipId || null,
    })
    if (err) { setError(err.message); setLoading(false); return }
    await refreshProfile()
    setLoading(false)
    closeAuthModal()
    router.refresh()
  }

  const grouped = fellowships.reduce<Record<string, Fellowship[]>>((acc, f) => {
    if (!acc[f.approach]) acc[f.approach] = []
    acc[f.approach].push(f)
    return acc
  }, {})

  const today = new Date().toISOString().slice(0, 10)

  if (!isAuthModalOpen) return null

  const HEADER: Record<Step, { title: string; sub: string }> = {
    login:       { title: 'Sign In',              sub: 'Welcome back to SoberAnchor.' },
    signup:      { title: 'Create Account',        sub: 'Your data is private, portable, and always yours. Delete anytime.' },
    forgot:      { title: 'Reset Password',        sub: 'We\'ll send a link to your email.' },
    forgot_sent: { title: 'Check Your Inbox',      sub: `Reset link sent to ${email}` },
    onboarding:  { title: 'Almost There!',         sub: 'Just a few quick things to set up your dashboard.' },
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (step === 'login' && e.target === backdropRef.current) closeAuthModal() }}
      onKeyDown={e => { if (step === 'login' && e.key === 'Escape') closeAuthModal() }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 420, background: '#fff', boxShadow: '0 24px 64px rgba(0,51,102,0.18)' }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg,#002244,#1a4a5e)', borderRadius: '16px 16px 0 0' }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚓</div>
          <div className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
            {HEADER[step].title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 }}>
            {HEADER[step].sub}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">

          {/* ── Login ── */}
          {step === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com" autoFocus
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              {success && <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{success}</p>}
              {error && <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full rounded-xl font-semibold text-white"
                style={{ padding: 13, fontSize: 15, background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
              <div className="flex justify-between" style={{ fontSize: 13 }}>
                <button onClick={() => { setError(null); setSuccess(null); setStep('signup') }}
                  style={{ background: 'none', border: 'none', color: '#2A8A99', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  Create account
                </button>
                <button onClick={() => { setError(null); setSuccess(null); setStep('forgot') }}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {/* ── Sign up ── */}
          {step === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoFocus
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder="••••••••"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              {error && <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button onClick={handleSignup} disabled={loading}
                className="w-full rounded-xl font-semibold text-white"
                style={{ padding: 13, fontSize: 15, background: '#2A8A99', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account…' : 'Create Account →'}
              </button>
              {/* Trust message — signup only */}
              <div style={{ borderTop: '1px solid #F0EDE8', paddingTop: 14, marginTop: 2 }}>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "I built SoberAnchor because I&apos;ve walked this path myself. Recovery work is deeply personal — your journal entries, step work, and check-ins are yours alone. My commitment to you: your sponsor only sees what you explicitly share, we will never sell your data or share your personal recovery information with anyone, and if you ever want to leave, everything you&apos;ve written can be deleted completely — no retention period, no backups kept."
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginTop: 6 }}>— Angel, co-founder</p>
              </div>
              <button onClick={() => { setError(null); setSuccess(null); setStep('login') }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, textAlign: 'center' }}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* ── Forgot password ── */}
          {step === 'forgot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgot()}
                  placeholder="you@example.com" autoFocus
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              {error && <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button onClick={handleForgot} disabled={loading}
                className="w-full rounded-xl font-semibold text-white"
                style={{ padding: 13, fontSize: 15, background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button onClick={() => { setError(null); setSuccess(null); setStep('login') }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, textAlign: 'center' }}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* ── Forgot sent ── */}
          {step === 'forgot_sent' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ fontSize: 15, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 16 }}>
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
              </p>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Check your spam folder if you don&apos;t see it within a minute.</p>
              <button onClick={() => { setError(null); setSuccess(null); setStep('login') }}
                style={{ background: 'none', border: 'none', color: '#2A8A99', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* ── Onboarding ── */}
          {step === 'onboarding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>
                  What should we call you? <span style={{ color: '#C0392B' }}>*</span>
                </label>
                <input ref={nameRef} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOnboarding()}
                  placeholder="First name or alias"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Only visible to you and your sponsor.</p>
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>
                  Sobriety Date <span className="font-normal text-mid">(optional)</span>
                </label>
                <input type="date" value={sobrietyDate} onChange={e => setSobrietyDate(e.target.value)}
                  max={today}
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>
                  Primary Fellowship <span className="font-normal text-mid">(optional)</span>
                </label>
                <select value={fellowshipId} onChange={e => setFellowshipId(e.target.value)}
                  className="w-full rounded-xl outline-none text-dark"
                  style={{ ...inputStyle, background: '#fff' }}>
                  <option value="">Select a fellowship…</option>
                  {Object.entries(grouped).map(([approach, list]) => (
                    <optgroup key={approach} label={APPROACH_LABELS[approach] ?? approach}>
                      {list.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.abbreviation ? `${f.abbreviation} — ` : ''}{f.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {error && <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button onClick={handleOnboarding} disabled={loading}
                className="w-full rounded-xl font-semibold text-white"
                style={{ padding: 13, fontSize: 15, background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 2 }}>
                {loading ? 'Saving…' : 'Go to My Dashboard →'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
