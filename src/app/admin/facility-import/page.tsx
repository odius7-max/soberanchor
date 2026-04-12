import { createAdminClient } from '@/lib/supabase/admin'
import FacilityImportClient from './FacilityImportClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Facility Import — SoberAnchor Admin' }

async function getFacilityCount() {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('facilities')
    .select('id', { count: 'exact', head: true })
  if (error) console.error('[facility-import] getFacilityCount error:', error)
  return count ?? 0
}

async function getSamhsaFacilityCount() {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'samhsa')
  if (error) console.error('[facility-import] getSamhsaFacilityCount error:', error)
  return count ?? 0
}

export default async function FacilityImportPage() {
  const [totalCount, samhsaCount] = await Promise.all([
    getFacilityCount(),
    getSamhsaFacilityCount(),
  ])
  return <FacilityImportClient totalCount={totalCount} samhsaCount={samhsaCount} />
}
