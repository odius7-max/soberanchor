import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ProgramBuilder from '@/components/dashboard/sponsor/ProgramBuilder'
import { getOrCreateProgram, getLibraryTasks } from './actions'

// Step names from AA Big Book — used as fallback when program_workbooks is empty
const AA_STEP_NAMES: Record<number, string> = {
  1: 'Powerlessness', 2: 'Hope', 3: 'Decision', 4: 'Inventory',
  5: 'Admission', 6: 'Readiness', 7: 'Humility', 8: 'Amends List',
  9: 'Amends', 10: 'Daily Inventory', 11: 'Spiritual Growth', 12: 'Service',
}

export default async function SponsorProgramPage({
  searchParams,
}: {
  // Next.js 15 passes searchParams as a Promise
  searchParams: Promise<{ fellowship?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  const params = await searchParams
  const requestedFellowshipId = params?.fellowship ?? null

  // Gather all fellowships this sponsor touches, in parallel:
  //   1. Their own sobriety milestones (their personal fellowship(s))
  //   2. Fellowships of their active sponsor_relationships (who they sponsor)
  //   3. Their existing program templates (in case they built programs previously)
  // Union of those IDs is the switchable set in the Program Builder header.
  const [profileRes, milestonesRes, sponseeRelsRes, existingTemplatesRes, fellowshipsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('primary_fellowship_id, is_available_sponsor')
      .eq('id', user.id)
      .single(),
    supabase
      .from('sobriety_milestones')
      .select('fellowship_id, is_primary, sobriety_date')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('sobriety_date', { ascending: true }),
    supabase
      .from('sponsor_relationships')
      .select('sponsee_id, fellowship_id')
      .eq('sponsor_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('sponsor_program_templates')
      .select('fellowship_id')
      .eq('sponsor_id', user.id),
    supabase
      .from('fellowships')
      .select('id, name, abbreviation')
      .order('name'),
  ])

  const profile = profileRes.data
  // Gate on having active sponsor_relationships, not on is_available_sponsor.
  // A sponsor who stopped taking new sponsees still needs to manage existing ones' programs.
  const hasActiveSponsees = (sponseeRelsRes.data ?? []).length > 0
  if (!profile || !hasActiveSponsees) redirect('/dashboard')

  const milestones = (milestonesRes.data ?? []) as { fellowship_id: string | null; is_primary: boolean }[]
  const sponseeRels = (sponseeRelsRes.data ?? []) as { sponsee_id: string; fellowship_id: string | null }[]
  const existingTemplates = (existingTemplatesRes.data ?? []) as { fellowship_id: string }[]
  const allFellowships = (fellowshipsRes.data ?? []) as { id: string; name: string; abbreviation: string | null }[]

  // Build the switchable set in priority order: primary milestone first, then any
  // other milestone, then sponsee fellowships, then existing templates. Use a Set
  // to dedupe while preserving order.
  const switchable: string[] = []
  const seen = new Set<string>()
  const pushId = (id: string | null | undefined) => {
    if (id && !seen.has(id)) { seen.add(id); switchable.push(id) }
  }
  if (profile.primary_fellowship_id) pushId(profile.primary_fellowship_id)
  for (const m of milestones) if (m.is_primary) pushId(m.fellowship_id)
  for (const m of milestones) pushId(m.fellowship_id)
  for (const r of sponseeRels) pushId(r.fellowship_id)
  for (const t of existingTemplates) pushId(t.fellowship_id)

  // Fallback: if the sponsor has sponsees but the relationship rows have null
  // fellowship_id (legacy rows, or never set during creation), resolve each
  // sponsee's OWN primary fellowship via their milestones / profile. Uses admin
  // client because RLS blocks cross-user profile reads. Without this, a sponsor
  // whose only fellowship context is their sponsees' fellowships can't reach
  // the Task Library at all.
  if (switchable.length === 0 && sponseeRels.length > 0) {
    const sponseeIds = sponseeRels.map(r => r.sponsee_id)
    const admin = createAdminClient()
    const [sponseeMilestonesRes, sponseeProfilesRes] = await Promise.all([
      admin.from('sobriety_milestones')
        .select('user_id, fellowship_id, is_primary')
        .in('user_id', sponseeIds)
        .not('fellowship_id', 'is', null)
        .order('is_primary', { ascending: false }),
      admin.from('user_profiles')
        .select('id, primary_fellowship_id')
        .in('id', sponseeIds),
    ])
    const sponseeMilestones = (sponseeMilestonesRes.data ?? []) as { user_id: string; fellowship_id: string; is_primary: boolean }[]
    const sponseeProfiles = (sponseeProfilesRes.data ?? []) as { id: string; primary_fellowship_id: string | null }[]
    // Prefer each sponsee's primary milestone, then any milestone, then their profile.
    for (const sid of sponseeIds) {
      const primary = sponseeMilestones.find(m => m.user_id === sid && m.is_primary)
      if (primary) { pushId(primary.fellowship_id); continue }
      const any = sponseeMilestones.find(m => m.user_id === sid)
      if (any) { pushId(any.fellowship_id); continue }
      const p = sponseeProfiles.find(p => p.id === sid)
      if (p?.primary_fellowship_id) pushId(p.primary_fellowship_id)
    }
  }

  if (switchable.length === 0) redirect('/dashboard')

  // Resolve the selected fellowship: the query param takes precedence as long as
  // it's in the switchable set; otherwise default to the first entry (which is
  // the sponsor's primary).
  const fellowshipId =
    (requestedFellowshipId && switchable.includes(requestedFellowshipId))
      ? requestedFellowshipId
      : switchable[0]

  // Build the fellowship list that will power the switcher UI (id + display label).
  const availableFellowships = switchable
    .map(id => allFellowships.find(f => f.id === id))
    .filter((f): f is { id: string; name: string; abbreviation: string | null } => !!f)
    .map(f => ({ id: f.id, name: f.name, abbreviation: f.abbreviation }))

  // Get or create program template for the selected fellowship
  const program = await getOrCreateProgram(fellowshipId)
  if (!program) redirect('/dashboard')

  // Fetch step definitions from program_workbooks (dynamic, not hardcoded)
  const { data: workbooks } = await supabase
    .from('program_workbooks')
    .select('step_number, title')
    .eq('fellowship_id', fellowshipId)
    .eq('is_active', true)
    .order('step_number')
    .order('sort_order')

  // Deduplicate: one entry per step_number (first workbook title becomes step name)
  const stepMap = new Map<number, string>()
  for (const wb of (workbooks ?? [])) {
    if (!stepMap.has(wb.step_number)) {
      // Extract step name from workbook title (e.g. "Step 1: Powerlessness — Reading" → "Powerlessness")
      const title = wb.title as string
      const match = title.match(/Step \d+[:\s—–-]+(.+?)(?:\s*[—–-]|$)/)
      stepMap.set(wb.step_number, match ? match[1].trim() : title)
    }
  }

  // Fallback: if no workbooks found, use hardcoded AA step names
  if (stepMap.size === 0) {
    for (const [n, name] of Object.entries(AA_STEP_NAMES)) {
      stepMap.set(Number(n), name)
    }
  }

  const steps = Array.from(stepMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([step_number, name]) => ({ step_number, name }))

  // Fetch library tasks and example tasks in parallel
  const [libraryTasks, examplesRes] = await Promise.all([
    getLibraryTasks(program.id),
    supabase
      .from('soberanchor_example_tasks')
      .select('id, step_number, title, description, category')
      .eq('fellowship_id', fellowshipId)
      .eq('is_active', true)
      .order('step_number')
      .order('sort_order'),
  ])

  const allExamples = (examplesRes.data ?? []) as { id: string; step_number: number; title: string; description: string | null; category: string }[]

  // Determine active step for the first sponsee of THIS fellowship (if any). Scoping
  // to the same fellowship matters — a sponsor's CoDA sponsee shouldn't define the
  // "current step" marker when the sponsor is viewing their AA program.
  const sponseeRelForFellowship = sponseeRels.find(r => r.fellowship_id === fellowshipId)
  let activeStep: number | null = null
  if (sponseeRelForFellowship) {
    const { data: completions } = await supabase
      .from('step_completions')
      .select('step_number')
      .eq('user_id', sponseeRelForFellowship.sponsee_id)
      .eq('fellowship_id', fellowshipId)
      .eq('is_completed', true)

    const completedSteps = new Set((completions ?? []).map(c => c.step_number as number))
    for (let i = 1; i <= steps.length; i++) {
      if (!completedSteps.has(i)) { activeStep = i; break }
    }
    if (activeStep === null) activeStep = steps.length // all done
  }

  return (
    <div style={{ padding: '28px 24px 72px' }}>
      <div className="max-w-[940px] mx-auto">
        <Link
          href="/dashboard?tab=sponsees"
          className="text-teal text-sm font-medium hover:underline"
          style={{ fontFamily: 'var(--font-body)', display: 'inline-block', marginBottom: 16 }}
        >
          ← Back to Sponsees
        </Link>
        <ProgramBuilder
          programId={program.id}
          fellowshipId={fellowshipId}
          availableFellowships={availableFellowships}
          steps={steps}
          initialTasks={libraryTasks}
          initialExamples={allExamples}
          activeStep={activeStep}
        />
      </div>
    </div>
  )
}
