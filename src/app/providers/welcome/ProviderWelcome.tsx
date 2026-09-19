'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { buildContinuation } from '@/lib/claim-continuation'

interface Props {
  initialName: string
  initialOrganization: string
  setupComplete: boolean
  hasProviderAccount: boolean
}

interface FacilityHit {
  id: string
  name: string
  city: string | null
  state: string | null
  is_claimed: boolean
}

const SUPPORT_HREF = '/for-providers#claim'

/**
 * Provider welcome + funnel (PROVIDER-PATH-SPEC §3).
 *
 * Two steps, deliberately in this order: identity first (so nav and the
 * provider account have a name and organization to use), then facility search.
 *
 * The search step exists because of E10/E11: generic /providers/claim bounces
 * an existing owner to their dashboard, so a second location can never be added
 * by handing off blindly to that route. The UUID is selected HERE and travels
 * in the link, so the claim page always receives a specific facility.
 */
export default function ProviderWelcome({
  initialName, initialOrganization, setupComplete, hasProviderAccount,
}: Props) {
  const router = useRouter()
  const { refreshProfile } = useAuth()

  const [step, setStep] = useState<'identity' | 'facility'>(setupComplete ? 'facility' : 'identity')
  const [name, setName] = useState(initialName)
  const [organization, setOrganization] = useState(initialOrganization)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FacilityHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (step !== 'facility') return
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await createClient()
        .from('facilities')
        .select('id,name,city,state,is_claimed')
        .ilike('name', `%${query}%`)
        .limit(8)
      setResults((data ?? []) as FacilityHit[])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, step])

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    setSaving(true); setError(null)

    // display_name lives in user_profiles: it is an existing field with existing
    // semantics, already visible to a sponsor by design, and it is what stops
    // generic sign-in from showing this provider the recovery first-setup modal.
    const supabase = createClient()
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({ id: (await supabase.auth.getUser()).data.user?.id, display_name: name.trim() })

    if (profileErr) { setSaving(false); setError('We could not save that. Please try again.'); return }

    // organization_name + setup completion go to user_setup via the one writer.
    // It is never written from a render, and it grants no access to anything.
    const res = await fetch('/api/workspace/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete-provider-setup', organization_name: organization.trim() || null }),
    }).catch(() => null)

    setSaving(false)
    if (!res || !res.ok) { setError('We could not save that. Please try again.'); return }

    await refreshProfile()   // nav label must not go stale behind the new name
    router.refresh()         // and the server-rendered shells re-read setup
    setStep('facility')
  }

  const heading = { fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.75px' } as const
  const input = {
    width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8,
    fontSize: 15, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none',
    boxSizing: 'border-box' as const, color: 'var(--dark)',
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px 80px' }}>
      <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3">For Providers</p>

      {step === 'identity' ? (
        <>
          <h1 style={{ ...heading, fontSize: 32, fontWeight: 600, marginBottom: 8 }}>
            Welcome — let&apos;s set up your account
          </h1>
          <p className="text-[15px] text-mid leading-[1.7] mb-8">
            Two quick things, then we&apos;ll help you find your facility in the directory.
          </p>

          {error && (
            <div role="alert" style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#721C24' }}>
              {error}
            </div>
          )}

          <form onSubmit={saveIdentity} className="bg-white rounded-[16px] border border-border p-7" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
            <label className="block text-[13px] font-semibold text-navy mb-1.5">Your name *</label>
            <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoFocus />

            <label className="block text-[13px] font-semibold text-navy mb-1.5 mt-5">
              Organization <span className="font-normal text-mid">(optional)</span>
            </label>
            <input style={input} value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Serenity Ridge Recovery" />
            <p className="text-[12px] text-mid mt-2">
              We&apos;ll use this on your account and carry it over when you claim a listing.
            </p>

            <button type="submit" disabled={saving}
              style={{ width: '100%', marginTop: 22, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 style={{ ...heading, fontSize: 32, fontWeight: 600, marginBottom: 8 }}>
            {hasProviderAccount ? 'Add another location' : 'Find your facility'}
          </h1>
          <p className="text-[15px] text-mid leading-[1.7] mb-8">
            Search the directory for the facility you manage. We&apos;ll take you straight to its claim page.
          </p>

          <div className="bg-white rounded-[16px] border border-border p-7 mb-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
            <label className="block text-[13px] font-semibold text-navy mb-1.5">Facility name</label>
            <div style={{ position: 'relative' }}>
              <input style={input} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Serenity Ridge Treatment Center" autoFocus />
              {searching && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)', fontSize: 12 }}>Searching…</span>
              )}
            </div>

            {results.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginTop: 12 }}>
                {results.map((r, i) => (
                  <div key={r.id} style={{ padding: '13px 15px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: r.is_claimed ? 'var(--mid)' : 'var(--navy)' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>
                        {[r.city, r.state].filter(Boolean).join(', ')}
                        {r.is_claimed && <span style={{ color: '#E67E22', fontWeight: 500 }}> · Already claimed</span>}
                      </div>
                    </div>
                    {!r.is_claimed && (
                      /* The UUID is chosen HERE and carried in the href, so the
                         claim page always gets a specific facility — the generic
                         route would bounce an existing owner to their dashboard. */
                      <Link href={buildContinuation(r.id)}
                        style={{ background: 'var(--teal)', color: '#fff', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        This is mine →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 12 }}>
                No results for &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>

          {/* E09: the existing email-request form is retained as-is and is NOT
              the signup door. It creates no listing and no account. */}
          <div style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              My facility isn&apos;t listed
            </div>
            <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>
              Send us the details and we&apos;ll add it —{' '}
              <Link href={SUPPORT_HREF} style={{ color: 'var(--teal)', fontWeight: 600 }}>
                request a listing →
              </Link>
            </div>
          </div>

          {hasProviderAccount && (
            <p style={{ textAlign: 'center', marginTop: 20 }}>
              <Link href="/dashboard?mode=facility" style={{ fontSize: 14, color: 'var(--mid)', textDecoration: 'underline' }}>
                Back to your dashboard
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
