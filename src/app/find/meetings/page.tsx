import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import MeetingsPageClient from '@/components/find/MeetingsPageClient'
import { getUserSavedIds } from '../actions'
import type { FellowshipOption, UserCustomMeeting } from '@/components/dashboard/meetings/types'

export const metadata: Metadata = {
  title: 'Meetings — SoberAnchor',
  description: 'Add the meetings you attend and find new ones. Your personal list is always ready at check-in.',
}

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let savedIds: Record<string, string> = {}
  let userCity: string | null = null
  let userState: string | null = null
  let availableFellowships: FellowshipOption[] = []
  let primaryFellowshipId: string | null = null
  let initialMeetings: UserCustomMeeting[] = []

  if (user) {
    const [saved, profileRes, fellowshipsRes, meetingsRes] = await Promise.all([
      getUserSavedIds(),
      supabase.from('user_profiles').select('city, state, primary_fellowship_id').eq('id', user.id).maybeSingle(),
      supabase.from('fellowships').select('id,name,abbreviation').order('name'),
      supabase.from('user_custom_meetings')
        .select('id,user_id,fellowship_id,name,day_of_week,time_local,format,location,topic,is_active,last_attended_at,created_at,updated_at,type,recurrence,is_private')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_attended_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
    ])

    for (const s of saved) {
      if (s.meeting_id) savedIds[s.meeting_id] = s.id
    }
    userCity = profileRes.data?.city ?? null
    userState = profileRes.data?.state ?? null
    primaryFellowshipId = profileRes.data?.primary_fellowship_id ?? null
    availableFellowships = (fellowshipsRes.data ?? []) as FellowshipOption[]
    initialMeetings = (meetingsRes.data ?? []) as UserCustomMeeting[]
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8 pb-20">
      <Link href="/find" className="text-teal text-sm font-semibold hover:underline">
        ← All Categories
      </Link>

      <div className="mt-5 mb-8">
        <Suspense>
          <MeetingsPageClient
            userId={user?.id ?? null}
            availableFellowships={availableFellowships}
            primaryFellowshipId={primaryFellowshipId}
            initialMeetings={initialMeetings}
            savedIds={savedIds}
            userCity={userCity}
            userState={userState}
          />
        </Suspense>
      </div>
    </div>
  )
}
