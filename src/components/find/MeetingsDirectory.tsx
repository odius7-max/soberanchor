'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FilterAccordion, { type ActiveFilter } from './FilterAccordion'
import HeartButton from './HeartButton'
import MultiSelectDropdown from './MultiSelectDropdown'
import {
  FELLOWSHIP_OPTIONS, TIME_OPTIONS, FORMAT_OPTIONS,
  MEETING_SPECIALTY_OPTIONS, LANGUAGE_OPTIONS, ACCESS_OPTIONS, MEETING_SORT_OPTIONS,
  FELLOWSHIP_FINDERS, FINDER_BY_SLUG, QUICK_FELLOWSHIP_CHIPS,
  isLiveNow, minutesUntilMeeting,
  getTimeRange, fmt12h, timeToMinutes, geocodeLocation,
} from './findUtils'

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// 'Today' and 'Tomorrow' are virtual tokens resolved to actual day names at runtime; '' = All
const DAY_PILLS = [
  { label: 'Today',    value: 'Today'     },
  { label: 'Tomorrow', value: 'Tomorrow'  },
  { label: 'Mon',      value: 'Monday'    },
  { label: 'Tue',      value: 'Tuesday'   },
  { label: 'Wed',      value: 'Wednesday' },
  { label: 'Thu',      value: 'Thursday'  },
  { label: 'Fri',      value: 'Friday'    },
  { label: 'Sat',      value: 'Saturday'  },
  { label: 'Sun',      value: 'Sunday'    },
  { label: 'All',      value: ''          },
]

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
  _minsUntil?: number | null
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

  const [fellowship,   setFellowship]   = useState(() => searchParams.get('fellowship') ?? '')
  const [selectedDay,  setSelectedDay]  = useState<string>('Today')   // '' = All
  const [times,        setTimes]        = useState<string[]>([])
  const [formats,      setFormats]      = useState<string[]>([])
  const [specialties,  setSpecialties]  = useState<string[]>([])
  const [languages,    setLanguages]    = useState<string[]>([])
  const [access,       setAccess]       = useState('')
  const [sort,         setSort]         = useState('soonest')

  const [todayName,    setTodayName]    = useState('')
  const [tomorrowName, setTomorrowName] = useState('')
  const [clientNowMins, setClientNowMins] = useState<number | null>(null)
  const [profileGeoAttempted, setProfileGeoAttempted] = useState(false)

  // ── Geolocation — tries localStorage cache first, then browser prompt ───────
  useEffect(() => {
    // Use cached coords if < 5 min old — avoids re-prompting on every visit
    try {
      const raw = localStorage.getItem('soberanchor:geo')
      if (raw) {
        const { lat, lng, ts } = JSON.parse(raw) as { lat: number; lng: number; ts: number }
        if (Date.now() - ts < 5 * 60 * 1000) {
          setLocationLat(lat); setLocationLng(lng)
          setLocationText('Near you'); setLocationDisplayName('Near you')
          setGeoStatus('granted'); setSort('nearest')
          reverseGeocode(lat, lng)
          return
        }
      }
    } catch { /* ignore bad cache */ }

    if (!navigator.geolocation) return
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          setGeoStatus('granted'); setSort('nearest')
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

  // ── Client-side day + time (browser timezone — never server UTC) ─────────
  useEffect(() => {
    const d = new Date()
    setTodayName(DAY_NAMES[d.getDay()] ?? '')
    setTomorrowName(DAY_NAMES[(d.getDay() + 1) % 7] ?? '')
    setClientNowMins(d.getHours() * 60 + d.getMinutes())
  }, [])

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
    if (key === 'day')        { setSelectedDay('Today'); setPage(1); return }
    const ci = key.indexOf(':')
    if (ci === -1) return
    const field = key.slice(0, ci), value = key.slice(ci + 1)
    if (field === 'time')      setTimes(v => v.filter(x => x !== value))
    else if (field === 'format')    setFormats(v => v.filter(x => x !== value))
    else if (field === 'specialty') setSpecialties(v => v.filter(x => x !== value))
    else if (field === 'language')  setLanguages(v => v.filter(x => x !== value))
    setPage(1)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasGeo           = !!(locationLat && locationLng)
  const isOnlyTodayFilter = selectedDay === 'Today' && todayName !== ''

  // When no location is available (and not still requesting), show only online meetings
  const onlineOnlyMode = !hasGeo && geoStatus !== 'requesting' && geoStatus !== 'idle'

  // Resolve 'Today'/'Tomorrow' tokens to actual day names for filtering
  const effectiveDayFilter: string[] =
    selectedDay === ''         ? [] :
    selectedDay === 'Today'    ? (todayName    ? [todayName]    : []) :
    selectedDay === 'Tomorrow' ? (tomorrowName ? [tomorrowName] : []) :
    [selectedDay]

  // ── Filter + sort helpers ─────────────────────────────────────────────────
  function applyFilters(dayFilter: string[], fromNow: boolean): Meeting[] {
    return allMeetings.filter(m => {
      if (fellowship && (!m.fellowships || m.fellowships.slug !== fellowship)) return false
      if (dayFilter.length && !dayFilter.includes(m.day_of_week ?? ''))         return false
      if (formats.length && !formats.includes(m.format ?? ''))                  return false
      if (times.length) { const b = getTimeRange(m.start_time); if (!times.includes(b ?? '')) return false }
      if (specialties.length && !specialties.some(s => (m.types ?? []).includes(s))) return false
      if (languages.length  && !languages.some(l => (m.types ?? []).includes(l)))    return false
      if (access && !(m.types ?? []).includes(access))                          return false
      if (hasGeo && m.format !== 'online' && nearbyDistances !== null && !nearbyDistances.has(m.id)) return false
      if (onlineOnlyMode && m.format !== 'online')                              return false
      // "Today from now": hide meetings whose end time is >30 min in the past
      if (fromNow && clientNowMins !== null && dayFilter.length === 1 && m.day_of_week === dayFilter[0]) {
        const endMins = timeToMinutes(m.start_time) + (m.duration_minutes ?? 60)
        if (endMins < clientNowMins - 30) return false
      }
      return true
    }).map(m => ({
      ...m,
      _distance: nearbyDistances?.get(m.id),
      _minsUntil: minutesUntilMeeting(m.day_of_week, m.start_time),
    }))
  }

  function sortMeetings(arr: Meeting[]): Meeting[] {
    return [...arr].sort((a, b) => {
      if (sort === 'nearest') {
        if (a._distance === undefined && b._distance === undefined) return 0
        if (a._distance === undefined) return 1
        if (b._distance === undefined) return -1
        return a._distance - b._distance
      }
      if (sort === 'alphabetical') return a.name.localeCompare(b.name)
      // soonest: _minsUntil accounts for wrap-around (passed meetings → ~10080)
      const am = a._minsUntil ?? Infinity, bm = b._minsUntil ?? Infinity
      if (am !== bm) return am - bm
      if (a._distance !== undefined && b._distance !== undefined) return a._distance - b._distance
      if (a._distance !== undefined) return -1
      if (b._distance !== undefined) return 1
      return 0
    })
  }

  // Today's upcoming meetings (primary list when selectedDay === 'Today')
  const todayFiltered: Meeting[] = isOnlyTodayFilter
    ? sortMeetings(applyFilters(todayName ? [todayName] : [], true))
    : []

  // Rollover: show tomorrow when after 9 PM OR fewer than 3 meetings left today
  const showTomorrow = isOnlyTodayFilter && tomorrowName !== '' && clientNowMins !== null &&
    (clientNowMins >= 21 * 60 || todayFiltered.length < 3)

  const tomorrowFiltered: Meeting[] = showTomorrow
    ? sortMeetings(applyFilters([tomorrowName], false))
    : []

  // Main list for non-today views
  const mainFiltered: Meeting[] = !isOnlyTodayFilter
    ? sortMeetings(applyFilters(effectiveDayFilter, false))
    : todayFiltered

  const paginated = mainFiltered.slice(0, page * ITEMS_PER_PAGE)
  const hasMore   = mainFiltered.length > paginated.length

  // ── Active filter pills ───────────────────────────────────────────────────
  const activeFilters: ActiveFilter[] = []
  if (fellowship) { const o = FELLOWSHIP_OPTIONS.find(x => x.value === fellowship); activeFilters.push({ key: 'fellowship', label: o?.label.split('–')[0]?.trim() ?? fellowship }) }
  if (selectedDay && selectedDay !== 'Today') { const p = DAY_PILLS.find(x => x.value === selectedDay); activeFilters.push({ key: 'day', label: p?.label ?? selectedDay }) }
  for (const t of times)      { const o = TIME_OPTIONS.find(x => x.value === t);      activeFilters.push({ key: `time:${t}`,      label: o?.label.split(' (')[0] ?? t }) }
  for (const f of formats)    { const o = FORMAT_OPTIONS.find(x => x.value === f);    activeFilters.push({ key: `format:${f}`,    label: o?.label ?? f }) }
  for (const s of specialties) activeFilters.push({ key: `specialty:${s}`, label: s })
  for (const l of languages)   activeFilters.push({ key: `language:${l}`,  label: l })
  if (access) { const o = ACCESS_OPTIONS.find(x => x.value === access); activeFilters.push({ key: 'access', label: o?.label.split(' (')[0] ?? access }) }

  const filterSummary = (() => {
    const parts: string[] = []
    if (fellowship)  { const o = FELLOWSHIP_OPTIONS.find(x => x.value === fellowship); parts.push(o?.label.split('–')[0]?.trim() ?? fellowship) }
    if (selectedDay && selectedDay !== 'Today') parts.push(selectedDay)
    for (const t of times)   { const o = TIME_OPTIONS.find(x => x.value === t);   parts.push(o?.label.split(' (')[0] ?? t) }
    for (const f of formats) { const o = FORMAT_OPTIONS.find(x => x.value === f); parts.push(o?.label ?? f) }
    for (const s of specialties) parts.push(s)
    for (const l of languages)   parts.push(l)
    if (access) { const o = ACCESS_OPTIONS.find(x => x.value === access); parts.push(o?.label.split(' (')[0] ?? access) }
    return parts.length ? parts.join(' · ') : 'All'
  })()

  // ── Display helpers ───────────────────────────────────────────────────────
  const selectedFinder = fellowship ? FINDER_BY_SLUG[fellowship] ?? null : null
  const fellowshipLabel = fellowship ? (FELLOWSHIP_OPTIONS.find(o => o.value === fellowship)?.label.split('–')[0]?.trim() ?? fellowship) : null

  const resultLabel = (hasGeo && nearbyDistances !== null && !nearbyLoading)
    ? `${mainFiltered.length.toLocaleString()} meeting${mainFiltered.length !== 1 ? 's' : ''} within ${radiusMiles} mi`
    : undefined

  const locationPrompt = geoStatus === 'requesting' ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>Detecting your location…</div>
  ) : nearbyLoading ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>Finding meetings near you…</div>
  ) : geoStatus === 'denied' && !hasGeo ? (
    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ opacity: 0.6 }}>📍</span>
      {profileGeoAttempted
        ? `Showing results near ${[userCity, userState].filter(Boolean).join(', ')}`
        : 'Enter a city or zip above to see in-person meetings near you'
      }
    </div>
  ) : null

  const sectionHeader = (() => {
    const loc = hasGeo ? 'near you' : null
    if (selectedDay === 'Today') {
      if (showTomorrow) return loc ? `Meetings ${loc} — Today & Tomorrow` : 'Today & Tomorrow'
      return loc ? `Meetings ${loc} — Today` : 'Today'
    }
    if (selectedDay === 'Tomorrow') return loc ? `Meetings ${loc} — Tomorrow` : 'Tomorrow'
    if (selectedDay === '') return loc ? `All meetings ${loc}` : 'All meetings'
    return loc ? `${selectedDay} meetings ${loc}` : `${selectedDay} meetings`
  })()

  function clearAll() {
    setFellowship(''); setSelectedDay('Today'); setTimes([]); setFormats([])
    setSpecialties([]); setLanguages([]); setAccess(''); setPage(1)
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
        filterHint="(fellowship, time, format, type, language, access)"
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
        resultCount={loading ? null : mainFiltered.length}
        resultLabel={resultLabel}
        sortValue={sort}
        sortOptions={MEETING_SORT_OPTIONS}
        onSortChange={v => { setSort(v); setPage(1) }}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      {/* ── Online-only mode banner ── */}
      {onlineOnlyMode && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 12, marginBottom: 14, background: 'rgba(42,138,153,0.05)', border: '1px solid rgba(42,138,153,0.2)' }}>
          <span style={{ fontSize: 20, lineHeight: 1.4 }}>📍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>Showing online meetings</div>
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>Enter a city or zip in the Location field above to also see in-person meetings near you.</div>
          </div>
        </div>
      )}

      {/* ── Day pill bar ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2, scrollbarWidth: 'none' }}>
        {DAY_PILLS.map(pill => {
          const active = selectedDay === pill.value
          return (
            <button key={pill.value || 'all'} onClick={() => { setSelectedDay(pill.value); setPage(1) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-body)', background: active ? 'var(--navy)' : 'var(--warm-gray)', border: `1.5px solid ${active ? 'var(--navy)' : 'var(--border)'}`, color: active ? '#fff' : 'var(--dark)' }}>
              {pill.label}
            </button>
          )
        })}
      </div>

      {/* ── Fellowship chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {QUICK_FELLOWSHIP_CHIPS.map(chip => {
          const active = fellowship === chip.slug
          return (
            <button key={chip.slug} onClick={() => { setFellowship(chip.slug); setPage(1) }}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-body)', background: active ? 'var(--navy)' : 'var(--warm-gray)', border: `1.5px solid ${active ? 'var(--navy)' : 'var(--border)'}`, color: active ? '#fff' : 'var(--dark)' }}>
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ── Section header ── */}
      {!loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{sectionHeader}</div>
          {isOnlyTodayFilter && (
            <button onClick={() => { setSelectedDay(''); setPage(1) }}
              style={{ fontSize: 12, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', padding: 0 }}>
              Show all days →
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 14 }}>Loading meetings…</div>
      ) : mainFiltered.length === 0 ? (
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
          ) : isOnlyTodayFilter && tomorrowName ? (
            /* No meetings left today */
            <div style={{ textAlign: 'center', color: 'var(--mid)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌙</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                No more meetings today{hasGeo ? ` near ${locationDisplayName ?? 'you'}` : ''}
              </p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>Here&apos;s what&apos;s coming up tomorrow:</p>
              <button onClick={() => { setSelectedDay(tomorrowName); setPage(1) }}
                style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'var(--navy)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)' }}>
                See {tomorrowName}&apos;s meetings →
              </button>
              <div style={{ marginTop: 12 }}>
                <button onClick={() => { setSelectedDay(''); setPage(1) }}
                  style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  Or browse all days
                </button>
              </div>
            </div>
          ) : hasGeo ? (
            /* Location set but nothing in radius */
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
            /* Generic / no location */
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

          {/* Today's meetings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginated.map(m => <MeetingCard key={m.id} meeting={m} savedId={savedIds[m.id] ?? null} />)}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={() => setPage(p => p + 1)}
                style={{ padding: '10px 28px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--navy)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Load more ({mainFiltered.length - paginated.length} remaining)
              </button>
            </div>
          )}

          {/* ── Tomorrow rollover section ── */}
          {showTomorrow && tomorrowFiltered.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                Tomorrow — {tomorrowName}{hasGeo ? ' near you' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tomorrowFiltered.slice(0, ITEMS_PER_PAGE).map(m => <MeetingCard key={m.id} meeting={m} savedId={savedIds[m.id] ?? null} />)}
              </div>
              {tomorrowFiltered.length > ITEMS_PER_PAGE && (
                <button onClick={() => { setSelectedDay(tomorrowName); setPage(1) }}
                  style={{ marginTop: 12, fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  See all {tomorrowFiltered.length} {tomorrowName} meetings →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Meeting Finders section ── */}
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
  const liveNow  = isLiveNow(m.day_of_week, m.start_time, m.duration_minutes)

  // Rich time status badge
  const minsUntil = m._minsUntil
  const timeStatus = (() => {
    if (liveNow) return { type: 'live' as const, text: 'Happening now' }
    if (minsUntil != null && minsUntil > 0) {
      if (minsUntil < 60)  return { type: 'soon'     as const, text: `Starts in ${minsUntil}m` }
      if (minsUntil < 120) return { type: 'starting' as const, text: `Starts at ${timeStr}` }
    }
    return null
  })()

  const inner = (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 4, flexShrink: 0, background: appStyle.color, opacity: 0.45 }} />
      <div style={{ flex: 1, padding: '13px 15px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Time status badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              {timeStatus?.type === 'live' && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#27AE60', background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: 20, padding: '2px 7px', letterSpacing: '0.5px' }}>
                  ● Happening now
                </span>
              )}
              {timeStatus?.type === 'soon' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(42,138,153,0.07)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 20, padding: '2px 7px' }}>
                  ⏰ {timeStatus.text}
                </span>
              )}
              {timeStatus?.type === 'starting' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(42,138,153,0.07)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 20, padding: '2px 7px' }}>
                  {timeStatus.text}
                </span>
              )}
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
