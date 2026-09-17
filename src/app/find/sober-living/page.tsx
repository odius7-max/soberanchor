import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase'
import FacilitiesDirectory from '@/components/find/FacilitiesDirectory'
import FeaturedBand from '@/components/find/FeaturedBand'
import { getUserSavedIds } from '../actions'

export const metadata: Metadata = { title: 'Sober Living Homes — SoberAnchor' }

// SAMHSA facilities that report offering transitional housing / sober homes
// (service_detail.TC contains this exact value — set during enrichment import)
const RECOVERY_HOUSING_CONTAINMENT = {
  TC: { values: ['Transitional housing, halfway house, or sober home'] },
}

const STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX',
  'UT','VT','VA','WA','WV','WI','WY',
] as const

const EXTERNAL_FINDERS = [
  {
    href: 'https://www.oxfordvacancies.com/',
    icon: '🏠',
    title: 'Oxford House Vacancies',
    desc: '3,500+ democratically run recovery homes nationwide. Search live bed openings and apply directly.',
    cta: 'Search live vacancies →',
    bg: 'var(--gold-10)',
  },
  {
    href: 'https://narronline.org/affiliates/',
    icon: '✅',
    title: 'NARR-Certified Residences',
    desc: 'The National Alliance for Recovery Residences certifies homes to national quality standards, state by state.',
    cta: 'Find your state affiliate →',
    bg: 'var(--teal-10)',
  },
]

export default async function SoberLivingPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()

  let savedIds: Record<string, string> = {}
  if (user) {
    const saved = await getUserSavedIds()
    for (const s of saved) {
      if (s.facility_id) savedIds[s.facility_id] = s.id
    }
  }

  // ── Cross-listed recovery housing: treatment centers reporting sober-home services ──
  const { state: rawState } = await searchParams
  const stateFilter = rawState && (STATE_CODES as readonly string[]).includes(rawState.toUpperCase())
    ? rawState.toUpperCase()
    : null

  let countQ = supabase
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('facility_type', 'treatment')
    .contains('service_detail', RECOVERY_HOUSING_CONTAINMENT)
  if (stateFilter) countQ = countQ.eq('state', stateFilter)
  const { count: housingCount } = await countQ

  let rowsQ = supabase
    .from('facilities')
    .select('id, name, city, state, is_featured, is_verified, is_claimed, source')
    .eq('facility_type', 'treatment')
    .contains('service_detail', RECOVERY_HOUSING_CONTAINMENT)
    .order('name')
    .limit(20)
  if (stateFilter) rowsQ = rowsQ.eq('state', stateFilter)
  const { data: housing } = await rowsQ

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8 pb-20">
      <Link href="/find" className="text-teal text-sm font-semibold hover:underline">
        ← All Categories
      </Link>

      <div className="mt-5 mb-8">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">Directory</p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-1.0px' }}
        >
          Sober Living Homes
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[560px]">
          Transitional housing and recovery residences for people in early sobriety.
        </p>
      </div>

      {/* External finders — the authoritative sources for live recovery-housing openings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {EXTERNAL_FINDERS.map(f => (
          <a
            key={f.href}
            href={f.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover block bg-white border border-border rounded-[16px] overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div
                className="flex items-center justify-center rounded-xl shrink-0 text-[32px]"
                style={{ width: 60, height: 60, background: f.bg }}
              >
                {f.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-navy text-[15px] leading-snug">{f.title}</div>
                <div className="text-mid text-[13px] mt-0.5 leading-snug">{f.desc}</div>
                <div className="text-teal text-[12px] font-semibold mt-1">{f.cta}</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Native sober-living listings (claimed/provider listings) */}
      <FeaturedBand facilityType="sober_living" />
      <FacilitiesDirectory facilityType="sober_living" savedIds={savedIds} />

      {/* Cross-listed: treatment centers that report offering recovery housing */}
      {housing && housing.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-1">
            <h2
              className="text-[22px] font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
            >
              Treatment Centers Offering Recovery Housing
            </h2>
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="state" className="text-[13px] text-mid font-semibold">State</label>
              <select
                id="state"
                name="state"
                defaultValue={stateFilter ?? ''}
                className="text-[13px] rounded-lg border px-2.5 py-1.5"
                style={{ borderColor: 'var(--border)', color: 'var(--dark)', fontFamily: 'var(--font-body)' }}
              >
                <option value="">All states</option>
                {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                type="submit"
                className="text-[13px] font-semibold rounded-lg px-3 py-1.5"
                style={{ background: 'var(--teal)', color: '#fff', fontFamily: 'var(--font-body)' }}
              >
                Go
              </button>
            </form>
          </div>
          <p className="text-sm text-mid mb-5">
            {(housingCount ?? 0).toLocaleString()} SAMHSA-listed treatment facilities
            {stateFilter ? ` in ${stateFilter}` : ''} report offering transitional housing, halfway house, or sober-home services.
            {(housingCount ?? 0) > 20 ? ' Showing the first 20 — filter by state to narrow.' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {housing.map(f => (
              <Link
                key={f.id}
                href={`/find/${f.id}`}
                className="card-hover block bg-white border border-border rounded-[14px] overflow-hidden"
              >
                <div className="flex flex-wrap">
                  <div
                    className="shrink-0 flex items-center justify-center text-[40px]"
                    style={{ width: 120, minHeight: 100, background: 'var(--gold-10)' }}
                  >
                    🏠
                  </div>
                  <div className="flex-1 p-4 px-5 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-0.5" style={{ color: '#9A7B54', background: 'var(--gold-10)', border: '1px solid rgba(212,165,116,0.2)' }}>
                        Recovery Housing
                      </span>
                      {f.is_verified && f.is_claimed && (
                        <span className="inline-flex items-center gap-1 bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-semibold rounded-full px-3 py-0.5">
                          ✓ Verified
                        </span>
                      )}
                      {!f.is_verified && f.source === 'samhsa' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-0.5" style={{ color: '#4A6785', background: 'rgba(74,103,133,0.08)', border: '1px solid rgba(74,103,133,0.2)' }}>
                          SAMHSA Listed
                        </span>
                      )}
                    </div>
                    <h3 className="text-[16px] text-navy font-semibold leading-snug">{f.name}</h3>
                    {(f.city || f.state) && (
                      <p className="text-[13px] text-mid mt-1">
                        📍 {[f.city, f.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex justify-end mt-2">
                      <span className="text-teal font-semibold text-sm">View Details →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
