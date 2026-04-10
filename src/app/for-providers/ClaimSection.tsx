'use client'

import { useState } from 'react'

const FACILITY_TYPES = [
  'Treatment Center',
  'Sober Living',
  'Therapist / Counselor',
  'Outpatient Program',
  'Sober Venue',
  'Other',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  color: 'var(--dark)',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function ClaimSection() {
  const [form, setForm] = useState({
    facilityName: '',
    contactName: '',
    email: '',
    phone: '',
    facilityType: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.facilityName.trim() || !form.contactName.trim() || !form.email.trim()) {
      setError('Facility name, contact name, and email are required.')
      return
    }
    setSubmitting(true)
    setError(null)

    // Compose mailto as a reliable no-backend fallback
    const body = [
      `Facility Name: ${form.facilityName}`,
      `Contact Name: ${form.contactName}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || '—'}`,
      `Facility Type: ${form.facilityType || '—'}`,
    ].join('\n')

    window.location.href =
      `mailto:providers@soberanchor.com` +
      `?subject=${encodeURIComponent(`Listing claim request — ${form.facilityName}`)}` +
      `&body=${encodeURIComponent(body)}`

    // Show success regardless — mailto may silently fail on some setups
    setTimeout(() => { setSubmitting(false); setSubmitted(true) }, 400)
  }

  if (submitted) {
    return (
      <section id="claim" className="py-[80px] px-6 bg-off-white">
        <div className="max-w-[480px] mx-auto text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2
            className="text-[28px] font-semibold mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
          >
            Request received
          </h2>
          <p className="text-[15px] text-mid leading-[1.7] mb-6">
            We&apos;ll reach out to <strong style={{ color: 'var(--dark)' }}>{form.email}</strong> within one business day to get your listing live.
          </p>
          <p className="text-[13px] text-mid">
            Questions?{' '}
            <a href="mailto:providers@soberanchor.com" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
              providers@soberanchor.com
            </a>
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="claim" className="py-[80px] px-6 bg-off-white">
      <div className="max-w-[520px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3 text-center">Get Started — Free</p>
        <h2
          className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-3 text-center"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.75px' }}
        >
          Claim your free listing
        </h2>
        <p className="text-[15px] text-mid leading-[1.7] mb-8 text-center">
          Fill in the form and we&apos;ll have your listing live within one business day. No contracts, no credit card.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[16px] border border-border p-8"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Facility Name *">
              <input
                style={inputStyle}
                value={form.facilityName}
                onChange={set('facilityName')}
                placeholder="e.g. Serenity Ridge Treatment Center"
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>

            <Field label="Your Name *">
              <input
                style={inputStyle}
                value={form.contactName}
                onChange={set('contactName')}
                placeholder="Jane Smith"
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>

            <Field label="Email Address *">
              <input
                type="email"
                style={inputStyle}
                value={form.email}
                onChange={set('email')}
                placeholder="jane@yourfacility.com"
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>

            <Field label="Phone Number">
              <input
                type="tel"
                style={inputStyle}
                value={form.phone}
                onChange={set('phone')}
                placeholder="(555) 555-5555"
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>

            <Field label="Facility Type">
              <select
                style={inputStyle}
                value={form.facilityType}
                onChange={set('facilityType')}
              >
                <option value="">Select type…</option>
                {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            {error && <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 500, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: 'var(--teal)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '13px',
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'var(--font-body)',
                marginTop: 4,
              }}
            >
              {submitting ? 'Sending…' : 'Claim My Listing →'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--mid)', textAlign: 'center', margin: 0 }}>
              No contracts · No credit card · We respond within 1 business day
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
