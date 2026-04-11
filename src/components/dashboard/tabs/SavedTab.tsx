'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { unsaveListing } from '@/app/find/actions'

interface SavedItem {
  id: string
  list_type: 'favorite' | 'watchlist'
  note: string | null
  created_at: string
  meeting_id: string | null
  facility_id: string | null
  meeting?: {
    id: string
    name: string
    slug: string | null
    day_of_week: string | null
    start_time: string | null
    format: string | null
    city: string | null
    state: string | null
    meeting_url: string | null
    fellowships: { abbreviation: string; approach: string } | null
  } | null
  facility?: {
    id: string
    name: string
    city: string | null
    state: string | null
    facility_type: string
    phone: string | null
    website: string | null
  } | null
}

function fmt12(t: string | null): string {
  if (!t) return ''
  const parts = t.split(':')
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

const FACILITY_ICONS: Record<string, string> = {
  treatment: '🏥', sober_living: '🏠', therapist: '💆', outpatient: '💊', venue: '🍹',
}

const APPROACH_STYLE: Record<string, { color: string }> = {
  twelve_step:    { color: 'var(--navy)' },
  secular:        { color: 'var(--teal)' },
  faith:          { color: '#9A7B54' },
  harm_reduction: { color: '#27AE60' },
}

interface Props {
  userId: string
}

export default function SavedTab({ userId }: Props) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState<'all' | 'favorite' | 'watchlist'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('saved_listings')
      .select(`
        id, list_type, note, created_at, meeting_id, facility_id,
        meeting:meetings(id, name, slug, day_of_week, start_time, format, city, state, meeting_url, fellowships(abbreviation, approach)),
        facility:facilities(id, name, city, state, facility_type, phone, website)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as SavedItem[])
        setLoading(false)
      })
  }, [userId])

  async function handleRemove(savedId: string) {
    setItems(prev => prev.filter(i => i.id !== savedId))
    try {
      await unsaveListing(savedId)
    } catch {
      // silently ignore — item already removed from UI
    }
  }

  const filtered = activeList === 'all' ? items : items.filter(i => i.list_type === activeList)
  const meetings = filtered.filter(i => i.meeting_id && i.meeting)
  const facilities = filtered.filter(i => i.facility_id && i.facility)

  const favoriteCount = items.filter(i => i.list_type === 'favorite').length
  const watchlistCount = items.filter(i => i.list_type === 'watchlist').length

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mid)', fontSize: 14 }}>
        Loading saved listings…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--mid)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No saved listings yet</p>
        <p style={{ fontSize: 13, maxWidth: 300, margin: '0 auto', lineHeight: 1.6, marginBottom: 20 }}>
          Tap the heart icon on any meeting or facility to save it here.
        </p>
        <Link
          href="/find"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none', background: 'rgba(42,138,153,0.08)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 8, padding: '9px 18px' }}
        >
          Browse the Directory →
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* List type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          { id: 'all', label: `All (${items.length})` },
          { id: 'favorite', label: `❤️ Favorites (${favoriteCount})` },
          { id: 'watchlist', label: `🔖 Watchlist (${watchlistCount})` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveList(tab.id)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: '1.5px solid',
              borderColor: activeList === tab.id ? 'var(--teal)' : 'var(--border)',
              background: activeList === tab.id ? 'rgba(42,138,153,0.08)' : '#fff',
              color: activeList === tab.id ? 'var(--teal)' : 'var(--mid)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Meetings */}
      {meetings.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 12 }}>
            👥 My Meetings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meetings.map(item => {
              const m = item.meeting!
              const f = m.fellowships
              const appColor = APPROACH_STYLE[f?.approach ?? '']?.color ?? 'var(--navy)'
              const isOnline = m.format === 'online'
              const timeStr = fmt12(m.start_time)

              return (
                <div key={item.id} className="bg-white border border-border rounded-[12px] overflow-hidden" style={{ display: 'flex' }}>
                  <div style={{ width: 4, flexShrink: 0, background: appColor, opacity: 0.5 }} />
                  <div style={{ flex: 1, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          {f && (
                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 6px', background: 'var(--warm-gray)', color: appColor, border: '1px solid var(--border)' }}>
                              {f.abbreviation}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'var(--mid)', background: item.list_type === 'favorite' ? 'rgba(231,76,60,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 20, padding: '2px 6px', border: '1px solid var(--border)' }}>
                            {item.list_type === 'favorite' ? '❤️ Favorite' : '🔖 Watchlist'}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
                          {m.day_of_week && timeStr ? `${m.day_of_week} · ${timeStr}` : m.day_of_week ?? ''}
                          {isOnline
                            ? <span style={{ color: '#6D28D9' }}> · Online</span>
                            : m.city ? ` · ${m.city}${m.state ? `, ${m.state}` : ''}` : ''
                          }
                        </div>
                        {item.note && (
                          <div style={{ fontSize: 11, color: 'var(--mid)', fontStyle: 'italic', marginTop: 4 }}>
                            &ldquo;{item.note}&rdquo;
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {isOnline && m.meeting_url && (
                          <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--teal)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            💻 Join
                          </a>
                        )}
                        {m.slug && (
                          <Link href={`/find/meetings/${m.slug}`}
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => handleRemove(item.id)}
                          title="Remove from saved"
                          style={{ fontSize: 13, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* My Saved Listings */}
      {facilities.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 12 }}>
            🏥 My Saved Listings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {facilities.map(item => {
              const f = item.facility!
              const icon = FACILITY_ICONS[f.facility_type] ?? '📍'

              return (
                <div key={item.id} className="bg-white border border-border rounded-[12px] overflow-hidden">
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'var(--teal-10)' }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: 'var(--mid)', background: item.list_type === 'favorite' ? 'rgba(231,76,60,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 20, padding: '2px 6px', border: '1px solid var(--border)' }}>
                              {item.list_type === 'favorite' ? '❤️ Favorite' : '🔖 Watchlist'}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.name}</div>
                          {(f.city || f.state) && (
                            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
                              📍 {[f.city, f.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                          {item.note && (
                            <div style={{ fontSize: 11, color: 'var(--mid)', fontStyle: 'italic', marginTop: 4 }}>
                              &ldquo;{item.note}&rdquo;
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <Link href={`/find/${f.id}`}
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            View
                          </Link>
                          <button
                            onClick={() => handleRemove(item.id)}
                            title="Remove from saved"
                            style={{ fontSize: 13, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mid)', fontSize: 13 }}>
          No {activeList === 'favorite' ? 'favorites' : 'watchlist items'} yet.
        </div>
      )}
    </div>
  )
}
