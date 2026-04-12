import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { CheckIn, JournalEntry, MeetingAttendance, ReadingAssignment, SponseeFull, SponseeCheckIn, ActivityItem, SobrietyMilestone, Fellowship } from '@/components/dashboard/DashboardShell'
import type { PendingRequest } from '@/components/dashboard/PendingRequests'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  const userId = user.id
  const phone = user.phone ?? null

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
    supabase.from('journal_entries').select('id,title,entry_date,excerpt,step_number,is_shared_with_sponsor').eq('user_id', userId).order('entry_date', { ascending: false }).limit(10),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('step_work_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('review_status', 'draft'),
    supabase.from('meeting_attendance').select('id,meeting_name,fellowship_name,attended_at,checkin_method').eq('user_id', userId).order('attended_at', { ascending: false }).limit(20),
    supabase.from('meeting_attendance').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sponsor_relationships').select('id,sponsor_id,users:sponsor_id(display_name:user_profiles(display_name))').eq('sponsee_id', userId).eq('status', 'active').maybeSingle(),
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

  // Sponsor name from relationship
  const activeSponsorRel = sponsorRelRes.data
  let activeSponsor: string | null = null
  if (activeSponsorRel) {
    const u = activeSponsorRel.users as unknown as { display_name: { display_name: string | null }[] } | null
    activeSponsor = u?.display_name?.[0]?.display_name ?? 'Sponsor'
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

  const rawPendingAsSponsee = pendingReqsRes.data ?? []
  const rawPendingAsSponsor = pendingAsSponsorRes.data ?? []

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
    pendingRequests = rawPendingAsSponsee.map((r: any) => ({
      id: r.id,
      otherId: r.sponsor_id,
      otherName: nameMap[r.sponsor_id] ?? 'Anonymous',
      createdAt: r.created_at,
    }))
    sponsorPendingRequests = rawPendingAsSponsor.map((r: any) => ({
      id: r.id,
      otherId: r.sponsee_id,
      otherName: nameMap[r.sponsee_id] ?? 'Anonymous',
      createdAt: r.created_at,
    }))
  }

  // Reading assignments (if has sponsor relationship)
  let readingAssignments: ReadingAssignment[] = []
  if (activeSponsorRel?.id) {
    const { data } = await supabase
      .from('reading_assignments')
      .select('id,title,source,is_completed,due_date,created_at')
      .eq('relationship_id', activeSponsorRel.id)
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
      const sponseeIds = relData.map(r => r.sponsee_id)
      const relMap = Object.fromEntries(relData.map(r => [r.sponsee_id, { id: r.id, fellowshipId: r.fellowship_id as string | null }]))
      const sponseeAdmin = createAdminClient()

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10)

      const [
        sponseeProfilesRes,
        sponseeCheckInsRes,
        pendingStepWorkRes,
        stepCompletionsRes,
        latestStepWorkRes,
        meetingAttendanceRes,
        sponsorNotesRes,
      ] = await Promise.all([
        sponseeAdmin.from('user_profiles').select('id,display_name,sobriety_date').in('id', sponseeIds),
        // 60-day check-in history for mood trend + streak calculation
        sponseeAdmin.from('check_ins')
          .select('user_id,check_in_date,mood,notes,sober_today,meetings_attended,called_sponsor')
          .in('user_id', sponseeIds)
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
      ])

      // Build check-in history per sponsee
      const checkInsBySponsee: Record<string, SponseeCheckIn[]> = {}
      for (const ci of (sponseeCheckInsRes.data ?? [])) {
        if (!checkInsBySponsee[ci.user_id]) checkInsBySponsee[ci.user_id] = []
        checkInsBySponsee[ci.user_id].push({
          date: ci.check_in_date as string,
          mood: ci.mood as string | null,
          notes: ci.notes as string | null,
          soberToday: ci.sober_today as boolean,
          meetingsAttended: (ci.meetings_attended as number | null) ?? 0,
          calledSponsor: ci.called_sponsor as boolean | null,
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

      // Latest sponsor note per sponsee
      const latestNoteBySponsee: Record<string, { text: string; createdAt: string }> = {}
      for (const note of (sponsorNotesRes.data ?? [])) {
        if (!latestNoteBySponsee[note.sponsee_id]) {
          latestNoteBySponsee[note.sponsee_id] = {
            text: note.note_text as string,
            createdAt: note.created_at as string,
          }
        }
      }

      // Fellowship abbreviation via relationship's fellowship_id
      const fellowshipAbbrBySponsee: Record<string, string | null> = {}
      for (const rel of relData) {
        const f = rel.fellowship_id ? fellowships.find(f => f.id === rel.fellowship_id) : null
        fellowshipAbbrBySponsee[rel.sponsee_id] = f?.abbreviation ?? null
      }

      sponsees = (sponseeProfilesRes.data ?? []).map(sp => {
        const completedSteps = Math.min(completedBySponsee[sp.id] ?? 0, 12)
        return {
          id: sp.id,
          name: (sp.display_name as string | null) ?? 'Anonymous',
          fellowshipAbbr: fellowshipAbbrBySponsee[sp.id] ?? null,
          sobrietyDate: (sp.sobriety_date as string | null) ?? null,
          checkInHistory: checkInsBySponsee[sp.id] ?? [],
          lastStepWork: latestStepWorkBySponsee[sp.id] ?? null,
          pendingReviews: pendingBySponsee[sp.id] ?? 0,
          lastMeeting: latestMeetingBySponsee[sp.id] ?? null,
          completedSteps,
          totalSteps: 12,
          latestNote: latestNoteBySponsee[sp.id] ?? null,
        }
      })
    }
  }

  return (
    <DashboardShell
      userId={userId}
      phone={phone}
      profile={profile}
      stepCompletions={stepCompletions}
      onboardingCompleted={profile?.onboarding_completed ?? false}
      recentCheckIns={recentCheckIns}
      journalEntries={journalEntries}
      journalCount={journalCount}
      stepWorkCount={stepWorkCount}
      meetingAttendance={meetingAttendance}
      meetingsThisWeek={meetingsThisWeek}
      meetingsTotal={meetingsTotal}
      readingAssignments={readingAssignments}
      checkInsTotal={checkInsTotal}
      activeSponsor={activeSponsor}
      sponsees={sponsees}
      pendingRequests={pendingRequests}
      sponsorPendingRequests={sponsorPendingRequests}
      activityItems={activityItems}
      initialMilestones={initialMilestones}
      fellowships={fellowships}
    />
  )
}
