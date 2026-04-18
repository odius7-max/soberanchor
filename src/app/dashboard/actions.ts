'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'

// A single existing relationship row between the searcher and the found user.
// direction 'you_are_sponsor'  → sponsor_id=you,  sponsee_id=them
// direction 'they_are_sponsor' → sponsor_id=them, sponsee_id=you
export interface ExistingRelationship {
  relationshipId:  string
  direction:       'you_are_sponsor' | 'they_are_sponsor'
  fellowshipId:    string | null
  fellowshipAbbr:  string | null
  status:          'active' | 'pending'
}

export type SearchResult =
  | { found: false; reason: 'not_found' | 'no_profile' | 'self' }
  | { found: true; userId: string; email: string; displayName: string | null; existingRelationships: ExistingRelationship[] }

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

  // Fetch all relationships between these two users in either direction.
  // Admin client so RLS never hides a row.
  const [relsRes, fellowshipsRes] = await Promise.all([
    admin
      .from('sponsor_relationships')
      .select('id, sponsor_id, sponsee_id, fellowship_id, status')
      .or(
        `and(sponsor_id.eq.${user.id},sponsee_id.eq.${found.id}),` +
        `and(sponsor_id.eq.${found.id},sponsee_id.eq.${user.id})`
      )
      .in('status', ['active', 'pending']),
    admin.from('fellowships').select('id, abbreviation'),
  ])

  const abbrMap: Record<string, string> = Object.fromEntries(
    (fellowshipsRes.data ?? []).map((f: { id: string; abbreviation: string }) => [f.id, f.abbreviation])
  )

  const existingRelationships: ExistingRelationship[] = (relsRes.data ?? []).map(rel => ({
    relationshipId:  rel.id as string,
    direction:       rel.sponsor_id === user.id ? 'you_are_sponsor' : 'they_are_sponsor',
    fellowshipId:    rel.fellowship_id as string | null,
    fellowshipAbbr:  rel.fellowship_id ? (abbrMap[rel.fellowship_id as string] ?? null) : null,
    status:          rel.status as 'active' | 'pending',
  }))

  return {
    found: true,
    userId: found.id,
    email: found.email ?? email,
    displayName: profile.display_name,
    existingRelationships,
  }
}

// Sponsor-initiated: current user (sponsor) sends a request to the sponsee.
export async function sendSponsorRequest(sponseeUserId: string, fellowshipId: string | null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  // Per-fellowship duplicate check (DB constraint is the backstop, this gives a clear message)
  const dupQuery = admin
    .from('sponsor_relationships')
    .select('id, status')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeUserId)
    .in('status', ['active', 'pending'])
  const { data: existing } = fellowshipId
    ? await dupQuery.eq('fellowship_id', fellowshipId)
    : await dupQuery.is('fellowship_id', null)

  if (existing && existing.length > 0) {
    const s = existing[0].status
    if (s === 'active')  throw new Error('You are already sponsoring this person in this program.')
    if (s === 'pending') throw new Error('A request is already pending for this program.')
  }

  const { error } = await admin
    .from('sponsor_relationships')
    .insert({ sponsor_id: user.id, sponsee_id: sponseeUserId, fellowship_id: fellowshipId ?? null, status: 'pending' })

  if (error) throw new Error(error.message)

  // Notify the sponsee (best-effort)
  try {
    const [{ data: sponsorProfile }, fellowshipRes] = await Promise.all([
      admin.from('user_profiles').select('display_name').eq('id', user.id).single(),
      fellowshipId
        ? admin.from('fellowships').select('abbreviation').eq('id', fellowshipId).single()
        : Promise.resolve({ data: null }),
    ])
    await sendNotification(sponseeUserId, 'sponsor_connection_request', {
      requesterName: (sponsorProfile as { display_name: string | null } | null)?.display_name ?? 'Someone',
      fellowship:    (fellowshipRes.data as { abbreviation: string } | null)?.abbreviation ?? null,
    })
  } catch { /* non-fatal */ }

  revalidatePath('/dashboard')
}

// Sponsee-initiated: current user wants this person as their sponsor.
// Uses admin client because INSERT RLS requires sponsor_id = auth.uid().
export async function requestSponsor(sponsorUserId: string, fellowshipId: string | null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  // Per-fellowship duplicate check
  const dupQuery = admin
    .from('sponsor_relationships')
    .select('id, status')
    .eq('sponsor_id', sponsorUserId)
    .eq('sponsee_id', user.id)
    .in('status', ['active', 'pending'])
  const { data: existing } = fellowshipId
    ? await dupQuery.eq('fellowship_id', fellowshipId)
    : await dupQuery.is('fellowship_id', null)

  if (existing && existing.length > 0) {
    const s = existing[0].status
    if (s === 'active')  throw new Error('You already have this person as your sponsor for this program.')
    if (s === 'pending') throw new Error('A request is already pending for this program.')
  }

  const { error } = await admin
    .from('sponsor_relationships')
    .insert({ sponsor_id: sponsorUserId, sponsee_id: user.id, fellowship_id: fellowshipId ?? null, status: 'pending' })

  if (error) throw new Error(error.message)

  // Notify the sponsor (best-effort)
  try {
    const [{ data: sponseeProfile }, fellowshipRes] = await Promise.all([
      admin.from('user_profiles').select('display_name').eq('id', user.id).single(),
      fellowshipId
        ? admin.from('fellowships').select('abbreviation').eq('id', fellowshipId).single()
        : Promise.resolve({ data: null }),
    ])
    await sendNotification(sponsorUserId, 'sponsor_connection_request', {
      requesterName: (sponseeProfile as { display_name: string | null } | null)?.display_name ?? 'Someone',
      fellowship:    (fellowshipRes.data as { abbreviation: string } | null)?.abbreviation ?? null,
    })
  } catch { /* non-fatal */ }

  revalidatePath('/dashboard')
}

// Either party can unlink an active or pending sponsor relationship.
// Returns a plain result object so errors serialize cleanly to the client.
// Note: cannot export the result type from a 'use server' file — inline only.
export async function removeSponsorRelationship(
  relationshipId: string,
): Promise<{ ok: true } | { ok: false; error: string; stage: string }> {
  try {
    console.log('[removeSponsorRelationship] start', { relationshipId })

    const supabase = await createClient()
    const authRes = await supabase.auth.getUser()
    const user = authRes.data.user
    if (authRes.error) return { ok: false, error: `Auth error: ${authRes.error.message}`, stage: 'auth' }
    if (!user) return { ok: false, error: 'Not signed in.', stage: 'auth' }
    console.log('[removeSponsorRelationship] auth ok', { userId: user.id })

    // 1. RLS-scoped read confirms visibility + participation
    const readRes = await supabase
      .from('sponsor_relationships')
      .select('id, sponsor_id, sponsee_id, status')
      .eq('id', relationshipId)
      .maybeSingle()

    if (readRes.error) {
      console.error('[removeSponsorRelationship] read error', readRes.error)
      return { ok: false, error: `Read failed: ${readRes.error.message}`, stage: 'read' }
    }
    const existing = readRes.data
    if (!existing) {
      return { ok: false, error: `Relationship ${relationshipId} not visible (RLS or missing row).`, stage: 'read' }
    }
    if (existing.sponsor_id !== user.id && existing.sponsee_id !== user.id) {
      return { ok: false, error: 'You are not a participant in this relationship.', stage: 'read' }
    }
    if (existing.status === 'ended') {
      revalidatePath('/dashboard')
      return { ok: true }
    }
    console.log('[removeSponsorRelationship] participant confirmed', { status: existing.status })

    // 2. Update — RLS policy already enforces participant-only writes
    const updRes = await supabase
      .from('sponsor_relationships')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', relationshipId)
      .select('id, status')

    if (updRes.error) {
      console.error('[removeSponsorRelationship] update error', updRes.error)
      return { ok: false, error: `Update failed: ${updRes.error.message}`, stage: 'update' }
    }
    const updated = updRes.data
    if (!updated || updated.length === 0) {
      return { ok: false, error: `Update returned zero rows (RLS blocked or row vanished).`, stage: 'update' }
    }
    if (updated[0].status !== 'ended') {
      return { ok: false, error: `Status after update is "${updated[0].status}" (expected "ended").`, stage: 'update' }
    }
    console.log('[removeSponsorRelationship] success', { id: updated[0].id })

    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    console.error('[removeSponsorRelationship] uncaught', e)
    return { ok: false, error: `Uncaught: ${msg}`, stage: 'catch' }
  }
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

  // Verify sponsor relationship (active or pending — consistent with sponsee list query)
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .in('status', ['active', 'pending'])
    .maybeSingle()

  if (!rel) throw new Error('No sponsor relationship found.')

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

// ─── Sponsor Reminder ────────────────────────────────────────────────────────

export async function sendSponsorReminder(sponseeId: string): Promise<{ sponsorName: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get sponsor's display name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const sponsorName = (profile?.display_name as string | null) ?? 'Your sponsor'

  // Verify active sponsor relationship
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) throw new Error('No active sponsor relationship found.')

  const admin = createAdminClient()

  // Rate limit: one reminder per sponsor per sponsee per 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await admin
    .from('activity_feed')
    .select('id')
    .eq('user_id', sponseeId)
    .eq('event_type', 'reminder')
    .gte('created_at', since)
    .filter('metadata->>sponsor_id', 'eq', user.id)
    .limit(1)

  if ((recent ?? []).length > 0) throw new Error('RATE_LIMITED')

  const { error } = await admin
    .from('activity_feed')
    .insert({
      user_id: sponseeId,
      event_type: 'reminder',
      title: `${sponsorName} sent you a reminder`,
      description: 'Your sponsor is checking in — how are you doing today?',
      is_read: false,
      metadata: {
        sponsor_id: user.id,
        sponsor_name: sponsorName,
        message: 'Your sponsor is checking in — how are you doing today?',
      },
    })

  if (error) throw new Error(error.message)
  return { sponsorName }
}

// ─── Meeting Report ───────────────────────────────────────────────────────────

export interface MeetingReportEntry {
  id: string
  meetingId: string | null
  meetingName: string
  fellowshipName: string | null
  meetingSlug: string | null
  attendedAt: string
  checkinMethod: string
}

export async function getSponseeMeetingReport(sponseeId: string): Promise<MeetingReportEntry[]> {
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

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
  ninetyDaysAgo.setHours(0, 0, 0, 0)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('meeting_attendance')
    .select('id,meeting_id,meeting_name,fellowship_name,attended_at,checkin_method,meetings(slug)')
    .eq('user_id', sponseeId)
    .gte('attended_at', ninetyDaysAgo.toISOString())
    .order('attended_at', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((e) => {
    const m = e.meetings as unknown as { slug: string } | null
    return {
      id: e.id as string,
      meetingId: e.meeting_id as string | null,
      meetingName: e.meeting_name as string,
      fellowshipName: e.fellowship_name as string | null,
      meetingSlug: m?.slug ?? null,
      attendedAt: e.attended_at as string,
      checkinMethod: e.checkin_method as string,
    }
  })
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
