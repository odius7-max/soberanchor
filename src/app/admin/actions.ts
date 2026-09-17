'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Guard: only admins can call these actions
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) throw new Error('Unauthorized')
  return user
}

/**
 * Claim decisions change what a provider can see, so both actions below:
 *  - target the owner the admin was actually looking at (`expectedAccountId`),
 *    so a stale queue left open in a tab cannot land on a replacement claimant;
 *  - check the affected row count rather than assuming the write landed;
 *  - invalidate the provider-facing surfaces too, not just the queue.
 */
function revalidateClaimSurfaces(facilityId: string) {
  revalidatePath('/admin/claims')
  revalidatePath('/dashboard')
  revalidatePath('/providers/dashboard')
  revalidatePath('/providers/claim')
  revalidatePath(`/find/${facilityId}`)
}

export async function approveClaim(facilityId: string, expectedAccountId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('facilities')
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq('id', facilityId)
    .eq('provider_account_id', expectedAccountId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length !== 1) {
    throw new Error('This claim changed since the queue was loaded. Reload and try again.')
  }

  revalidateClaimSurfaces(facilityId)
}

/**
 * Rejection is FACILITY-SPECIFIC (CLAIM-FLOW-SPEC §8, option A — ratified).
 *
 * It clears this listing's claim flags and ownership and records a durable
 * rejection so the claimant sees a real outcome instead of silently losing
 * provider mode. It deliberately does NOT touch provider_accounts.is_active:
 * one operator can own several locations, and rejecting their second site must
 * not lock them out of an already-verified first site. Account suspension stays
 * a separate, explicit admin action (deactivateProvider below) and is never
 * auto-triggered from here — including by repeated rejections.
 */
export async function rejectClaim(facilityId: string, expectedAccountId: string) {
  const adminUser = await assertAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('facilities')
    .update({
      is_claimed: false,
      is_verified: false,
      provider_account_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facilityId)
    .eq('provider_account_id', expectedAccountId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length !== 1) {
    throw new Error('This claim changed since the queue was loaded. Reload and try again.')
  }

  // Durable record, scoped to (claimant, facility). Also what stops the same
  // person silently re-claiming the listing — a retry needs support.
  const { data: account } = await admin
    .from('provider_accounts')
    .select('auth_user_id')
    .eq('id', expectedAccountId)
    .maybeSingle()

  // Delete-then-insert rather than upsert: the uniqueness guard is a PARTIAL
  // index (WHERE auth_user_id IS NOT NULL), and PostgREST can't infer an ON
  // CONFLICT target from a partial index. A re-rejection refreshes the record.
  if (account?.auth_user_id) {
    await admin
      .from('facility_claim_rejections')
      .delete()
      .eq('facility_id', facilityId)
      .eq('auth_user_id', account.auth_user_id)
  }

  const { error: rejectionError } = await admin
    .from('facility_claim_rejections')
    .insert({
      facility_id: facilityId,
      auth_user_id: account?.auth_user_id ?? null,
      provider_account_id: expectedAccountId,
      rejected_by: adminUser.id,
    })

  if (rejectionError) throw new Error(rejectionError.message)

  revalidateClaimSurfaces(facilityId)
}

// Facility management actions
export async function toggleFacilityVerified(facilityId: string, current: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('facilities').update({ is_verified: !current }).eq('id', facilityId)
  revalidatePath('/admin/facilities')
}

export async function toggleFacilityFeatured(facilityId: string, current: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('facilities').update({ is_featured: !current }).eq('id', facilityId)
  revalidatePath('/admin/facilities')
}

export async function updateFacilityTier(facilityId: string, tier: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('facilities').update({ listing_tier: tier }).eq('id', facilityId)
  revalidatePath('/admin/facilities')
}

export async function updateFacility(facilityId: string, data: Record<string, unknown>) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('facilities').update({ ...data, updated_at: new Date().toISOString() }).eq('id', facilityId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/facilities')
  revalidatePath(`/admin/facilities/${facilityId}`)
}

export async function deleteFacility(facilityId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('facilities').delete().eq('id', facilityId)
  revalidatePath('/admin/facilities')
}

// User management actions
export async function deactivateProvider(providerAccountId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('provider_accounts').update({ is_active: false }).eq('id', providerAccountId)
  revalidatePath('/admin/users')
}

export async function reactivateProvider(providerAccountId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('provider_accounts').update({ is_active: true }).eq('id', providerAccountId)
  revalidatePath('/admin/users')
}

export async function updateProviderTier(providerAccountId: string, tier: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('provider_accounts').update({ subscription_tier: tier }).eq('id', providerAccountId)
  revalidatePath('/admin/users')
}

// Lead management actions
export async function updateLeadStatus(leadId: string, status: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('leads').update({ status }).eq('id', leadId)
  revalidatePath('/admin/leads')
}
