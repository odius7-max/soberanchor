import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { CheckIn, JournalEntry, MeetingAttendance, ReadingAssignment, SponseeFull, SponseeCheckIn, ActivityItem, SobrietyMilestone, Fellowship, ActiveSponsor, ProviderData, ProgramRowData } from '@/components/dashboard/DashboardShell'
import type { PendingRequest } from '@/components/dashboard/PendingRequests'
import type { FacilityData } from '@/components/providers/ListingTab'
import type { Lead } from '@/components/providers/LeadsTab'
import { getDailyQuote } from '@/lib/daily-quote'
import { buildMemberTodayQueue, buildSponsorTodayItems, getTodaySummaryParts } from '@/lib/today-queue'
import type { MemberProgram } from '@/lib/today-queue'
import { getTodayDateStr } from '@/lib/today-window'
import { getUpcomingMilestones } from '@/lib/milestone-windows'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  const userId = user.id
  const phone = user.phone ?? null

  // ── Email-invite conversion ─────────────────────────────────────────────
  // Two-directional: materialize any pending sponsee_invites (sponsor→sponsee)
  // AND sponsor_invites (sponsee→sponsor) addressed to this user's email into
  // pending sponsor_relationships rows, so the existing PendingRequests banner
  // picks them up without the invitee needing to search for anyone. Idempotent:
  // we dedupe against existing relationships and mark processed invites
  // 'converted'. Fellowship is resolved from the sender's primary_fellowship_id
  // at conversion time, which also fixes the long-standing null fellowship_id
  // bug at the source.
  if (user.email) {
    const inviteAdmin = createAdminClient()
    const emailLower = user.email.toLowerCase()

    // ── Direction 1: sponsor invited sponsee (sponsee_invites) ──
    const { data: pendingInvites } = await inviteAdmin
      .from('sponsee_invites')
      .select('id, sponsor_id, created_at')
      .eq('invitee_email', emailLower)
      .eq('status', 'pending')

    if (pendingInvites && pendingInvites.length > 0) {
      const inviteSponsorIds = [...new Set(pendingInvites.map(i => i.sponsor_id as string))]

      const [{ data: inviteSponsorProfiles }, { data: existingInviteRels }] = await Promise.all([
        inviteAdmin.from('user_profiles').select('id, primary_fellowship_id').in('id', inviteSponsorIds),
        inviteAdmin.from('sponsor_relationships').select('sponsor_id').in('sponsor_id', inviteSponsorIds).eq('sponsee_id', userId),
      ])

      const fellowshipMap = new Map(
        (inviteSponsorProfiles ?? []).map(p => [
          p.id as string,
          (p as { primary_fellowship_id: string | null }).primary_fellowship_id ?? null,
        ])
      )
      const existingRelSet = new Set((existingInviteRels ?? []).map(r => r.sponsor_id as string))

      const relInserts: Array<{ sponsor_id: string; sponsee_id: string; status: string; fellowship_id: string | null; created_at: string }> = []
      const inviteIdsToMark: string[] = []

      // Track sponsors we've already queued in THIS batch — otherwise multiple
      // invites from the same sponsor both pass the DB-existence check and we
      // insert duplicate pending rows. (The existingRelSet was loaded once
      // before the loop and doesn't know about rows we're about to insert.)
      const queuedSponsors = new Set<string>()
      for (const inv of pendingInvites) {
        inviteIdsToMark.push(inv.id as string)
        const sponsorId = inv.sponsor_id as string
        if (existingRelSet.has(sponsorId) || queuedSponsors.has(sponsorId)) continue
        queuedSponsors.add(sponsorId)
        relInserts.push({
          sponsor_id: sponsorId,
          sponsee_id: userId,
          status: 'pending',
          fellowship_id: fellowshipMap.get(sponsorId) ?? null,
          created_at: inv.created_at as string,
        })
      }

      if (relInserts.length > 0) {
        await inviteAdmin.from('sponsor_relationships').insert(relInserts)
      }
      if (inviteIdsToMark.length > 0) {
        await inviteAdmin.from('sponsee_invites').update({ status: 'converted' }).in('id', inviteIdsToMark)
      }
    }

    // ── Direction 2: sponsee invited sponsor (sponsor_invites) ──
    // Mirror of the block above. New user = sponsor; original sender = sponsee.
    // Incoming request then surfaces in PendingRequests with
    // perspective="as_sponsor".
    const { data: pendingSponsorInvites } = await inviteAdmin
      .from('sponsor_invites')
      .select('id, sponsee_id, created_at')
      .eq('invitee_email', emailLower)
      .eq('status', 'pending')

    if (pendingSponsorInvites && pendingSponsorInvites.length > 0) {
      const inviteSponseeIds = [...new Set(pendingSponsorInvites.map(i => i.sponsee_id as string))]

      const [{ data: inviteSponseeProfiles }, { data: existingSponsorRels }] = await Promise.all([
        inviteAdmin.from('user_profiles').select('id, primary_fellowship_id').in('id', inviteSponseeIds),
        inviteAdmin.from('sponsor_relationships').select('sponsee_id').eq('sponsor_id', userId).in('sponsee_id', inviteSponseeIds),
      ])

      const sponseeFellowshipMap = new Map(
        (inviteSponseeProfiles ?? []).map(p => [
          p.id as string,
          (p as { primary_fellowship_id: string | null }).primary_fellowship_id ?? null,
        ])
      )
      const existingSponsorRelSet = new Set((existingSponsorRels ?? []).map(r => r.sponsee_id as string))

      const sponsorRelInserts: Array<{ sponsor_id: string; sponsee_id: string; status: string; fellowship_id: string | null; created_at: string }> = []
      const sponsorInviteIdsToMark: string[] = []

      // Same within-batch dedupe as direction 1 above.
      const queuedSponsees = new Set<string>()
      for (const inv of pendingSponsorInvites) {
        sponsorInviteIdsToMark.push(inv.id as string)
        const sponseeId = inv.sponsee_id as string
        if (existingSponsorRelSet.has(sponseeId) || queuedSponsees.has(sponseeId)) continue
        queuedSponsees.add(sponseeId)
        sponsorRelInserts.push({
          sponsor_id: userId,
          sponsee_id: sponseeId,
          status: 'pending',
          fellowship_id: sponseeFellowshipMap.get(sponseeId) ?? null,
          created_at: inv.created_at as string,
        })
      }

      if (sponsorRelInserts.length > 0) {
        await inviteAdmin.from('sponsor_relationships').insert(sponsorRelInserts)
      }
      if (sponsorInviteIdsToMark.length > 0) {
        await inviteAdmin.from('sponsor_invites').update({ status: 'converted' }).in('id', sponsorInviteIdsToMark)
      }
    }
  }


  // Parallel fetches
  const [
    profileRes,
    recentCheckInsRes,
    journalEntriesRes,
    journalCountRes,
    stepWorkCountRes,
    meetingAttendanceRes,
    meetingsTotalRes,
    checkInsTotalRes,
    sponsorRelRes,
    pendingReqsRes,
    pendingAsSponsorRes,
    stepCompletionsRes,
    activityFeedRes,
    milestonesRes,
    fellowshipsRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('display_name,sobriety_date,primary_fellowship_id,current_step,is_available_sponsor,onboarding_completed').eq('id', userId).single(),
    supabase.from('check_ins').select('id,check_in_date,mood,notes,sober_today,meetings_attended').eq('user_id', userId).order('check_in_date', { ascending: false }).limit(4),
    supabase.from('journal_entries').select('id,title,entry_date,body,step_number,is_shared_with_sponsor').eq('user_id', userId).order('entry_date', { ascending: false }).limit(10),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('step_work_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('review_status', 'draft'),
    supabase.from('meeting_attendance').select('id,meeting_name,fellowship_name,location_name,attended_at,checkin_method,notes').eq('user_id', userId).order('attended_at', { ascending: false }).limit(20),
    supabase.from('meeting_attendance').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sponsor_relationships').select('id,sponsor_id,fellowship_id').eq('sponsee_id', userId).eq('status', 'active'),
    // Pending where I'm the sponsee (sponsor initiated)
    supabase.from('sponsor_relationships').select('id,sponsor_id,created_at').eq('sponsee_id', userId).eq('status', 'pending'),
    // Pending where I'm the sponsor (sponsee initiated)
    supabase.from('sponsor_relationships').select('id,sponsee_id,created_at').eq('sponsor_id', userId).eq('status', 'pending'),
    // Step completions — used to derive real progress per fellowship
    supabase.from('step_completions').select('step_number,fellowship_id').eq('user_id', userId).eq('is_completed', true),
    // Activity feed
    supabase.from('activity_feed').select('id,event_type,title,description,is_read,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    // Sobriety milestones
    supabase.from('sobriety_milestones').select('id,label,sobriety_date,fellowship_id,is_primary,notes').eq('user_id', userId).order('is_primary', { ascending: false }).order('sobriety_date'),
    // Fellowships for the add-milestone form
    supabase.from('fellowships').select('id,name,abbreviation').order('name'),
  ])

  const stepCompletions = (stepCompletionsRes.data ?? []) as { step_number: number; fellowship_id: string | null }[]

  const profile = profileRes.data ?? null
  const fellowships: Fellowship[] = (fellowshipsRes.data ?? []) as Fellowship[]

  // Migrate user_profiles.sobriety_date → sobriety_milestones on first dashboard load
  let initialMilestones: SobrietyMilestone[] = (milestonesRes.data ?? []) as SobrietyMilestone[]
  if (initialMilestones.length === 0 && profile?.sobriety_date) {
    const pf = fellowships.find(f => f.id === (profile as { primary_fellowship_id?: string | null }).primary_fellowship_id)
    const label = pf?.abbreviation ?? pf?.name ?? 'Sobriety'
    const { data: newM } = await supabase.from('sobriety_milestones').insert({
      user_id: userId,
      label,
      sobriety_date: profile.sobriety_date,
      fellowship_id: (profile as { primary_fellowship_id?: string | null }).primary_fellowship_id ?? null,
      is_primary: true,
    }).select('id,label,sobriety_date,fellowship_id,is_primary,notes').single()
    if (newM) initialMilestones = [newM as SobrietyMilestone]
  }

  const recentCheckIns: CheckIn[] = (recentCheckInsRes.data ?? []) as CheckIn[]
  const journalEntries: JournalEntry[] = (journalEntriesRes.data ?? []) as JournalEntry[]
  const journalCount = journalCountRes.count ?? 0
  const stepWorkCount = stepWorkCountRes.count ?? 0
  const meetingAttendance: MeetingAttendance[] = (meetingAttendanceRes.data ?? []) as MeetingAttendance[]
  const meetingsTotal = meetingsTotalRes.count ?? 0
  const checkInsTotal = checkInsTotalRes.count ?? 0
  const activityItems: ActivityItem[] = (activityFeedRes.data ?? []) as ActivityItem[]

  // Build activeSponsors — resolve display names via admin (RLS blocks cross-user profile reads)
  const activeSponsorRels = (sponsorRelRes.data ?? []) as { id: string; sponsor_id: string; fellowship_id: string | null }[]
  let activeSponsors: ActiveSponsor[] = []
  if (activeSponsorRels.length > 0) {
    const adminForSponsors = createAdminClient()
    const sponsorIds = [...new Set(activeSponsorRels.map(r => r.sponsor_id))]
    const { data: sponsorProfiles } = await adminForSponsors
      .from('user_profiles').select('id, display_name').in('id', sponsorIds)
    const sponsorNameMap: Record<string, string | null> = Object.fromEntries(
      (sponsorProfiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name])
    )
    activeSponsors = activeSponsorRels.map(r => {
      const f = r.fellowship_id ? fellowships.find(f => f.id === r.fellowship_id) : null
      return {
        relationshipId: r.id,
        name: sponsorNameMap[r.sponsor_id] ?? 'Sponsor',
        fellowshipId: r.fellowship_id ?? null,
        fellowshipAbbr: f?.abbreviation ?? null,
      }
    })
  }

  // Meetings this week (since last Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const lastSunday = new Date(now)
  lastSunday.setDate(now.getDate() - dayOfWeek)
  lastSunday.setHours(0, 0, 0, 0)
  const meetingsThisWeek = meetingAttendance.filter(m => new Date(m.attended_at) >= lastSunday).length

  // Pending sponsor requests — resolve names via admin client (RLS blocks user_profiles cross-lookup)
  let pendingRequests: PendingRequest[] = []
  let sponsorPendingRequests: PendingRequest[] = []

  // Fetch a broader view of pending rows that also includes fellowship_id so we
  // can filter out rows that would collide with an existing active relationship
  // on idx_sponsor_per_fellowship (or unique_active_pair_null_fellowship). Those
  // pending rows are un-acceptable — accepting them would throw a unique
  // constraint error, so don't surface them at all.
  type RawPending = { id: string; created_at: string; fellowship_id: string | null; sponsor_id?: string; sponsee_id?: string }
  const rawPendingAsSponseeWithFellowship = ((pendingReqsRes.data ?? []) as any[]).map(r => ({
    id: r.id as string, created_at: r.created_at as string,
    sponsor_id: r.sponsor_id as string, fellowship_id: null as string | null,
  })) as RawPending[]
  const rawPendingAsSponsorWithFellowship = ((pendingAsSponsorRes.data ?? []) as any[]).map(r => ({
    id: r.id as string, created_at: r.created_at as string,
    sponsee_id: r.sponsee_id as string, fellowship_id: null as string | null,
  })) as RawPending[]

  // Hydrate fellowship_id on each pending row — the base queries don't select it.
  if (rawPendingAsSponseeWithFellowship.length > 0 || rawPendingAsSponsorWithFellowship.length > 0) {
    const allIds = [
      ...rawPendingAsSponseeWithFellowship.map(r => r.id),
      ...rawPendingAsSponsorWithFellowship.map(r => r.id),
    ]
    const { data: fRows } = await supabase
      .from('sponsor_relationships')
      .select('id, fellowship_id')
      .in('id', allIds)
    const fMap = new Map((fRows ?? []).map(r => [r.id as string, (r.fellowship_id as string | null) ?? null]))
    for (const r of rawPendingAsSponseeWithFellowship) r.fellowship_id = fMap.get(r.id) ?? null
    for (const r of rawPendingAsSponsorWithFellowship) r.fellowship_id = fMap.get(r.id) ?? null
  }

  // Build a lookup of active relationships where I'm the sponsee, keyed by
  // fellowship_id string (null → '__null__'). Used to suppress pending-as-sponsee
  // invites that conflict with an existing sponsor for the same fellowship.
  const activeAsSponseeByFellowship = new Set<string>()
  for (const r of activeSponsorRels) {
    activeAsSponseeByFellowship.add(r.fellowship_id ?? '__null__')
  }

  // Fetch active relationships where I'm the sponsor, for the opposite-direction
  // filter. Keyed by "sponseeId|fellowshipId" — only that pair is truly blocked.
  const { data: activeAsSponsorRowsForFilter } = await supabase
    .from('sponsor_relationships')
    .select('sponsee_id, fellowship_id')
    .eq('sponsor_id', userId)
    .eq('status', 'active')
  const activeAsSponsorPairKeys = new Set(
    (activeAsSponsorRowsForFilter ?? []).map(r =>
      `${r.sponsee_id as string}|${(r.fellowship_id as string | null) ?? '__null__'}`
    )
  )

  // ── Program rows for Hero Phase 2 table ────────────────────────────────────
  // One entry per sobriety_milestone, used to drive the SOBER/FELLOWSHIP/PROGRAM/SINCE table.
  const milestoneFellowshipIds = initialMilestones.map(m => m.fellowship_id).filter(Boolean) as string[]
  const workbookByFellowship = new Map<string, { workbook_name: string | null }>()
  const stepWorkData: Record<string, Record<number, { label: string; slug: string }>> = {}
  if (milestoneFellowshipIds.length > 0) {
    const { data: wbRows } = await supabase
      .from('program_workbooks')
      .select('fellowship_id, workbook_name, step_number, title, slug')
      .eq('is_active', true)
      .in('fellowship_id', milestoneFellowshipIds)
      .order('sort_order')
    for (const wb of (wbRows ?? [])) {
      const fid = wb.fellowship_id as string
      if (!workbookByFellowship.has(fid)) workbookByFellowship.set(fid, { workbook_name: (wb as any).workbook_name as string | null })
      const stepNum = wb.step_number as number | null
      if (stepNum !== null) {
        if (!stepWorkData[fid]) stepWorkData[fid] = {}
        if (!stepWorkData[fid][stepNum]) {
          const label = (wb.title as string).replace(/^Step \d+:\s*/i, '')
          stepWorkData[fid][stepNum] = { label, slug: wb.slug as string }
        }
      }
    }
  }
  const sponseeCountByFellowship = new Map<string, number>()
  for (const r of (activeAsSponsorRowsForFilter ?? [])) {
    const fid = (r.fellowship_id as string | null) ?? '__null__'
    sponseeCountByFellowship.set(fid, (sponseeCountByFellowship.get(fid) ?? 0) + 1)
  }
  function getStepForFellowship(fellowshipId: string | null): number | null {
    if (!fellowshipId) return null
    const completed = new Set(
      stepCompletions.filter(sc => sc.fellowship_id === fellowshipId).map(sc => sc.step_number)
    )
    if (completed.size === 0) return null
    for (let i = 1; i <= 12; i++) { if (!completed.has(i)) return i }
    return 13 // all 12 done — signals "complete" via currentStep > maxStep in getProgramLabel
  }
  const programRows: ProgramRowData[] = initialMilestones.map(m => {
    const fellowship = m.fellowship_id ? fellowships.find(f => f.id === m.fellowship_id) : null
    const wb = m.fellowship_id ? workbookByFellowship.get(m.fellowship_id) : null
    return {
      milestoneId: m.id,
      fellowshipId: m.fellowship_id ?? null,
      fellowshipAbbr: fellowship ? (fellowship.abbreviation ?? fellowship.name) : null,
      workbookName: wb?.workbook_name ?? null,
      currentStep: getStepForFellowship(m.fellowship_id ?? null),
      maxStep: wb ? 12 : null,
      activeSponseesInFellowship: sponseeCountByFellowship.get(m.fellowship_id ?? '__null__') ?? 0,
      sobrietyDate: m.sobriety_date,
    }
  })

  // ── Working programs (Phase 3) ─────────────────────────────────────────────
  // Pills appear for every declared fellowship (milestone with a fellowship_id),
  // regardless of step progress or sponsor relationships. Primary milestone first
  // (milestoneFellowshipIds preserves the is_primary DESC order from the query).
  const workingPrograms = [...new Set(milestoneFellowshipIds)].map(fid => {
    const f = fellowships.find(f => f.id === fid)
    return { fellowshipId: fid, fellowshipAbbr: f ? (f.abbreviation ?? f.name) : fid }
  })

  const rawPendingAsSponsee = rawPendingAsSponseeWithFellowship.filter(r => {
    // Skip if I already have an active sponsor for this fellowship
    return !activeAsSponseeByFellowship.has(r.fellowship_id ?? '__null__')
  })
  const rawPendingAsSponsor = rawPendingAsSponsorWithFellowship.filter(r => {
    // Skip if I'm already sponsoring this person in this fellowship
    const key = `${r.sponsee_id ?? ''}|${r.fellowship_id ?? '__null__'}`
    return !activeAsSponsorPairKeys.has(key)
  })

  if (rawPendingAsSponsee.length > 0 || rawPendingAsSponsor.length > 0) {
    const admin = createAdminClient()
    const allIds = [
      ...rawPendingAsSponsee.map((r: any) => r.sponsor_id),
      ...rawPendingAsSponsor.map((r: any) => r.sponsee_id),
    ]
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id, display_name')
      .in('id', allIds)
    const nameMap: Record<string, string | null> = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.id, p.display_name])
    )
    // Dedupe by the "other" user id, keeping the most recent row. Prevents
    // the same requester from showing up multiple times if duplicate pending
    // sponsor_relationships rows exist (e.g. from legacy data or the pre-fix
    // conversion loop). Most-recent wins so Accept/Decline acts on the latest.
    const dedupeMostRecent = <T extends { created_at: string }>(
      rows: T[],
      keyOf: (r: T) => string
    ): T[] => {
      const best = new Map<string, T>()
      for (const r of rows) {
        const k = keyOf(r)
        const prev = best.get(k)
        if (!prev || new Date(r.created_at) > new Date(prev.created_at)) best.set(k, r)
      }
      return Array.from(best.values())
    }
    pendingRequests = dedupeMostRecent(rawPendingAsSponsee, (r: any) => r.sponsor_id as string)
      .map((r: any) => ({
        id: r.id,
        otherId: r.sponsor_id,
        otherName: nameMap[r.sponsor_id] ?? 'Anonymous',
        createdAt: r.created_at,
      }))
    sponsorPendingRequests = dedupeMostRecent(rawPendingAsSponsor, (r: any) => r.sponsee_id as string)
      .map((r: any) => ({
        id: r.id,
        otherId: r.sponsee_id,
        otherName: nameMap[r.sponsee_id] ?? 'Anonymous',
        createdAt: r.created_at,
      }))
  }

  // Reading assignments — fetch across all active sponsor relationships
  let readingAssignments: ReadingAssignment[] = []
  if (activeSponsorRels.length > 0) {
    const allRelIds = activeSponsorRels.map(r => r.id)
    const { data } = await supabase
      .from('reading_assignments')
      .select('id,title,source,is_completed,due_date,created_at')
      .in('sponsor_relationship_id', allRelIds)
      .order('created_at', { ascending: false })
    readingAssignments = (data ?? []) as ReadingAssignment[]
  }

  // Sponsees (if is_available_sponsor)
  let sponsees: SponseeFull[] = []
  if (profile?.is_available_sponsor) {
    const { data: relData } = await supabase
      .from('sponsor_relationships')
      .select('id,sponsee_id,fellowship_id')
      .eq('sponsor_id', userId)
      .eq('status', 'active')

    if (relData && relData.length > 0) {
      const sponseeIds = [...new Set(relData.map(r => r.sponsee_id))]
      // Multiple relationships per sponsee are possible (different fellowships)
      const relsBySponsee: Record<string, { id: string; fellowshipId: string | null }[]> = {}
      for (const r of relData) {
        if (!relsBySponsee[r.sponsee_id]) relsBySponsee[r.sponsee_id] = []
        relsBySponsee[r.sponsee_id].push({ id: r.id, fellowshipId: r.fellowship_id as string | null })
      }
      // For backwards-compat step-completion filtering, use first relationship's fellowship
      const relMap = Object.fromEntries(
        Object.entries(relsBySponsee).map(([sid, rels]) => [sid, { id: rels[0].id, fellowshipId: rels[0].fellowshipId }])
      )
      const sponseeAdmin = createAdminClient()

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10)

      const today = new Date().toISOString().slice(0, 10)

      const [
        sponseeProfilesRes,
        sponseeCheckInsRes,
        pendingStepWorkRes,
        stepCompletionsRes,
        latestStepWorkRes,
        meetingAttendanceRes,
        sponsorNotesRes,
        sponsorTasksRes,
      ] = await Promise.all([
        sponseeAdmin.from('user_profiles').select('id,display_name,sobriety_date').in('id', sponseeIds),
        // 60-day check-in history — only rows the sponsee opted to share
        sponseeAdmin.from('check_ins')
          .select('id,user_id,check_in_date,mood,notes,sober_today,meetings_attended,called_sponsor,sponsor_acknowledged_at')
          .in('user_id', sponseeIds)
          .eq('is_shared_with_sponsor', true)
          .gte('check_in_date', sixtyDaysAgoStr)
          .order('check_in_date', { ascending: false }),
        // Count pending reviews per sponsee
        sponseeAdmin.from('step_work_entries').select('user_id').in('user_id', sponseeIds).eq('review_status', 'submitted'),
        // Step completions filtered by fellowship
        sponseeAdmin.from('step_completions').select('user_id,fellowship_id').in('user_id', sponseeIds).eq('is_completed', true),
        // Latest submitted/reviewed step work entry with workbook title
        sponseeAdmin.from('step_work_entries')
          .select('user_id,submitted_at,updated_at,program_workbooks(title,step_number)')
          .in('user_id', sponseeIds)
          .in('review_status', ['submitted', 'reviewed'])
          .order('updated_at', { ascending: false }),
        // Latest meeting attendance per sponsee
        sponseeAdmin.from('meeting_attendance')
          .select('user_id,meeting_name,attended_at')
          .in('user_id', sponseeIds)
          .order('attended_at', { ascending: false })
          .limit(sponseeIds.length * 5),
        // Sponsor's own private notes (RLS-safe: sponsor_id = current user)
        supabase.from('sponsor_notes')
          .select('sponsee_id,note_text,created_at')
          .eq('sponsor_id', userId)
          .in('sponsee_id', sponseeIds)
          .order('created_at', { ascending: false }),
        // Active sponsor tasks for task counter badges
        supabase.from('sponsor_tasks')
          .select('sponsee_id,status,due_date')
          .eq('sponsor_id', userId)
          .in('sponsee_id', sponseeIds)
          .neq('status', 'completed'),
      ])

      // Build check-in history per sponsee
      const checkInsBySponsee: Record<string, SponseeCheckIn[]> = {}
      for (const ci of (sponseeCheckInsRes.data ?? [])) {
        if (!checkInsBySponsee[ci.user_id]) checkInsBySponsee[ci.user_id] = []
        checkInsBySponsee[ci.user_id].push({
          id: ci.id as string,
          date: ci.check_in_date as string,
          mood: ci.mood as string | null,
          notes: ci.notes as string | null,
          soberToday: ci.sober_today as boolean,
          meetingsAttended: (ci.meetings_attended as number | null) ?? 0,
          calledSponsor: ci.called_sponsor as boolean | null,
          sponsor_acknowledged_at: ci.sponsor_acknowledged_at as string | null,
        })
      }

      // Pending step work count per sponsee
      const pendingBySponsee: Record<string, number> = {}
      for (const sw of (pendingStepWorkRes.data ?? [])) {
        pendingBySponsee[sw.user_id] = (pendingBySponsee[sw.user_id] ?? 0) + 1
      }

      // Completed steps per sponsee filtered to relationship fellowship
      const completedBySponsee: Record<string, number> = {}
      for (const sc of (stepCompletionsRes.data ?? [])) {
        const fellowship = relMap[sc.user_id]?.fellowshipId
        if (!fellowship || sc.fellowship_id === fellowship) {
          completedBySponsee[sc.user_id] = (completedBySponsee[sc.user_id] ?? 0) + 1
        }
      }

      // Latest step work per sponsee
      const latestStepWorkBySponsee: Record<string, { date: string; title: string; stepNumber: number | null }> = {}
      for (const sw of (latestStepWorkRes.data ?? [])) {
        if (!latestStepWorkBySponsee[sw.user_id]) {
          const wb = sw.program_workbooks as unknown as { title: string; step_number: number | null } | null
          const date = (sw.submitted_at ?? sw.updated_at) as string | null
          if (date) {
            latestStepWorkBySponsee[sw.user_id] = {
              date,
              title: wb?.title ?? 'Step work',
              stepNumber: wb?.step_number ?? null,
            }
          }
        }
      }

      // Latest meeting per sponsee
      const latestMeetingBySponsee: Record<string, { date: string; name: string }> = {}
      for (const ma of (meetingAttendanceRes.data ?? [])) {
        if (!latestMeetingBySponsee[ma.user_id]) {
          latestMeetingBySponsee[ma.user_id] = {
            date: (ma.attended_at as string).slice(0, 10),
            name: ma.meeting_name as string,
          }
        }
      }

      // Latest sponsor note + total count per sponsee
      const latestNoteBySponsee: Record<string, { text: string; createdAt: string }> = {}
      const noteCountBySponsee: Record<string, number> = {}
      for (const note of (sponsorNotesRes.data ?? [])) {
        if (!latestNoteBySponsee[note.sponsee_id]) {
          latestNoteBySponsee[note.sponsee_id] = {
            text: note.note_text as string,
            createdAt: note.created_at as string,
          }
        }
        noteCountBySponsee[note.sponsee_id] = (noteCountBySponsee[note.sponsee_id] ?? 0) + 1
      }

      // Active + overdue task counts per sponsee
      const activeTasksBySponsee: Record<string, number> = {}
      const overdueTasksBySponsee: Record<string, number> = {}
      for (const t of (sponsorTasksRes.data ?? [])) {
        const sid = t.sponsee_id as string
        activeTasksBySponsee[sid] = (activeTasksBySponsee[sid] ?? 0) + 1
        if (t.due_date && (t.due_date as string) < today) {
          overdueTasksBySponsee[sid] = (overdueTasksBySponsee[sid] ?? 0) + 1
        }
      }

      // Build per-sponsee relationships list (with fellowship abbr)
      const relationshipsBySponsee: Record<string, { id: string; fellowshipId: string | null; fellowshipAbbr: string | null }[]> = {}
      for (const [sid, rels] of Object.entries(relsBySponsee)) {
        relationshipsBySponsee[sid] = rels.map(r => {
          const f = r.fellowshipId ? fellowships.find(f => f.id === r.fellowshipId) : null
          return { id: r.id, fellowshipId: r.fellowshipId, fellowshipAbbr: f?.abbreviation ?? null }
        })
      }

      sponsees = (sponseeProfilesRes.data ?? []).map(sp => {
        const completedSteps = Math.min(completedBySponsee[sp.id] ?? 0, 12)
        const rels = relationshipsBySponsee[sp.id] ?? []
        const fellowshipAbbrs = rels.map(r => r.fellowshipAbbr).filter((a): a is string => a !== null)
        return {
          id: sp.id,
          name: (sp.display_name as string | null) ?? 'Anonymous',
          fellowshipAbbr: fellowshipAbbrs[0] ?? null,
          fellowshipAbbrs,
          relationships: rels,
          sobrietyDate: (sp.sobriety_date as string | null) ?? null,
          checkInHistory: checkInsBySponsee[sp.id] ?? [],
          lastStepWork: latestStepWorkBySponsee[sp.id] ?? null,
          pendingReviews: pendingBySponsee[sp.id] ?? 0,
          lastMeeting: latestMeetingBySponsee[sp.id] ?? null,
          completedSteps,
          totalSteps: 12,
          latestNote: latestNoteBySponsee[sp.id] ?? null,
          noteCount: noteCountBySponsee[sp.id] ?? 0,
          activeTasks: activeTasksBySponsee[sp.id] ?? 0,
          overdueTasks: overdueTasksBySponsee[sp.id] ?? 0,
        }
      })
    }
  }

  // ── Provider data (if user has a provider account) ──
  let isProviderUser = false
  let providerData: ProviderData | null = null

  const { data: providerAccount } = await supabase
    .from('provider_accounts')
    .select('id, subscription_tier')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (providerAccount) {
    isProviderUser = true
    const { data: facilitiesRaw } = await supabase
      .from('facilities')
      .select('id,name,description,phone,email,website,address_line1,city,state,zip,facility_type,listing_tier,is_verified,is_claimed,is_featured,avg_rating,review_count')
      .eq('provider_account_id', providerAccount.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (facilitiesRaw && facilitiesRaw.length > 0) {
      const facility = facilitiesRaw[0] as FacilityData
      const [amenitiesRes2, insuranceRes2, leadsRes2] = await Promise.all([
        supabase.from('facility_amenities').select('amenity_name').eq('facility_id', facility.id),
        supabase.from('facility_insurance').select('insurance_name').eq('facility_id', facility.id),
        supabase.from('leads').select('id,first_name,phone,insurance_provider,seeking,who_for,notes,status,created_at')
          .eq('facility_id', facility.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      const provLeads: Lead[] = (leadsRes2.data ?? []) as Lead[]
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      providerData = {
        facility,
        amenities: (amenitiesRes2.data ?? []).map(r => r.amenity_name as string),
        insurance: (insuranceRes2.data ?? []).map(r => r.insurance_name as string),
        leads: provLeads,
        leadsThisMonth: provLeads.filter(l => new Date(l.created_at) >= startOfMonth).length,
        leadsLastMonth: provLeads.filter(l => { const d = new Date(l.created_at); return d >= startOfLastMonth && d < startOfMonth }).length,
      }
    }
  }

  // Today queue + daily quote (behind feature flag — avoids extra DB calls when flag is off)
  const todayQueueEnabled = process.env.NEXT_PUBLIC_TODAY_QUEUE_ENABLED === 'true'
  const today = getTodayDateStr()
  const checkedInToday = recentCheckIns.length > 0 && recentCheckIns[0].check_in_date === today

  // Sponsee alert count — drives the red badge on My Sponsees sub-nav
  // Uses same Tier 1 logic as buildSponsorTodayItems: severe mood today OR 3+ silent days
  const SEVERE_MOODS_SET = new Set(['struggling', 'hard', 'crisis'])
  const sponseeAlertCount = sponsees.filter(s => {
    const latest = s.checkInHistory[0]
    if (latest?.date === today && SEVERE_MOODS_SET.has(latest.mood ?? '')) return true
    if (!latest) return true
    const daysSilent = Math.floor(
      (new Date(today).getTime() - new Date(latest.date).getTime()) / 86_400_000
    )
    return daysSilent >= 3
  }).length

  // Derive current step from step_completions — NOT profile.current_step, which can
  // drift stale. This matches DashboardShell's first-gap algorithm so the Hero,
  // Today card, and Overview all agree. Scope to the primary milestone's fellowship
  // (same default activeFellowshipId DashboardShell computes on mount).
  // See CLAUDE.md pitfall #5: "Step completion sync".
  const serverPrimaryMilestone = initialMilestones.find(m => m.is_primary) ?? initialMilestones[0] ?? null
  const serverActiveFellowshipId: string | null | undefined = initialMilestones.length > 0
    ? (serverPrimaryMilestone?.fellowship_id ?? null)
    : undefined
  const derivedCompletions = serverActiveFellowshipId === undefined
    ? stepCompletions
    : serverActiveFellowshipId === null
      ? []
      : stepCompletions.filter(sc => sc.fellowship_id === serverActiveFellowshipId)
  const derivedCompletedSet = new Set(derivedCompletions.map(r => r.step_number))
  const derivedAllStepsDone = derivedCompletedSet.size >= 12
  const derivedFirstIncomplete = (() => {
    for (let i = 1; i <= 12; i++) {
      if (!derivedCompletedSet.has(i)) return i
    }
    return 12
  })()
  const derivedCurrentStep: number | null = derivedAllStepsDone ? null : derivedFirstIncomplete

  // Resolve the specific workbook(s) for the current step. Used for two things:
  //   1. CTA slug → /dashboard/step-work/<slug> (first workbook by sort_order)
  //   2. Detecting whether the sponsee has already submitted this step to their
  //      sponsor — any entry with review_status IN ('submitted','reviewed')
  //      means the member's part is done (awaiting sponsor review). The Today
  //      card should reflect that rather than keep urging "Continue Step X".
  const stepWorkFellowshipId = serverActiveFellowshipId ?? profile?.primary_fellowship_id ?? null
  let stepWorkHref: string | undefined
  let stepWorkSubmitted = false
  if (todayQueueEnabled && derivedCurrentStep) {
    let wbQ = supabase
      .from('program_workbooks')
      .select('id, slug, sort_order')
      .eq('is_active', true)
      .eq('step_number', derivedCurrentStep)
      .order('sort_order')
    if (stepWorkFellowshipId) {
      wbQ = wbQ.eq('fellowship_id', stepWorkFellowshipId) as typeof wbQ
    }
    const { data: wbs } = await wbQ
    const workbooks = (wbs ?? []) as { id: string; slug: string; sort_order: number }[]
    stepWorkHref = workbooks[0]?.slug
      ? `/dashboard/step-work/${workbooks[0].slug}`
      : '/dashboard/step-work/pending'

    if (workbooks.length > 0) {
      const { data: submittedEntries } = await supabase
        .from('step_work_entries')
        .select('id')
        .eq('user_id', userId)
        .in('workbook_id', workbooks.map(w => w.id))
        .in('review_status', ['submitted', 'reviewed'])
        .limit(1)
      stepWorkSubmitted = (submittedEntries ?? []).length > 0
    }
  }

  const memberPrograms: MemberProgram[] = workingPrograms.map(wp => {
    const fid = wp.fellowshipId
    const felCompleted = new Set(
      stepCompletions.filter(sc => sc.fellowship_id === fid).map(sc => sc.step_number)
    )
    const felAllDone = felCompleted.size >= 12
    const felCurrentStep: number | null = felAllDone ? null : (() => {
      for (let i = 1; i <= 12; i++) if (!felCompleted.has(i)) return i
      return null
    })()
    const isPrimary = fid === stepWorkFellowshipId
    const fellowshipHref = isPrimary
      ? stepWorkHref
      : (felCurrentStep !== null && stepWorkData[fid]?.[felCurrentStep]?.slug
          ? `/dashboard/step-work/${stepWorkData[fid][felCurrentStep].slug}`
          : undefined)
    return {
      fellowshipId: fid,
      fellowshipAbbr: wp.fellowshipAbbr,
      currentStep: felCurrentStep,
      stepWorkCount: isPrimary ? stepWorkCount : 0,
      stepWorkSubmitted: isPrimary ? stepWorkSubmitted : false,
      stepWorkHref: fellowshipHref,
      meetingsThisWeek,
    }
  })

  let todayQueue = todayQueueEnabled
    ? buildMemberTodayQueue({ checkedInToday, programs: memberPrograms })
    : null

  // Sponsor pull-through: merge Tier 1 alerts + Tier 3 tasks into Today queue
  if (todayQueueEnabled && todayQueue && profile?.is_available_sponsor && sponsees.length > 0) {
    // Upsert upcoming milestone reminders (ON CONFLICT DO NOTHING via ignoreDuplicates)
    const milestoneUpserts = sponsees.flatMap(s => {
      if (!s.sobrietyDate) return []
      const upcoming = getUpcomingMilestones(new Date(s.sobrietyDate + 'T00:00:00'))
      return upcoming.map(m => {
        const milestoneDate = new Date(new Date(s.sobrietyDate! + 'T00:00:00').getTime() + m.days * 86_400_000)
        return {
          sponsor_user_id: userId,
          sponsee_user_id: s.id,
          milestone_label: m.label,
          milestone_date: milestoneDate.toISOString().slice(0, 10),
          surfaced_at: new Date().toISOString(),
        }
      })
    })
    if (milestoneUpserts.length > 0) {
      await supabase.from('sponsor_milestone_reminders').upsert(milestoneUpserts, {
        onConflict: 'sponsor_user_id,sponsee_user_id,milestone_label,milestone_date',
        ignoreDuplicates: true,
      })
    }

    // Fetch non-dismissed, not-yet-past reminders for this sponsor
    const { data: milestoneRows } = await supabase
      .from('sponsor_milestone_reminders')
      .select('sponsee_user_id,milestone_label,milestone_date')
      .eq('sponsor_user_id', userId)
      .is('dismissed_at', null)
      .gte('milestone_date', today)

    const sponseeNameMap = Object.fromEntries(sponsees.map(s => [s.id, s.name]))
    const milestoneReminders = (milestoneRows ?? []).map(r => ({
      sponsee_user_id: r.sponsee_user_id as string,
      sponsee_name: sponseeNameMap[r.sponsee_user_id as string] ?? 'Your sponsee',
      milestone_label: r.milestone_label as string,
      milestone_date: r.milestone_date as string,
    }))

    const sponsorItems = buildSponsorTodayItems({
      sponsees: sponsees.map(s => ({
        id: s.id,
        name: s.name,
        checkInHistory: s.checkInHistory,
        pendingReviews: s.pendingReviews,
      })),
      milestoneReminders,
      today,
    })

    if (sponsorItems.length > 0) {
      const combined = [...todayQueue.items, ...sponsorItems]
      combined.sort((a, b) => b.priority - a.priority)
      const visible = combined.slice(0, 6)
      todayQueue = {
        items: visible,
        overflowCount: Math.max(0, combined.length - 6),
        caughtUp: combined.every(i => i.completed),
        memberCaughtUp: todayQueue.memberCaughtUp,
      }
    }
  }

  // Caught-up summary parts — computed server-side so DashboardShell doesn't need to
  const todaySummaryParts = todayQueueEnabled ? getTodaySummaryParts({
    checkedInMood: recentCheckIns[0]?.check_in_date === today ? (recentCheckIns[0]?.mood ?? null) : null,
    meetingName: meetingAttendance.find(m => m.attended_at.slice(0, 10) === today)?.meeting_name ?? null,
    stepWorkCount,
    currentStep: derivedCurrentStep,
  }) : []

  const dailyQuote = todayQueueEnabled
    ? await getDailyQuote(supabase, userId)
    : null

  return (
    <DashboardShell
      userId={userId}
      phone={phone}
      profile={profile}
      stepCompletions={stepCompletions}
      onboardingCompleted={profile?.onboarding_completed ?? false}
      isProvider={isProviderUser}
      providerData={providerData}
      recentCheckIns={recentCheckIns}
      journalEntries={journalEntries}
      journalCount={journalCount}
      stepWorkCount={stepWorkCount}
      meetingAttendance={meetingAttendance}
      meetingsThisWeek={meetingsThisWeek}
      meetingsTotal={meetingsTotal}
      readingAssignments={readingAssignments}
      checkInsTotal={checkInsTotal}
      activeSponsors={activeSponsors}
      sponsees={sponsees}
      pendingRequests={pendingRequests}
      sponsorPendingRequests={sponsorPendingRequests}
      activityItems={activityItems}
      initialMilestones={initialMilestones}
      fellowships={fellowships}
      todayQueueItems={todayQueue?.items}
      todayQueueOverflow={todayQueue?.overflowCount}
      todayMemberCaughtUp={todayQueue?.memberCaughtUp}
      todaySummaryParts={todaySummaryParts}
      dailyQuote={dailyQuote}
      sponseeAlertCount={sponseeAlertCount}
      programRows={programRows}
      workingPrograms={workingPrograms}
      stepWorkData={stepWorkData}
    />
  )
}
