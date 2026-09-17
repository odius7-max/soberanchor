// ODI-52: "Similar centers nearby" — renders on unclaimed/claimed PDPs ONLY.
// This module is the honest upgrade lever (a claimed page that upgrades to
// Enhanced loses it), so it MUST NOT render on enhanced/premium pages. The PDP
// enforces that; this component just renders whatever it's handed.

import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type NearbyRow = {
  id: string
  name: string
  city: string | null
  state: string | null
  facility_type: string | null
  distance_miles?: number | null
}

interface Props {
  facilityId: string
  facilityType: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
}

async function fetchSimilar(p: Props): Promise<NearbyRow[]> {
  // Preferred path: PostGIS radius search around the facility, same type.
  // The RPC doesn't exclude self, so we over-fetch by one and filter.
  if (p.latitude != null && p.longitude != null) {
    const { data } = await supabase.rpc('nearby_facilities', {
      user_lat: p.latitude,
      user_lng: p.longitude,
      radius_miles: 25,
      result_limit: 4,
      p_facility_type: p.facilityType,
    })
    const rows = ((data ?? []) as NearbyRow[]).filter((r) => r.id !== p.facilityId)
    if (rows.length) return rows.slice(0, 3)
  }

  // Fallback: same-state, same-type, alphabetical (facilities missing coords).
  if (p.state) {
    let q = supabase
      .from('facilities')
      .select('id, name, city, state, facility_type')
      .eq('state', p.state)
      .neq('id', p.facilityId)
      .order('name')
      .limit(3)
    if (p.facilityType) q = q.eq('facility_type', p.facilityType)
    const { data } = await q
    return (data ?? []) as NearbyRow[]
  }

  return []
}

export default async function SimilarCentersNearby(props: Props) {
  const rows = await fetchSimilar(props)
  if (!rows.length) return null

  const where = [props.city, props.state].filter(Boolean).join(', ')

  return (
    <div className="border border-border rounded-[14px] p-5">
      <h3 className="text-base font-semibold text-navy mb-1">Similar centers nearby</h3>
      {where && <p className="text-[13px] text-mid mb-3">{where}</p>}
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const loc = [r.city, r.state].filter(Boolean).join(', ')
          const miles =
            typeof r.distance_miles === 'number' ? `${Math.round(r.distance_miles)} mi` : null
          return (
            <Link
              key={r.id}
              href={`/find/${r.id}`}
              className="flex items-center justify-between gap-3 bg-white border border-border rounded-xl px-4 py-3 hover:border-teal transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy truncate">{r.name}</div>
                {(loc || miles) && (
                  <div className="text-[12px] text-mid mt-0.5">
                    {loc}
                    {loc && miles ? ' · ' : ''}
                    {miles}
                  </div>
                )}
              </div>
              <span className="text-teal font-semibold text-sm shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
