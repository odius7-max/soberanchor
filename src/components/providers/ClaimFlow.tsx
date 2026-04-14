'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'search' | 'create' | 'done'

interface SearchResult { id:string; name:string; city:string|null; state:string|null; facility_type:string; is_claimed:boolean }

const FACILITY_TYPES = [
  { value: 'treatment', label: 'Treatment Center' },
  { value: 'sober_living', label: 'Sober Living Home' },
  { value: 'therapist', label: 'Therapist / Counselor' },
  { value: 'venue', label: 'Sober Venue' },
  { value: 'outpatient', label: 'Outpatient Program' },
  { value: 'telehealth', label: 'Telehealth' },
]

const TYPE_LABELS: Record<string,string> = Object.fromEntries(FACILITY_TYPES.map(t => [t.value, t.label]))

interface Props {
  userId: string
  preselectedFacility?: SearchResult | null
}

export default function ClaimFlow({ userId, preselectedFacility = null }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState(preselectedFacility?.name ?? '')
  const [results, setResults] = useState<SearchResult[]>(preselectedFacility ? [preselectedFacility] : [])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(preselectedFacility ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPreselected = preselectedFacility !== null

  // Create new form
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '', organization_name: '',
    facility_name: '', facility_type: 'treatment', phone: '', email: '', website: '',
    address_line1: '', city: '', state: '', zip: '', description: '',
  })

  // Track whether results are "live" (from user typing) vs seeded from preselection
  const [resultsFromSearch, setResultsFromSearch] = useState(!isPreselected)

  useEffect(() => {
    // Don't re-run Supabase search while showing the preselected result
    if (!resultsFromSearch) return
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('facilities')
        .select('id,name,city,state,facility_type,is_claimed')
        .ilike('name', `%${query}%`)
        .limit(8)
      setResults((data ?? []) as SearchResult[])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, resultsFromSearch])

  function extractDomain(url: string | null): string {
    if (!url) return ''
    try {
      const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname
      return hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return ''
    }
  }

  async function claimFacility(facility: SearchResult) {
    if (facility.is_claimed) { setError('This facility has already been claimed. Contact us if this is your facility.'); return }
    setSubmitting(true); setError(null)
    const supabase = createClient()

    // Get user email for domain matching
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email ?? ''
    const emailDomain = userEmail.split('@')[1]?.toLowerCase() ?? ''

    // Fetch facility website for domain comparison
    const { data: facilityDetail } = await supabase
      .from('facilities')
      .select('website')
      .eq('id', facility.id)
      .maybeSingle()
    const websiteDomain = extractDomain(facilityDetail?.website ?? null)

    // Hybrid auto-verify: domain match → auto-verify; no match → queue for admin review
    const autoVerify = !!(emailDomain && websiteDomain && emailDomain === websiteDomain)

    // Get/create provider account
    let { data: existing } = await supabase
      .from('provider_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (!existing) {
      const { data: created } = await supabase
        .from('provider_accounts')
        .insert({ auth_user_id: userId, contact_name: facility.name, contact_email: userEmail })
        .select('id')
        .single()
      existing = created
    }

    if (!existing) { setSubmitting(false); setError('Failed to create provider account.'); return }

    // Link facility — auto-verify if email domain matches website domain
    await supabase.from('facilities').update({
      provider_account_id: existing.id,
      is_claimed: true,
      is_verified: autoVerify,
      updated_at: new Date().toISOString(),
    }).eq('id', facility.id)

    setSubmitting(false)
    router.push('/providers/dashboard')
  }

  async function createFacility() {
    if (!form.contact_name.trim() || !form.contact_email.trim() || !form.facility_name.trim()) {
      setError('Contact name, email, and facility name are required.'); return
    }
    setSubmitting(true); setError(null)
    const supabase = createClient()

    // Get/create provider account
    let { data: existing } = await supabase
      .from('provider_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (!existing) {
      const { data: created } = await supabase
        .from('provider_accounts')
        .insert({
          auth_user_id: userId,
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          organization_name: form.organization_name.trim() || null,
        })
        .select('id')
        .single()
      existing = created
    }

    if (!existing) { setSubmitting(false); setError('Failed to create provider account.'); return }

    // Generate slug
    const slug = form.facility_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      + '-' + Math.random().toString(36).slice(2, 6)

    const { error: facilityErr } = await supabase
      .from('facilities')
      .insert({
        provider_account_id: existing.id,
        name: form.facility_name.trim(),
        slug,
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        address_line1: form.address_line1.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        facility_type: form.facility_type,
        listing_tier: 'basic',
        is_claimed: true,
      })

    if (facilityErr) { setSubmitting(false); setError(facilityErr.message); return }
    setSubmitting(false)
    router.push('/providers/dashboard')
  }

  const inputStyle = (focused = false) => ({
    width: '100%', padding: '10px 13px', border: `1.5px solid ${focused ? 'var(--teal)' : 'var(--border)'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none', boxSizing: 'border-box' as const, color: 'var(--dark)',
  })
  const label = (text: string) => (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 5 }}>{text}</label>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', marginBottom: 6 }}>Claim Your Listing</h1>
      <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
        Your facility may already be in our directory. Search below to find and claim it, or add a new listing.
      </p>

      {error && (
        <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#721C24' }}>{error}</div>
      )}

      {step === 'search' && (
        <>
          {/* Search */}
          {isPreselected && selected && (
            <div style={{ background: 'rgba(42,138,153,0.07)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>📍 Pre-selected from directory</div>
                <div style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, marginTop: 2 }}>{selected.name}</div>
                {(selected.city || selected.state) && (
                  <div style={{ fontSize: 12, color: 'var(--mid)' }}>{[selected.city, selected.state].filter(Boolean).join(', ')} · {TYPE_LABELS[selected.facility_type] ?? selected.facility_type}</div>
                )}
              </div>
              <button
                onClick={() => { setQuery(''); setSelected(null); setResults([]); setResultsFromSearch(true) }}
                style={{ fontSize: 12, color: 'var(--mid)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', flexShrink: 0 }}
              >
                Search different →
              </button>
            </div>
          )}

          <div className="card-hover" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>Search Your Facility</div>
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setSelected(null)
                  setResultsFromSearch(true)
                }}
                placeholder="e.g. Serenity Ridge Treatment Center"
                style={inputStyle()}
                autoFocus={!isPreselected}
              />
              {searching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)', fontSize: 12 }}>Searching…</div>
              )}
            </div>

            {results.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
                {results.map((r, i) => (
                  <div key={r.id}
                    style={{ padding: '14px 16px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: selected?.id === r.id ? 'rgba(42,138,153,0.06)' : '#fff', cursor: r.is_claimed ? 'default' : 'pointer' }}
                    onClick={() => !r.is_claimed && setSelected(r)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: r.is_claimed ? 'var(--mid)' : 'var(--navy)' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
                        {r.city && r.state ? `${r.city}, ${r.state}` : ''} · {TYPE_LABELS[r.facility_type] ?? r.facility_type}
                        {r.is_claimed && <span style={{ color: '#E67E22', fontWeight: 500 }}> · Already claimed</span>}
                      </div>
                    </div>
                    {!r.is_claimed && (
                      <button onClick={e => { e.stopPropagation(); claimFacility(r) }} disabled={submitting}
                        style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? '…' : 'This is mine →'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && !searching && results.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 8, padding: '10px 0' }}>No results found for &ldquo;{query}&rdquo;</div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 12 }}>Don&apos;t see your facility?</div>
            <button onClick={() => setStep('create')}
              style={{ background: 'none', color: 'var(--teal)', border: '1.5px solid var(--teal)', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              + Add a New Listing
            </button>
          </div>
        </>
      )}

      {step === 'create' && (
        <>
          <button onClick={() => setStep('search')} style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 24 }}>← Back to Search</button>

          {/* Contact info */}
          <div className="card-hover" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Your Contact Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 0 }}>
                {label('Your Name *')}
                <input style={inputStyle()} value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))} placeholder="Jane Smith" />
              </div>
              <div style={{ marginBottom: 0 }}>
                {label('Your Email *')}
                <input style={inputStyle()} type="email" value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))} placeholder="jane@example.com" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                {label('Your Phone')}
                <input style={inputStyle()} type="tel" value={form.contact_phone} onChange={e => setForm(f => ({...f, contact_phone: e.target.value}))} placeholder="(555) 555-5555" />
              </div>
              <div>
                {label('Organization / Company')}
                <input style={inputStyle()} value={form.organization_name} onChange={e => setForm(f => ({...f, organization_name: e.target.value}))} placeholder="Optional" />
              </div>
            </div>
          </div>

          {/* Facility info */}
          <div className="card-hover" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28, marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Facility Information</div>
            <div style={{ marginBottom: 14 }}>
              {label('Facility Name *')}
              <input style={inputStyle()} value={form.facility_name} onChange={e => setForm(f => ({...f, facility_name: e.target.value}))} placeholder="e.g. Serenity Ridge Treatment Center" />
            </div>
            <div style={{ marginBottom: 14 }}>
              {label('Facility Type')}
              <select style={inputStyle()} value={form.facility_type} onChange={e => setForm(f => ({...f, facility_type: e.target.value}))}>
                {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              {label('Description')}
              <textarea rows={3} style={inputStyle()} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Brief description of your services…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>{label('Phone')}<input style={inputStyle()} type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="(555) 555-5555" /></div>
              <div>{label('Website')}<input style={inputStyle()} value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} placeholder="https://example.com" /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              {label('Street Address')}
              <input style={inputStyle()} value={form.address_line1} onChange={e => setForm(f => ({...f, address_line1: e.target.value}))} placeholder="123 Main St" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div>{label('City')}<input style={inputStyle()} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
              <div>{label('State')}<input style={inputStyle()} value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} placeholder="CA" maxLength={2} /></div>
              <div>{label('ZIP')}<input style={inputStyle()} value={form.zip} onChange={e => setForm(f => ({...f, zip: e.target.value}))} placeholder="92001" /></div>
            </div>
          </div>

          <button onClick={createFacility} disabled={submitting}
            style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
            {submitting ? 'Creating your listing…' : 'Create Listing & Go to Dashboard →'}
          </button>
        </>
      )}
    </div>
  )
}
