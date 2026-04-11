'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { SmartSearchResponse, MeetingResult, FacilityResult, ArticleResult } from '@/lib/resources'
import { pillarToCategory, readTime } from '@/lib/resources'

export type SearchContext = 'home' | 'resources' | 'directory' | 'member'

const PLACEHOLDERS: Record<SearchContext, string> = {
  home:      'Ask me anything — try "help for my son who\'s gambling" or "AA meetings tonight"',
  resources: 'Ask me anything — try "what is step work" or "how to support a loved one"',
  directory: 'Ask me anything — try "detox near Phoenix" or "sober living for women"',
  member:    'Ask me anything — try "how to find a sponsor" or "what to expect at first meeting"',
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

// ─── Compact result rows ──────────────────────────────────────────────────────

function CrisisBanner({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ background: '#fff4f4', border: '1.5px solid #e74c3c', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
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

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'AA meetings near me',
  'help for my son who drinks',
  'sober living in my city',
  'how to support someone in recovery',
  'gambling addiction help',
  'what happens at a first AA meeting',
]

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
  const [inputFocused, setInputFocused] = useState(false)
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px 24px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal panel */}
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 660, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '82vh' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header: AI label + Esc ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Sparkle icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 1 L8.8 5.5 L13 6 L8.8 6.5 L8 11 L7.2 6.5 L3 6 L7.2 5.5 Z" fill="#2A8A99"/>
              <path d="M13 1 L13.5 3 L15 3.5 L13.5 4 L13 6 L12.5 4 L11 3.5 L12.5 3 Z" fill="#2A8A99" opacity="0.6"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.3px' }}>AI Search</span>
          </div>
          <button onClick={onClose}
            style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Esc
          </button>
        </div>

        {/* ── Large input ── */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: inputFocused ? '#fff' : 'var(--warm-gray)',
            border: `2px solid ${inputFocused ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 14, padding: '14px 16px',
            transition: 'border-color 0.15s, background 0.15s',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleChange(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={PLACEHOLDERS[context]}
              style={{ flex: 1, fontSize: 16, border: 'none', outline: 'none', background: 'transparent', color: 'var(--dark)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}
            />
            {loading && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            )}
            {query && !loading && (
              <button onClick={() => { setQuery(''); setResult(null); inputRef.current?.focus() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mid)', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>
                ✕
              </button>
            )}
          </div>

          {/* Powered by AI badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px 12px' }}>
            <span style={{ fontSize: 11, color: 'var(--mid)' }}>
              Understands natural language — describe what you need
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1 L8.8 5.5 L13 6 L8.8 6.5 L8 11 L7.2 6.5 L3 6 L7.2 5.5 Z" fill="currentColor"/>
              </svg>
              Powered by AI
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* ── Results area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>

          {/* Idle state */}
          {!query && !result && (
            <div style={{ padding: '24px 14px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', letterSpacing: '0.5px', marginBottom: 10, paddingLeft: 2 }}>
                Try asking…
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map(ex => (
                  <button key={ex} onClick={() => { setQuery(ex); search(ex) }}
                    style={{ fontSize: 12, color: 'var(--dark)', background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)'; e.currentTarget.style.background = 'var(--teal-10)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dark)'; e.currentTarget.style.background = 'var(--warm-gray)' }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {result?.error && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
              {result.error}
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
              No results for &ldquo;{result?.query}&rdquo;.<br />
              <span style={{ fontSize: 13 }}>Try different phrasing or browse the directory.</span>
            </div>
          )}

          {/* Results */}
          {hasResults && result && (
            <>
              {/* Query + AI tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 6px' }}>
                <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                  Results for &ldquo;{result.query}&rdquo;
                </span>
                {result.ai_powered && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'var(--teal-10)', border: '1px solid var(--teal-20)', color: 'var(--teal)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 1 L8.8 5.5 L13 6 L8.8 6.5 L8 11 L7.2 6.5 L3 6 L7.2 5.5 Z" fill="currentColor"/>
                    </svg>
                    AI-matched
                  </span>
                )}
              </div>

              {result.crisis && <div style={{ padding: '0 8px 4px' }}><CrisisBanner onClose={onClose} /></div>}

              {(result.meetings?.length ?? 0) > 0 && (
                <ResultSection icon="🤝" label="Meetings" count={result.meetings.length}>
                  {result.meetings.map(m => <MeetingRow key={m.id} m={m} onClose={onClose} />)}
                  <Link href="/find#meetings" onClick={onClose}
                    style={{ display: 'block', padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                    Browse all meetings →
                  </Link>
                </ResultSection>
              )}

              {(result.facilities?.length ?? 0) > 0 && (
                <ResultSection icon="🏥" label="Treatment & Support" count={result.facilities.length}>
                  {result.facilities.map(f => <FacilityRow key={f.id} f={f} onClose={onClose} />)}
                  <Link href="/find#facilities" onClick={onClose}
                    style={{ display: 'block', padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                    Browse all listings →
                  </Link>
                </ResultSection>
              )}

              {(result.articles?.length ?? 0) > 0 && (
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
