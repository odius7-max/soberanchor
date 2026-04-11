import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import MeetingActions from './MeetingActions'
import HeartButton from '@/components/find/HeartButton'
import { getUserSavedIds } from '../../actions'

export const revalidate = 3600

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt12(t: string | null): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

const FORMAT_META: Record<string, { label: string; emoji: string; bg: string; color: string; border: string }> = {
  in_person: { label: 'In Person',  emoji: '📍', bg: 'rgba(0,51,102,0.06)',    color: 'var(--navy)',  border: 'rgba(0,51,102,0.14)' },
  online:    { label: 'Online',     emoji: '💻', bg: 'rgba(139,92,246,0.07)',  color: '#6D28D9',     border: 'rgba(139,92,246,0.2)' },
  hybrid:    { label: 'Hybrid',     emoji: '🔀', bg: 'rgba(212,165,116,0.1)', color: '#9A7B54',     border: 'rgba(212,165,116,0.25)' },
}

const APPROACH_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  twelve_step:    { bg: 'rgba(0,51,102,0.06)',   color: 'var(--navy)',  border: 'rgba(0,51,102,0.14)' },
  secular:        { bg: 'rgba(42,138,153,0.08)', color: 'var(--teal)',  border: 'rgba(42,138,153,0.2)' },
  faith:          { bg: 'rgba(212,165,116,0.1)', color: '#9A7B54',     border: 'rgba(212,165,116,0.25)' },
  harm_reduction: { bg: 'rgba(39,174,96,0.08)',  color: '#27AE60',     border: 'rgba(39,174,96,0.2)' },
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data: m } = await supabase
    .from('meetings')
    .select('name, city, state, day_of_week, start_time, fellowships(abbreviation)')
    .eq('slug', slug)
    .single()

  if (!m) return { title: 'Meeting Not Found — SoberAnchor' }
  const f = m.fellowships as unknown as { abbreviation: string } | null
  const where = [m.city, m.state].filter(Boolean).join(', ')
  const when = [m.day_of_week, fmt12(m.start_time)].filter(Boolean).join(' ')
  return {
    title: `${m.name} — ${f?.abbreviation ?? 'Meeting'} | SoberAnchor`,
    description: `${f?.abbreviation ?? 'Recovery meeting'}: ${m.name}${where ? ` in ${where}` : ''}${when ? `. ${when}` : ''}.`,
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, fellowships(id, name, abbreviation, slug, approach, website, is_for_family)')
    .eq('slug', slug)
    .single()

  if (!meeting) notFound()

  const savedList = await getUserSavedIds()
  const savedEntry = savedList.find(s => s.meeting_id === meeting.id)
  const savedId = savedEntry?.id ?? null

  type Fellowship = {
    id: string; name: string; abbreviation: string; slug: string
    approach: string; website: string | null; is_for_family: boolean
  }
  const fellowship = meeting.fellowships as Fellowship | null

  const fmt      = FORMAT_META[meeting.format as string] ?? FORMAT_META.in_person
  const appStyle = APPROACH_STYLE[fellowship?.approach ?? ''] ?? APPROACH_STYLE.twelve_step
  const isOnline    = meeting.format === 'online' || meeting.format === 'hybrid'
  const isInPerson  = meeting.format === 'in_person' || meeting.format === 'hybrid'

  const timeStr    = fmt12(meeting.start_time)
  const types: string[] = Array.isArray(meeting.types) ? meeting.types : []
  const fullAddress = [meeting.address, meeting.city, meeting.state, meeting.zip].filter(Boolean).join(', ')

  const mapsUrl = meeting.latitude && meeting.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${meeting.latitude},${meeting.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://soberanchor.com'
  const shareUrl = `${siteUrl}/find/meetings/${slug}`
  const reportUrl = `mailto:hello@soberanchor.com?subject=${encodeURIComponent(`Meeting correction: ${meeting.name}`)}&body=${encodeURIComponent(`Meeting: ${meeting.name}\nSlug: ${slug}\n\nWhat needs correction:\n`)}`

  const locationLabel = isInPerson
    ? (meeting.location_name ?? fullAddress)
    : 'Online'

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6 pb-20">

      {/* Breadcrumb */}
      <Link href="/find" className="text-teal text-sm font-medium hover:underline">
        ← Find Meetings
      </Link>

      {/* Badges */}
      <div className="mt-4 mb-2 flex flex-wrap gap-2 items-center">
        {fellowship && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-3 py-1"
            style={{ background: appStyle.bg, color: appStyle.color, border: `1px solid ${appStyle.border}` }}
          >
            {fellowship.abbreviation}
            {fellowship.is_for_family && <span style={{ opacity: 0.65 }}> · Family</span>}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-3 py-1"
          style={{ background: fmt.bg, color: fmt.color, border: `1px solid ${fmt.border}` }}
        >
          {fmt.emoji} {fmt.label}
        </span>
        {meeting.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-3 py-1 bg-[var(--teal-10)] border border-[rgba(42,138,153,0.2)] text-teal">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <h1
          className="text-[30px] font-semibold mb-1 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.75px' }}
        >
          {meeting.name}
        </h1>
        <div className="mt-1 flex-shrink-0">
          <HeartButton meetingId={meeting.id} initialSavedId={savedId} size={24} />
        </div>
      </div>
      {meeting.group_name && meeting.group_name !== meeting.name && (
        <div className="text-mid text-sm mb-1">{meeting.group_name}</div>
      )}
      <div className="text-[13px] text-mid mb-6">
        {isInPerson && (meeting.city || meeting.state) && (
          <span>
            📍 {[meeting.city, meeting.state].filter(Boolean).join(', ')}
            {meeting.region ? ` · ${meeting.region}` : ''}
          </span>
        )}
        {isOnline && !isInPerson && <span>💻 Online meeting</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">

        {/* ── Left ── */}
        <div>

          {/* Map */}
          {isInPerson && meeting.latitude && meeting.longitude && (
            <div className="rounded-[14px] overflow-hidden border border-border mb-3" style={{ height: 220 }}>
              <iframe
                title={`Map — ${meeting.name}`}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${meeting.longitude - 0.009},${meeting.latitude - 0.007},${meeting.longitude + 0.009},${meeting.latitude + 0.007}&layer=mapnik&marker=${meeting.latitude},${meeting.longitude}`}
              />
            </div>
          )}

          {isInPerson && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full font-semibold text-white rounded-xl mb-6 transition-opacity hover:opacity-90"
              style={{ padding: '11px 20px', background: 'var(--navy)', fontSize: 14, textDecoration: 'none' }}
            >
              🧭 Get Directions
            </a>
          )}

          {/* Location */}
          {isInPerson && (meeting.location_name || meeting.address) && (
            <section className="mb-6">
              <h2 className="font-semibold text-navy text-[14px] mb-2">📍 Location</h2>
              <div className="text-[14px] leading-[1.9]">
                {meeting.location_name && (
                  <div className="font-medium text-dark">{meeting.location_name}</div>
                )}
                {meeting.address && (
                  <div className="text-mid">{meeting.address}</div>
                )}
                {(meeting.city || meeting.state) && (
                  <div className="text-mid">
                    {[meeting.city, meeting.state, meeting.zip].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              {meeting.location_notes && (
                <div
                  className="mt-3 rounded-xl text-[13px] leading-[1.6]"
                  style={{ padding: '10px 14px', background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--dark)' }}
                >
                  <span className="font-semibold text-navy">Access notes: </span>
                  {meeting.location_notes}
                </div>
              )}
            </section>
          )}

          {/* Phone dial-in */}
          {meeting.conference_phone && (
            <section className="mb-6">
              <h2 className="font-semibold text-navy text-[14px] mb-2">📞 Phone Dial-In</h2>
              <a
                href={`tel:${meeting.conference_phone}`}
                className="flex items-center gap-3 bg-white border border-border rounded-xl px-5 py-3.5 hover:border-teal transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <span className="text-xl flex-shrink-0">📞</span>
                <div>
                  <div className="text-xs text-mid font-medium">Tap to dial</div>
                  <div className="text-base font-semibold text-navy">{meeting.conference_phone}</div>
                </div>
              </a>
              {meeting.conference_phone_notes && (
                <p className="mt-2 text-[12px] text-mid leading-[1.6]">
                  {meeting.conference_phone_notes}
                </p>
              )}
            </section>
          )}

          {/* Description / Notes */}
          {(meeting.description || meeting.notes) && (
            <section className="mb-6">
              <h2 className="font-semibold text-navy text-[14px] mb-2">About this meeting</h2>
              <p className="text-[14px] text-dark leading-[1.7]">
                {meeting.description ?? meeting.notes}
              </p>
            </section>
          )}

          {/* Fellowship card */}
          {fellowship && (
            <section
              className="rounded-[14px] p-5 mb-2"
              style={{ background: appStyle.bg, border: `1px solid ${appStyle.border}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold text-navy text-[14px]">{fellowship.name}</div>
                  {fellowship.is_for_family && (
                    <div className="text-[12px] text-mid mt-0.5">Support for families &amp; loved ones</div>
                  )}
                </div>
                <span
                  className="flex-shrink-0 rounded-full text-[11px] font-bold px-3 py-1 text-white"
                  style={{ background: appStyle.color }}
                >
                  {fellowship.abbreviation}
                </span>
              </div>
              {fellowship.website && (
                <a
                  href={fellowship.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: appStyle.color }}
                >
                  Learn more about {fellowship.abbreviation} →
                </a>
              )}
            </section>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="lg:sticky lg:top-[84px]">
          <div className="rounded-[16px] overflow-hidden border border-border bg-white">

            {/* Schedule */}
            <div className="p-5 border-b border-border">
              <div className="text-[11px] font-bold tracking-[2px] uppercase text-mid mb-3">Schedule</div>
              {meeting.day_of_week ? (
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>📅</span>
                  <div>
                    <div className="font-bold text-navy" style={{ fontSize: 16 }}>
                      {meeting.day_of_week}s
                    </div>
                    {timeStr && (
                      <div className="font-semibold" style={{ fontSize: 15, color: 'var(--teal)', marginTop: 1 }}>
                        {timeStr}
                      </div>
                    )}
                    {meeting.duration_minutes && (
                      <div className="text-mid" style={{ fontSize: 12, marginTop: 2 }}>
                        {meeting.duration_minutes} min
                      </div>
                    )}
                    {meeting.timezone && (
                      <div className="text-mid" style={{ fontSize: 11, marginTop: 3 }}>
                        {meeting.timezone.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-mid text-sm">Schedule not listed</div>
              )}
            </div>

            {/* Meeting type tags */}
            {types.length > 0 && (
              <div className="p-5 border-b border-border">
                <div className="text-[11px] font-bold tracking-[2px] uppercase text-mid mb-3">Meeting Type</div>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full text-[12px] font-medium px-3 py-1"
                      style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--dark)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Join Meeting (online) */}
            {isOnline && meeting.meeting_url && (
              <div className="p-5 border-b border-border">
                <a
                  href={meeting.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
                  style={{ padding: '12px 20px', background: 'var(--teal)', fontSize: 14, textDecoration: 'none' }}
                >
                  💻 Join Meeting
                </a>
              </div>
            )}

            {/* Dial-in shortcut */}
            {meeting.conference_phone && (
              <div className="p-5 border-b border-border">
                <a
                  href={`tel:${meeting.conference_phone}`}
                  className="flex items-center gap-3 w-full rounded-xl border border-border bg-warm-gray hover:border-teal transition-colors"
                  style={{ padding: '10px 14px', textDecoration: 'none' }}
                >
                  <span style={{ fontSize: 18 }}>📞</span>
                  <div>
                    <div className="text-[11px] text-mid font-medium">Dial in</div>
                    <div className="text-[13px] font-semibold text-navy">{meeting.conference_phone}</div>
                  </div>
                </a>
              </div>
            )}

            {/* Share + Calendar */}
            <div className="p-5">
              <MeetingActions
                shareUrl={shareUrl}
                meetingName={meeting.name}
                dayOfWeek={meeting.day_of_week}
                startTime={meeting.start_time}
                durationMinutes={meeting.duration_minutes}
                locationName={locationLabel}
              />
            </div>
          </div>

          {/* Report */}
          <div className="mt-4 text-center">
            <a
              href={reportUrl}
              className="text-[12px] text-mid hover:text-teal hover:underline transition-colors"
            >
              Is this info correct? Let us know →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
