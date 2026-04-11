'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { SmartSearchResponse, MeetingResult, FacilityResult, ArticleResult } from '@/lib/resources'
import { pillarToCategory, readTime } from '@/lib/resources'

export type SearchContext = 'home' | 'resources' | 'directory' | 'member'

const PLACEHOLDERS: Record<SearchContext, string> = {
  home:      'Search for meetings, treatment, articles…',
  resources: 'Search articles and guides…',
  directory: 'Search meetings, treatment centers, sober living…',
  member:    'Ask about step work, meetings, recovery…',
}

const FACILITY_LABELS: Record<string, string> = {
  treatment: 'Treatment',
  sober_living: 'Sober Living',
  therapist: 'Therapist',
  venue: 'Sober Venue',
  outpatient: 'Outpatient',
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)__sa_csrf=([^;]+)/)
  return m?.[1] ?? ''
}

function formatTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ─── Compact result cards ─────────────────────────────────────────────────────

function CrisisBanner({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ background: '#fff4f4', border: '1.5px solid #e74c3c', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c0392b', marginBottom: 6 }}>
        Crisis Resources — 24/7
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="tel:18006624357" onClick={onClose}
          style={{ display: 'inline-block', background: '#c0392b', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          SAMHSA · 1-800-662-4357
        </a>
        <a href="tel:988" onClick={onClose}
          style={{ display: 'inline-block', background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Crisis Lifeline · 988
        </a>
      </div>
    </div>
  )
}

function MeetingRow({ m, onClose }: { m: MeetingResult; onClose: () => void }) {
  const href = m.slug ? `/find/meetings/${m.slug}` : '/find#meetings'
  const where = [m.city, m.state].filter(Boolean).join(', ')
  const when = [m.day_of_week, formatTime(m.start_time)].filter(Boolean).join(' · ')
  return (
    <Link href={href} onClick={onClose}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', gap: 12 }}
      className="hover:bg-warm-gray transition-colors"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 1 }}>
          {m.fellowship_name}{when ? ` · ${when}` : ''}{where ? ` · ${where}` : ''}
          {m.meeting_url ? ' · Online' : ''}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, flexShrink: 0 }}>→</span>
    </Link>
  )
}

function FacilityRow({ f, onClose }: { f: FacilityResult; onClose: () => void }) {
  const href = f.slug ? `/find/${f.slug}` : '/find#facilities'
  const where = [f.city, f.state].filter(Boolean).join(', ')
  return (
    <Link href={href} onClick={onClose}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', gap: 12 }}
      className="hover:bg-warm-gray transition-colors"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {f.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 1 }}>
          {FACILITY_LABELS[f.facility_type] ?? f.facility_type}
          {where ? ` · ${where}` : ''}
          {f.accepts_insurance ? ' · Accepts insurance' : ''}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, flexShrink: 0 }}>→</span>
    </Link>
  )
}

function ArticleRow({ a, onClose }: { a: ArticleResult; onClose: () => void }) {
  const cat = pillarToCategory(a.pillar ?? '')
  const href = `/resources/${cat}/${a.slug}`
  return (
    <Link href={href} onClick={onClose}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', gap: 12 }}
      className="hover:bg-warm-gray transition-colors"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        {a.excerpt && (
          <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.excerpt}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
          {a.author ?? 'SoberAnchor Team'} · {readTime(a.body)} min
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, flexShrink: 0 }}>→</span>
    </Link>
  )
}

function ResultSection({ icon, label, count, children }: {
  icon: string; label: string; count: number; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px 4px' }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--mid)' }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--mid)', background: 'var(--warm-gray)', borderRadius: 20, padding: '1px 7px' }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  context: SearchContext
  onClose: () => void
}

export default function GlobalSearch({ open, context, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SmartSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      setQuery('')
      setResult(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const csrf = getCsrfToken()
      const headers: HeadersInit = csrf ? { 'X-CSRF-Token': csrf } : {}
      const res = await fetch(
        `/api/smart-search?q=${encodeURIComponent(q)}&context=${context}`,
        { headers, signal: controller.signal }
      )

      const empty: SmartSearchResponse = { query: q, intent: null, meetings: [], facilities: [], articles: [], crisis: false, ai_powered: false }

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setResult({ ...empty, error: body.error ?? 'Too many requests. Please wait before searching again.' })
        return
      }
      if (res.status === 403) {
        setResult({ ...empty, error: 'Search unavailable. Please reload the page and try again.' })
        return
      }
      if (!res.ok) {
        setResult({ ...empty, error: 'Search unavailable. Please try again.' })
        return
      }

      const data: SmartSearchResponse = await res.json()
      // Guard against malformed responses — ensure arrays are always present
      setResult({
        ...data,
        meetings: Array.isArray(data.meetings) ? data.meetings : [],
        facilities: Array.isArray(data.facilities) ? data.facilities : [],
        articles: Array.isArray(data.articles) ? data.articles : [],
      })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setResult({ query: q, intent: null, meetings: [], facilities: [], articles: [], crisis: false, ai_powered: false, error: 'Search unavailable. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }, [context])

  function handleChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResult(null); return }
    debounceRef.current = setTimeout(() => search(val.trim()), 350)
  }

  if (!open) return null

  const hasResults = result && (
    result.crisis ||
    (result.meetings?.length ?? 0) > 0 ||
    (result.facilities?.length ?? 0) > 0 ||
    (result.articles?.length ?? 0) > 0
  )

  const showEmpty = result && !hasResults && !result.error && !loading

  return (
    /* Backdrop */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px 24px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal panel */}
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '80vh' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder={PLACEHOLDERS[context]}
            style={{ flex: 1, fontSize: 16, border: 'none', outline: 'none', background: 'transparent', color: 'var(--dark)', fontFamily: 'var(--font-body)' }}
          />
          {loading && (
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          )}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResult(null); inputRef.current?.focus() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mid)', padding: 4, lineHeight: 1 }}>
              ✕
            </button>
          )}
          <button onClick={onClose}
            style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            Esc
          </button>
        </div>

        {/* Results area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {/* Idle state */}
          {!query && !result && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚓</div>
              <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
                Search across meetings, treatment centers, articles, and guides.<br />
                Try &ldquo;AA meetings near me&rdquo; or &ldquo;how to help a loved one&rdquo;.
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['AA meetings', 'sober living', 'how to help someone who relapsed', 'gambling addiction'].map(ex => (
                  <button key={ex} onClick={() => { setQuery(ex); search(ex) }}
                    style={{ fontSize: 12, color: 'var(--mid)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                    className="hover:border-teal hover:text-teal transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {result?.error && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
              {result.error}
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
              No results for &ldquo;{result?.query}&rdquo;.<br />
              <span style={{ fontSize: 13 }}>Try different keywords or browse the directory.</span>
            </div>
          )}

          {/* Results */}
          {hasResults && result && (
            <>
              {/* AI badge + query */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 14px 8px' }}>
                <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                  Results for &ldquo;{result.query}&rdquo;
                </span>
                {result.ai_powered && (
                  <span style={{ fontSize: 11, background: 'var(--teal-10)', border: '1px solid var(--teal-20)', color: 'var(--teal)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                    ✨ AI
                  </span>
                )}
              </div>

              {result.crisis && <div style={{ padding: '0 8px 4px' }}><CrisisBanner onClose={onClose} /></div>}

              {result.meetings.length > 0 && (
                <ResultSection icon="🤝" label="Meetings" count={result.meetings.length}>
                  {result.meetings.map(m => <MeetingRow key={m.id} m={m} onClose={onClose} />)}
                  <Link href="/find#meetings" onClick={onClose}
                    style={{ display: 'block', padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                    Browse all meetings →
                  </Link>
                </ResultSection>
              )}

              {result.facilities.length > 0 && (
                <ResultSection icon="🏥" label="Treatment & Support" count={result.facilities.length}>
                  {result.facilities.map(f => <FacilityRow key={f.id} f={f} onClose={onClose} />)}
                  <Link href="/find#facilities" onClick={onClose}
                    style={{ display: 'block', padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                    Browse all listings →
                  </Link>
                </ResultSection>
              )}

              {result.articles.length > 0 && (
                <ResultSection icon="📖" label="Articles & Guides" count={result.articles.length}>
                  {result.articles.map(a => <ArticleRow key={a.id} a={a} onClose={onClose} />)}
                  <Link href="/resources" onClick={onClose}
                    style={{ display: 'block', padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                    Browse all resources →
                  </Link>
                </ResultSection>
              )}
            </>
          )}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
