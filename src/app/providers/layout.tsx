import { createClient } from '@/lib/supabase/server'
import ProviderNav from '@/components/providers/ProviderNav'

export default async function ProvidersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let facilityName: string | null = null
  let initials = 'P'

  if (user) {
    const { data: providerAccount } = await supabase
      .from('provider_accounts')
      .select('contact_name, organization_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (providerAccount) {
      facilityName = providerAccount.organization_name ?? providerAccount.contact_name ?? null
      const name = providerAccount.contact_name ?? providerAccount.organization_name ?? ''
      initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'P'
    }
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <ProviderNav facilityName={facilityName} initials={initials} />
      {children}
    </div>
  )
}
