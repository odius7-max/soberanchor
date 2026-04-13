'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications'

/**
 * After a sponsor marks a step complete in step_completions, re-read all
 * completions for that fellowship and write the next incomplete step number
 * back to user_profiles.current_step. Uses the admin client because RLS
 * only allows users to update their own profile row.
 */
export async function syncSponseeCurrentStep(sponseeId: string, fellowshipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify caller is an active sponsor of the sponsee
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: completions } = await admin
    .from('step_completions')
    .select('step_number')
    .eq('user_id', sponseeId)
    .eq('fellowship_id', fellowshipId)
    .eq('is_completed', true)

  const done = new Set((completions ?? []).map(c => c.step_number))
  const nextStep = [1,2,3,4,5,6,7,8,9,10,11,12].find(n => !done.has(n)) ?? 12

  await admin
    .from('user_profiles')
    .update({ current_step: nextStep, updated_at: new Date().toISOString() })
    .eq('id', sponseeId)

  revalidatePath('/dashboard')
  return { ok: true }
}

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

  // Notify the sponsor (best-effort — doesn't affect return value)
  try {
    const admin = createAdminClient()
    const { data: entry } = await admin
      .from('step_work_entries')
      .select('workbook_id, sponsor_relationship_id')
      .eq('id', entryId)
      .single()

    if (entry?.sponsor_relationship_id) {
      const [{ data: rel }, { data: sponseeProfile }, workbookRes] = await Promise.all([
        admin.from('sponsor_relationships').select('sponsor_id').eq('id', entry.sponsor_relationship_id).single(),
        admin.from('user_profiles').select('display_name').eq('id', user.id).single(),
        entry.workbook_id
          ? admin.from('program_workbooks').select('title, step_number').eq('id', entry.workbook_id).single()
          : Promise.resolve({ data: null }),
      ])
      const sponsorId = (rel as { sponsor_id: string } | null)?.sponsor_id
      if (sponsorId) {
        await sendNotification(sponsorId, 'sponsee_submits_step_work', {
          sponseeName:  (sponseeProfile  as { display_name: string | null } | null)?.display_name ?? 'Your sponsee',
          stepNumber:   (workbookRes.data as { step_number: number | null } | null)?.step_number  ?? null,
          sectionTitle: (workbookRes.data as { title: string }              | null)?.title        ?? 'Step Work',
        })
      }
    }
  } catch { /* non-fatal */ }

  revalidatePath('/dashboard/step-work')
  return { success: true }
}

/**
 * Force-saves an entry that is in submitted or reviewed state.
 * Resets review_status to 'draft', increments __edit_count in responses,
 * and updates updated_at. reviewed_at is preserved so the UI can detect
 * "edited after review" by checking reviewed_at != null && status === 'draft'.
 */
export async function editStepWorkEntry({
  entryId,
  responses,
}: {
  entryId: string
  responses: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('step_work_entries')
    .select('id, responses')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()

  if (!existing) return { error: 'Entry not found' }

  const prevCount = ((existing.responses as Record<string, unknown> | null)?.__edit_count as number) ?? 0
  const updatedResponses = { ...responses, __edit_count: prevCount + 1 }

  const { error } = await supabase
    .from('step_work_entries')
    .update({
      responses: updatedResponses,
      review_status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/step-work')
  return { id: entryId, edit_count: prevCount + 1 }
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
    .select('id, user_id, workbook_id, sponsor_relationship_id')
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

  // Write activity event + send notification to sponsee (both best-effort)
  try {
    const admin = createAdminClient()
    const [{ data: sponsorProfile }, workbookRes] = await Promise.all([
      admin.from('user_profiles').select('display_name').eq('id', user.id).single(),
      entry.workbook_id
        ? admin.from('program_workbooks').select('title, step_number').eq('id', entry.workbook_id).single()
        : Promise.resolve({ data: null }),
    ])
    const sponsorName   = (sponsorProfile as { display_name: string | null } | null)?.display_name ?? 'Your sponsor'
    const workbookTitle = (workbookRes.data as { title: string }              | null)?.title        ?? 'Step Work'
    const stepNumber    = (workbookRes.data as { step_number: number | null } | null)?.step_number  ?? null

    await Promise.all([
      admin.from('activity_feed').insert({
        user_id:    entry.user_id,
        event_type: 'step_work_reviewed',
        title:      `${workbookTitle} reviewed`,
        description:`${sponsorName} reviewed your step work and left feedback`,
        metadata:   { entry_id: entryId, workbook_title: workbookTitle },
      }),
      sendNotification(entry.user_id as string, 'sponsor_feedback_on_step_work', {
        sponsorName,
        stepNumber,
        sectionTitle: workbookTitle,
      }),
    ])
  } catch { /* best-effort */ }

  revalidatePath('/dashboard')
  return { success: true }
}
