import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'
import type { CheckIn, JournalEntry, MeetingAttendance, ReadingAssignment, Sponsee } from '@/components/dashboard/DashboardShell'

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
  ] = await Promise.all([
    supabase.from('user_profiles').select('display_name,sobriety_date,current_step,is_available_sponsor').eq('id', userId).single(),
    supabase.from('check_ins').select('id,check_in_date,mood,notes,sober_today,meetings_attended').eq('user_id', userId).order('check_in_date', { ascending: false }).limit(4),
    supabase.from('journal_entries').select('id,title,entry_date,excerpt,step_number,is_shared_with_sponsor').eq('user_id', userId).order('entry_date', { ascending: false }).limit(10),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('step_work_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_draft', false),
    supabase.from('meeting_attendance').select('id,meeting_name,fellowship_name,attended_at,checkin_method').eq('user_id', userId).order('attended_at', { ascending: false }).limit(20),
    supabase.from('meeting_attendance').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sponsor_relationships').select('id,sponsor_id,users:sponsor_id(display_name:user_profiles(display_name))').eq('sponsee_id', userId).eq('status', 'active').maybeSingle(),
  ])

  const profile = profileRes.data ?? null
  const recentCheckIns: CheckIn[] = (recentCheckInsRes.data ?? []) as CheckIn[]
  const journalEntries: JournalEntry[] = (journalEntriesRes.data ?? []) as JournalEntry[]
  const journalCount = journalCountRes.count ?? 0
  const stepWorkCount = stepWorkCountRes.count ?? 0
  const meetingAttendance: MeetingAttendance[] = (meetingAttendanceRes.data ?? []) as MeetingAttendance[]
  const meetingsTotal = meetingsTotalRes.count ?? 0
  const checkInsTotal = checkInsTotalRes.count ?? 0

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
      .select('id,sponsee_id')
      .eq('sponsor_id', userId)
      .eq('status', 'active')

    if (relData && relData.length > 0) {
      const sponseeIds = relData.map(r => r.sponsee_id)
      const relMap = Object.fromEntries(relData.map(r => [r.sponsee_id, r.id]))

      const [sponseeProfilesRes, sponseeCheckInsRes, pendingStepWorkRes] = await Promise.all([
        supabase.from('user_profiles').select('id,display_name,sobriety_date,current_step').in('id', sponseeIds),
        supabase.from('check_ins').select('user_id,mood,check_in_date').in('user_id', sponseeIds).order('check_in_date', { ascending: false }),
        supabase.from('step_work_entries').select('user_id').in('user_id', sponseeIds).eq('is_shared_with_sponsor', true).eq('sponsor_reviewed', false),
      ])

      const latestCheckIn: Record<string, { mood: string | null; date: string }> = {}
      for (const ci of (sponseeCheckInsRes.data ?? [])) {
        if (!latestCheckIn[ci.user_id]) latestCheckIn[ci.user_id] = { mood: ci.mood, date: ci.check_in_date }
      }

      const pendingBySponsee: Record<string, number> = {}
      for (const sw of (pendingStepWorkRes.data ?? [])) {
        pendingBySponsee[sw.user_id] = (pendingBySponsee[sw.user_id] ?? 0) + 1
      }

      sponsees = (sponseeProfilesRes.data ?? []).map(sp => ({
        id: sp.id,
        name: sp.display_name ?? 'Anonymous',
        sobrietyDate: sp.sobriety_date ?? null,
        currentStep: sp.current_step ?? 1,
        lastMood: latestCheckIn[sp.id]?.mood ?? null,
        lastCheckInDate: latestCheckIn[sp.id]?.date ?? null,
        pendingReviews: pendingBySponsee[sp.id] ?? 0,
      }))
    }
  }

  return (
    <DashboardShell
      userId={userId}
      phone={phone}
      profile={profile}
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
    />
  )
}
