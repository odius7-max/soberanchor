'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LibraryTask {
  id: string
  program_id: string
  sponsor_id: string
  step_number: number
  title: string
  description: string | null
  category: string
  sort_order: number
  subsection: string | null
  source: string
}

export interface ProgramTemplate {
  id: string
  sponsor_id: string
  fellowship_id: string
  name: string
}

// ── Get or create program template ─────────────────────────────────────────

export async function getOrCreateProgram(fellowshipId: string): Promise<ProgramTemplate | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Try to find existing
  const { data: existing } = await supabase
    .from('sponsor_program_templates')
    .select('id, sponsor_id, fellowship_id, name')
    .eq('sponsor_id', user.id)
    .eq('fellowship_id', fellowshipId)
    .maybeSingle()

  if (existing) return existing as ProgramTemplate

  // Auto-create
  const { data: created } = await supabase
    .from('sponsor_program_templates')
    .insert({ sponsor_id: user.id, fellowship_id: fellowshipId })
    .select('id, sponsor_id, fellowship_id, name')
    .single()

  return (created as ProgramTemplate) ?? null
}

// ── Fetch library tasks for a program ──────────────────────────────────────

export async function getLibraryTasks(programId: string): Promise<LibraryTask[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sponsor_task_library')
    .select('id, program_id, sponsor_id, step_number, title, description, category, sort_order, subsection, source')
    .eq('program_id', programId)
    .order('step_number')
    .order('sort_order')

  return (data ?? []) as LibraryTask[]
}

// ── Create a task ──────────────────────────────────────────────────────────

export async function createLibraryTask(input: {
  programId: string
  stepNumber: number
  title: string
  description: string | null
  category: string
  subsection: string | null
}): Promise<{ task?: LibraryTask; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get max sort_order for this step
  const { data: maxRow } = await supabase
    .from('sponsor_task_library')
    .select('sort_order')
    .eq('program_id', input.programId)
    .eq('step_number', input.stepNumber)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('sponsor_task_library')
    .insert({
      program_id: input.programId,
      sponsor_id: user.id,
      step_number: input.stepNumber,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      sort_order: nextSort,
      subsection: input.subsection,
      source: 'custom',
    })
    .select('id, program_id, sponsor_id, step_number, title, description, category, sort_order, subsection, source')
    .single()

  if (error) return { error: error.message }
  return { task: data as LibraryTask }
}

// ── Update a task ──────────────────────────────────────────────────────────

export async function updateLibraryTask(
  taskId: string,
  updates: { title?: string; description?: string | null; category?: string; subsection?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sponsor_task_library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }
  return {}
}

// ── Delete a task ──────────────────────────────────────────────────────────

export async function deleteLibraryTask(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sponsor_task_library')
    .delete()
    .eq('id', taskId)

  if (error) return { error: error.message }
  return {}
}

// ── Reorder tasks within a step ────────────────────────────────────────────

export async function reorderTasks(
  programId: string,
  stepNumber: number,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Normalize sort_order: 0, 1, 2, 3...
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('sponsor_task_library')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i])
      .eq('program_id', programId)
      .eq('step_number', stepNumber)

    if (error) return { error: error.message }
  }

  return {}
}

// ── Add/remove subsection ──────────────────────────────────────────────────

export async function setSubsection(
  taskIds: string[],
  subsection: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()

  for (const id of taskIds) {
    const { error } = await supabase
      .from('sponsor_task_library')
      .update({ subsection, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error: error.message }
  }

  return {}
}

// ── Create a subsection (set label on tasks) ───────────────────────────────

export async function createSubsection(
  programId: string,
  stepNumber: number,
  name: string
): Promise<{ error?: string }> {
  // A subsection is just a label on tasks — creating one doesn't require a DB insert.
  // It will be used when tasks are added to it.
  // This is a no-op placeholder; the UI handles grouping by the `subsection` field.
  void programId
  void stepNumber
  void name
  return {}
}

// ── Ungroup a subsection (move tasks back to main step) ────────────────────

export async function ungroupSubsection(
  programId: string,
  stepNumber: number,
  subsection: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sponsor_task_library')
    .update({ subsection: null, updated_at: new Date().toISOString() })
    .eq('program_id', programId)
    .eq('step_number', stepNumber)
    .eq('subsection', subsection)

  if (error) return { error: error.message }
  return {}
}
