import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 3600

const CATEGORIES = [
  {
    type: 'treatment',
    href: '/find/treatment',
    icon: '🏥',
    title: 'Treatment Centers',
    desc: 'Inpatient, residential, and detox programs.',
    bg: 'var(--teal-10)',
  },
  {
    type: 'sober_living',
    href: '/find/sober-living',
    icon: '🏠',
    title: 'Sober Living Homes',
    desc: 'Transitional housing and recovery residences.',
    bg: 'var(--gold-10)',
  },
  {
    type: 'therapist',
    href: '/find/therapists',
    icon: '💆',
    title: 'Therapists & Counselors',
    desc: 'Addiction specialists, dual-diagnosis, family therapy.',
    bg: 'rgba(39,174,96,0.07)',
  },
  {
    type: 'outpatient',
    href: '/find/outpatient',
    icon: '💊',
    title: 'Outpatient Programs',
    desc: 'IOP, OP, and day programs.',
    bg: 'rgba(155,89,182,0.07)',
  },
  {
    type: 'venue',
    href: '/find/venues',
    icon: '🍹',
    title: 'Sober Venues',
    desc: 'Alcohol-free bars, cafes, and event spaces.',
    bg: 'rgba(42,138,153,0.07)',
  },
]

export default async function FindPage() {
  // Counts per type
  const { data: typeRows } = await supabase
    .from('facilities')
    .select('facility_type')

  const counts = (typeRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.facility_type] = (acc[r.facility_type] ?? 0) + 1
    return acc
  }, {})

  // Default browse content: a preview of treatment centers (premium/featured first).
  const { data: treatment } = await supabase
    .from('facilities')
    .select('id, name, city, state, is_featured, is_verified, is_claimed, source')
    .eq('facility_type', 'treatment')
    .order('listing_tier', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('name')
    .limit(12)

  const treatmentCount = counts['treatment'] ?? 0

  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-8 px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">Directory</p>
          <h1
            className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-1.0px' }}
          >
            Find what you need.
          </h1>
          <p className="text-mid text-base leading-relaxed max-w-[560px] mb-8">
            Browse treatment centers, sober living, therapists, outpatient programs, and sober venues — all in one place.
          </p>

          {/* Category cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {CATEGORIES.map(cat => {
              const count = counts[cat.type] ?? 0
              return (
                <Link
                  key={cat.type}
                  href={cat.href}
                  className="card-hover block bg-white border border-border rounded-[16px] overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div
                      className="flex items-center justify-center rounded-xl shrink-0 text-[32px]"
                      style={{ width: 60, height: 60, background: cat.bg }}
                    >
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-navy text-[15px] leading-snug">{cat.title}</div>
                      <div className="text-mid text-[13px] mt-0.5 leading-snug">{cat.desc}</div>
                      {count > 0 && (
                        <div className="text-teal text-[12px] font-semibold mt-1">{count} listing{count !== 1 ? 's' : ''}</div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Find a meeting — hand-off to fellowships' official finders (we are not a meeting finder) */}
            <Link
              href="/fellowships"
              className="card-hover block bg-white border border-border rounded-[16px] overflow-hidden"
            >
              <div className="flex items-center gap-4 p-5">
                <div
                  className="flex items-center justify-center rounded-xl shrink-0 text-[32px]"
                  style={{ width: 60, height: 60, background: 'rgba(0,51,102,0.06)' }}
                >
                  👥
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-[15px] leading-snug">Find a Meeting</div>
                  <div className="text-mid text-[13px] mt-0.5 leading-snug">
                    Browse fellowships and their official meeting finders — AA, NA, SMART, and more.
                  </div>
                  <div className="text-teal text-[12px] font-semibold mt-1">Explore fellowships →</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Default listing: Treatment Centers */}
      {treatment && treatment.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-[1120px] mx-auto">
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <h2
                className="text-[22px] font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
              >
                Treatment Centers
              </h2>
              <Link href="/find/treatment" className="text-teal text-sm font-semibold hover:underline whitespace-nowrap">
                View all{treatmentCount ? ` ${treatmentCount.toLocaleString()}` : ''} →
              </Link>
            </div>
            <p className="text-sm text-mid mb-5">Inpatient, residential, and detox programs.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {treatment.map((f) => (
                <Link
                  key={f.id}
                  href={`/find/${f.id}`}
                  className="card-hover block bg-white border border-border rounded-[14px] overflow-hidden"
                >
                  <div className="flex flex-wrap">
                    <div
                      className="shrink-0 flex items-center justify-center text-[40px]"
                      style={{ width: 120, minHeight: 100, background: 'var(--teal-10)' }}
                    >
                      🏥
                    </div>
                    <div className="flex-1 p-4 px-5 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1.5">
                        {f.is_featured && (
                          <span className="inline-flex items-center gap-1 bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-semibold rounded-full px-3 py-0.5">
                            ⭐ Featured
                          </span>
                        )}
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
          </div>
        </section>
      )}
    </>
  )
}
