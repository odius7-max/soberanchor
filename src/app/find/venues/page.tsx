import Link from 'next/link'
import FacilityTypeListings from '@/components/find/FacilityTypeListings'

export const revalidate = 3600
export const metadata = { title: 'Sober Venues — SoberAnchor' }

export default function VenuesPage() {
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
          Sober Venues
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[560px]">
          Alcohol-free bars, cafes, event spaces, and community venues for the sober curious.
        </p>
      </div>

      <FacilityTypeListings facilityType="venue" />
    </div>
  )
}
