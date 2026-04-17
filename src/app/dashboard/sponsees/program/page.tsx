import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProgramBuilder from '@/components/dashboard/sponsor/ProgramBuilder'
import { getOrCreateProgram, getLibraryTasks } from './actions'

// Step names from AA Big Book — used as fallback when program_workbooks is empty
const AA_STEP_NAMES: Record<number, string> = {
  1: 'Powerlessness', 2: 'Hope', 3: 'Decision', 4: 'Inventory',
  5: 'Admission', 6: 'Readiness', 7: 'Humility', 8: 'Amends List',
  9: 'Amends', 10: 'Daily Inventory', 11: 'Spiritual Growth', 12: 'Service',
}

export default async function SponsorProgramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  // Get sponsor's profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('primary_fellowship_id, is_available_sponsor')
    .eq('id', user.id)
    .single()

  if (!profile?.is_available_sponsor) redirect('/dashboard')

  const fellowshipId = profile.primary_fellowship_id
  if (!fellowshipId) redirect('/dashboard')

  // Get or create program template
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

  // Determine active step for the first sponsee (if any)
  const { data: sponseeRels } = await supabase
    .from('sponsor_relationships')
    .select('sponsee_id, fellowship_id')
    .eq('sponsor_id', user.id)
    .eq('status', 'active')
    .limit(1)

  let activeStep: number | null = null
  if (sponseeRels && sponseeRels.length > 0) {
    const { data: completions } = await supabase
      .from('step_completions')
      .select('step_number')
      .eq('user_id', sponseeRels[0].sponsee_id)
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
          steps={steps}
          initialTasks={libraryTasks}
          initialExamples={allExamples}
          activeStep={activeStep}
        />
      </div>
    </div>
  )
}
