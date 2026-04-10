import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClaimFlow from '@/components/providers/ClaimFlow'

export default async function ProviderClaimPage() {
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

  return <ClaimFlow userId={user.id} />
}
