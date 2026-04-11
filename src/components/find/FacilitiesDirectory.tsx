'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FilterAccordion, { type ActiveFilter } from './FilterAccordion'
import HeartButton from './HeartButton'
import {
  FACILITY_SORT_OPTIONS,
  haversineMiles,
  buildFilterSummary,
} from './findUtils'

// ─── Type-specific filter options ────────────────────────────────────────────

const TREATMENT_TYPE_OPTS = [
  { value: '', label: 'Any Type' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'outpatient', label: 'Outpatient (IOP/OP)' },
  { value: 'detox', label: 'Detox' },
  { value: 'mat', label: 'MAT (Medication-Assisted)' },
  { value: 'dual_diagnosis', label: 'Dual Diagnosis' },
  { value: 'residential', label: 'Residential' },
]

const GENDER_OPTS = [
  { value: '', label: 'Any Gender' },
  { value: 'mens', label: "Men's" },
  { value: 'womens', label: "Women's" },
  { value: 'coed', label: 'Co-ed' },
]

const THERAPY_SPECIALTY_OPTS = [
  { value: '', label: 'Any Specialty' },
  { value: 'addiction', label: 'Addiction' },
  { value: 'dual_diagnosis', label: 'Dual Diagnosis' },
  { value: 'trauma', label: 'Trauma / PTSD' },
  { value: 'family', label: 'Family Therapy' },
  { value: 'eating_disorders', label: 'Eating Disorders' },
]

const LICENSE_OPTS = [
  { value: '', label: 'Any License' },
  { value: 'LMFT', label: 'LMFT' },
  { value: 'LCSW', label: 'LCSW' },
  { value: 'PsyD', label: 'PsyD' },
  { value: 'PhD', label: 'PhD' },
  { value: 'CADC', label: 'CADC' },
]

const SUBSTANCE_OPTS = [
  { value: '', label: 'Any Substance' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'opioids', label: 'Opioids' },
  { value: 'stimulants', label: 'Stimulants' },
  { value: 'cannabis', label: 'Cannabis' },
  { value: 'polysubstance', label: 'Polysubstance' },
]

const PRICE_RANGE_OPTS = [
  { value: '', label: 'Any Price' },
  { value: 'low', label: '$ Low' },
  { value: 'mid', label: '$$ Mid' },
  { value: 'high', label: '$$$ High' },
]

const VENUE_TYPE_OPTS = [
  { value: '', label: 'Any Type' },
  { value: 'bar', label: 'Alcohol-Free Bar' },
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'event_space', label: 'Event Space' },
]

const selStyle: React.CSSProperties = {
  padding: '7px 28px 7px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
  fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--dark)',
  cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Facility {
  id: string
  name: string
  city: string | null
  state: string | null
  facility_type: string
  description: string | null
  is_featured: boolean
  is_verified: boolean
  listing_tier: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  accepts_insurance: boolean | null
  avg_rating: number | null
  review_count: number | null
  _distance?: number
}

type FacilityType = 'treatment' | 'sober_living' | 'therapist' | 'venue' | 'outpatient'

const TYPE_META: Record<FacilityType, { icon: string; bg: string; hint: string }> = {
  treatment:    { icon: '🏥', bg: 'var(--teal-10)',           hint: '(type, substance, insurance)' },
  sober_living: { icon: '🏠', bg: 'var(--gold-10)',           hint: '(gender, price, features)' },
  therapist:    { icon: '💆', bg: 'rgba(39,174,96,0.07)',     hint: '(specialty, license, telehealth)' },
  venue:        { icon: '🍹', bg: 'rgba(42,138,153,0.07)',    hint: '(type, amenities)' },
  outpatient:   { icon: '💊', bg: 'rgba(155,89,182,0.07)',    hint: '(type, insurance)' },
}

interface Props {
  facilityType: FacilityType
  savedIds?: Record<string, string>
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FacilitiesDirectory({ facilityType, savedIds = {} }: Props) {
  const [allFacilities, setAllFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  const [locationText, setLocationText] = useState('')
  const [locationDisplayName, setLocationDisplayName] = useState<string | null>(null)
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(
    facilityType === 'treatment' ? 50 : facilityType === 'sober_living' || facilityType === 'therapist' ? 25 : 15
  )

  // Type-specific filter state
  const [treatmentType, setTreatmentType] = useState('')
  const [substanceType, setSubstanceType] = useState('')
  const [insuranceOnly, setInsuranceOnly] = useState(false)
  const [gender, setGender] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [twelveStepOnly, setTwelveStepOnly] = useState(false)
  const [petFriendly, setPetFriendly] = useState(false)
  const [therapySpecialty, setTherapySpecialty] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [insuranceOnlyTherapist, setInsuranceOnlyTherapist] = useState(false)
  const [telehealthOnly, setTelehealthOnly] = useState(false)
  const [venueType, setVenueType] = useState('')
  const [sort, setSort] = useState('featured')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('facilities')
      .select('id, name, city, state, facility_type, description, is_featured, is_verified, listing_tier, latitude, longitude, phone, website, accepts_insurance, avg_rating, review_count')
      .eq('facility_type', facilityType)
      .then(({ data, error }) => {
        if (error) console.error('FacilitiesDirectory fetch error:', error.message)
        setAllFacilities((data ?? []) as unknown as Facility[])
        setLoading(false)
      })
  }, [facilityType])

  function handleLocationChange(v: { text: string; displayName: string | null; lat: number | null; lng: number | null; radius: number }) {
    setLocationText(v.text)
    setLocationDisplayName(v.displayName)
    setLocationLat(v.lat)
    setLocationLng(v.lng)
    setRadiusMiles(v.radius)
    setPage(1)
  }

  function removeFilter(key: string) {
    if (key === 'treatmentType') setTreatmentType('')
    else if (key === 'substanceType') setSubstanceType('')
    else if (key === 'insurance') setInsuranceOnly(false)
    else if (key === 'gender') setGender('')
    else if (key === 'priceRange') setPriceRange('')
    else if (key === 'twelveStep') setTwelveStepOnly(false)
    else if (key === 'petFriendly') setPetFriendly(false)
    else if (key === 'therapySpecialty') setTherapySpecialty('')
    else if (key === 'licenseType') setLicenseType('')
    else if (key === 'insuranceTherapist') setInsuranceOnlyTherapist(false)
    else if (key === 'telehealth') setTelehealthOnly(false)
    else if (key === 'venueType') setVenueType('')
    setPage(1)
  }

  const hasGeo = !!(locationLat && locationLng)

  const filtered = allFacilities
    .filter(f => {
      // Geo filter
      if (hasGeo) {
        if (!f.latitude || !f.longitude) return false
        const dist = haversineMiles(locationLat!, locationLng!, f.latitude, f.longitude)
        if (dist > radiusMiles) return false
      }
      // Insurance filter (accepts_insurance is a real column)
      if (insuranceOnly && !f.accepts_insurance) return false
      if (insuranceOnlyTherapist && !f.accepts_insurance) return false
      // Other type-specific filters (substance, gender, price, etc.) will filter here
      // once those columns are added to the facilities schema.
      return true
    })
    .map(f => ({
      ...f,
      _distance: hasGeo && f.latitude && f.longitude
        ? haversineMiles(locationLat!, locationLng!, f.latitude, f.longitude)
        : undefined,
    }))
    .sort((a, b) => {
      if (sort === 'nearest') {
        if (a._distance === undefined && b._distance === undefined) return 0
        if (a._distance === undefined) return 1
        if (b._distance === undefined) return -1
        return a._distance - b._distance
      }
      if (sort === 'alphabetical') return a.name.localeCompare(b.name)
      // featured: premium first, then enhanced, then featured flag, then basic
      const tierOrder: Record<string, number> = { premium: 3, enhanced: 2, basic: 0 }
      const tierA = tierOrder[a.listing_tier ?? 'basic'] ?? 0
      const tierB = tierOrder[b.listing_tier ?? 'basic'] ?? 0
      if (tierB !== tierA) return tierB - tierA
      if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1
      return a.name.localeCompare(b.name)
    })

  // Build active filters + filter summary
  const activeFilters: ActiveFilter[] = []

  if (treatmentType) {
    const opt = TREATMENT_TYPE_OPTS.find(o => o.value === treatmentType)
    activeFilters.push({ key: 'treatmentType', label: opt?.label ?? treatmentType })
  }
  if (substanceType) {
    const opt = SUBSTANCE_OPTS.find(o => o.value === substanceType)
    activeFilters.push({ key: 'substanceType', label: opt?.label ?? substanceType })
  }
  if (insuranceOnly) activeFilters.push({ key: 'insurance', label: 'Accepts Insurance' })
  if (gender) {
    const opt = GENDER_OPTS.find(o => o.value === gender)
    activeFilters.push({ key: 'gender', label: opt?.label ?? gender })
  }
  if (priceRange) {
    const opt = PRICE_RANGE_OPTS.find(o => o.value === priceRange)
    activeFilters.push({ key: 'priceRange', label: opt?.label ?? priceRange })
  }
  if (twelveStepOnly) activeFilters.push({ key: 'twelveStep', label: '12-Step' })
  if (petFriendly) activeFilters.push({ key: 'petFriendly', label: 'Pet-Friendly' })
  if (therapySpecialty) {
    const opt = THERAPY_SPECIALTY_OPTS.find(o => o.value === therapySpecialty)
    activeFilters.push({ key: 'therapySpecialty', label: opt?.label ?? therapySpecialty })
  }
  if (licenseType) activeFilters.push({ key: 'licenseType', label: licenseType })
  if (insuranceOnlyTherapist) activeFilters.push({ key: 'insuranceTherapist', label: 'Accepts Insurance' })
  if (telehealthOnly) activeFilters.push({ key: 'telehealth', label: 'Telehealth' })
  if (venueType) {
    const opt = VENUE_TYPE_OPTS.find(o => o.value === venueType)
    activeFilters.push({ key: 'venueType', label: opt?.label ?? venueType })
  }

  const filterSummary = activeFilters.length > 0
    ? activeFilters.map(f => f.label).join(' · ')
    : 'All'

  const meta = TYPE_META[facilityType]
  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = filtered.length > paginated.length

  // Build the type-specific filter slot
  let filterSlot: React.ReactNode = null
  if (facilityType === 'treatment') {
    filterSlot = (
      <>
        <select value={treatmentType} onChange={e => { setTreatmentType(e.target.value); setPage(1) }} style={selStyle}>
          {TREATMENT_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={substanceType} onChange={e => { setSubstanceType(e.target.value); setPage(1) }} style={selStyle}>
          {SUBSTANCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ToggleButton active={insuranceOnly} onClick={() => { setInsuranceOnly(v => !v); setPage(1) }}>
          🛡️ Accepts Insurance
        </ToggleButton>
      </>
    )
  } else if (facilityType === 'outpatient') {
    filterSlot = (
      <>
        <select value={treatmentType} onChange={e => { setTreatmentType(e.target.value); setPage(1) }} style={selStyle}>
          {TREATMENT_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ToggleButton active={insuranceOnly} onClick={() => { setInsuranceOnly(v => !v); setPage(1) }}>
          🛡️ Accepts Insurance
        </ToggleButton>
      </>
    )
  } else if (facilityType === 'sober_living') {
    filterSlot = (
      <>
        <select value={gender} onChange={e => { setGender(e.target.value); setPage(1) }} style={selStyle}>
          {GENDER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priceRange} onChange={e => { setPriceRange(e.target.value); setPage(1) }} style={selStyle}>
          {PRICE_RANGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ToggleButton active={twelveStepOnly} onClick={() => { setTwelveStepOnly(v => !v); setPage(1) }}>
          🔵 12-Step
        </ToggleButton>
        <ToggleButton active={petFriendly} onClick={() => { setPetFriendly(v => !v); setPage(1) }}>
          🐾 Pet-Friendly
        </ToggleButton>
      </>
    )
  } else if (facilityType === 'therapist') {
    filterSlot = (
      <>
        <select value={therapySpecialty} onChange={e => { setTherapySpecialty(e.target.value); setPage(1) }} style={selStyle}>
          {THERAPY_SPECIALTY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={licenseType} onChange={e => { setLicenseType(e.target.value); setPage(1) }} style={selStyle}>
          {LICENSE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ToggleButton active={insuranceOnlyTherapist} onClick={() => { setInsuranceOnlyTherapist(v => !v); setPage(1) }}>
          🛡️ Accepts Insurance
        </ToggleButton>
        <ToggleButton active={telehealthOnly} onClick={() => { setTelehealthOnly(v => !v); setPage(1) }}>
          💻 Telehealth
        </ToggleButton>
      </>
    )
  } else if (facilityType === 'venue') {
    filterSlot = (
      <select value={venueType} onChange={e => { setVenueType(e.target.value); setPage(1) }} style={selStyle}>
        {VENUE_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <div>
      <FilterAccordion
        storageKey={`facilities-${facilityType}`}
        locationText={locationText}
        locationDisplayName={locationDisplayName}
        locationLat={locationLat}
        locationLng={locationLng}
        radiusMiles={radiusMiles}
        onLocationChange={handleLocationChange}
        filterHint={meta.hint}
        filterSummary={filterSummary}
        filterSlot={filterSlot}
        resultCount={loading ? null : filtered.length}
        sortValue={sort}
        sortOptions={FACILITY_SORT_OPTIONS}
        onSortChange={v => { setSort(v); setPage(1) }}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 14 }}>
          Loading listings…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{meta.icon}</div>
          <p style={{ fontSize: 15 }}>
            {hasGeo
              ? `No listings within ${radiusMiles} miles. Try expanding your radius.`
              : 'No listings found. Try adjusting your filters.'}
          </p>
          {activeFilters.length > 0 && (
            <button
              onClick={() => {
                setTreatmentType(''); setSubstanceType(''); setInsuranceOnly(false)
                setGender(''); setPriceRange(''); setTwelveStepOnly(false); setPetFriendly(false)
                setTherapySpecialty(''); setLicenseType(''); setInsuranceOnlyTherapist(false); setTelehealthOnly(false)
                setVenueType(''); setPage(1)
              }}
              style={{ marginTop: 12, fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paginated.map(f => (
              <FacilityCard key={f.id} facility={f} icon={meta.icon} bg={meta.bg} savedId={savedIds[f.id] ?? null} />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '10px 28px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--navy)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Load more ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 6 }}>Don&apos;t see your facility?</p>
            <Link href="/for-providers" style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 13 }}>
              Claim or add your free listing →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
        background: active ? 'rgba(42,138,153,0.08)' : '#fff',
        color: active ? 'var(--teal)' : 'var(--mid)',
        cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function FacilityCard({ facility: f, icon, bg, savedId }: {
  facility: Facility & { _distance?: number }
  icon: string
  bg: string
  savedId: string | null
}) {
  return (
    <div className="bg-white border border-border rounded-[14px] overflow-hidden" style={{ position: 'relative' }}>
      <div style={{ display: 'flex' }}>
        <div className="shrink-0 flex items-center justify-center text-[36px]" style={{ width: 120, minHeight: 120, background: bg }}>
          {icon}
        </div>
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {f.listing_tier === 'premium' && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9A7B54', background: 'var(--gold-10)', border: '1px solid rgba(212,165,116,0.2)', borderRadius: 20, padding: '2px 7px' }}>
                    ⭐ Featured
                  </span>
                )}
                {f.is_verified && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'var(--teal-10)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 20, padding: '2px 7px' }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.3 }}>{f.name}</h3>
              {(f.city || f.state) && (
                <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3 }}>
                  📍 {[f.city, f.state].filter(Boolean).join(', ')}
                  {f._distance !== undefined && (
                    <span style={{ color: 'var(--teal)' }}> · {f._distance.toFixed(1)} mi</span>
                  )}
                </p>
              )}
              {f.description && (
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {f.description}
                </p>
              )}
            </div>
            <HeartButton facilityId={f.id} initialSavedId={savedId} size={17} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {f.phone && (
                <a
                  href={`tel:${f.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  📞 Call
                </a>
              )}
              {f.website && (
                <a
                  href={f.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  🌐 Website
                </a>
              )}
            </div>
            <Link
              href={`/find/${f.id}`}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
