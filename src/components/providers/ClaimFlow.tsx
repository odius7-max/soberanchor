'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CONTINUATION_PARAM, buildContinuation, claimCancelHref } from '@/lib/claim-continuation'

type Step = 'search' | 'done'
type Outcome = 'verified' | 'pending'

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

const SUPPORT_EMAIL = 'providers@soberanchor.com'

interface Props {
  // No userId prop: the claim's actor is derived server-side from the session,
  // never passed in from the client.
  preselectedFacility?: SearchResult | null
  /** Persisted status when the signed-in user already owns the preselected facility. */
  initialOutcome?: Outcome | null
  /** A previous claim by this user for this facility was rejected. */
  wasRejected?: boolean
  /** The user's provider account has been suspended by an admin. */
  accountInactive?: boolean
  /** The ?facility= id did not resolve to a listing. */
  missingFacility?: boolean
}

export default function ClaimFlow({
  preselectedFacility = null,
  initialOutcome = null,
  wasRejected = false,
  accountInactive = false,
  missingFacility = false,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(initialOutcome ? 'done' : 'search')
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome)
  const [query, setQuery] = useState(preselectedFacility?.name ?? '')
  const [results, setResults] = useState<SearchResult[]>(preselectedFacility ? [preselectedFacility] : [])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(preselectedFacility ?? null)
  const [claimedFacility, setClaimedFacility] = useState<SearchResult | null>(
    initialOutcome ? preselectedFacility : null
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPreselected = preselectedFacility !== null

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

  /**
   * ODI-68: the claim is a single server-side transaction now.
   *
   * The old version wrote provider_accounts and facilities straight from the
   * browser. RLS refuses both (facilities is SELECT-only; provider_accounts has
   * no INSERT policy), so the writes silently no-op'd and the user was pushed to
   * a dashboard that had nothing in it. Verification, account creation and
   * linking are all decided server-side now — this function only reports.
   *
   * On any failure we stay on this page. Navigating away on a failed claim is
   * what made the original bug invisible.
   */
  async function claimFacility(facility: SearchResult) {
    setSubmitting(true); setError(null)

    let res: Response
    try {
      res = await fetch('/api/providers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facility.id }),
      })
    } catch {
      setSubmitting(false)
      setError('We could not reach the server. Check your connection and try again.')
      return
    }

    const payload = await res.json().catch(() => null) as
      { status?: Outcome; error?: string; code?: string } | null

    setSubmitting(false)

    if (!res.ok) {
      // 401 — the session lapsed mid-flow. Resume authentication against this
      // same facility rather than dropping the claim.
      if (res.status === 401) {
        const continuation = buildContinuation(facility.id)
        router.replace(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`)
        return
      }
      setError(payload?.error ?? 'Something went wrong. Your claim was not submitted.')
      return
    }

    if (payload?.status !== 'verified' && payload?.status !== 'pending') {
      setError('Something went wrong. Your claim was not submitted.')
      return
    }

    setClaimedFacility(facility)
    setOutcome(payload.status)
    setStep('done')
    // Let the dashboard and listing pages see the committed claim.
    router.refresh()
  }

  const inputStyle = (focused = false) => ({
    width: '100%', padding: '10px 13px', border: `1.5px solid ${focused ? 'var(--teal)' : 'var(--border)'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none', boxSizing: 'border-box' as const, color: 'var(--dark)',
  })

  const cancelHref = claimCancelHref(preselectedFacility?.id ?? null)
  const doneFacility = claimedFacility ?? preselectedFacility

  const noticeStyle = {
    background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10,
    padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#721C24',
  } as const

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>
          {step === 'done' ? 'Your Claim' : 'Claim Your Listing'}
        </h1>
        {/* Deterministic exit — a shared or direct link may have no same-site
            history entry, so history.back() can strand the visitor. */}
        <Link
          href={cancelHref}
          aria-label="Close"
          style={{
            flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--mid)', fontSize: 26, lineHeight: 1, textDecoration: 'none', marginTop: -4,
          }}
        >
          ×
        </Link>
      </div>

      {step === 'search' && (
        <p style={{ color: 'var(--mid)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Your facility may already be in our directory. Search below to find and claim it.
        </p>
      )}

      {missingFacility && (
        <div style={noticeStyle}>
          We couldn&apos;t find that listing — it may have been removed. Search for your facility below.
        </div>
      )}

      {accountInactive && (
        <div style={noticeStyle}>
          Your provider account is currently suspended, so new claims are on hold.
          Contact <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#721C24', fontWeight: 600 }}>{SUPPORT_EMAIL}</a> to restore access.
        </div>
      )}

      {wasRejected && (
        <div style={{ background: '#FFF6E5', border: '1px solid #F0D9A8', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, color: '#7A5A15', lineHeight: 1.6 }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>This claim wasn&apos;t approved</strong>
          A previous claim for {preselectedFacility?.name ?? 'this listing'} was reviewed and not approved.
          Any other listings on your account are unaffected. To reopen this one, contact{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#7A5A15', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>.
        </div>
      )}

      {error && <div style={noticeStyle} role="alert">{error}</div>}

      {step === 'search' && (
        <>
          {isPreselected && selected && (
            <div style={{ background: 'rgba(42,138,153,0.07)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
                      <button onClick={e => { e.stopPropagation(); claimFacility(r) }} disabled={submitting || accountInactive || wasRejected}
                        style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', opacity: (submitting || accountInactive || wasRejected) ? 0.6 : 1 }}>
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

          {/*
            "Add a New Listing" used to post straight into facilities, which RLS
            refuses — it looked like it worked and silently did nothing. Adding
            new listings is out of scope for this branch (ODI-53), so the path is
            honest about being unavailable rather than left looking functional.
          */}
          <div style={{ background: 'var(--warm-gray, #F7F5F2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              Don&apos;t see your facility?
            </div>
            <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>
              Adding a brand-new listing isn&apos;t self-serve yet. Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>{' '}
              with your facility details and we&apos;ll add it for you.
            </div>
          </div>
        </>
      )}

      {step === 'done' && outcome && (
        <div className="card-hover" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{outcome === 'verified' ? '✅' : '🕒'}</div>

          {outcome === 'verified' ? (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                Your claim for {doneFacility?.name ?? 'your facility'} is verified.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 20 }}>
                We matched your email domain to the listing&apos;s website, so your claim was approved automatically.
                Your listing now shows a verified badge.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                Claim submitted for {doneFacility?.name ?? 'your facility'}.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 12 }}>
                Your claim is awaiting review. Check this page for updates.
              </p>
              <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 20 }}>
                Listing changes aren&apos;t available until your claim is approved.
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={doneFacility ? `/dashboard?mode=facility&facility=${doneFacility.id}` : '/dashboard?mode=facility'}
              style={{ background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              Go to your dashboard →
            </Link>
            <Link
              href={cancelHref}
              style={{ background: 'none', color: 'var(--teal)', border: '1.5px solid var(--teal)', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              View your listing
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
