import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClaimFlow from '@/components/providers/ClaimFlow'

export default async function ProviderClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/providers/login')

  // If they already have a provider account with a facility, go to dashboard
  const { data: providerAccount } = await supabase
    .from('provider_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (providerAccount) {
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id')
      .eq('provider_account_id', providerAccount.id)
      .limit(1)

    if (facilities && facilities.length > 0) redirect('/providers/dashboard')
  }

  // Pre-populate from ?facility= query param
  const { facility: facilityId } = await searchParams
  let preselectedFacility: { id: string; name: string; city: string | null; state: string | null; facility_type: string; is_claimed: boolean } | null = null

  if (facilityId) {
    const { data } = await supabase
      .from('facilities')
      .select('id, name, city, state, facility_type, is_claimed')
      .eq('id', facilityId)
      .maybeSingle()
    preselectedFacility = data ?? null
  }

  return <ClaimFlow userId={user.id} preselectedFacility={preselectedFacility} />
}
