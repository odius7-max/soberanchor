'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { CONTINUATION_PARAM, classifyContinuation, validateContinuation, type ContinuationKind } from '@/lib/claim-continuation'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // ── Claim continuation (ODI-66) ──
  // Where this person was headed before we asked them to sign in. Held in
  // state rather than read from the URL on each render so that switching
  // between login and signup — and AuthQueryOpener rewriting the query to
  // strip ?auth= — cannot drop it mid-flow.
  const [continuation, setContinuation] = useState<string | null>(null)
  const [continuationKind, setContinuationKind] = useState<ContinuationKind | null>(null)
  const openedRef = useRef(false)
  const consumedRef = useRef(false)
  // A3: copy keys on the DESTINATION KIND, not on "a continuation exists".
  // Welcome validates too, and telling someone we'll claim "your facility"
  // when they never picked one is a promise the flow can't keep.
  const isClaimEntry = continuationKind === 'claim'
  const isProviderEntry = continuationKind !== null

  // Snapshot once per opening. Reading window.location directly (rather than
  // depending on useSearchParams) keeps this tied to the open edge only.
  useEffect(() => {
    if (!isAuthModalOpen) { openedRef.current = false; return }
    if (openedRef.current) return
    openedRef.current = true
    consumedRef.current = false
    const snapshot = validateContinuation(
      new URLSearchParams(window.location.search).get(CONTINUATION_PARAM)
    )
    setContinuation(snapshot)
    setContinuationKind(classifyContinuation(snapshot))
  }, [isAuthModalOpen])

  // Closing without authenticating clears the pending claim intent, so it
  // cannot silently attach itself to an unrelated sign-in later on.
  useEffect(() => {
    if (isAuthModalOpen || consumedRef.current || !continuation) return
    const params = new URLSearchParams(window.location.search)
    if (params.has(CONTINUATION_PARAM)) {
      params.delete(CONTINUATION_PARAM)
      const qs = params.toString()
      router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, { scroll: false })
    }
    setContinuation(null)
    setContinuationKind(null)
  }, [isAuthModalOpen, continuation, router])

  // When modal opens, start at the requested step.
  // useLayoutEffect (not useEffect) so the sync happens BEFORE the browser
  // paints the first render of the opened modal — otherwise the modal briefly
  // shows "Welcome back" (login) before flipping to "Create Account" (signup)
  // when AuthQueryOpener triggers open from ?auth=signup.
  useLayoutEffect(() => {
    if (isAuthModalOpen) setStep(authModalInitialStep)
  }, [isAuthModalOpen, authModalInitialStep])

  // Reset state when modal closes.
  // IMPORTANT: return a cleanup that clears the timer. Without this, the
  // timer scheduled on initial mount (when isAuthModalOpen is false) fires
  // 300ms later and stomps setStep('login') on top of whatever step the
  // modal was opened in. That's what caused /?auth=signup to briefly show
  // "Create Account" and then flip to "Welcome back".
  useEffect(() => {
    if (isAuthModalOpen) return
    const t = setTimeout(() => {
      setStep('login'); setEmail(''); setPassword(''); setConfirm('')
      setDisplayName(''); setSobrietyDate(''); setFellowshipId('')
      setError(null); setSuccess(null); setShowPassword(false); setShowConfirm(false)
    }, 300)
    return () => clearTimeout(t)
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
    // Provider arriving from a claim link: resume that exact claim. Recovery
    // onboarding is not part of a provider's journey, so it is skipped here —
    // they can still complete it later from the member side.
    //
    // refresh() before push() so the server re-renders with the session cookie
    // the client just wrote; otherwise the auth-gated claim page can render
    // against a stale, signed-out view and bounce straight back to the modal.
    if (continuation) {
      consumedRef.current = true
      closeAuthModal()
      router.refresh()
      router.push(continuation)
      return
    }

    const { data: prof } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
    if (!prof?.display_name) {
      setStep('onboarding')
    } else {
      closeAuthModal()
      // Send users to their member center after sign-in rather than
      // leaving them on whatever page they signed in from.
      router.push('/dashboard')
    }
  }

  function friendlyAuthError(msg: string): string {
    if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
      return 'Incorrect email or password. Please try again.'
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
      return 'Please check your email to confirm your account before signing in.'
    }
    if (msg.toLowerCase().includes('too many requests') || msg.toLowerCase().includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    return 'Something went wrong. Please try again.'
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) { setError(friendlyAuthError(err.message)); return }
    if (data.user) await afterAuth(data.user.id)
  }

  async function handleSignup() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(null)
    // Confirmation links land on the ungated /auth/continue, never on
    // auth-gated /dashboard — a confirmation arrives before a session exists,
    // so the gate used to fire first and discard the pending claim. The
    // validated continuation rides along in the link itself, so opening the
    // email in a fresh browser still knows where the person was headed.
    const confirmBase = `${window.location.origin}/auth/continue`
    const emailRedirectTo = continuation
      ? `${confirmBase}?${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`
      : confirmBase

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo },
    })
    setLoading(false)
    if (err) { setError(friendlyAuthError(err.message)); return }
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
    router.push('/dashboard')
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

  // A provider who clicked "Claim this listing" is not on a recovery journey —
  // the same modal, read in that context, should say so.
  if (isClaimEntry) {
    HEADER.login  = { title: 'Sign in to claim your facility', sub: 'Use the account that manages this listing.' }
    HEADER.signup = { title: 'Create your provider account',   sub: 'One account manages all of your locations.' }
  } else if (isProviderEntry) {
    // Provider context WITHOUT a selected facility (welcome). Generic
    // provider-auth copy — it must not imply a listing was already chosen.
    HEADER.login  = { title: 'Sign in to SoberAnchor',        sub: 'Use the account that manages your listings.' }
    HEADER.signup = { title: 'Create your provider account',  sub: 'Set up your account, then find your facility.' }
  }

  // Claim-entry login/signup get an explicit way out. Elsewhere the modal keeps
  // its existing dismissal behaviour.
  const showClose = isProviderEntry && (step === 'login' || step === 'signup')

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}
      onMouseDown={e => { if ((step === 'login' || showClose) && e.target === backdropRef.current) closeAuthModal() }}
      onKeyDown={e => { if ((step === 'login' || showClose) && e.key === 'Escape') closeAuthModal() }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 420, background: '#fff', boxShadow: '0 24px 64px rgba(0,51,102,0.18)', flexShrink: 0 }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg,#002244,#1a4a5e)', borderRadius: '16px 16px 0 0', position: 'relative' }}
        >
          {showClose && (
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Close"
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 44, height: 44,            // 44px touch target (CLAUDE.md §6)
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)', fontSize: 26, lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >
              ×
            </button>
          )}
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
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com" autoFocus
                  autoComplete="email"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray}
                />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={inputCls}
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={focusTeal} onBlur={blurGray}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#888', opacity: 0.6, zIndex: 2,
                      // Min 44px touch target baked in (the full height of the input)
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {success && (
                <p role="status" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500, margin: 0 }}>
                  {success}
                </p>
              )}
              {error && (
                <p role="alert" style={{ fontSize: 13, color: '#C0392B', fontWeight: 600, margin: 0, padding: '10px 12px', background: 'rgba(192,57,43,0.06)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.18)' }}>
                  {error}
                </p>
              )}
              <button onClick={handleLogin} disabled={loading}
                className="w-full rounded-xl font-semibold text-white"
                style={{ padding: 13, fontSize: 15, background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
              <div className="flex justify-between" style={{ fontSize: 13 }}>
                <button onClick={() => { setError(null); setSuccess(null); setShowPassword(false); setStep('signup') }}
                  style={{ background: 'none', border: 'none', color: '#2A8A99', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  Create account
                </button>
                <button onClick={() => { setError(null); setSuccess(null); setShowPassword(false); setStep('forgot') }}
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
                  autoComplete="email"
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurGray} />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={inputCls} style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={focusTeal} onBlur={blurGray}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#888', opacity: 0.6, zIndex: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: 14 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputCls} style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={focusTeal} onBlur={blurGray}
                  />
                  <button
                    type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#888', opacity: 0.6, zIndex: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <p role="alert" style={{ fontSize: 13, color: '#C0392B', fontWeight: 600, margin: 0, padding: '10px 12px', background: 'rgba(192,57,43,0.06)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.18)' }}>
                  {error}
                </p>
              )}
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
