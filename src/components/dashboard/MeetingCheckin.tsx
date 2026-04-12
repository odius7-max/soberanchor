'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Meeting {
  id: string
  name: string
  day_of_week: string | null
  start_time: string | null
  format: string
  location_name: string | null
  city: string | null
  fellowships: { abbreviation: string | null } | null
}

const CHIPS = ['All', 'AA', 'NA', 'CR', 'SMART', 'Al-Anon', 'GA']

const FC: Record<string, { bg: string; color: string }> = {
  AA:        { bg: 'rgba(0,51,102,0.07)',    color: '#003366' },
  NA:        { bg: 'rgba(42,138,153,0.08)',  color: '#2A8A99' },
  GA:        { bg: 'rgba(155,89,182,0.08)',  color: '#8E44AD' },
  SMART:     { bg: 'rgba(39,174,96,0.08)',   color: '#27AE60' },
  'Al-Anon': { bg: 'rgba(212,165,116,0.12)', color: '#9A7B54' },
  CR:        { bg: 'rgba(230,126,34,0.08)',  color: '#E67E22' },
}

const DAY_ORDER: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
}

const PAGE_SIZE = 20

function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

interface Props { userId: string }

export default function MeetingCheckin({ userId }: Props) {
  const [allMeetings, setAllMeetings]     = useState<Meeting[]>([])
  const [savedMeetings, setSavedMeetings] = useState<Meeting[]>([])
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([])
  const [loggedToday, setLoggedToday]     = useState<Set<string>>(new Set())
  const [logging, setLogging]             = useState<string | null>(null)
  const [filter, setFilter]               = useState('All')
  const [searchInput, setSearchInput]     = useState('')
  const [search, setSearch]               = useState('')
  const [shownCount, setShownCount]       = useState(PAGE_SIZE)
  const [loading, setLoading]             = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [
        { data: allData },
        { data: savedData },
        { data: recentData },
        { data: todayData },
      ] = await Promise.all([
        supabase
          .from('meetings')
          .select('id,name,day_of_week,start_time,format,location_name,city,fellowships(abbreviation)')
          .order('name'),
        supabase
          .from('saved_listings')
          .select('meeting_id')
          .eq('user_id', userId)
          .not('meeting_id', 'is', null),
        supabase
          .from('meeting_attendance')
          .select('meeting_id')
          .eq('user_id', userId)
          .not('meeting_id', 'is', null)
          .order('attended_at', { ascending: false })
          .limit(50),
        supabase
          .from('meeting_attendance')
          .select('meeting_id')
          .eq('user_id', userId)
          .not('meeting_id', 'is', null)
          .gte('attended_at', todayStart.toISOString()),
      ])

      // Sort meetings by day-of-week then start time
      const meetings = (allData as unknown as Meeting[]) ?? []
      meetings.sort((a, b) => {
        const da = DAY_ORDER[a.day_of_week?.toLowerCase() ?? ''] ?? 7
        const db = DAY_ORDER[b.day_of_week?.toLowerCase() ?? ''] ?? 7
        if (da !== db) return da - db
        return (a.start_time ?? '').localeCompare(b.start_time ?? '')
      })
      setAllMeetings(meetings)

      // Saved meetings (both favorites and watchlist)
      const savedMeetingIds = new Set(
        (savedData ?? []).map(s => s.meeting_id).filter(Boolean) as string[]
      )
      setSavedMeetings(meetings.filter(m => savedMeetingIds.has(m.id)))

      // Recently attended: distinct IDs, exclude saved, up to 5
      const seenIds = new Set<string>()
      const recentIds: string[] = []
      for (const row of (recentData ?? [])) {
        if (row.meeting_id && !seenIds.has(row.meeting_id) && !savedMeetingIds.has(row.meeting_id)) {
          seenIds.add(row.meeting_id)
          recentIds.push(row.meeting_id)
          if (recentIds.length >= 5) break
        }
      }
      const meetingMap = new Map(meetings.map(m => [m.id, m]))
      setRecentMeetings(recentIds.map(id => meetingMap.get(id)).filter(Boolean) as Meeting[])

      // Already logged today
      setLoggedToday(new Set(
        (todayData ?? []).map(a => a.meeting_id).filter(Boolean) as string[]
      ))

      setLoading(false)
    }
    load()
  }, [userId])

  function handleSearchInput(val: string) {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setShownCount(PAGE_SIZE)
    }, 300)
  }

  function handleFilterChange(f: string) {
    setFilter(f)
    setShownCount(PAGE_SIZE)
  }

  async function handleCheckin(m: Meeting) {
    setLogging(m.id)
    const supabase = createClient()
    await supabase.from('meeting_attendance').insert({
      user_id: userId,
      meeting_id: m.id,
      meeting_name: m.name,
      fellowship_name: m.fellowships?.abbreviation ?? null,
      location_name: m.location_name,
      checkin_method: 'directory',
    })
    setLoggedToday(prev => new Set([...prev, m.id]))
    setLogging(null)
  }

  function applyFilter(list: Meeting[]) {
    return list.filter(m => {
      const abbr = m.fellowships?.abbreviation ?? ''
      if (filter !== 'All' && abbr !== filter) return false
      if (search.trim()) {
        const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
        return words.every(w =>
          m.name.toLowerCase().includes(w) ||
          (m.location_name ?? '').toLowerCase().includes(w) ||
          (m.city ?? '').toLowerCase().includes(w) ||
          abbr.toLowerCase().includes(w)
        )
      }
      return true
    })
  }

  const filteredSaved  = applyFilter(savedMeetings)
  const filteredRecent = applyFilter(recentMeetings)

  // "All meetings" excludes anything already shown in the two sections above
  const alreadyShownIds = new Set([
    ...savedMeetings.map(m => m.id),
    ...recentMeetings.map(m => m.id),
  ])
  const filteredAll = applyFilter(allMeetings.filter(m => !alreadyShownIds.has(m.id)))
  const shownAll    = filteredAll.slice(0, shownCount)
  const hasMore     = shownCount < filteredAll.length

  function renderCard(m: Meeting, saved = false) {
    const abbr = m.fellowships?.abbreviation ?? null
    const fc   = abbr ? (FC[abbr] ?? { bg: 'rgba(136,136,136,0.07)', color: '#888' }) : { bg: 'rgba(136,136,136,0.07)', color: '#888' }
    const isLogged   = loggedToday.has(m.id)
    const isLogging  = logging === m.id
    const fmtBadge =
      m.format === 'online'  ? { label: 'Online',    bg: 'rgba(39,174,96,0.08)',   color: '#27AE60' } :
      m.format === 'hybrid'  ? { label: 'Hybrid',    bg: 'rgba(212,165,116,0.1)',  color: '#9A7B54' } :
                               { label: 'In-Person', bg: 'rgba(42,138,153,0.08)',  color: '#2A8A99' }

    return (
      <div
        key={m.id}
        className="card-hover rounded-[16px] p-5 flex items-start gap-4 bg-white"
        style={{
          border: '1px solid var(--border)',
          borderLeft: saved ? '3px solid #D4A574' : '1px solid var(--border)',
          paddingLeft: saved ? '18px' : '20px',
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-navy mb-1" style={{ fontSize: '15px' }}>{m.name}</div>
          <div className="flex gap-2 flex-wrap mb-2">
            {abbr && (
              <span className="rounded-full font-bold" style={{ fontSize: '11px', padding: '2px 9px', background: fc.bg, color: fc.color }}>
                {abbr}
              </span>
            )}
            <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '2px 9px', background: fmtBadge.bg, color: fmtBadge.color }}>
              {fmtBadge.label}
            </span>
          </div>
          <div className="text-mid" style={{ fontSize: '13px' }}>
            {m.day_of_week && <span style={{ textTransform: 'capitalize' }}>{m.day_of_week}</span>}
            {m.start_time  && <span>{m.day_of_week ? ' · ' : ''}{fmtTime(m.start_time)}</span>}
            {(m.location_name || m.city) && (
              <span>{(m.day_of_week || m.start_time) ? ' · ' : ''}{m.location_name ?? m.city}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => !isLogged && handleCheckin(m)}
          disabled={isLogging || isLogged}
          className="rounded-xl font-semibold flex-shrink-0 transition-all"
          style={{
            fontSize: '13px', padding: '8px 16px',
            cursor: isLogged ? 'default' : isLogging ? 'wait' : 'pointer',
            background: isLogged ? 'rgba(39,174,96,0.1)' : 'var(--navy)',
            border:     isLogged ? '1.5px solid rgba(39,174,96,0.3)' : '1.5px solid var(--navy)',
            color:      isLogged ? '#27AE60' : '#fff',
            opacity:    isLogging ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {isLogged ? '✓ Logged' : isLogging ? '…' : 'I Was Here'}
        </button>
      </div>
    )
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
    textTransform: 'uppercase', color: 'var(--mid)',
  }

  return (
    <div>
      {/* ── Banner ── */}
      <div
        className="rounded-[20px] overflow-hidden mb-5 relative"
        style={{ background: 'linear-gradient(145deg,#002244 0%,#003366 50%,#1a4a5e 100%)', padding: '28px 32px' }}
      >
        <svg aria-hidden="true" className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 80" fill="none" preserveAspectRatio="none" style={{ height: '80px', width: '100%', opacity: 0.05 }}>
          <path d="M0 40 Q225 0 450 40 Q675 80 900 40 L900 80 L0 80Z" fill="#fff" />
        </svg>
        <div className="relative">
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Meeting Check-in
          </div>
          <div className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Find &amp; log your meeting
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
            Your saved meetings appear first for quick check-in.
          </div>
        </div>
      </div>

      {/* ── Fellowship chips ── */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CHIPS.map(f => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className="rounded-full font-semibold transition-colors"
            style={{
              fontSize: '13px', padding: '6px 14px', cursor: 'pointer',
              background: filter === f ? 'var(--navy)' : 'var(--warm-gray)',
              border:     filter === f ? '1.5px solid var(--navy)' : '1.5px solid var(--border)',
              color:      filter === f ? '#fff' : 'var(--dark)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-mid" style={{ fontSize: '14px' }}>Loading meetings…</div>
      ) : (
        <>
          {/* ── My Meetings (saved) ── */}
          {filteredSaved.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={sectionLabel}>My Meetings</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(212,165,116,0.15)', color: '#9A7B54', border: '1px solid rgba(212,165,116,0.3)' }}>
                  {filteredSaved.length} saved
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredSaved.map(m => renderCard(m, true))}
              </div>
            </div>
          )}

          {/* ── Recently Attended ── */}
          {filteredRecent.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={sectionLabel}>Recently Attended</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredRecent.map(m => renderCard(m, false))}
              </div>
            </div>
          )}

          {/* ── All Meetings ── */}
          <div>
            {/* Section header + search bar */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', marginBottom: '12px', flexWrap: 'wrap',
              }}
            >
              <span style={sectionLabel}>All Meetings</span>
              <div style={{ position: 'relative', flex: 1, maxWidth: '340px', minWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--mid)', pointerEvents: 'none' }}>
                  🔍
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Search for meetings..."
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: '10px',
                    border: '1.5px solid var(--border)', fontSize: '13px',
                    fontFamily: 'var(--font-body)', color: 'var(--dark)',
                    background: '#fff', boxSizing: 'border-box', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2A8A99')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {filteredAll.length === 0 ? (
              <div className="text-center py-10 text-mid" style={{ fontSize: '14px' }}>
                {search.trim()
                  ? <>No meetings match &ldquo;{search}&rdquo;.</>
                  : 'No meetings found for this filter.'}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {shownAll.map(m => renderCard(m, false))}
                </div>

                {hasMore ? (
                  <button
                    onClick={() => setShownCount(c => c + PAGE_SIZE)}
                    style={{
                      display: 'block', width: '100%', marginTop: '14px',
                      padding: '13px', borderRadius: '12px',
                      border: '1.5px solid var(--border)',
                      background: '#fff', fontSize: '14px', fontWeight: 600,
                      color: 'var(--navy)', cursor: 'pointer', textAlign: 'center',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Load more meetings ({filteredAll.length - shownCount} remaining)
                  </button>
                ) : filteredAll.length > PAGE_SIZE ? (
                  <div className="text-center text-mid mt-4" style={{ fontSize: '13px' }}>
                    All {filteredAll.length} meetings shown
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
