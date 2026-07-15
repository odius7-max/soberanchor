// ODI-52 (deferred from ODI-51): the labeled Featured band.
//
// This is the ONLY surface where payment influences placement, and it is
// explicitly labeled "Featured / Sponsored" per the locked rules. It performs
// its OWN fetch of is_featured facilities — organic directory/search queries
// stay payment-blind (the ODI-51 grep gate: no paid signals in organic
// `.order()`). Renders nothing when no facility is featured (true until ODI-54).

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FeaturedBadge from './FeaturedBadge'

const FACILITY_TYPE_LABELS: Record<string, string> = {
  treatment: 'Treatment Center',
  sober_living: 'Sober Living',
  therapist: 'Therapist',
  venue: 'Sober Venue',
  outpatient: 'Outpatient',
}

type FeaturedRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  facility_type: string | null
}

interface Props {
  /** When set, only feature facilities of this type (matches the page context). */
  facilityType?: string
  limit?: number
}

export default async function FeaturedBand({ facilityType, limit = 3 }: Props) {
  let q = supabase
    .from('facilities')
    .select('id, name, city, state, facility_type')
    .eq('is_featured', true)
    .order('name')
    .limit(limit)
  if (facilityType) q = q.eq('facility_type', facilityType)

  const { data } = await q
  const rows = (data ?? []) as FeaturedRow[]
  if (!rows.length) return null

  return (
    <section
      className="rounded-[16px] border border-[rgba(212,165,116,0.35)] p-5 mb-6"
      style={{ background: 'linear-gradient(180deg, var(--gold-10), rgba(212,165,116,0.03))' }}
      aria-label="Featured listings"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#9A7B54]">
          Featured
        </span>
        <span className="text-[10px] font-semibold text-mid bg-white/60 border border-[rgba(212,165,116,0.3)] rounded-full px-2 py-0.5">
          Sponsored
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((f) => {
          const loc = [f.city, f.state].filter(Boolean).join(', ')
          return (
            <Link
              key={f.id}
              href={`/find/${f.id}`}
              className="card-hover block bg-white border border-[rgba(212,165,116,0.3)] rounded-[12px] p-4"
            >
              <div className="mb-1.5">
                <FeaturedBadge />
              </div>
              <div className="text-[15px] font-semibold text-navy leading-snug">{f.name}</div>
              <div className="text-[12px] text-mid mt-1">
                {f.facility_type ? FACILITY_TYPE_LABELS[f.facility_type] ?? f.facility_type : ''}
                {f.facility_type && loc ? ' · ' : ''}
                {loc}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
