import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FacilitiesDirectory from '@/components/find/FacilitiesDirectory'
import { getUserSavedIds } from '../actions'

export const metadata: Metadata = { title: 'Sober Living Homes — SoberAnchor' }

export default async function SoberLivingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let savedIds: Record<string, string> = {}
  if (user) {
    const saved = await getUserSavedIds()
    for (const s of saved) {
      if (s.facility_id) savedIds[s.facility_id] = s.id
    }
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
          Sober Living Homes
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[560px]">
          Transitional housing and recovery residences for people in early sobriety.
        </p>
      </div>

      <FacilitiesDirectory facilityType="sober_living" savedIds={savedIds} />
    </div>
  )
}
