// ODI-52: the ⭐ Featured pill. Used on premium PDPs and Featured-band cards.
// Matches the existing gold badge pattern in FacilityTypeListings / FacilityCard.

export default function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-semibold rounded-full px-3 py-0.5">
      ⭐ Featured
    </span>
  )
}
