'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { geocodeLocation, buildLocationSummary } from './findUtils'

export interface ActiveFilter {
  key: string
  label: string
}

interface Props {
  storageKey: string
  // Location
  locationText: string
  locationDisplayName: string | null
  locationLat: number | null
  locationLng: number | null
  radiusMiles: number
  onLocationChange: (v: {
    text: string
    displayName: string | null
    lat: number | null
    lng: number | null
    radius: number
  }) => void
  // Filters section
  filterHint: string          // "(fellowship, day, time, format)"
  filterSummary: string       // "AA · Monday" or "All"
  filterSlot: ReactNode       // type-specific dropdowns
  // Results row
  resultCount: number | null
  /** When provided, replaces the auto-generated "X results" count text */
  resultLabel?: string
  sortValue: string
  sortOptions: Array<{ value: string; label: string }>
  onSortChange: (v: string) => void
  activeFilters: ActiveFilter[]
  onRemoveFilter: (key: string) => void
}

const sel: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
  fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff',
  color: 'var(--dark)', cursor: 'pointer', outline: 'none',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  paddingRight: 28,
}

export default function FilterAccordion({
  storageKey,
  locationText, locationDisplayName, locationLat, locationLng, radiusMiles,
  onLocationChange,
  filterHint, filterSummary, filterSlot,
  resultCount, resultLabel, sortValue, sortOptions, onSortChange,
  activeFilters, onRemoveFilter,
}: Props) {
  const [locOpen, setLocOpen] = useState(true)
  const [filOpen, setFilOpen] = useState(true)
  const [inputText, setInputText] = useState(locationText)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore open/close from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:accordion`)
      if (stored) {
        const { locOpen: l, filOpen: f } = JSON.parse(stored)
        setLocOpen(l)
        setFilOpen(f)
      }
    } catch { /* ignore */ }
  }, [storageKey])

  // Persist open/close state
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:accordion`, JSON.stringify({ locOpen, filOpen }))
    } catch { /* ignore */ }
  }, [storageKey, locOpen, filOpen])

  // Keep input in sync when parent resets
  useEffect(() => { setInputText(locationText) }, [locationText])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not available in this browser.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        // Reverse geocode to get display name
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { 'User-Agent': 'SoberAnchor/1.0' },
        })
          .then(r => r.json())
          .then(data => {
            const parts = (data.address?.city || data.address?.town || data.address?.village || data.address?.county || '')
            const state = data.address?.state_abbreviation || data.address?.state || ''
            const displayName = [parts, state].filter(Boolean).join(', ')
            setInputText(displayName || 'Near you')
            onLocationChange({ text: displayName || 'Near you', displayName: displayName || 'Near you', lat, lng, radius: radiusMiles })
          })
          .catch(() => {
            setInputText('Near you')
            onLocationChange({ text: 'Near you', displayName: 'Near you', lat, lng, radius: radiusMiles })
          })
          .finally(() => setGeoLoading(false))
      },
      err => {
        setGeoLoading(false)
        setGeoError(err.code === 1 ? 'Location access denied.' : 'Unable to get location.')
      }
    )
  }

  function handleTextChange(val: string) {
    setInputText(val)
    setGeoError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      onLocationChange({ text: '', displayName: null, lat: null, lng: null, radius: radiusMiles })
      return
    }
    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true)
      const result = await geocodeLocation(val)
      setGeoLoading(false)
      if (result) {
        onLocationChange({ text: val, displayName: result.displayName, lat: result.lat, lng: result.lng, radius: radiusMiles })
      } else {
        setGeoError('Location not found. Try a city name or zip code.')
        onLocationChange({ text: val, displayName: null, lat: null, lng: null, radius: radiusMiles })
      }
    }, 700)
  }

  function clearLocation() {
    setInputText('')
    setGeoError(null)
    onLocationChange({ text: '', displayName: null, lat: null, lng: null, radius: radiusMiles })
  }

  const locationSummary = buildLocationSummary(locationDisplayName, radiusMiles)
  const hasLocation = !!(locationLat && locationLng)

  const hdr: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  }
  const hdrLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', textTransform: 'uppercase',
    color: 'var(--navy)',
  }
  const hdrRight: React.CSSProperties = {
    fontSize: 12, color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 6,
  }

  return (
    <div>
      {/* Accordion card */}
      <div className="bg-white rounded-[14px] border border-border mb-4" style={{ position: 'relative' }}>

        {/* ── Location section ── */}
        <div>
          <div style={hdr} onClick={() => setLocOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={hdrLabel}>📍 Location</span>
              <span style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 400 }}>(city, zip, or address)</span>
            </div>
            <div style={hdrRight}>
              {hasLocation && locationSummary && (
                <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{locationSummary}</span>
              )}
              <span style={{ fontSize: 14, color: 'var(--mid)', transition: 'transform 0.2s', display: 'inline-block', transform: locOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
          </div>

          {locOpen && (
            <div style={{ padding: '14px 16px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="City, zip code, or address…"
                    value={inputText}
                    onChange={e => handleTextChange(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 34px 9px 12px',
                      borderRadius: 8, border: '1.5px solid var(--border)',
                      fontSize: 13, fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box', outline: 'none', color: 'var(--dark)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {inputText && (
                    <button onClick={clearLocation} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 15, lineHeight: 1, padding: 2 }}>✕</button>
                  )}
                </div>
                <button
                  onClick={useMyLocation}
                  disabled={geoLoading}
                  style={{
                    padding: '9px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border)', background: hasLocation && !inputText ? 'var(--teal-10)' : '#fff',
                    fontSize: 12, fontWeight: 600, color: 'var(--navy)',
                    cursor: geoLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {geoLoading ? '…' : '📍 Use my location'}
                </button>
              </div>

              {geoError && (
                <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 8 }}>{geoError}</div>
              )}

              {/* Radius slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600, whiteSpace: 'nowrap' }}>Radius:</span>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={radiusMiles}
                  onChange={e => onLocationChange({ text: locationText, displayName: locationDisplayName, lat: locationLat, lng: locationLng, radius: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--teal)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', whiteSpace: 'nowrap', minWidth: 38, textAlign: 'right' }}>{radiusMiles} mi</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Filters section ── */}
        <div>
          <div style={{ ...hdr, borderBottom: 'none' }} onClick={() => setFilOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={hdrLabel}>🔧 Filters</span>
              <span style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 400 }}>{filterHint}</span>
            </div>
            <div style={hdrRight}>
              {filterSummary !== 'All' && (
                <span style={{ color: 'var(--teal)', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterSummary}</span>
              )}
              {filterSummary === 'All' && <span>All</span>}
              <span style={{ fontSize: 14, color: 'var(--mid)', transition: 'transform 0.2s', display: 'inline-block', transform: filOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
          </div>

          {filOpen && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {filterSlot}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results row: count + active pills + sort ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Result count */}
        <span style={{ fontSize: 13, color: 'var(--mid)', marginRight: 4, whiteSpace: 'nowrap' }}>
          {resultCount === null ? 'Loading…' : (resultLabel ?? `${resultCount.toLocaleString()} result${resultCount !== 1 ? 's' : ''}`)}
        </span>

        {/* Active filter pills */}
        {activeFilters.map(f => (
          <button
            key={f.key}
            onClick={() => onRemoveFilter(f.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: 'rgba(42,138,153,0.08)', border: '1px solid rgba(42,138,153,0.2)',
              color: 'var(--teal)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {f.label}
            <span style={{ fontSize: 11, opacity: 0.7 }}>✕</span>
          </button>
        ))}

        {/* Sort — push to right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500 }}>Sort:</span>
          <select value={sortValue} onChange={e => onSortChange(e.target.value)} style={{ ...sel, fontSize: 12 }}>
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
