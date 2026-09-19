import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CONTINUATION_PARAM, WELCOME_PATH } from '@/lib/claim-continuation'
import type { UserSetup } from '@/lib/workspace'
import ProviderWelcome from './ProviderWelcome'

// Setup state must always reflect committed values, never a cached render.
export const dynamic = 'force-dynamic'

/**
 * /providers/welcome — the provider-before-claim shell (PROVIDER-PATH-SPEC §3).
 *
 * An ORDINARY authenticated destination (R5). It has an auth guard and a
 * continuation-preserving redirect, and that is all: it does not consume auth
 * callback signals, does not own post-callback navigation, and is not in
 * SELF_ROUTING_PATHS. /auth/continue remains the sole callback owner.
 *
 * It also performs NO workspace writes on render. Provider links get prefetched
 * and revisited, and a GET that mutates preference would reclassify an existing
 * member who merely hovered a link (§0). Every write here is an explicit user
 * action posting to /api/workspace/initialize.
 */
export default async function ProviderWelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(WELCOME_PATH)}`)
  }

  // Self-read only; user_setup has no other SELECT policy.
  const [{ data: setupRow }, { data: profile }, { data: providerAccount }] = await Promise.all([
    supabase.from('user_setup').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('provider_accounts').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
  ])

  const setup = (setupRow ?? null) as UserSetup | null

  return (
    <ProviderWelcome
      initialName={profile?.display_name ?? ''}
      initialOrganization={setup?.organization_name ?? ''}
      setupComplete={!!setup?.provider_setup_completed_at}
      hasProviderAccount={!!providerAccount}
    />
  )
}
