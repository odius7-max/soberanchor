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

// ─── Step Work Report ─────────────────────────────────────────────────────────

export interface StepWorkReportEntry {
  id: string
  sectionTitle: string
  stepNumber: number | null
  slug: string
  reviewStatus: string | null
  submittedAt: string | null
  reviewedAt: string | null
  updatedAt: string
  createdAt: string
  responses: Record<string, unknown> | null
  totalPrompts: number
}

export interface StepWorkReportData {
  entries: StepWorkReportEntry[]        // last 90 days, newest first
  completedSteps: number
  totalSteps: number
  fellowshipName: string | null
  awaitingReview: number                // all-time submitted count
  lastActivityDate: string | null       // most recent updated_at ever
}

export async function getSponseeStepWorkReport(sponseeId: string): Promise<StepWorkReportData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify active relationship and capture fellowship_id
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id, fellowship_id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) throw new Error('No active sponsor relationship found.')

  const admin = createAdminClient()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
  ninetyDaysAgo.setHours(0, 0, 0, 0)

  const fellowshipId = rel.fellowship_id as string | null

  // Parallel: entries in range + completions + awaiting count + last activity
  const [entriesRes, completionsRes, awaitingRes, lastActivityRes] = await Promise.all([
    admin
      .from('step_work_entries')
      .select('id, responses, review_status, submitted_at, reviewed_at, updated_at, created_at, program_workbooks(title, step_number, slug, prompts)')
      .eq('user_id', sponseeId)
      .gte('updated_at', ninetyDaysAgo.toISOString())
      .order('updated_at', { ascending: false }),
    fellowshipId
      ? admin.from('step_completions').select('step_number').eq('user_id', sponseeId).eq('fellowship_id', fellowshipId).eq('is_completed', true)
      : admin.from('step_completions').select('step_number').eq('user_id', sponseeId).eq('is_completed', true),
    admin
      .from('step_work_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sponseeId)
      .eq('review_status', 'submitted'),
    admin
      .from('step_work_entries')
      .select('updated_at')
      .eq('user_id', sponseeId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Fellowship-specific stats (conditional second pass)
  let totalSteps = 12
  let fellowshipName: string | null = null
  if (fellowshipId) {
    const [totalStepsRes, fellowshipRes] = await Promise.all([
      admin
        .from('program_workbooks')
        .select('step_number')
        .eq('fellowship_id', fellowshipId)
        .not('step_number', 'is', null)
        .eq('is_active', true),
      admin.from('fellowships').select('name').eq('id', fellowshipId).single(),
    ])
    const distinctSteps = new Set(
      (totalStepsRes.data ?? [])
        .filter((w: { step_number: number | null }) => w.step_number !== null)
        .map((w: { step_number: number }) => w.step_number)
    ).size
    totalSteps = distinctSteps || 12
    fellowshipName = (fellowshipRes.data as { name: string } | null)?.name ?? null
  }

  // Build typed entries
  const entries: StepWorkReportEntry[] = (entriesRes.data ?? []).map((e) => {
    const wb = e.program_workbooks as unknown as {
      title: string; step_number: number | null; slug: string; prompts: unknown[] | null
    } | null
    const prompts = wb?.prompts
    return {
      id: e.id as string,
      sectionTitle: wb?.title ?? 'Step work',
      stepNumber: (wb?.step_number ?? null) as number | null,
      slug: wb?.slug ?? '',
      reviewStatus: e.review_status as string | null,
      submittedAt: e.submitted_at as string | null,
      reviewedAt: e.reviewed_at as string | null,
      updatedAt: e.updated_at as string,
      createdAt: e.created_at as string,
      responses: e.responses as Record<string, unknown> | null,
      totalPrompts: Array.isArray(prompts) ? prompts.length : 0,
    }
  })

  const completedSteps = new Set(
    (completionsRes.data ?? []).map((c: { step_number: number }) => c.step_number)
  ).size

  return {
    entries,
    completedSteps,
    totalSteps,
    fellowshipName,
    awaitingReview: awaitingRes.count ?? 0,
    lastActivityDate: (lastActivityRes.data as { updated_at: string } | null)?.updated_at ?? null,
  }
}

// ─── Check-in Report ──────────────────────────────────────────────────────────

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
