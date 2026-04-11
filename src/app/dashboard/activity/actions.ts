'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const STEP_NAMES = [
  'Powerlessness', 'Hope', 'Decision', 'Inventory', 'Admission',
  'Readiness', 'Humility', 'Amends List', 'Amends', 'Daily Inventory',
  'Prayer', 'Service',
]

export async function writeStepActivityEvent({
  sponseeId,
  stepNumber,
  isCompleted,
}: {
  sponseeId: string
  stepNumber: number
  isCompleted: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify caller is an active sponsor of the sponsee
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()
  if (!rel) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: sponsorProfile } = await admin
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const sponsorName = sponsorProfile?.display_name ?? 'Your sponsor'
  const stepName = STEP_NAMES[stepNumber - 1] ?? `Step ${stepNumber}`

  await admin.from('activity_feed').insert({
    user_id: sponseeId,
    event_type: isCompleted ? 'step_completed' : 'step_uncompleted',
    title: isCompleted
      ? `Step ${stepNumber} marked complete`
      : `Step ${stepNumber} marked incomplete`,
    description: isCompleted
      ? `${sponsorName} marked Step ${stepNumber}: ${stepName} as complete`
      : `${sponsorName} marked Step ${stepNumber}: ${stepName} as incomplete`,
    metadata: { step_number: stepNumber, step_name: stepName, sponsor_id: user.id },
  })

  return { ok: true }
}

export async function logCheckInActivity({
  userId,
  mood,
}: {
  userId: string
  mood: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { error: 'Not authenticated' }

  const moodLabels: Record<string, string> = {
    great: 'Great', good: 'Good', okay: 'Okay',
    struggling: 'Struggling', crisis: 'Crisis',
  }

  const admin = createAdminClient()
  await admin.from('activity_feed').insert({
    user_id: userId,
    event_type: 'check_in',
    title: 'Daily check-in logged',
    description: `Feeling ${moodLabels[mood] ?? mood} today`,
    metadata: { mood },
  })

  return { ok: true }
}

export async function markActivityRead(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return

  await supabase
    .from('activity_feed')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}
