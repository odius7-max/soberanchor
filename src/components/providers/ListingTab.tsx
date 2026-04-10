'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface FacilityData {
  id: string
  name: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  facility_type: string
  listing_tier: string
  is_verified: boolean
  is_claimed: boolean
  is_featured: boolean
  avg_rating: number
  review_count: number
}

interface Props {
  facility: FacilityData
  amenities: string[]
  insurance: string[]
  onGoToPlan: () => void
}

const FACILITY_TYPE_LABELS: Record<string,string> = {
  treatment: 'Treatment Center',
  sober_living: 'Sober Living',
  therapist: 'Therapist / Counselor',
  venue: 'Sober Venue',
  outpatient: 'Outpatient',
  telehealth: 'Telehealth',
}

function FieldInput({ label, value, disabled, onChange, multiline, type = 'text' }: {
  label: string; value: string; disabled: boolean; onChange: (v: string) => void; multiline?: boolean; type?: string
}) {
  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    border: `1.5px solid ${disabled ? 'var(--border)' : '#2A8A99'}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    background: disabled ? 'var(--warm-gray)' : '#fff',
    outline: 'none',
    resize: 'vertical' as const,
    color: 'var(--dark)',
    boxSizing: 'border-box' as const,
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>{label}</label>
      {multiline
        ? <textarea rows={4} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} style={inputStyle} />
        : <input type={type} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </div>
  )
}

export default function ListingTab({ facility, amenities: initAmenities, insurance: initInsurance, onGoToPlan }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: facility.name ?? '',
    description: facility.description ?? '',
    phone: facility.phone ?? '',
    email: facility.email ?? '',
    website: facility.website ?? '',
    address_line1: facility.address_line1 ?? '',
    city: facility.city ?? '',
    state: facility.state ?? '',
    zip: facility.zip ?? '',
  })

  const [amenities, setAmenities] = useState<string[]>(initAmenities)
  const [insurance, setInsurance] = useState<string[]>(initInsurance)
  const [newAmenity, setNewAmenity] = useState('')
  const [newInsurance, setNewInsurance] = useState('')

  function startEdit() {
    setForm({
      name: facility.name ?? '',
      description: facility.description ?? '',
      phone: facility.phone ?? '',
      email: facility.email ?? '',
      website: facility.website ?? '',
      address_line1: facility.address_line1 ?? '',
      city: facility.city ?? '',
      state: facility.state ?? '',
      zip: facility.zip ?? '',
    })
    setAmenities(initAmenities)
    setInsurance(initInsurance)
    setEditing(true)
  }

  function cancelEdit() { setEditing(false); setNewAmenity(''); setNewInsurance('') }

  async function saveEdit() {
    setSaving(true)
    const supabase = createClient()

    // Update main facility fields
    await supabase.from('facilities').update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      address_line1: form.address_line1.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', facility.id)

    // Replace amenities
    await supabase.from('facility_amenities').delete().eq('facility_id', facility.id)
    if (amenities.length > 0) {
      await supabase.from('facility_amenities').insert(amenities.map(a => ({ facility_id: facility.id, amenity_name: a })))
    }

    // Replace insurance
    await supabase.from('facility_insurance').delete().eq('facility_id', facility.id)
    if (insurance.length > 0) {
      await supabase.from('facility_insurance').insert(insurance.map(i => ({ facility_id: facility.id, insurance_name: i })))
    }

    setSaving(false)
    setEditing(false)
    setNewAmenity('')
    setNewInsurance('')
    router.refresh()
  }

  const display = editing ? form : {
    name: facility.name ?? '',
    description: facility.description ?? '',
    phone: facility.phone ?? '',
    email: facility.email ?? '',
    website: facility.website ?? '',
    address_line1: facility.address_line1 ?? '',
    city: facility.city ?? '',
    state: facility.state ?? '',
    zip: facility.zip ?? '',
  }

  const stars = Math.round(facility.avg_rating ?? 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>My Listing</h1>
          <p style={{ color: 'var(--mid)', fontSize: 15 }}>Edit how your facility appears in the SoberAnchor directory.</p>
        </div>
        {!editing ? (
          <button onClick={startEdit}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            ✏️ Edit Listing
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelEdit}
              style={{ background: 'none', color: 'var(--navy)', border: '1.5px solid var(--navy)', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }} className="listing-grid">
        {/* Left column */}
        <div>
          {/* Listing preview */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>Listing Preview</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 100, height: 100, borderRadius: 12, background: 'rgba(42,138,153,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>🏥</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {facility.is_featured && (
                  <span style={{ background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#9A7B54', marginRight: 6 }}>⭐ Featured</span>
                )}
                <h3 style={{ fontSize: 19, color: 'var(--navy)', fontWeight: 600, fontFamily: 'var(--font-display)', margin: '4px 0' }}>{display.name || facility.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--mid)' }}>
                  📍 {display.city || facility.city}, {display.state || facility.state} · {FACILITY_TYPE_LABELS[facility.facility_type] ?? facility.facility_type}
                </div>
                {facility.review_count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= stars ? 'var(--gold)' : '#ddd', fontSize: 13 }}>★</span>
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--mid)', marginLeft: 2 }}>({facility.review_count})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Facility Details</div>
            <FieldInput label="Facility Name" value={display.name} disabled={!editing} onChange={v => setForm(f => ({...f, name: v}))} />
            <FieldInput label="Description" value={display.description} disabled={!editing} multiline onChange={v => setForm(f => ({...f, description: v}))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldInput label="Phone" value={display.phone} disabled={!editing} onChange={v => setForm(f => ({...f, phone: v}))} />
              <FieldInput label="Email" value={display.email} disabled={!editing} type="email" onChange={v => setForm(f => ({...f, email: v}))} />
            </div>
            <FieldInput label="Website" value={display.website} disabled={!editing} onChange={v => setForm(f => ({...f, website: v}))} />
            <FieldInput label="Street Address" value={display.address_line1} disabled={!editing} onChange={v => setForm(f => ({...f, address_line1: v}))} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <FieldInput label="City" value={display.city} disabled={!editing} onChange={v => setForm(f => ({...f, city: v}))} />
              <FieldInput label="State" value={display.state} disabled={!editing} onChange={v => setForm(f => ({...f, state: v}))} />
              <FieldInput label="ZIP" value={display.zip} disabled={!editing} onChange={v => setForm(f => ({...f, zip: v}))} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Plan */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Your Plan</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)', textTransform: 'capitalize' }}>{facility.listing_tier}</div>
                <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{facility.listing_tier === 'basic' ? 'Free forever' : facility.listing_tier === 'enhanced' ? '$149/mo' : '$399/mo'}</div>
              </div>
              {facility.listing_tier !== 'premium' && (
                <button onClick={onGoToPlan}
                  style={{ background: 'none', color: 'var(--navy)', border: '1.5px solid var(--navy)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Listing Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Claimed', value: facility.is_claimed, yes: '✓ Yes', no: '✗ No' },
                { label: 'Verified', value: facility.is_verified, yes: '✓ Yes', no: '✗ Pending' },
                { label: 'Featured', value: facility.is_featured, yes: '★ Yes', no: '— No' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--mid)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: row.value ? (row.label === 'Featured' ? 'var(--gold)' : '#27AE60') : (row.label === 'Featured' ? 'var(--mid)' : '#E53935') }}>
                    {row.value ? row.yes : row.no}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Services & Amenities */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Services &amp; Amenities</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {amenities.map(a => (
                <span key={a} style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--dark)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {a}
                  {editing && (
                    <button onClick={() => setAmenities(prev => prev.filter(x => x !== a))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  )}
                </span>
              ))}
              {editing && (
                <div style={{ display: 'flex', gap: 4, width: '100%', marginTop: 4 }}>
                  <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity('') } }}
                    placeholder="Add amenity…"
                    style={{ flex: 1, padding: '5px 10px', border: '1px dashed var(--teal)', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', background: 'rgba(42,138,153,0.04)' }} />
                  <button onClick={() => { if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity('') } }}
                    style={{ background: 'rgba(42,138,153,0.1)', border: '1px dashed var(--teal)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
              )}
              {amenities.length === 0 && !editing && <span style={{ fontSize: 13, color: 'var(--mid)' }}>None listed</span>}
            </div>
          </div>

          {/* Insurance */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Insurance Accepted</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {insurance.map(ins => (
                <span key={ins} style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--dark)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {ins}
                  {editing && (
                    <button onClick={() => setInsurance(prev => prev.filter(x => x !== ins))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  )}
                </span>
              ))}
              {editing && (
                <div style={{ display: 'flex', gap: 4, width: '100%', marginTop: 4 }}>
                  <input value={newInsurance} onChange={e => setNewInsurance(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newInsurance.trim()) { setInsurance(prev => [...prev, newInsurance.trim()]); setNewInsurance('') } }}
                    placeholder="Add insurance…"
                    style={{ flex: 1, padding: '5px 10px', border: '1px dashed var(--teal)', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', background: 'rgba(42,138,153,0.04)' }} />
                  <button onClick={() => { if (newInsurance.trim()) { setInsurance(prev => [...prev, newInsurance.trim()]); setNewInsurance('') } }}
                    style={{ background: 'rgba(42,138,153,0.1)', border: '1px dashed var(--teal)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
              )}
              {insurance.length === 0 && !editing && <span style={{ fontSize: 13, color: 'var(--mid)' }}>None listed</span>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 840px) {
          .listing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
