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
}

// Claims queue actions
export async function approveClaim(facilityId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('facilities').update({ is_verified: true }).eq('id', facilityId)
  revalidatePath('/admin/claims')
}

export async function rejectClaim(facilityId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  // Capture the provider_account_id before clearing it
  const { data: facility } = await admin
    .from('facilities')
    .select('provider_account_id')
    .eq('id', facilityId)
    .single()

  await admin.from('facilities').update({
    is_claimed: false,
    is_verified: false,
    provider_account_id: null,
  }).eq('id', facilityId)

  // Deactivate the provider account so 'Provider Dashboard' no longer appears in nav
  if (facility?.provider_account_id) {
    await admin
      .from('provider_accounts')
      .update({ is_active: false })
      .eq('id', facility.provider_account_id)
  }

  revalidatePath('/admin/claims')
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
