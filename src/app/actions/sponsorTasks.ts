'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'

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
  reviewed_at: string | null
  sponsor_note: string | null
  sponsee_note: string | null
  is_recurring: boolean
  recurrence_interval: string | null
  library_task_id: string | null
  step_number: number | null
  sort_order: number
  subsection: string | null
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

  // No revalidatePath — client calls router.refresh() after this returns,
  // avoiding a server-side RSC re-render that can 500 if the dashboard page throws.
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

// ── Phase 3: bulk-assign tasks from the sponsor's library to a sponsee ────────
// Copies the library rows into sponsor_tasks, linked via library_task_id.
// Skips duplicates (same library_task_id already assigned to this sponsee).
export async function assignFromLibrary(input: {
  sponseeId: string
  relationshipId: string
  libraryTaskIds: string[]
  dueDate?: string | null
  sponsorNote?: string | null
}): Promise<{ tasks: SponsorTask[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tasks: [], error: 'Not authenticated' }

  if (input.libraryTaskIds.length === 0) return { tasks: [] }

  // Verify relationship
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('id', input.relationshipId)
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', input.sponseeId)
    .eq('status', 'active')
    .maybeSingle()
  if (!rel) return { tasks: [], error: 'Relationship not found' }

  // Fetch the library tasks
  const { data: libraryRows } = await supabase
    .from('sponsor_task_library')
    .select('id, title, description, category, step_number, subsection')
    .in('id', input.libraryTaskIds)
    .eq('sponsor_id', user.id)

  if (!libraryRows || libraryRows.length === 0) {
    return { tasks: [], error: 'Library tasks not found' }
  }

  // Skip already-assigned (same library_task_id for this sponsee, any status)
  const { data: existing } = await supabase
    .from('sponsor_tasks')
    .select('library_task_id')
    .eq('sponsee_id', input.sponseeId)
    .eq('sponsor_id', user.id)
    .in('library_task_id', input.libraryTaskIds)

  const alreadyAssigned = new Set((existing ?? []).map(r => r.library_task_id as string))
  const toAssign = libraryRows.filter(r => !alreadyAssigned.has(r.id))

  if (toAssign.length === 0) return { tasks: [] }

  const rows = toAssign.map(r => ({
    sponsor_relationship_id: input.relationshipId,
    sponsor_id: user.id,
    sponsee_id: input.sponseeId,
    title: r.title,
    description: r.description,
    category: r.category,
    status: 'assigned' as const,
    due_date: input.dueDate || null,
    sponsor_note: input.sponsorNote?.trim() || null,
    library_task_id: r.id,
    step_number: r.step_number,
    subsection: r.subsection,
  }))

  const { data: inserted, error } = await supabase
    .from('sponsor_tasks')
    .insert(rows)
    .select('*')

  if (error) return { tasks: [], error: error.message }
  const tasks = (inserted ?? []) as SponsorTask[]

  // Fire-and-forget notification
  Promise.resolve().then(async () => {
    try {
      const admin = createAdminClient()
      const { data: sponsorProfile } = await admin
        .from('user_profiles').select('display_name').eq('id', user.id).maybeSingle()
      for (const t of tasks) {
        await sendNotification(input.sponseeId, 'sponsor_assigns_task', {
          sponsorName: sponsorProfile?.display_name ?? 'Your sponsor',
          taskTitle: t.title,
          dueDate: t.due_date,
        })
      }
    } catch (err) {
      console.error('[assignFromLibrary] notification failed (non-fatal):', err)
    }
  })

  return { tasks }
}

// ── Phase 3: create a custom task and assign it, optionally saving to library ─
export async function createAndAssignCustomTask(input: {
  sponseeId: string
  relationshipId: string
  programId: string | null   // null = don't save to library
  title: string
  description: string | null
  category: string
  stepNumber: number | null
  dueDate: string | null
  sponsorNote: string | null
  saveToLibrary: boolean
}): Promise<{ task?: SponsorTask; error?: string }> {
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

  let libraryTaskId: string | null = null

  // Optionally save to library first so we can link the assigned task to it
  if (input.saveToLibrary && input.programId && input.stepNumber) {
    const { data: maxRow } = await supabase
      .from('sponsor_task_library')
      .select('sort_order')
      .eq('program_id', input.programId)
      .eq('step_number', input.stepNumber)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = (maxRow?.sort_order ?? -1) + 1

    const { data: libRow, error: libError } = await supabase
      .from('sponsor_task_library')
      .insert({
        program_id: input.programId,
        sponsor_id: user.id,
        step_number: input.stepNumber,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category,
        sort_order: nextSort,
        source: 'custom',
      })
      .select('id')
      .single()

    if (libError) return { error: libError.message }
    libraryTaskId = libRow?.id ?? null
  }

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
      sponsor_note: input.sponsorNote?.trim() || null,
      library_task_id: libraryTaskId,
      step_number: input.stepNumber,
    })
    .select('*')
    .single()

  if (error) return { error: error.message }
  if (!task) return { error: 'Insert returned no data' }

  // Fire-and-forget notification
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
      console.error('[createAndAssignCustomTask] notification failed (non-fatal):', err)
    }
  })

  return { task: task as SponsorTask }
}

// ── Phase 3: sponsor marks a completed task as reviewed ──────────────────────
export async function reviewTask(input: {
  taskId: string
  sponsorNote?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (input.sponsorNote !== undefined) {
    updates.sponsor_note = input.sponsorNote?.trim() || null
  }

  const { error } = await supabase
    .from('sponsor_tasks')
    .update(updates)
    .eq('id', input.taskId)
    .eq('sponsor_id', user.id)
    .eq('status', 'completed')

  if (error) return { error: error.message }
  return {}
}
