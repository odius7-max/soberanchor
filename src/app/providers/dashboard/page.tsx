import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateFacilityId } from '@/lib/claim-continuation'

export const dynamic = 'force-dynamic'

/**
 * Canonical redirect into the unified dashboard (CLAIM-FLOW-SPEC §4).
 *
 * This route used to load and render provider data on its own, with its own
 * `.limit(1)` oldest-facility selection and no pending-claim gating — a second
 * way in that could bypass the restrictions applied on /dashboard. Rather than
 * duplicating the access logic in two places and letting them drift, it now
 * forwards to the one implementation.
 */
export default async function ProviderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string }>
}) {
  const { facility: rawFacility } = await searchParams
  const facilityId = validateFacilityId(rawFacility)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  if (facilityId) redirect(`/dashboard?mode=facility&facility=${facilityId}`)

  // Without a specific target, let /dashboard resolve which facility to show;
  // it applies the same ownership, pending and inactive checks.
  const { data: providerAccount } = await supabase
    .from('provider_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!providerAccount) redirect('/providers/claim')

  redirect('/dashboard?mode=facility')
}
