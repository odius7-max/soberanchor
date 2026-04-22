import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  majorFellowships,
  specialtyFellowships,
  familyFellowships,
  type Fellowship,
  type FellowshipTagTone,
} from '@/data/fellowships'

export const metadata: Metadata = {
  title: 'Recovery Fellowships — AA, NA, SMART, and more | SoberAnchor',
  description:
    'Compare every major recovery fellowship — 12-step, secular, Buddhist-informed, faith-based. Direct links to AA, NA, SMART Recovery, Refuge Recovery, Celebrate Recovery and more. Free meeting finders for each.',
  alternates: { canonical: '/fellowships' },
}

// ─── Tag tone → Tailwind class ────────────────────────────────────────────────

const TAG_CLASSES: Record<FellowshipTagTone, string> = {
  primary: 'bg-teal/10 text-[#1f6e7a]',
  secular: 'bg-[rgba(107,107,107,0.12)] text-[#4a4a4a]',
  faith:   'bg-[rgba(200,155,60,0.15)] text-[#8a6a1f]',
  neutral: 'bg-warm-gray text-mid',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDayOfWeek(d: number | null | undefined): string {
  if (d === null || d === undefined) return ''
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? ''
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return ''
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}

function fmtFormat(f: string | null | undefined): string {
  if (!f) return ''
  const map: Record<string, string> = { in_person: 'In-person', online: 'Online', hybrid: 'Hybrid' }
  return map[f] ?? f
}

// ─── Outbound arrow SVG ────────────────────────────────────────────────────────

function OutboundArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 flex-shrink-0"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

// ─── Fellowship card (major) ──────────────────────────────────────────────────

function FellowshipCard({ f }: { f: Fellowship }) {
  const metaParts: string[] = []
  if (f.founded) metaParts.push(`Founded ${f.founded}`)
  if (f.reach) metaParts.push(...f.reach)
  const findLabel = f.abbreviation ?? f.name

  return (
    <article className="rounded-[14px] border border-[var(--border)] p-6 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-teal hover:shadow-[0_10px_28px_rgba(0,51,102,0.08)] bg-white">
      {/* Header */}
      <div className="mb-2.5">
        <h3 className="text-[18px] font-bold text-navy tracking-tight leading-snug">
          {f.name}
          {f.abbreviation && (
            <span className="text-mid font-medium ml-1.5 text-[15px]">{f.abbreviation}</span>
          )}
        </h3>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {f.tags.map(t => (
          <span
            key={t.label}
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${TAG_CLASSES[t.tone]}`}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-dark flex-grow mb-3.5">{f.shortDescription}</p>

      {/* Meta line */}
      {metaParts.length > 0 && (
        <p className="text-[12px] text-[#9a9a9a] mb-3.5">
          {metaParts.join(' · ')}
        </p>
      )}

      {/* Actions */}
      <div className="pt-3.5 border-t border-[var(--border)] flex flex-col sm:flex-row gap-2.5">
        <a
          href={f.officialMeetingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 bg-navy text-white text-[13px] font-bold px-3 py-2.5 rounded-lg hover:bg-navy-dark transition-colors text-center"
        >
          Find {findLabel} meetings
          <OutboundArrow />
        </a>
        <Link
          href={`/fellowships/${f.slug}`}
          className="flex-1 flex items-center justify-center bg-white text-navy border border-[var(--border)] text-[13px] font-bold px-3 py-2.5 rounded-lg hover:border-navy hover:bg-warm-gray transition-colors text-center"
        >
          Learn more →
        </Link>
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FellowshipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  type SavedMeeting = {
    id: string
    name: string
    fellowship_abbr?: string
    day_of_week?: number | null
    time_local?: string | null
    format?: string | null
  }

  let savedMeetings: SavedMeeting[] = []
  if (user) {
    const { data } = await supabase
      .from('user_custom_meetings')
      .select('id,name,day_of_week,time_local,format,fellowship_id,fellowships(abbreviation)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_attended_at', { ascending: false, nullsFirst: false })
      .limit(3)

    savedMeetings = ((data ?? []) as unknown as Array<{
      id: string
      name: string
      day_of_week: number | null
      time_local: string | null
      format: string | null
      fellowships: Array<{ abbreviation: string | null }>
    }>).map(m => ({
      id: m.id,
      name: m.name,
      fellowship_abbr: m.fellowships?.[0]?.abbreviation ?? undefined,
      day_of_week: m.day_of_week,
      time_local: m.time_local,
      format: m.format,
    }))
  }

  const major    = majorFellowships()
  const specialty = specialtyFellowships()
  const family   = familyFellowships()

  const articles = [
    { href: '/resources/guides/first-meeting',        kicker: 'Newcomer guide',      title: 'What to expect at your first meeting' },
    { href: '/resources/guides/choosing-a-fellowship', kicker: 'Choosing a program',  title: 'How to pick the fellowship that fits you' },
    { href: '/resources/guides/secular-recovery',      kicker: 'Secular recovery',    title: 'Recovery without religion: secular paths compared' },
    { href: '/resources/guides/online-vs-in-person',   kicker: 'Online vs. in-person',title: 'Online or in-person — which should a newcomer try first?' },
    { href: '/resources/guides/family-fellowships',    kicker: 'For families',        title: 'Al-Anon vs. Nar-Anon vs. CoDA: what\'s the difference?' },
    { href: '/resources/guides/multiple-fellowships',  kicker: 'Attending multiple',  title: 'Can I go to AA and SMART at the same time?' },
  ]

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10 pb-20">

      {/* ── Hero ── */}
      <div className="mb-10">
        <h1
          className="text-[clamp(28px,4vw,38px)] font-extrabold text-navy tracking-tight leading-[1.15] mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Find a fellowship that fits
        </h1>
        <p className="text-[17px] text-mid leading-relaxed max-w-[680px]">
          Every major recovery fellowship, with straightforward info on each one and direct links to their official meeting finders. No accounts required — but save the meetings you attend when you&apos;re ready.
        </p>
      </div>

      {/* ── Framing callout ── */}
      <div className="bg-[#e8f4f6] border-l-[3px] border-teal rounded-lg px-5 py-4 mb-10 text-[14.5px] text-navy-dark leading-relaxed">
        <strong className="text-navy">Not sure where to start?</strong>{' '}
        Most newcomers try a few meetings across different fellowships before one clicks. That&apos;s normal. Read the short program descriptions below, or click <em>Learn more</em> on any card for a deeper overview.
      </div>

      {/* ── Major fellowships ── */}
      <div className="flex items-baseline justify-between pb-2.5 border-b border-[var(--border)] mb-4">
        <h2 className="text-[20px] font-bold text-navy tracking-tight">Major fellowships</h2>
        <span className="text-[13px] text-mid">{major.length} programs</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {major.map(f => <FellowshipCard key={f.slug} f={f} />)}
      </div>

      {/* ── Specialty / substance-specific ── */}
      <div className="flex items-baseline justify-between pb-2.5 border-b border-[var(--border)] mb-4">
        <h2 className="text-[20px] font-bold text-navy tracking-tight">Substance-specific 12-step fellowships</h2>
        <span className="text-[13px] text-mid">{specialty.length} programs</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-12">
        {specialty.map(f => (
          <a
            key={f.slug}
            href={f.officialMeetingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-[var(--border)] rounded-[10px] px-4 py-3.5 hover:border-teal transition-colors block"
          >
            <div className="text-[14px] font-bold text-navy mb-0.5">
              {f.name}{f.abbreviation && ` (${f.abbreviation})`}
            </div>
            <div className="text-[12px] text-mid leading-snug">{f.shortDescription}</div>
          </a>
        ))}
      </div>

      {/* ── Family & loved ones ── */}
      <div className="bg-warm-gray rounded-xl px-7 py-6 mb-12">
        <h3 className="text-[16px] font-bold text-navy mb-1.5">Support for families and loved ones</h3>
        <p className="text-[13.5px] text-mid mb-3.5 max-w-[640px]">
          Recovery affects the whole family. These fellowships offer free, peer support specifically for the people who love someone struggling with addiction.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {family.map(f => (
            <a
              key={f.slug}
              href={f.officialMeetingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-navy hover:border-teal transition-colors"
            >
              {f.abbreviation ? `${f.name} (${f.abbreviation})` : f.name}
            </a>
          ))}
        </div>
      </div>

      {/* ── Saved meetings preview (auth + has meetings only) ── */}
      {user && savedMeetings.length > 0 && (
        <div className="border-[1.5px] border-dashed border-teal rounded-xl px-6 py-5 mb-12 bg-teal/[0.02]">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[15px] font-bold text-navy">Your saved meetings</h3>
            <Link href="/find/meetings" className="text-[12.5px] font-bold text-teal hover:underline">
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {savedMeetings.map(m => {
              const parts = [
                m.fellowship_abbr,
                m.day_of_week !== null && m.day_of_week !== undefined ? fmtDayOfWeek(m.day_of_week) : null,
                m.time_local ? fmtTime(m.time_local) : null,
                m.format ? fmtFormat(m.format) : null,
              ].filter(Boolean)
              return (
                <div key={m.id} className="bg-white border border-[var(--border)] rounded-lg px-3.5 py-3">
                  <div className="text-[13px] font-bold text-navy mb-0.5">{m.name}</div>
                  {parts.length > 0 && (
                    <div className="text-[11.5px] text-mid">{parts.join(' · ')}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Related articles ── */}
      <div className="mb-12">
        <div className="flex items-baseline justify-between pb-2.5 border-b border-[var(--border)] mb-4">
          <h2 className="text-[20px] font-bold text-navy tracking-tight">Helpful reading before your first meeting</h2>
          <Link href="/resources" className="text-[13px] font-bold text-teal hover:underline">All resources →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {articles.map(a => (
            <Link
              key={a.href}
              href={a.href}
              className="block px-4 py-3.5 border border-[var(--border)] rounded-[10px] hover:border-teal transition-colors"
            >
              <div className="text-[11px] font-bold text-teal uppercase tracking-wide mb-1">{a.kicker}</div>
              <div className="text-[14px] font-bold text-navy leading-snug">{a.title}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl px-10 py-9 text-center text-white" style={{ background: 'linear-gradient(135deg, var(--navy-dark), var(--navy))' }}>
        <h2 className="text-[22px] font-bold tracking-tight mb-2">Going to meetings? Track your journey.</h2>
        <p className="text-[14.5px] opacity-85 max-w-[560px] mx-auto mb-5">
          Save the meetings you attend, log check-ins, track sobriety milestones, and connect with a sponsor — all in one place. Free to start, anonymous by default.
        </p>
        {user ? (
          <Link
            href="/dashboard"
            className="inline-block bg-gold text-navy-dark font-bold text-[14px] px-6 py-3 rounded-lg hover:opacity-90 transition-opacity tracking-wide"
          >
            Go to your dashboard →
          </Link>
        ) : (
          <Link
            href="/sign-up"
            className="inline-block bg-gold text-navy-dark font-bold text-[14px] px-6 py-3 rounded-lg hover:opacity-90 transition-opacity tracking-wide"
          >
            Create your free account
          </Link>
        )}
      </div>

    </div>
  )
}
