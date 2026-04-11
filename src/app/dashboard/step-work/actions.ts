'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveStepWorkEntry({
  workbookId,
  responses,
  sponsorRelationshipId,
}: {
  workbookId: string
  responses: Record<string, unknown>
  sponsorRelationshipId?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('step_work_entries')
    .select('id, review_status')
    .eq('user_id', user.id)
    .eq('workbook_id', workbookId)
    .maybeSingle()

  if (existing) {
    // Don't overwrite submitted/reviewed entries
    if (existing.review_status === 'submitted' || existing.review_status === 'reviewed') {
      return { id: existing.id }
    }
    const { error } = await supabase
      .from('step_work_entries')
      .update({ responses, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { id: existing.id }
  } else {
    const { data, error } = await supabase
      .from('step_work_entries')
      .insert({
        user_id: user.id,
        workbook_id: workbookId,
        sponsor_relationship_id: sponsorRelationshipId ?? null,
        responses,
        review_status: 'draft',
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { id: data.id }
  }
}

export async function submitStepWork(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('step_work_entries')
    .update({
      review_status: 'submitted',
      is_shared_with_sponsor: true,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/step-work')
  return { success: true }
}

export async function saveSponsorFeedback({
  entryId,
  feedback,
}: {
  entryId: string
  feedback: Record<string, string>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify current user is the sponsor for this entry
  const { data: entry } = await supabase
    .from('step_work_entries')
    .select('id, sponsor_relationship_id')
    .eq('id', entryId)
    .single()

  if (!entry) return { error: 'Entry not found' }

  if (entry.sponsor_relationship_id) {
    const { data: rel } = await supabase
      .from('sponsor_relationships')
      .select('sponsor_id')
      .eq('id', entry.sponsor_relationship_id)
      .single()
    if (!rel || rel.sponsor_id !== user.id) return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('step_work_entries')
    .update({
      sponsor_feedback: JSON.stringify(feedback),
      review_status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
