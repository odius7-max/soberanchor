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

// Sponsee-initiated: current user wants this person as their sponsor.
// INSERT RLS requires sponsor_id = auth.uid(), so we use the admin client here.
export async function requestSponsor(sponsorUserId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  // Check for an existing relationship in either direction
  const { data: existing } = await admin
    .from('sponsor_relationships')
    .select('id, status')
    .eq('sponsor_id', sponsorUserId)
    .eq('sponsee_id', user.id)
    .maybeSingle()

  if (existing?.status === 'active') throw new Error('You already have this person as your sponsor.')
  if (existing?.status === 'pending') throw new Error('A request is already pending.')

  const { error } = await admin
    .from('sponsor_relationships')
    .insert({ sponsor_id: sponsorUserId, sponsee_id: user.id, status: 'pending' })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export interface CheckInReportEntry {
  check_in_date: string
  mood: string | null
  sober_today: boolean
  meetings_attended: number | null
  called_sponsor: boolean | null
  notes: string | null
}

export async function getSponseeCheckInReport(sponseeId: string, days: number): Promise<CheckInReportEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify active sponsor relationship
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) throw new Error('No active sponsor relationship found.')

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - days + 1)
  const startStr = rangeStart.toISOString().slice(0, 10)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('check_ins')
    .select('check_in_date,mood,sober_today,meetings_attended,called_sponsor,notes')
    .eq('user_id', sponseeId)
    .gte('check_in_date', startStr)
    .order('check_in_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CheckInReportEntry[]
}

export async function addSponsorNote(sponseeId: string, noteText: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify active sponsor relationship before writing
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) throw new Error('No active sponsor relationship found.')

  const { error } = await supabase
    .from('sponsor_notes')
    .insert({ sponsor_id: user.id, sponsee_id: sponseeId, note_text: noteText.trim() })

  if (error) throw new Error(error.message)
}

export async function respondToSponsorRequest(
  relationshipId: string,
  accept: boolean
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Either party can accept or decline — both sponsor and sponsee can respond
  const { error } = await supabase
    .from('sponsor_relationships')
    .update({
      status: accept ? 'active' : 'ended',
      ...(accept ? { started_at: new Date().toISOString() } : {}),
    })
    .eq('id', relationshipId)
    .or(`sponsee_id.eq.${user.id},sponsor_id.eq.${user.id}`)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
