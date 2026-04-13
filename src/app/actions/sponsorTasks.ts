'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'

export interface SponsorTask {
  id: string
  sponsor_relationship_id: string
  sponsor_id: string
  sponsee_id: string
  title: string
  description: string | null
  category: string
  status: 'assigned' | 'in_progress' | 'completed'
  due_date: string | null
  assigned_at: string
  completed_at: string | null
  sponsor_note: string | null
  sponsee_note: string | null
  is_recurring: boolean
  recurrence_interval: string | null
  created_at: string
  updated_at: string
}

export async function assignTask(input: {
  sponseeId: string
  relationshipId: string
  title: string
  description: string | null
  category: string
  dueDate: string | null
  isRecurring: boolean
  recurrenceInterval: string | null
  sponsorNote: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify relationship
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('id', input.relationshipId)
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', input.sponseeId)
    .eq('status', 'active')
    .maybeSingle()
  if (!rel) return { error: 'Relationship not found' }

  const { data: task, error } = await supabase
    .from('sponsor_tasks')
    .insert({
      sponsor_relationship_id: input.relationshipId,
      sponsor_id: user.id,
      sponsee_id: input.sponseeId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      status: 'assigned',
      due_date: input.dueDate || null,
      is_recurring: input.isRecurring,
      recurrence_interval: input.isRecurring ? input.recurrenceInterval : null,
      sponsor_note: input.sponsorNote?.trim() || null,
    })
    .select('id')
    .single()

  console.log('[assignTask] insert result:', { data: task, error })

  if (error) return { error: error.message }
  if (!task) return { error: 'Insert returned no data — check RLS policies on sponsor_tasks' }

  // Fire-and-forget notification — never await so a slow email API can't block the action
  Promise.resolve().then(async () => {
    try {
      const admin = createAdminClient()
      const { data: sponsorProfile } = await admin
        .from('user_profiles').select('display_name').eq('id', user.id).maybeSingle()
      await sendNotification(input.sponseeId, 'sponsor_assigns_task', {
        sponsorName: sponsorProfile?.display_name ?? 'Your sponsor',
        taskTitle: input.title.trim(),
        dueDate: input.dueDate || null,
      })
    } catch (err) {
      console.error('[assignTask] notification failed (non-fatal):', err)
    }
  })

  // No revalidatePath — caller manages local state to avoid triggering a server re-render
  return {}
}

export async function updateTaskStatus(input: {
  taskId: string
  status: 'assigned' | 'in_progress' | 'completed'
  sponseeNote?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch task to verify ownership and get details for notification
  const { data: task } = await supabase
    .from('sponsor_tasks')
    .select('id, sponsor_id, sponsee_id, title, status')
    .eq('id', input.taskId)
    .eq('sponsee_id', user.id)   // only sponsee can update status
    .maybeSingle()

  if (!task) return { error: 'Task not found' }

  const updates: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  }
  if (input.status === 'completed') {
    updates.completed_at = new Date().toISOString()
    if (input.sponseeNote !== undefined) updates.sponsee_note = input.sponseeNote?.trim() || null
  } else {
    updates.completed_at = null
  }

  const { error } = await supabase
    .from('sponsor_tasks')
    .update(updates)
    .eq('id', input.taskId)

  if (error) return { error: error.message }

  // Fire-and-forget notification when sponsee completes a task
  if (input.status === 'completed' && task.status !== 'completed') {
    Promise.resolve().then(async () => {
      try {
        const admin = createAdminClient()
        const { data: sponseeProfile } = await admin
          .from('user_profiles').select('display_name').eq('id', user.id).maybeSingle()
        await sendNotification(task.sponsor_id, 'sponsee_completes_task', {
          sponseeName: sponseeProfile?.display_name ?? 'Your sponsee',
          taskTitle: task.title,
        })
      } catch (err) {
        console.error('[updateTaskStatus] notification failed (non-fatal):', err)
      }
    })
  }

  revalidatePath('/dashboard')
  return {}
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only sponsor can delete
  const { error } = await supabase
    .from('sponsor_tasks')
    .delete()
    .eq('id', taskId)
    .eq('sponsor_id', user.id)

  if (error) return { error: error.message }

  // No revalidatePath — SponseeTasksSection manages local state after delete
  return {}
}
