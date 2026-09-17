import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClaimFlow from '@/components/providers/ClaimFlow'
import { CONTINUATION_PARAM, buildContinuation, validateFacilityId } from '@/lib/claim-continuation'

// Claim status must always reflect committed state, never a cached render.
export const dynamic = 'force-dynamic'

export default async function ProviderClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string }>
}) {
  const { facility: rawFacility } = await searchParams
  const facilityId = validateFacilityId(rawFacility)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Carry the same continuation the middleware would (ODI-66) — this guard
  // also fires when middleware has already let the request through but the
  // session turns out to be unreadable server-side.
  if (!user) {
    const continuation = buildContinuation(facilityId)
    redirect(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`)
  }

  const { data: providerAccount } = await supabase
    .from('provider_accounts')
    .select('id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // ── No facility in the URL: generic provider entry ──
  // Someone who already owns a listing and arrives here with no specific
  // target is looking for their dashboard, so the existing bounce stays.
  if (!facilityId) {
    if (providerAccount) {
      const { data: owned } = await supabase
        .from('facilities')
        .select('id')
        .eq('provider_account_id', providerAccount.id)
        .limit(1)
      if (owned && owned.length > 0) redirect('/dashboard?mode=facility')
    }
    return <ClaimFlow preselectedFacility={null} />
  }

  // ── A specific facility was requested ──
  // No bounce-to-dashboard here even when the account already owns another
  // listing: multi-location operators are real (one operator, five sites), and
  // sending them to a dashboard would make a second claim impossible.
  const { data: facility } = await supabase
    .from('facilities')
    .select('id, name, city, state, facility_type, is_claimed, is_verified, provider_account_id')
    .eq('id', facilityId)
    .maybeSingle()

  if (!facility) {
    return <ClaimFlow preselectedFacility={null} missingFacility />
  }

  const ownedByUser =
    !!providerAccount && facility.provider_account_id === providerAccount.id

  // Returning to this page as the owner resolves the persisted outcome rather
  // than re-submitting anything — the done screen is not transient client state.
  const initialOutcome: 'verified' | 'pending' | null = ownedByUser
    ? (facility.is_verified ? 'verified' : 'pending')
    : null

  // A rejected claim gets a durable, authenticated outcome instead of silently
  // dropping the person back into the recovery product (spec §8, option A).
  let wasRejected = false
  if (!ownedByUser) {
    const { data: rejection } = await supabase
      .from('facility_claim_rejections')
      .select('id')
      .eq('facility_id', facility.id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    wasRejected = !!rejection
  }

  return (
    <ClaimFlow
      preselectedFacility={{
        id: facility.id,
        name: facility.name,
        city: facility.city,
        state: facility.state,
        facility_type: facility.facility_type,
        is_claimed: facility.is_claimed,
      }}
      initialOutcome={initialOutcome}
      wasRejected={wasRejected}
      accountInactive={!!providerAccount && providerAccount.is_active === false}
    />
  )
}
