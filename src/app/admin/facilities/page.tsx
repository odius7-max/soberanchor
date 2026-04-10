import { createAdminClient } from '@/lib/supabase/admin'
import FacilityTable from '@/components/admin/FacilityTable'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Facilities — Admin' }

export default async function AdminFacilitiesPage() {
  const admin = createAdminClient()

  const [{ data: facilities }, { data: leadCounts }] = await Promise.all([
    admin.from('facilities')
      .select('id, name, city, state, facility_type, listing_tier, is_claimed, is_verified, is_featured')
      .order('name'),
    admin.from('leads').select('facility_id'),
  ])

  // Count leads per facility
  const countMap: Record<string, number> = {}
  for (const l of leadCounts ?? []) {
    countMap[l.facility_id] = (countMap[l.facility_id] ?? 0) + 1
  }

  const enriched = (facilities ?? []).map(f => ({ ...f, lead_count: countMap[f.id] ?? 0 }))

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>Facilities</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>{enriched.length} total</span>
        </div>
      </div>

      <FacilityTable facilities={enriched as any} />
    </div>
  )
}
