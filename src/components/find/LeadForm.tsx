'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { facilityId: string; facilityName: string }

export default function LeadForm({ facilityId, facilityName }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Honeypot: bots fill hidden fields; humans never see this one.
  const [company, setCompany] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    phone: '',
    insurance_provider: '',
    seeking: 'unsure',
    who_for: 'self',
  })

  // Basic rate limiting: a short client-side cooldown between submissions,
  // keyed per facility (mirrors the smart-search throttle intent). The leads
  // RLS allows anon inserts, so this is a friction guard, not the security
  // boundary.
  const COOLDOWN_MS = 20_000
  function throttleKey() { return `sa_lead_ts_${facilityId}` }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Silently succeed for bots that trip the honeypot — never insert.
    if (company.trim()) { setSubmitted(true); return }
    if (!form.first_name.trim() || !form.phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }
    try {
      const last = Number(localStorage.getItem(throttleKey()) ?? 0)
      if (Date.now() - last < COOLDOWN_MS) {
        setError('You just sent a request — please wait a moment before sending another.')
        return
      }
    } catch { /* localStorage unavailable — proceed */ }

    setSubmitting(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('leads').insert({
      facility_id: facilityId,
      first_name: form.first_name.trim(),
      phone: form.phone.trim(),
      insurance_provider: form.insurance_provider || null,
      seeking: form.seeking,
      who_for: form.who_for,
      status: 'new',
    })
    setSubmitting(false)
    if (err) { setError('Something went wrong. Please try again.'); return }
    try { localStorage.setItem(throttleKey(), String(Date.now())) } catch { /* ignore */ }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="bg-warm-gray rounded-[14px] p-7">
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>✅</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.5px', textAlign: 'center', marginBottom: 8 }} className="text-navy">Request Sent</h3>
        <p className="text-mid text-sm text-center leading-relaxed">
          Your request went directly to {facilityName}. They&rsquo;ll be in touch shortly. If you need immediate help, call the SAMHSA National Helpline:{' '}
          <a href="tel:18006624357" className="text-teal font-semibold hover:underline">1-800-662-4357</a> (free, 24/7).
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-warm-gray rounded-[14px] p-7">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.5px', marginBottom: 4 }} className="text-navy font-semibold">
        Request a callback
      </h3>
      <p className="text-sm text-mid mb-5">Request information about this facility. Free and confidential.</p>

      {/* Honeypot — hidden from users; bots that fill it are silently dropped. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={e => setCompany(e.target.value)}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <label className="block text-[13px] font-semibold text-navy mb-1.5">First Name</label>
      <input
        type="text"
        value={form.first_name}
        onChange={e => setForm(f => ({...f, first_name: e.target.value}))}
        placeholder="Your first name"
        className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
        required
      />

      <label className="block text-[13px] font-semibold text-navy mb-1.5">Phone Number</label>
      <input
        type="tel"
        value={form.phone}
        onChange={e => setForm(f => ({...f, phone: e.target.value}))}
        placeholder="(555) 555-5555"
        className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
        required
      />

      <label className="block text-[13px] font-semibold text-navy mb-1.5">Insurance Provider</label>
      <select
        value={form.insurance_provider}
        onChange={e => setForm(f => ({...f, insurance_provider: e.target.value}))}
        className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
      >
        <option value="">Select your insurance</option>
        <option>Blue Cross / Blue Shield</option>
        <option>Aetna</option>
        <option>Cigna</option>
        <option>United Healthcare</option>
        <option>Kaiser</option>
        <option>Medi-Cal / Medicaid</option>
        <option>Medicare</option>
        <option>No Insurance / Self-Pay</option>
        <option>Other</option>
      </select>

      <label className="block text-[13px] font-semibold text-navy mb-1.5">What are you looking for?</label>
      <select
        value={form.seeking}
        onChange={e => setForm(f => ({...f, seeking: e.target.value}))}
        className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
      >
        <option value="inpatient">Inpatient / Residential</option>
        <option value="outpatient">Outpatient (IOP / OP)</option>
        <option value="detox">Detox</option>
        <option value="sober_living">Sober Living</option>
        <option value="therapy">Therapy / Counseling</option>
        <option value="unsure">Not sure yet</option>
      </select>

      <label className="block text-[13px] font-semibold text-navy mb-1.5">Who is this for?</label>
      <select
        value={form.who_for}
        onChange={e => setForm(f => ({...f, who_for: e.target.value}))}
        className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
      >
        <option value="self">Myself</option>
        <option value="family">A family member</option>
        <option value="friend">A friend</option>
        <option value="professional">A client / patient</option>
      </select>

      {error && <p className="text-[13px] mb-3" style={{ color: '#C0392B' }}>{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full bg-teal text-white font-semibold text-base py-3.5 rounded-xl hover:opacity-90 transition-opacity mt-1"
        style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--font-body)' }}>
        {submitting ? 'Sending…' : 'Request Information →'}
      </button>
      <p className="text-xs text-mid text-center mt-2">🔒 Your request goes only to this facility. SoberAnchor never sells or shares your information, and facilities never pay per referral.</p>
    </form>
  )
}
