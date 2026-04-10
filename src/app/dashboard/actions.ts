'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type SearchResult =
  | { found: false; reason: 'not_found' | 'no_profile' | 'self' }
  | { found: true; userId: string; email: string; displayName: string | null }

export async function searchUserByEmail(email: string): Promise<SearchResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const normalized = email.trim().toLowerCase()

  // Can't add yourself
  if (user.email?.toLowerCase() === normalized) {
    return { found: false, reason: 'self' }
  }

  const admin = createAdminClient()

  // Search auth.users by email — admin API bypasses RLS
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = users.find(u => u.email?.toLowerCase() === normalized)
  if (!found) return { found: false, reason: 'not_found' }

  // Must have a member profile (not just a provider account)
  const { data: profile } = await admin
    .from('user_profiles')
    .select('display_name')
    .eq('id', found.id)
    .maybeSingle()

  if (!profile) return { found: false, reason: 'no_profile' }

  return {
    found: true,
    userId: found.id,
    email: found.email ?? email,
    displayName: profile.display_name,
  }
}

export async function sendSponsorRequest(sponseeUserId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check for an existing relationship
  const { data: existing } = await supabase
    .from('sponsor_relationships')
    .select('id, status')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeUserId)
    .maybeSingle()

  if (existing?.status === 'active') throw new Error('You are already sponsoring this person.')
  if (existing?.status === 'pending') throw new Error('A request is already pending.')

  const { error } = await supabase
    .from('sponsor_relationships')
    .insert({ sponsor_id: user.id, sponsee_id: sponseeUserId, status: 'pending' })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function respondToSponsorRequest(
  relationshipId: string,
  accept: boolean
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('sponsor_relationships')
    .update({
      status: accept ? 'active' : 'ended',
      ...(accept ? { started_at: new Date().toISOString() } : {}),
    })
    .eq('id', relationshipId)
    .eq('sponsee_id', user.id) // only the sponsee can respond

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
