'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'phone' | 'otp'

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function normalizePhone(display: string) {
  const digits = display.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : null
}

export default function ProviderLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  async function sendOtp() {
    const e164 = normalizePhone(phone)
    if (!e164) { setError('Enter a valid 10-digit phone number.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('otp')
    let t = 60
    setCooldown(t)
    const iv = setInterval(() => { t--; setCooldown(t); if (t <= 0) clearInterval(iv) }, 1000)
  }

  async function verifyOtp() {
    const e164 = normalizePhone(phone)
    if (!e164 || otp.length < 6) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' })
    if (err) { setLoading(false); setError('Invalid code. Please try again.'); return }

    // Check for provider account
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); setError('Authentication failed.'); return }

    const { data: providerAccount } = await supabase
      .from('provider_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    setLoading(false)
    if (providerAccount) {
      router.push('/providers/dashboard')
    } else {
      router.push('/providers/claim')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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
        {step === 'phone' ? (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: 6 }}>Provider Sign In</h1>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 28, lineHeight: 1.5 }}>Enter your phone number to receive a verification code.</p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>Phone Number</label>
            <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
              <span style={{ padding: '11px 14px', background: 'var(--warm-gray)', fontSize: 14, color: 'var(--dark)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>🇺🇸 +1</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                placeholder="(555) 867-5309"
                style={{ flex: 1, padding: '11px 14px', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-body)' }}
                autoFocus
              />
            </div>

            {error && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button onClick={sendOtp} disabled={loading}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {loading ? 'Sending…' : 'Send Verification Code'}
            </button>

            <p style={{ fontSize: 13, color: 'var(--mid)', textAlign: 'center', marginTop: 20 }}>
              Don&apos;t have an account?{' '}
              <Link href="/providers/claim" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Claim your listing →</Link>
            </p>
          </>
        ) : (
          <>
            <button onClick={() => setStep('phone')} style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>← Back</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: 6 }}>Enter Code</h1>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 28, lineHeight: 1.5 }}>
              We texted a 6-digit code to{' '}
              <strong style={{ color: 'var(--dark)' }}>+1 {phone}</strong>
            </p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              placeholder="123456"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 20, fontFamily: 'monospace', letterSpacing: '0.15em', textAlign: 'center', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
              autoFocus
            />

            {error && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button onClick={verifyOtp} disabled={loading || otp.length < 6}
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length < 6 ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--mid)' }}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : (
                <button onClick={sendOtp} style={{ color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Resend code</button>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
