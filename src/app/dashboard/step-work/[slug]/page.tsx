import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StepWorkSection from '@/components/dashboard/step-work/StepWorkSection'

interface Prompt {
  id: string
  type: 'text' | 'yesno' | 'table'
  question: string
  hint?: string
  followup?: string
  columns?: string[]
  rows?: string
  required?: boolean
}

export default async function StepWorkSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  // Fetch workbook
  const { data: workbook } = await supabase
    .from('program_workbooks')
    .select('id, title, slug, step_number, description, reference_text, prompts')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!workbook) notFound()

  // Fetch user's entry for this workbook
  const { data: entry } = await supabase
    .from('step_work_entries')
    .select('id, review_status, responses, sponsor_feedback, submitted_at, reviewed_at')
    .eq('user_id', user.id)
    .eq('workbook_id', workbook.id)
    .maybeSingle()

  // Fetch active sponsor relationship + whether this step is sponsor-completed
  const [{ data: sponsorRel }, { data: stepCompletion }] = await Promise.all([
    supabase
      .from('sponsor_relationships')
      .select('id')
      .eq('sponsee_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    workbook.step_number
      ? supabase
          .from('step_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('step_number', workbook.step_number)
          .eq('is_completed', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <StepWorkSection
      workbook={{ ...workbook, prompts: (workbook.prompts ?? []) as Prompt[] }}
      entry={entry ?? null}
      userId={user.id}
      sponsorRelationshipId={sponsorRel?.id ?? null}
      stepCompleted={!!stepCompletion}
    />
  )
}
