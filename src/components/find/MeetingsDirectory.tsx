'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FilterAccordion, { type ActiveFilter } from './FilterAccordion'
import HeartButton from './HeartButton'
import MultiSelectDropdown from './MultiSelectDropdown'
import {
  FELLOWSHIP_OPTIONS, DAY_OPTIONS, TIME_OPTIONS, FORMAT_OPTIONS,
  MEETING_SPECIALTY_OPTIONS, LANGUAGE_OPTIONS, ACCESS_OPTIONS, MEETING_SORT_OPTIONS,
  FELLOWSHIP_FINDERS, FINDER_BY_SLUG, QUICK_FELLOWSHIP_CHIPS,
  getTimeRange, fmt12h, geocodeLocation,
} from './findUtils'

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied'

// Day order for sorting online meetings when no distance is available
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Meeting {
  id: string
  name: string
  slug: string | null
  day_of_week: string | null
  start_time: string | null
  duration_minutes: number | null
  format: string | null
  location_name: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  meeting_url: string | null
  types: string[] | null
  is_verified: boolean
  fellowships: { name: string; abbreviation: string; slug: string; approach: string } | null
  _distance?: number
}

const ITEMS_PER_PAGE = 25

const APPROACH_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  twelve_step:    { bg: 'rgba(0,51,102,0.06)',   color: 'var(--navy)', border: 'rgba(0,51,102,0.14)'    },
  secular:        { bg: 'rgba(42,138,153,0.08)', color: 'var(--teal)', border: 'rgba(42,138,153,0.2)'   },
  faith:          { bg: 'rgba(212,165,116,0.1)', color: '#9A7B54',     border: 'rgba(212,165,116,0.25)' },
  harm_reduction: { bg: 'rgba(39,174,96,0.08)',  color: '#27AE60',     border: 'rgba(39,174,96,0.2)'    },
}

interface Props {
  savedIds?: Record<string, string>
  userCity?: string | null
  userState?: string | null
}

export default function MeetingsDirectory({ savedIds = {}, userCity, userState }: Props) {
  const searchParams = useSearchParams()

  const [allMeetings,   setAllMeetings]   = useState<Meeting[]>([])
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(1)
  const [geoStatus,     setGeoStatus]     = useState<GeoStatus>('idle')

  const [locationText,        setLocationText]        = useState('')
  const [locationDisplayName, setLocationDisplayName] = useState<string | null>(null)
  const [locationLat,         setLocationLat]         = useState<number | null>(null)
  const [locationLng,         setLocationLng]         = useState<number | null>(null)
  const [radiusMiles,         setRadiusMiles]         = useState(15)

  const [nearbyDistances, setNearbyDistances] = useState<Map<string, number> | null>(null)
  const [nearbyLoading,   setNearbyLoading]   = useState(false)

  // All filters default to "all" / unselected
  const [fellowship,  setFellowship]  = useState(() => searchParams.get('fellowship') ?? '')
  const [days,        setDays]        = useState<string[]>([])
  const [times,       setTimes]       = useState<string[]>([])
  const [formats,     setFormats]     = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [languages,   setLanguages]   = useState<string[]>([])
  const [access,      setAccess]      = useState('')
  const [sort,        setSort]        = useState('nearest')

  const [profileGeoAttempted, setProfileGeoAttempted] = useState(false)

  // ── Default to today's day (client-side only, avoids SSR timezone mismatch) ─
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    setDays([today])
  }, [])

  // ── Geolocation — tries localStorage cache first, then browser prompt ───────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('soberanchor:geo')
      if (raw) {
        const { lat, lng, ts } = JSON.parse(raw) as { lat: number; lng: number; ts: number }
        if (Date.now() - ts < 5 * 60 * 1000) {
          setLocationLat(lat); setLocationLng(lng)
          setLocationText('Near you'); setLocationDisplayName('Near you')
          setGeoStatus('granted')
          reverseGeocode(lat, lng)
          return
        }
      }
    } catch { /* ignore bad cache */ }

    if (!navigator.geolocation) { setGeoStatus('denied'); return }
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          setGeoStatus('granted')
          setLocationLat(lat); setLocationLng(lng)
          setLocationText('Near you'); setLocationDisplayName('Near you')
          try { localStorage.setItem('soberanchor:geo', JSON.stringify({ lat, lng, ts: Date.now() })) } catch { /* ignore */ }
          reverseGeocode(lat, lng)
        } catch (err) {
          console.error('[MeetingsDirectory] geo callback threw:', err)
          setGeoStatus('denied')
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 10000, maximumAge: 300000 },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reverseGeocode(lat: number, lng: number) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': 'SoberAnchor/1.0' } })
      .then(r => r.json())
      .then((d: { address?: { city?: string; town?: string; village?: string; county?: string; state_abbreviation?: string; state?: string } }) => {
        const city  = d.address?.city || d.address?.town || d.address?.village || d.address?.county || ''
        const state = d.address?.state_abbreviation || d.address?.state || ''
        const name  = [city, state].filter(Boolean).join(', ') || 'Near you'
        setLocationText(name); setLocationDisplayName(name)
      })
      .catch(() => { /* keep "Near you" */ })
  }

  // ── Profile city/state geo fallback — fires once when browser geo denied ──
  useEffect(() => {
    const alreadyHasGeo = !!(locationLat && locationLng)
    if (geoStatus !== 'denied' || alreadyHasGeo || profileGeoAttempted) return
    if (!userCity && !userState) return
    setProfileGeoAttempted(true)
    geocodeLocation([userCity, userState].filter(Boolean).join(', ')).then(result => {
      if (!result) return
      setLocationLat(result.lat); setLocationLng(result.lng)
      const label = [userCity, userState].filter(Boolean).join(', ')
      setLocationText(label); setLocationDisplayName(label)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, locationLat, locationLng, profileGeoAttempted])

  // ── Fetch all meetings ────────────────────────────────────────────────────
  useEffect(() => {
    createClient()
      .from('meetings')
      .select('id, name, slug, day_of_week, start_time, duration_minutes, format, location_name, city, state, latitude, longitude, meeting_url, types, is_verified, fellowships(name, abbreviation, slug, approach)')
      .order('day_of_week').order('start_time')
      .then(({ data, error }) => {
        if (error) console.error('MeetingsDirectory fetch error:', error.message)
        console.log('Meetings sample:', data?.slice(0, 5).map(m => ({
          name: (m as unknown as Meeting).name,
          day: (m as unknown as Meeting).day_of_week,
        })))
        setAllMeetings((data ?? []) as unknown as Meeting[])
        setLoading(false)
      })
  }, [])

  // ── PostGIS nearby_meetings RPC ───────────────────────────────────────────
  useEffect(() => {
    if (!locationLat || !locationLng) { setNearbyDistances(null); setNearbyLoading(false); return }
    setNearbyLoading(true)
    createClient()
      .rpc('nearby_meetings', { user_lat: locationLat, user_lng: locationLng, radius_miles: radiusMiles, result_limit: 500 })
      .then(({ data, error }) => {
        if (error) { console.error('[MeetingsDirectory] nearby_meetings RPC error:', error); setNearbyDistances(new Map()); setNearbyLoading(false); return }
        const map = new Map<string, number>()
        for (const row of (data ?? []) as Array<{ id: string; distance_miles?: number }>) map.set(row.id, row.distance_miles ?? 0)
        setNearbyDistances(map); setNearbyLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationLat, locationLng, radiusMiles])

  function handleLocationChange(v: { text: string; displayName: string | null; lat: number | null; lng: number | null; radius: number }) {
    setLocationText(v.text); setLocationDisplayName(v.displayName)
    setLocationLat(v.lat); setLocationLng(v.lng)
    setRadiusMiles(v.radius); setPage(1)
  }

  function removeFilter(key: string) {
    if (key === 'fellowship') { setFellowship(''); setPage(1); return }
    if (key === 'access')     { setAccess('');     setPage(1); return }
    const ci = key.indexOf(':')
    if (ci === -1) return
    const field = key.slice(0, ci), value = key.slice(ci + 1)
    if (field === 'day')         setDays(v => v.filter(x => x !== value))
    else if (field === 'time')      setTimes(v => v.filter(x => x !== value))
    else if (field === 'format')    setFormats(v => v.filter(x => x !== value))
    else if (field === 'specialty') setSpecialties(v => v.filter(x => x !== value))
    else if (field === 'language')  setLanguages(v => v.filter(x => x !== value))
    setPage(1)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasGeo = !!(locationLat && locationLng)

  // ── Filter ────────────────────────────────────────────────────────────────
  console.log('Raw meetings count:', allMeetings.length)
  console.log('Sample day values:', allMeetings.slice(0, 5).map(m => m.day_of_week))
  console.log('Selected days state:', days)
  console.log('Type of days[0]:', typeof days[0])
  console.log('Type of meeting day:', typeof allMeetings[0]?.day_of_week)
  console.log('Exact comparison:', allMeetings[0]?.day_of_week === days[0])
  console.log('Meeting keys:', Object.keys(allMeetings[0] || {}))
  const filtered: Meeting[] = allMeetings.filter(m => {
    if (fellowship && (!m.fellowships || m.fellowships.slug !== fellowship)) return false
    if (days.length    && !days.includes(m.day_of_week ?? ''))              return false
    if (formats.length && !formats.includes(m.format ?? ''))                return false
    if (times.length) { const b = getTimeRange(m.start_time); if (!times.includes(b ?? '')) return false }
    if (specialties.length && !specialties.some(s => (m.types ?? []).includes(s))) return false
    if (languages.length   && !languages.some(l => (m.types ?? []).includes(l)))   return false
    if (access && !(m.types ?? []).includes(access))                         return false
    // With location: in-person meetings must be within radius
    if (hasGeo && m.format !== 'online' && nearbyDistances !== null && !nearbyDistances.has(m.id)) return false
    // Without location: show only online meetings
    if (!hasGeo && m.format !== 'online') return false
    return true
  }).map(m => ({ ...m, _distance: nearbyDistances?.get(m.id) }))

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted: Meeting[] = [...filtered].sort((a, b) => {
    if (sort === 'alphabetical') return a.name.localeCompare(b.name)
    // time: sort purely by start_time ASC (for day-filtered views)
    if (sort === 'time') {
      const ta = a.start_time ?? ''
      const tb = b.start_time ?? ''
      if (ta !== tb) return ta.localeCompare(tb)
      return a.name.localeCompare(b.name)
    }
    // nearest (default): in-person by distance, then online by day+time
    if (a._distance !== undefined && b._distance !== undefined) {
      if (a._distance !== b._distance) return a._distance - b._distance
      // tie-break equal distances by day then start_time so days interleave
      const da = DAY_ORDER.indexOf(a.day_of_week ?? '')
      const db = DAY_ORDER.indexOf(b.day_of_week ?? '')
      if (da !== db) return (da === -1 ? 7 : da) - (db === -1 ? 7 : db)
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    }
    if (a._distance !== undefined) return -1  // in-person before online
    if (b._distance !== undefined) return 1
    // both online (no distance): sort by day then start_time
    const da = DAY_ORDER.indexOf(a.day_of_week ?? '')
    const db = DAY_ORDER.indexOf(b.day_of_week ?? '')
    if (da !== db) return (da === -1 ? 7 : da) - (db === -1 ? 7 : db)
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })

  const paginated = sorted.slice(0, page * ITEMS_PER_PAGE)
  const hasMore   = sorted.length > paginated.length

  // ── Active filter pills ───────────────────────────────────────────────────
  const activeFilters: ActiveFilter[] = []
  if (fellowship) { const o = FELLOWSHIP_OPTIONS.find(x => x.value === fellowship); activeFilters.push({ key: 'fellowship', label: o?.label.split('–')[0]?.trim() ?? fellowship }) }
  for (const d of days)      { const o = DAY_OPTIONS.find(x => x.value === d);       activeFilters.push({ key: `day:${d}`,       label: o?.label ?? d }) }
  for (const t of times)     { const o = TIME_OPTIONS.find(x => x.value === t);      activeFilters.push({ key: `time:${t}`,      label: o?.label.split(' (')[0] ?? t }) }
  for (const f of formats)   { const o = FORMAT_OPTIONS.find(x => x.value === f);   activeFilters.push({ key: `format:${f}`,    label: o?.label ?? f }) }
  for (const s of specialties) activeFilters.push({ key: `specialty:${s}`, label: s })
  for (const l of languages)   activeFilters.push({ key: `language:${l}`,  label: l })
  if (access) { const o = ACCESS_OPTIONS.find(x => x.value === access); activeFilters.push({ key: 'access', label: o?.label.split(' (')[0] ?? access }) }

  const filterSummary = (() => {
    const parts: string[] = []
    if (fellowship) { const o = FELLOWSHIP_OPTIONS.find(x => x.value === fellowship); parts.push(o?.label.split('–')[0]?.trim() ?? fellowship) }
    for (const d of days)    { const o = DAY_OPTIONS.find(x => x.value === d);      parts.push(o?.label ?? d) }
    for (const t of times)   { const o = TIME_OPTIONS.find(x => x.value === t);     parts.push(o?.label.split(' (')[0] ?? t) }
    for (const f of formats) { const o = FORMAT_OPTIONS.find(x => x.value === f);  parts.push(o?.label ?? f) }
    for (const s of specialties) parts.push(s)
    for (const l of languages)   parts.push(l)
    if (access) { const o = ACCESS_OPTIONS.find(x => x.value === access); parts.push(o?.label.split(' (')[0] ?? access) }
    return parts.length ? parts.join(' · ') : 'All'
  })()

  // ── Display helpers ───────────────────────────────────────────────────────
  const selectedFinder  = fellowship ? FINDER_BY_SLUG[fellowship] ?? null : null
  const fellowshipLabel = fellowship ? (FELLOWSHIP_OPTIONS.find(o => o.value === fellowship)?.label.split('–')[0]?.trim() ?? fellowship) : null

  const resultLabel = (hasGeo && nearbyDistances !== null && !nearbyLoading)
    ? `${sorted.length.toLocaleString()} meeting${sorted.length !== 1 ? 's' : ''} within ${radiusMiles} mi`
    : undefined

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const isTodayOnly = days.length === 1 && days[0] === today

  const sectionHeader = isTodayOnly
    ? hasGeo
      ? `${today} meetings near ${locationDisplayName ?? 'you'}`
      : `${today} online meetings`
    : hasGeo
    ? `Meetings near ${locationDisplayName ?? 'you'}`
    : 'Online meetings'

  const locationPrompt = geoStatus === 'requesting' ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>Detecting your location…</div>
  ) : nearbyLoading ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>Finding meetings near you…</div>
  ) : geoStatus === 'denied' && !hasGeo ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>
      {profileGeoAttempted
        ? `Showing results near ${[userCity, userState].filter(Boolean).join(', ')}`
        : 'Enter a city or zip above to see in-person meetings near you'
      }
    </div>
  ) : null

  function clearAll() {
    setFellowship(''); setDays([]); setTimes([]); setFormats([])
    setSpecialties([]); setLanguages([]); setAccess(''); setSort('nearest'); setPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <FilterAccordion
        storageKey="meetings-directory"
        locationText={locationText}
        locationDisplayName={locationDisplayName}
        locationLat={locationLat}
        locationLng={locationLng}
        radiusMiles={radiusMiles}
        onLocationChange={v => { handleLocationChange(v); if (v.lat) setSort('nearest') }}
        filterHint="(fellowship, day, time, format, type, language, access)"
        filterSummary={filterSummary}
        filterSlot={
          <>
            {locationPrompt}
            {/* Fellowship */}
            <select
              value={fellowship}
              onChange={e => { setFellowship(e.target.value); setPage(1) }}
              style={{ padding: '7px 28px 7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--dark)', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {FELLOWSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {/* Day */}
            <MultiSelectDropdown options={DAY_OPTIONS.filter(o => o.value !== '')} selected={days} onChange={v => { setDays(v); setPage(1) }} defaultLabel="Any Day" fieldLabel="Day" />
            {/* Time */}
            <MultiSelectDropdown options={TIME_OPTIONS.filter(o => o.value !== '')} selected={times} onChange={v => { setTimes(v); setPage(1) }} defaultLabel="Any Time" fieldLabel="Time" />
            {/* Format */}
            <MultiSelectDropdown options={FORMAT_OPTIONS.filter(o => o.value !== '')} selected={formats} onChange={v => { setFormats(v); setPage(1) }} defaultLabel="Any Format" fieldLabel="Format" />
            {/* Type */}
            <MultiSelectDropdown options={MEETING_SPECIALTY_OPTIONS.filter(o => o.value !== '')} selected={specialties} onChange={v => { setSpecialties(v); setPage(1) }} defaultLabel="Any Type" fieldLabel="Type" />
            {/* Language */}
            <MultiSelectDropdown options={LANGUAGE_OPTIONS.filter(o => o.value !== '')} selected={languages} onChange={v => { setLanguages(v); setPage(1) }} defaultLabel="Any Language" fieldLabel="Language" />
            {/* Access */}
            <select
              value={access}
              onChange={e => { setAccess(e.target.value); setPage(1) }}
              style={{ padding: '7px 28px 7px 10px', borderRadius: 8, border: `1.5px solid ${access ? 'var(--teal)' : 'var(--border)'}`, fontSize: 13, fontFamily: 'var(--font-body)', background: access ? 'rgba(42,138,153,0.06)' : '#fff', color: access ? 'var(--teal)' : 'var(--dark)', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', fontWeight: access ? 600 : 400 }}
            >
              {ACCESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ width: '100%', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--mid)', fontFamily: 'var(--font-body)' }}>
                Looking for something specific?{' '}
                <button type="button" onClick={() => document.dispatchEvent(new CustomEvent('soberanchor:open-search'))}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--teal)', fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Try AI search above.
                </button>
              </span>
            </div>
          </>
        }
        resultCount={loading ? null : sorted.length}
        resultLabel={resultLabel}
        sortValue={sort}
        sortOptions={MEETING_SORT_OPTIONS.filter(o => o.value !== 'soonest')}
        onSortChange={v => { setSort(v); setPage(1) }}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      {/* ── No-location banner ── */}
      {!hasGeo && geoStatus !== 'idle' && geoStatus !== 'requesting' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 12, marginBottom: 14, background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.2)' }}>
          <span style={{ fontSize: 18, lineHeight: 1.4 }}>📍</span>
          <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.5 }}>
            Enter a city or zip code above, or allow location access to find in-person meetings near you.
            <span style={{ display: 'block', marginTop: 2, color: 'var(--navy)', fontWeight: 600 }}>Showing online meetings below.</span>
          </div>
        </div>
      )}

      {/* ── Fellowship chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {QUICK_FELLOWSHIP_CHIPS.map(chip => {
          const active = fellowship === chip.slug
          return (
            <button key={chip.slug} onClick={() => { setFellowship(active ? '' : chip.slug); setPage(1) }}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-body)', background: active ? 'var(--navy)' : 'var(--warm-gray)', border: `1.5px solid ${active ? 'var(--navy)' : 'var(--border)'}`, color: active ? '#fff' : 'var(--dark)' }}>
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ── Section header ── */}
      {!loading && !nearbyLoading && (
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
          {sectionHeader}
        </div>
      )}

      {loading || (hasGeo && nearbyLoading) ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 14 }}>
          {loading ? 'Loading meetings…' : 'Finding meetings near you…'}
        </div>
      ) : sorted.length === 0 ? (
        /* ── Empty states ── */
        <div style={{ padding: '40px 0' }}>
          {selectedFinder ? (
            <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>{fellowshipLabel} meetings coming soon</p>
              <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 20 }}>We&apos;re working on adding {fellowshipLabel} meetings directly. In the meantime:</p>
              <a href={selectedFinder.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 10, background: 'var(--navy)', color: '#fff', textDecoration: 'none', marginBottom: 16 }}>
                {selectedFinder.label} →
              </a>
              <div><button onClick={clearAll} style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>← Back to all meetings</button></div>
            </div>
          ) : hasGeo ? (
            <div style={{ textAlign: 'center', color: 'var(--mid)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No meetings found within {radiusMiles} miles</p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>of {locationDisplayName ?? 'your location'}</p>
              {radiusMiles < 30 && (
                <button onClick={() => { setRadiusMiles(30); setPage(1) }}
                  style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'var(--navy)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', display: 'block', margin: '0 auto 12px' }}>
                  Try 30-mile radius
                </button>
              )}
              <button onClick={clearAll} style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--mid)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 15 }}>No meetings match your filters.</p>
              <button onClick={clearAll} style={{ marginTop: 12, fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* External finder banner */}
          {selectedFinder && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'rgba(42,138,153,0.06)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 2 }}>Find more {fellowshipLabel} meetings</div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>Search the official {selectedFinder.name} meeting directory</div>
              </div>
              <a href={selectedFinder.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, background: 'var(--teal)', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {selectedFinder.label} →
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginated.map(m => <MeetingCard key={m.id} meeting={m} savedId={savedIds[m.id] ?? null} />)}
          </div>

          {isTodayOnly && !hasMore && sorted.length < 5 && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.18)', fontSize: 13, color: 'var(--mid)', lineHeight: 1.5 }}>
              Showing {sorted.length} meeting{sorted.length !== 1 ? 's' : ''} today.{' '}
              <button
                type="button"
                onClick={() => { setDays([]); setSort('nearest'); setPage(1) }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--teal)', fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                View all days for more options.
              </button>
            </div>
          )}

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={() => setPage(p => p + 1)}
                style={{ padding: '10px 28px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--navy)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Load more ({sorted.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Fellowship Finders section ── */}
      <div style={{ marginTop: 48, borderTop: '1px solid var(--border)', paddingTop: 36 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>External Resources</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>Fellowship Meeting Finders</h2>
          <p style={{ fontSize: 14, color: 'var(--mid)', marginTop: 6, lineHeight: 1.6 }}>Find meetings directly on each fellowship&apos;s official website.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {FELLOWSHIP_FINDERS.map(finder => (
            <a key={finder.slug} href={finder.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(42,138,153,0.08)', color: 'var(--teal)', border: '1px solid rgba(42,138,153,0.2)', flexShrink: 0, whiteSpace: 'nowrap' }}>{finder.abbreviation}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>{finder.name}</div>
                <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 2 }}>Find meetings →</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Meeting card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting: m, savedId }: { meeting: Meeting; savedId: string | null }) {
  const fellowship = m.fellowships
  const appStyle = APPROACH_STYLE[fellowship?.approach ?? ''] ?? APPROACH_STYLE.twelve_step
  const isOnline = m.format === 'online'
  const isHybrid = m.format === 'hybrid'
  const timeStr  = fmt12h(m.start_time)

  const inner = (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 4, flexShrink: 0, background: appStyle.color, opacity: 0.45 }} />
      <div style={{ flex: 1, padding: '13px 15px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              {fellowship && (
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 7px', background: appStyle.bg, color: appStyle.color, border: `1px solid ${appStyle.border}`, whiteSpace: 'nowrap' }}>
                  {fellowship.abbreviation}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.3 }}>{m.name}</h3>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, lineHeight: 1.6 }}>
              {m.day_of_week && timeStr ? `${m.day_of_week} · ${timeStr}` : m.day_of_week ?? ''}
              {(isOnline || isHybrid)
                ? <span style={{ color: '#6D28D9' }}>{isHybrid ? ' · Hybrid' : ' · Online'}</span>
                : m.city ? ` · ${m.city}${m.state ? `, ${m.state}` : ''}` : ''
              }
              {m._distance !== undefined && !isOnline && (
                <span style={{ color: 'var(--teal)' }}> · {m._distance.toFixed(1)} mi</span>
              )}
            </div>
            {m.types && m.types.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {m.types.slice(0, 5).map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--mid)' }}>{t}</span>
                ))}
                {m.types.length > 5 && <span style={{ fontSize: 10, color: 'var(--mid)', lineHeight: '20px' }}>+{m.types.length - 5} more</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <HeartButton meetingId={m.id} initialSavedId={savedId} size={17} />
            {(isOnline || isHybrid) && m.meeting_url && (
              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--teal)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                💻 Join
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return m.slug ? (
    <Link href={`/find/meetings/${m.slug}`} className="card-hover bg-white border border-border rounded-[12px] overflow-hidden block" style={{ textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </Link>
  ) : (
    <div className="bg-white border border-border rounded-[12px] overflow-hidden">{inner}</div>
  )
}
