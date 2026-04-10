'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateFacility } from '@/app/admin/actions'

const FACILITY_TYPES = [
  { value: 'treatment', label: 'Treatment Center' },
  { value: 'sober_living', label: 'Sober Living Home' },
  { value: 'therapist', label: 'Therapist / Counselor' },
  { value: 'venue', label: 'Sober Venue' },
  { value: 'outpatient', label: 'Outpatient Program' },
  { value: 'telehealth', label: 'Telehealth' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none',
  boxSizing: 'border-box', color: 'var(--dark)',
}

export default function AdminFacilityEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: '', description: '', phone: '', email: '', website: '',
    address_line1: '', city: '', state: '', zip: '',
    facility_type: 'treatment', listing_tier: 'basic',
    is_verified: false, is_featured: false, is_claimed: false,
    accepts_insurance: false, accepts_private_pay: false,
    samhsa_id: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single()
      if (err || !data) { setError('Facility not found.'); setLoading(false); return }
      setForm({
        name: data.name ?? '',
        description: data.description ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        address_line1: data.address_line1 ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        zip: data.zip ?? '',
        facility_type: data.facility_type ?? 'treatment',
        listing_tier: data.listing_tier ?? 'basic',
        is_verified: data.is_verified ?? false,
        is_featured: data.is_featured ?? false,
        is_claimed: data.is_claimed ?? false,
        accepts_insurance: data.accepts_insurance ?? false,
        accepts_private_pay: data.accepts_private_pay ?? false,
        samhsa_id: data.samhsa_id ?? '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateFacility(id, form)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>{label}</label>
      <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
    </div>
  )

  const checkField = (label: string, key: keyof typeof form) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--dark)' }}>
      <input type="checkbox" checked={form[key] as boolean} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
        style={{ width: 16, height: 16, cursor: 'pointer' }} />
      {label}
    </label>
  )

  if (loading) return <div style={{ padding: 48, color: 'var(--mid)' }}>Loading…</div>
  if (error && !form.name) return <div style={{ padding: 48, color: '#C0392B' }}>{error}</div>

  return (
    <div style={{ padding: '40px 48px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/facilities" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>← All Facilities</Link>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>Edit Facility</h1>
      </div>

      {error && <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#721C24' }}>{error}</div>}
      {saved && <div style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#27AE60', fontWeight: 600 }}>Saved successfully.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Basic Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {field('Facility Name', 'name')}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Phone', 'phone', 'tel')}
                {field('Email', 'email', 'email')}
              </div>
              {field('Website', 'website')}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Address</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {field('Street Address', 'address_line1')}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                {field('City', 'city')}
                {field('State', 'state')}
                {field('ZIP', 'zip')}
              </div>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Facility Type</label>
                <select value={form.facility_type} onChange={e => setForm(f => ({ ...f, facility_type: e.target.value }))} style={inputStyle}>
                  {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>Listing Tier</label>
                <select value={form.listing_tier} onChange={e => setForm(f => ({ ...f, listing_tier: e.target.value }))} style={inputStyle}>
                  <option value="basic">Basic (Free)</option>
                  <option value="enhanced">Enhanced ($149/mo)</option>
                  <option value="premium">Premium ($399/mo)</option>
                </select>
              </div>
              {field('SAMHSA ID', 'samhsa_id')}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Flags</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checkField('Claimed', 'is_claimed')}
              {checkField('Verified', 'is_verified')}
              {checkField('Featured', 'is_featured')}
              {checkField('Accepts Insurance', 'accepts_insurance')}
              {checkField('Accepts Private Pay', 'accepts_private_pay')}
            </div>
          </div>

          <button onClick={handleSave} disabled={isPending}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
            {isPending ? 'Saving…' : 'Save Changes →'}
          </button>
        </div>
      </div>
    </div>
  )
}
