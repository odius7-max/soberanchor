import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Props {
  facilityType: string
}

const TYPE_ICONS: Record<string, string> = {
  treatment: '🏥',
  sober_living: '🏠',
  therapist: '💆',
  outpatient: '💊',
  venue: '🍹',
  telehealth: '💻',
}

export default async function FacilityTypeListings({ facilityType }: Props) {
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, city, state, facility_type, description, is_featured, is_verified, listing_tier')
    .eq('facility_type', facilityType)
    .order('listing_tier', { ascending: false }) // premium → enhanced → basic
    .order('is_featured', { ascending: false })
    .order('name')

  const icon = TYPE_ICONS[facilityType] ?? '📍'

  if (!facilities || facilities.length === 0) {
    return (
      <div className="text-center py-20 text-mid">
        <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
        <p style={{ fontSize: 15 }}>No listings found yet. Check back soon.</p>
        <Link href="/for-providers" className="text-teal font-semibold text-sm hover:underline" style={{ display: 'inline-block', marginTop: 12 }}>
          Are you a provider? Claim your free listing →
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-mid mb-5">{facilities.length} listing{facilities.length !== 1 ? 's' : ''} found</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {facilities.map((f) => (
          <Link
            key={f.id}
            href={`/find/${f.id}`}
            className="card-hover block bg-white border border-border rounded-[14px] overflow-hidden"
          >
            <div className="flex flex-wrap">
              <div
                className="shrink-0 flex items-center justify-center text-[40px]"
                style={{ width: 140, minHeight: 140, background: 'var(--teal-10)' }}
              >
                {icon}
              </div>
              <div className="flex-1 p-5 px-6 min-w-0">
                <div className="flex flex-wrap gap-2 mb-1.5">
                  {f.is_featured && (
                    <span className="inline-flex items-center gap-1 bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-semibold rounded-full px-3 py-0.5">
                      ⭐ Featured
                    </span>
                  )}
                  {f.is_verified && (
                    <span className="inline-flex items-center gap-1 bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-semibold rounded-full px-3 py-0.5">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <h3 className="text-[17px] text-navy font-semibold leading-snug">{f.name}</h3>
                {(f.city || f.state) && (
                  <p className="text-[13px] text-mid mt-1">
                    📍 {[f.city, f.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {f.description && (
                  <p className="text-sm text-dark/70 mt-2 line-clamp-2 leading-relaxed">{f.description}</p>
                )}
                <div className="flex justify-end mt-3">
                  <span className="text-teal font-semibold text-sm">View Details →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 pt-8 border-t border-border text-center">
        <p className="text-sm text-mid mb-2">Don't see your facility?</p>
        <Link href="/for-providers" className="text-teal font-semibold text-sm hover:underline">
          Claim or add your free listing →
        </Link>
      </div>
    </>
  )
}
