'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function ClaimSection() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  async function sendOtp() {
    const e164 = normalizePhone(phone)
    if (!e164) { setError('Enter a valid 10-digit US phone number.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('otp')
    let t = 60; setCooldown(t)
    const iv = setInterval(() => { t--; setCooldown(t); if (t <= 0) clearInterval(iv) }, 1000)
  }

  async function verifyOtp() {
    const e164 = normalizePhone(phone)
    if (!e164 || otp.length < 6) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' })
    if (err) { setLoading(false); setError('Invalid code. Please try again.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); setError('Authentication failed.'); return }
    const { data: existing } = await supabase.from('provider_accounts').select('id').eq('auth_user_id', user.id).maybeSingle()
    setLoading(false)
    router.push(existing ? '/providers/dashboard' : '/providers/claim')
  }

  return (
    <section id="claim" className="py-[80px] px-6 bg-off-white">
      <div className="max-w-[480px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3 text-center">Get Started</p>
        <h2
          className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-3 text-center"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.75px' }}
        >
          Claim your free listing
        </h2>
        <p className="text-[15px] text-mid leading-[1.7] mb-8 text-center">
          Enter your phone number to verify your identity and claim or create your facility listing.
        </p>

        <div className="bg-white rounded-[16px] border border-border p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {step === 'phone' ? (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
                <span style={{ padding: '11px 14px', background: 'var(--warm-gray)', fontSize: 14, color: 'var(--dark)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
                  🇺🇸 +1
                </span>
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
              <button
                onClick={sendOtp}
                disabled={loading}
                style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-body)' }}
              >
                {loading ? 'Sending…' : 'Send Verification Code'}
              </button>
              <p style={{ fontSize: 13, color: 'var(--mid)', textAlign: 'center', marginTop: 16 }}>
                Already have an account?{' '}
                <a href="/providers/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('phone')}
                style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}
              >
                ← Back
              </button>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                Verification Code
              </label>
              <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.5 }}>
                We texted a 6-digit code to <strong style={{ color: 'var(--dark)' }}>+1 {phone}</strong>
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="123456"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 20, fontFamily: 'monospace', letterSpacing: '0.15em', textAlign: 'center', outline: 'none', marginBottom: 16, boxSizing: 'border-box' as const }}
                autoFocus
              />
              {error && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length < 6 ? 0.7 : 1, fontFamily: 'var(--font-body)' }}
              >
                {loading ? 'Verifying…' : 'Verify & Continue →'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--mid)' }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : (
                  <button onClick={sendOtp} style={{ color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                    Resend code
                  </button>
                )}
              </p>
            </>
          )}
        </div>

        <p className="text-[13px] text-mid text-center mt-5">
          No contracts · No hidden fees · Cancel upgrades anytime
        </p>
      </div>
    </section>
  )
}
