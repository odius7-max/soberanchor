'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

type Step = 'phone' | 'otp' | 'onboarding'

interface Fellowship {
  id: string
  name: string
  abbreviation: string | null
  approach: string
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function normalizePhone(formatted: string): string {
  const d = formatted.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return `+${d}`
}

const APPROACH_LABELS: Record<string, string> = {
  twelve_step: '12-Step Programs',
  secular: 'Secular / Non-12-Step',
  faith: 'Faith-Based',
  clinical: 'Clinical / Professional',
  harm_reduction: 'Harm Reduction',
}

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sobrietyDate, setSobrietyDate] = useState('')
  const [fellowshipId, setFellowshipId] = useState('')
  const [fellowships, setFellowships] = useState<Fellowship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const nameRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset on close
  useEffect(() => {
    if (!isAuthModalOpen) {
      setTimeout(() => {
        setStep('phone')
        setPhone('')
        setNormalizedPhone('')
        setOtp('')
        setDisplayName('')
        setSobrietyDate('')
        setFellowshipId('')
        setError(null)
        setCooldown(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }, 300)
    }
  }, [isAuthModalOpen])

  // Focus name on onboarding
  useEffect(() => {
    if (step === 'onboarding') {
      setTimeout(() => nameRef.current?.focus(), 100)
      const supabase2 = createClient()
      supabase2.from('fellowships').select('id, name, abbreviation, approach').order('approach').order('name').then(({ data }) => {
        setFellowships((data as Fellowship[]) ?? [])
      })
    }
  }, [step])

  // Cooldown timer
  function startCooldown() {
    setCooldown(60)
    timerRef.current = setInterval(() => {
      setCooldown(v => {
        if (v <= 1) { clearInterval(timerRef.current!); return 0 }
        return v - 1
      })
    }, 1000)
  }

  async function handleSendOtp() {
    const np = normalizePhone(phone)
    if (np.replace(/\D/g, '').length < 11) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: np })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setNormalizedPhone(np)
    setStep('otp')
    startCooldown()
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) { setError('Enter the 6-digit code.'); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp,
      type: 'sms',
    })
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }
    // Check if profile has a name (returning user vs new)
    if (data.user) {
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .single()
      setLoading(false)
      if (!prof?.display_name) {
        setStep('onboarding')
      } else {
        closeAuthModal()
        router.refresh()
      }
    } else {
      setLoading(false)
      closeAuthModal()
    }
  }

  async function handleOnboarding() {
    if (!displayName.trim()) { setError('Please enter a name or alias.'); return }
    setLoading(true)
    setError(null)
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

  // Group fellowships by approach
  const grouped = fellowships.reduce<Record<string, Fellowship[]>>((acc, f) => {
    const key = f.approach
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const today = new Date().toISOString().slice(0, 10)

  if (!isAuthModalOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (step === 'phone' && e.target === backdropRef.current) closeAuthModal() }}
      onKeyDown={e => { if (step === 'phone' && e.key === 'Escape') closeAuthModal() }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: '420px', background: '#fff', boxShadow: '0 24px 64px rgba(0,51,102,0.18)' }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg,#002244,#1a4a5e)', borderRadius: '16px 16px 0 0' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚓</div>
          <div className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>
            {step === 'phone' && 'Sign In to SoberAnchor'}
            {step === 'otp' && 'Enter Your Code'}
            {step === 'onboarding' && 'Almost There!'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginTop: '4px' }}>
            {step === 'phone' && 'Phone number only. No email, no password.'}
            {step === 'otp' && `Code sent to ${phone}`}
            {step === 'onboarding' && 'Just a few quick things to personalize your dashboard.'}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: '14px' }}>Phone Number</label>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid #E8E4DF' }}>
                  <div className="flex items-center gap-1.5 px-3 py-3 border-r border-[var(--border)] bg-warm-gray flex-shrink-0" style={{ fontSize: '14px' }}>
                    🇺🇸 <span className="font-medium text-mid">+1</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    placeholder="(555) 867-5309"
                    autoFocus
                    className="flex-1 px-3 py-3 outline-none text-dark bg-transparent"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
              {error && <p style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full rounded-xl font-semibold text-white transition-colors"
                style={{ padding: '13px', fontSize: '15px', background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending…' : 'Send Code →'}
              </button>
              <p className="text-center text-mid" style={{ fontSize: '12px' }}>
                US numbers only · No spam · Your privacy is protected
              </p>
            </div>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#888' }}>
                Enter the 6-digit code texted to <strong className="text-navy">{phone}</strong>
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                placeholder="000000"
                autoFocus
                className="w-full rounded-xl text-center font-bold text-navy outline-none"
                style={{ border: '2px solid #E8E4DF', padding: '16px', fontSize: '28px', letterSpacing: '8px', fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = '#2A8A99')}
                onBlur={e => (e.target.style.borderColor = '#E8E4DF')}
              />
              {error && <p style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full rounded-xl font-semibold text-white transition-colors"
                style={{ padding: '13px', fontSize: '15px', background: '#2A8A99', border: 'none', cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length < 6 ? 0.6 : 1 }}
              >
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <div className="flex items-center justify-between" style={{ fontSize: '13px' }}>
                <button onClick={() => setStep('phone')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>
                  ← Change number
                </button>
                <button
                  onClick={() => { setOtp(''); startCooldown(); supabase.auth.signInWithOtp({ phone: normalizedPhone }) }}
                  disabled={cooldown > 0}
                  style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#bbb' : '#2A8A99', cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          {/* ── Onboarding step ── */}
          {step === 'onboarding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: '14px' }}>
                  What should we call you? <span style={{ color: '#C0392B' }}>*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOnboarding()}
                  placeholder="First name or alias"
                  className="w-full rounded-xl outline-none text-dark"
                  style={{ border: '1.5px solid #E8E4DF', padding: '11px 14px', fontSize: '15px', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')}
                  onBlur={e => (e.target.style.borderColor = '#E8E4DF')}
                />
                <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Only visible to you and your sponsor.</p>
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: '14px' }}>
                  Sobriety Date <span className="font-normal text-mid">(optional)</span>
                </label>
                <input
                  type="date"
                  value={sobrietyDate}
                  onChange={e => setSobrietyDate(e.target.value)}
                  max={today}
                  className="w-full rounded-xl outline-none text-dark"
                  style={{ border: '1.5px solid #E8E4DF', padding: '11px 14px', fontSize: '14px', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')}
                  onBlur={e => (e.target.style.borderColor = '#E8E4DF')}
                />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5" style={{ fontSize: '14px' }}>
                  Primary Fellowship <span className="font-normal text-mid">(optional)</span>
                </label>
                <select
                  value={fellowshipId}
                  onChange={e => setFellowshipId(e.target.value)}
                  className="w-full rounded-xl outline-none text-dark"
                  style={{ border: '1.5px solid #E8E4DF', padding: '11px 14px', fontSize: '14px', fontFamily: 'inherit', background: '#fff' }}
                >
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
              {error && <p style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</p>}
              <button
                onClick={handleOnboarding}
                disabled={loading}
                className="w-full rounded-xl font-semibold text-white transition-colors"
                style={{ padding: '13px', fontSize: '15px', background: '#003366', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '2px' }}
              >
                {loading ? 'Saving…' : 'Go to My Dashboard →'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
