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
  MEETING_SPECIALTY_OPTIONS, MEETING_SORT_OPTIONS,
  haversineMiles, isLiveNow, minutesUntilMeeting, formatCountdown,
  getTimeRange, fmt12h,
} from './findUtils'

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
  twelve_step:    { bg: 'rgba(0,51,102,0.06)',   color: 'var(--navy)',  border: 'rgba(0,51,102,0.14)' },
  secular:        { bg: 'rgba(42,138,153,0.08)', color: 'var(--teal)',  border: 'rgba(42,138,153,0.2)' },
  faith:          { bg: 'rgba(212,165,116,0.1)', color: '#9A7B54',     border: 'rgba(212,165,116,0.25)' },
  harm_reduction: { bg: 'rgba(39,174,96,0.08)',  color: '#27AE60',     border: 'rgba(39,174,96,0.2)' },
}


interface Props {
  savedIds?: Record<string, string>
}

export default function MeetingsDirectory({ savedIds = {} }: Props) {
  const searchParams = useSearchParams()

  const [allMeetings, setAllMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [locationText, setLocationText] = useState('')
  const [locationDisplayName, setLocationDisplayName] = useState<string | null>(null)
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(15)

  const [fellowship, setFellowship] = useState(() => searchParams.get('fellowship') ?? '')
  const [days,       setDays]       = useState<string[]>([])
  const [times,      setTimes]      = useState<string[]>([])
  const [formats,    setFormats]    = useState<string[]>([])
  const [specialties,setSpecialties]= useState<string[]>([])
  const [sort, setSort] = useState('soonest')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('meetings')
      .select('id, name, slug, day_of_week, start_time, duration_minutes, format, location_name, city, state, latitude, longitude, meeting_url, types, is_verified, fellowships(name, abbreviation, slug, approach)')
      .order('day_of_week')
      .order('start_time')
      .then(({ data, error }) => {
        if (error) console.error('MeetingsDirectory fetch error:', error.message)
        setAllMeetings((data ?? []) as unknown as Meeting[])
        setLoading(false)
      })
  }, [])

  function handleLocationChange(v: { text: string; displayName: string | null; lat: number | null; lng: number | null; radius: number }) {
    setLocationText(v.text)
    setLocationDisplayName(v.displayName)
    setLocationLat(v.lat)
    setLocationLng(v.lng)
    setRadiusMiles(v.radius)
    setPage(1)
  }

  function removeFilter(key: string) {
    if (key === 'fellowship') { setFellowship(''); setPage(1); return }
    const colonIdx = key.indexOf(':')
    if (colonIdx === -1) return
    const field = key.slice(0, colonIdx)
    const value = key.slice(colonIdx + 1)
    if (field === 'day')       setDays(v => v.filter(x => x !== value))
    else if (field === 'time') setTimes(v => v.filter(x => x !== value))
    else if (field === 'format')    setFormats(v => v.filter(x => x !== value))
    else if (field === 'specialty') setSpecialties(v => v.filter(x => x !== value))
    setPage(1)
  }

  const hasGeo = !!(locationLat && locationLng)

  const filtered = allMeetings
    .filter(m => {
      if (fellowship) {
        const f = m.fellowships
        if (!f || f.slug !== fellowship) return false
      }
      if (days.length && !days.includes(m.day_of_week ?? '')) return false
      if (formats.length && !formats.includes(m.format ?? '')) return false
      if (times.length) {
        const bucket = getTimeRange(m.start_time)
        if (!times.includes(bucket ?? '')) return false
      }
      if (specialties.length) {
        const mTypes = m.types ?? []
        if (!specialties.some(s => mTypes.includes(s))) return false
      }
      if (hasGeo && m.format !== 'online') {
        if (!m.latitude || !m.longitude) return false
        const dist = haversineMiles(locationLat!, locationLng!, m.latitude, m.longitude)
        if (dist > radiusMiles) return false
      }
      return true
    })
    .map(m => ({
      ...m,
      _distance: hasGeo && m.latitude && m.longitude
        ? haversineMiles(locationLat!, locationLng!, m.latitude, m.longitude)
        : undefined,
      _minsUntil: minutesUntilMeeting(m.day_of_week, m.start_time),
    }))
    .sort((a, b) => {
      if (sort === 'nearest') {
        if (a._distance === undefined && b._distance === undefined) return 0
        if (a._distance === undefined) return 1
        if (b._distance === undefined) return -1
        return a._distance - b._distance
      }
      if (sort === 'alphabetical') return a.name.localeCompare(b.name)
      // soonest
      const aMins = a._minsUntil ?? Infinity
      const bMins = b._minsUntil ?? Infinity
      return aMins - bMins
    })

  const activeFilters: ActiveFilter[] = []
  if (fellowship) {
    const opt = FELLOWSHIP_OPTIONS.find(o => o.value === fellowship)
    activeFilters.push({ key: 'fellowship', label: opt?.label.split('–')[0]?.trim() ?? fellowship })
  }
  for (const d of days)      activeFilters.push({ key: `day:${d}`, label: d })
  for (const t of times) {
    const opt = TIME_OPTIONS.find(o => o.value === t)
    activeFilters.push({ key: `time:${t}`, label: opt?.label.split(' (')[0] ?? t })
  }
  for (const f of formats) {
    const opt = FORMAT_OPTIONS.find(o => o.value === f)
    activeFilters.push({ key: `format:${f}`, label: opt?.label ?? f })
  }
  for (const s of specialties) activeFilters.push({ key: `specialty:${s}`, label: s })

  const filterSummary = (() => {
    const parts: string[] = []
    if (fellowship) { const o = FELLOWSHIP_OPTIONS.find(x => x.value === fellowship); parts.push(o?.label.split('–')[0]?.trim() ?? fellowship) }
    for (const d of days) parts.push(d)
    for (const t of times) { const o = TIME_OPTIONS.find(x => x.value === t); parts.push(o?.label.split(' (')[0] ?? t) }
    for (const f of formats) { const o = FORMAT_OPTIONS.find(x => x.value === f); parts.push(o?.label ?? f) }
    for (const s of specialties) parts.push(s)
    return parts.length ? parts.join(' · ') : 'All'
  })()
  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = filtered.length > paginated.length

  return (
    <div>
      <FilterAccordion
        storageKey="meetings-directory"
        locationText={locationText}
        locationDisplayName={locationDisplayName}
        locationLat={locationLat}
        locationLng={locationLng}
        radiusMiles={radiusMiles}
        onLocationChange={handleLocationChange}
        filterHint="(fellowship, day, time, format, type)"
        filterSummary={filterSummary}
        filterSlot={
          <>
            <select
              value={fellowship}
              onChange={e => { setFellowship(e.target.value); setPage(1) }}
              style={{ padding: '7px 28px 7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', color: 'var(--dark)', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {FELLOWSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <MultiSelectDropdown
              options={DAY_OPTIONS.filter(o => o.value !== '')}
              selected={days}
              onChange={v => { setDays(v); setPage(1) }}
              defaultLabel="Any Day"
              fieldLabel="Day"
            />
            <MultiSelectDropdown
              options={TIME_OPTIONS.filter(o => o.value !== '')}
              selected={times}
              onChange={v => { setTimes(v); setPage(1) }}
              defaultLabel="Any Time"
              fieldLabel="Time"
            />
            <MultiSelectDropdown
              options={FORMAT_OPTIONS.filter(o => o.value !== '')}
              selected={formats}
              onChange={v => { setFormats(v); setPage(1) }}
              defaultLabel="Any Format"
              fieldLabel="Format"
            />
            <MultiSelectDropdown
              options={MEETING_SPECIALTY_OPTIONS.filter(o => o.value !== '')}
              selected={specialties}
              onChange={v => { setSpecialties(v); setPage(1) }}
              defaultLabel="Any Type"
              fieldLabel="Type"
            />
          </>
        }
        resultCount={loading ? null : filtered.length}
        sortValue={sort}
        sortOptions={MEETING_SORT_OPTIONS}
        onSortChange={v => { setSort(v); setPage(1) }}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 14 }}>
          Loading meetings…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <p style={{ fontSize: 15 }}>No meetings match your filters.</p>
          <button
            onClick={() => { setFellowship(''); setDays([]); setTimes([]); setFormats([]); setSpecialties([]); setPage(1) }}
            style={{ marginTop: 12, fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginated.map(m => (
              <MeetingCard key={m.id} meeting={m} savedId={savedIds[m.id] ?? null} />
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
        </>
      )}
    </div>
  )
}

function MeetingCard({ meeting: m, savedId }: { meeting: Meeting & { _distance?: number; _minsUntil?: number | null }; savedId: string | null }) {
  const fellowship = m.fellowships
  const appStyle = APPROACH_STYLE[fellowship?.approach ?? ''] ?? APPROACH_STYLE.twelve_step
  const isOnline = m.format === 'online'
  const isHybrid = m.format === 'hybrid'
  const timeStr = fmt12h(m.start_time)
  const liveNow = isLiveNow(m.day_of_week, m.start_time, m.duration_minutes)
  const countdown = m._minsUntil != null ? formatCountdown(m._minsUntil) : ''

  const inner = (
    <div style={{ display: 'flex' }}>
      <div style={{ width: 4, flexShrink: 0, background: appStyle.color, opacity: 0.45 }} />
      <div style={{ flex: 1, padding: '13px 15px 13px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              {liveNow && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#E74C3C', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 20, padding: '2px 7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  🔴 Live Now
                </span>
              )}
              {!liveNow && countdown && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(42,138,153,0.07)', border: '1px solid rgba(42,138,153,0.15)', borderRadius: 20, padding: '2px 7px' }}>
                  ⏰ {countdown}
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
                  <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--mid)' }}>
                    {t}
                  </span>
                ))}
                {m.types.length > 5 && <span style={{ fontSize: 10, color: 'var(--mid)', lineHeight: '20px' }}>+{m.types.length - 5} more</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <HeartButton meetingId={m.id} initialSavedId={savedId} size={17} />
            {(isOnline || isHybrid) && m.meeting_url && (
              <a
                href={m.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--teal)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                💻 Join
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return m.slug ? (
    <Link
      href={`/find/meetings/${m.slug}`}
      className="card-hover bg-white border border-border rounded-[12px] overflow-hidden block"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {inner}
    </Link>
  ) : (
    <div className="bg-white border border-border rounded-[12px] overflow-hidden">
      {inner}
    </div>
  )
}
