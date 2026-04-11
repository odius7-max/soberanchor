import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { CheckIn, JournalEntry, MeetingAttendance, ReadingAssignment, Sponsee, ActivityItem, SobrietyMilestone, Fellowship } from '@/components/dashboard/DashboardShell'
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
    // Step completions — used to derive real progress (not user_profiles.current_step)
    supabase.from('step_completions').select('step_number').eq('user_id', userId).eq('is_completed', true),
    // Activity feed
    supabase.from('activity_feed').select('id,event_type,title,description,is_read,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    // Sobriety milestones
    supabase.from('sobriety_milestones').select('id,label,sobriety_date,fellowship_id,is_primary,notes').eq('user_id', userId).order('is_primary', { ascending: false }).order('sobriety_date'),
    // Fellowships for the add-milestone form
    supabase.from('fellowships').select('id,name,abbreviation').order('name'),
  ])

  // Count distinct completed step numbers across any fellowship
  const completedSteps = new Set((stepCompletionsRes.data ?? []).map(r => r.step_number)).size

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
  let sponsees: Sponsee[] = []
  if (profile?.is_available_sponsor) {
    const { data: relData } = await supabase
      .from('sponsor_relationships')
      .select('id,sponsee_id,fellowship_id')
      .eq('sponsor_id', userId)
      .eq('status', 'active')

    if (relData && relData.length > 0) {
      const sponseeIds = relData.map(r => r.sponsee_id)
      const relMap = Object.fromEntries(relData.map(r => [r.sponsee_id, { id: r.id, fellowshipId: r.fellowship_id as string | null }]))

      const [sponseeProfilesRes, sponseeCheckInsRes, pendingStepWorkRes, stepCompletionsRes] = await Promise.all([
        supabase.from('user_profiles').select('id,display_name,sobriety_date,current_step').in('id', sponseeIds),
        supabase.from('check_ins').select('user_id,mood,check_in_date').in('user_id', sponseeIds).order('check_in_date', { ascending: false }),
        supabase.from('step_work_entries').select('user_id').in('user_id', sponseeIds).eq('review_status', 'submitted'),
        supabase.from('step_completions').select('user_id,fellowship_id').in('user_id', sponseeIds).eq('is_completed', true),
      ])

      const latestCheckIn: Record<string, { mood: string | null; date: string }> = {}
      for (const ci of (sponseeCheckInsRes.data ?? [])) {
        if (!latestCheckIn[ci.user_id]) latestCheckIn[ci.user_id] = { mood: ci.mood, date: ci.check_in_date }
      }

      const pendingBySponsee: Record<string, number> = {}
      for (const sw of (pendingStepWorkRes.data ?? [])) {
        pendingBySponsee[sw.user_id] = (pendingBySponsee[sw.user_id] ?? 0) + 1
      }

      // Count completed steps per sponsee, filtered to their relationship's fellowship
      const completedBySponsee: Record<string, number> = {}
      for (const sc of (stepCompletionsRes.data ?? [])) {
        const fellowship = relMap[sc.user_id]?.fellowshipId
        if (!fellowship || sc.fellowship_id === fellowship) {
          completedBySponsee[sc.user_id] = (completedBySponsee[sc.user_id] ?? 0) + 1
        }
      }

      sponsees = (sponseeProfilesRes.data ?? []).map(sp => {
        const completedSteps = Math.min(completedBySponsee[sp.id] ?? 0, 12)
        return {
          id: sp.id,
          name: sp.display_name ?? 'Anonymous',
          sobrietyDate: sp.sobriety_date ?? null,
          currentStep: sp.current_step ?? 1,
          completedSteps,
          lastMood: latestCheckIn[sp.id]?.mood ?? null,
          lastCheckInDate: latestCheckIn[sp.id]?.date ?? null,
          pendingReviews: pendingBySponsee[sp.id] ?? 0,
        }
      })
    }
  }

  return (
    <DashboardShell
      userId={userId}
      phone={phone}
      profile={profile}
      completedSteps={completedSteps}
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
