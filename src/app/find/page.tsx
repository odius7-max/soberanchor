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

  // Meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*, fellowships(name, abbreviation)')
    .order('day_of_week')
    .limit(10)

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
            Browse treatment centers, sober living, therapists, outpatient programs, sober venues, and meetings — all in one place.
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

            {/* Meetings card */}
            <Link
              href="#meetings"
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
                  <div className="font-semibold text-navy text-[15px] leading-snug">Meetings & Support Groups</div>
                  <div className="text-mid text-[13px] mt-0.5 leading-snug">AA, NA, SMART Recovery, and more.</div>
                  {meetings && meetings.length > 0 && (
                    <div className="text-teal text-[12px] font-semibold mt-1">{meetings.length} meetings listed</div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Meetings section */}
      {meetings && meetings.length > 0 && (
        <section id="meetings" className="px-6 pb-16 scroll-mt-24">
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="text-[22px] font-semibold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
            >
              Meetings &amp; Support Groups
            </h2>
            <p className="text-sm text-mid mb-5">{meetings.length} meetings found</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {meetings.map((m: any) => {
                const fellowship = m.fellowships
                return (
                  <div key={m.id} className="card-hover bg-white border border-border rounded-[14px] overflow-hidden">
                    <div className="flex flex-wrap">
                      <div
                        className="shrink-0 flex items-center justify-center text-[36px]"
                        style={{ width: 120, minHeight: 100, background: 'var(--gold-10)' }}
                      >
                        👥
                      </div>
                      <div className="flex-1 p-4 px-5 min-w-0">
                        <h3 className="text-[15px] text-navy font-semibold">{m.name}</h3>
                        <div className="text-[13px] text-mid mt-1">
                          📍 {m.location_name || 'Online'}
                          {m.day_of_week && <> · {m.day_of_week}</>}
                          {m.start_time && <> {m.start_time}</>}
                          {m.format && <> · {m.format}</>}
                        </div>
                        {fellowship && (
                          <span className="inline-block mt-2 bg-warm-gray border border-border rounded-full px-3 py-0.5 text-xs font-medium text-dark">
                            {fellowship.abbreviation || fellowship.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
