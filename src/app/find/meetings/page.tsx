import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import MeetingsDirectory from '@/components/find/MeetingsDirectory'
import { getUserSavedIds } from '../actions'

export const metadata: Metadata = {
  title: 'Find Meetings — SoberAnchor',
  description: 'Find AA, NA, SMART Recovery, and other recovery meetings near you. Filter by fellowship, day, time, and format.',
}

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Build a meetingId → savedListingId map, and grab profile city/state for geo fallback
  let savedIds: Record<string, string> = {}
  let userCity: string | null = null
  let userState: string | null = null
  if (user) {
    const [saved, profileRes] = await Promise.all([
      getUserSavedIds(),
      supabase.from('user_profiles').select('city, state').eq('id', user.id).maybeSingle(),
    ])
    for (const s of saved) {
      if (s.meeting_id) savedIds[s.meeting_id] = s.id
    }
    userCity = profileRes.data?.city ?? null
    userState = profileRes.data?.state ?? null
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8 pb-20">
      <Link href="/find" className="text-teal text-sm font-semibold hover:underline">
        ← All Categories
      </Link>

      <div className="mt-5 mb-8">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">Directory</p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-1.0px' }}
        >
          Meetings &amp; Support Groups
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[560px]">
          Find AA, NA, Al-Anon, SMART Recovery, and other recovery meetings near you — in-person and online.
        </p>
      </div>

      <Suspense>
        <MeetingsDirectory savedIds={savedIds} userCity={userCity} userState={userState} />
      </Suspense>
    </div>
  )
}
