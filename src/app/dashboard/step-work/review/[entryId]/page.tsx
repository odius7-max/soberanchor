import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StepWorkSection from '@/components/dashboard/step-work/StepWorkSection'

interface Prompt {
  id: string
  type: 'text' | 'yesno' | 'table' | 'scale'
  question: string
  hint?: string
  followup?: string
  columns?: string[]
  rows?: string
  required?: boolean
  min?: number
  max?: number
  labels?: string[]
}

export default async function SponsorReviewPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  // Fetch entry with relationship info
  const { data: entry } = await supabase
    .from('step_work_entries')
    .select('id, user_id, workbook_id, sponsor_relationship_id, review_status, responses, sponsor_feedback, submitted_at, reviewed_at, updated_at')
    .eq('id', entryId)
    .single()

  if (!entry) notFound()

  // Verify current user is the sponsor
  if (entry.sponsor_relationship_id) {
    const { data: rel } = await supabase
      .from('sponsor_relationships')
      .select('sponsor_id')
      .eq('id', entry.sponsor_relationship_id)
      .single()
    if (!rel || rel.sponsor_id !== user.id) notFound()
  } else {
    // No relationship — only the entry owner's sponsor can review
    notFound()
  }

  // Fetch workbook
  const { data: workbook } = await supabase
    .from('program_workbooks')
    .select('id, title, slug, step_number, description, reference_text, prompts')
    .eq('id', entry.workbook_id)
    .single()

  if (!workbook) notFound()

  // Fetch sponsee name
  const { data: sponseeProfile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', entry.user_id)
    .single()

  return (
    <StepWorkSection
      workbook={{ ...workbook, prompts: (workbook.prompts ?? []) as Prompt[] }}
      entry={entry}
      userId={user.id}
      sponsorRelationshipId={entry.sponsor_relationship_id}
      isSponsorView={true}
      sponseeName={sponseeProfile?.display_name ?? 'Your Sponsee'}
    />
  )
}
