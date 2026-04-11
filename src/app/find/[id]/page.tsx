import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/find/LeadForm";
import HeartButton from "@/components/find/HeartButton";
import { getUserSavedIds } from "../actions";

export const revalidate = 3600;

export default async function FacilityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: facility }, savedList] = await Promise.all([
    supabase.from("facilities").select("*").eq("id", id).single(),
    getUserSavedIds(),
  ]);

  if (!facility) notFound();

  const savedEntry = savedList.find(s => s.facility_id === id)
  const savedId = savedEntry?.id ?? null

  // Get insurance accepted
  const { data: insuranceRows } = await supabase
    .from("facility_insurance")
    .select("insurance_name")
    .eq("facility_id", id);

  const insurances = insuranceRows?.map((r) => r.insurance_name) || [];

  const showLeadForm =
    facility.listing_tier === "enhanced" || facility.listing_tier === "premium";

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6 pb-16">
      <Link
        href="/find"
        className="text-teal text-sm font-medium hover:underline"
      >
        ← Back to Results
      </Link>

      <div className="flex gap-2 flex-wrap items-center mt-4">
        {facility.is_featured && (
          <span className="inline-block bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-medium rounded-full px-3 py-1">
            ⭐ Featured
          </span>
        )}
        {facility.is_verified && (
          <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1">
            ✓ Verified
          </span>
        )}
        <div className="ml-auto">
          <HeartButton facilityId={facility.id} initialSavedId={savedId} size={22} />
        </div>
      </div>

      <h1
        className="text-[32px] font-semibold mt-2 mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
      >
        {facility.name}
      </h1>

      <div className="text-[13px] text-mid mb-6">
        📍 {facility.city}, {facility.state}
        {facility.facility_type && (
          <>
            {" · "}
            {facility.facility_type
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
        {/* Left: Details */}
        <div>
          {/* Photo placeholder */}
          <div
            className="h-[240px] rounded-[14px] border border-border flex items-center justify-center mb-6"
            style={{
              background:
                "linear-gradient(135deg, var(--teal-10), var(--navy-10))",
            }}
          >
            <div className="text-center text-mid">
              <div className="text-5xl mb-2">🏥</div>
              <div className="text-sm">Facility photos</div>
            </div>
          </div>

          <h2
            className="text-[22px] font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.5px" }}
          >
            About This Facility
          </h2>
          <p className="text-[15px] text-dark leading-[1.7] mb-5">
            {facility.description ||
              "Contact this facility for more information about their programs and services."}
          </p>

          <h3 className="text-base font-semibold text-navy mb-2.5">Details</h3>
          <div className="text-sm text-dark leading-[2.2] mb-6">
            📍 {facility.address_line1 || `${facility.city}, ${facility.state}`}
            <br />
            {facility.phone && (
              <>
                📞{" "}
                <a href={`tel:${facility.phone}`} className="hover:underline text-teal">
                  {facility.phone}
                </a>
                <br />
              </>
            )}
            {facility.website && (
              <>
                🌐{" "}
                <a
                  href={facility.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal hover:underline"
                >
                  {facility.website.replace(/^https?:\/\//, "")}
                </a>
                <br />
              </>
            )}
          </div>

          {insurances.length > 0 && (
            <>
              <h3 className="text-base font-semibold text-navy mb-2.5">
                Insurance Accepted
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {insurances.map((ins) => (
                  <span
                    key={ins}
                    className="bg-warm-gray border border-border rounded-full px-3 py-1 text-xs font-medium text-dark"
                  >
                    {ins}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:sticky lg:top-[84px]">
          {showLeadForm ? (
            /* Enhanced/Premium: lead capture form */
            <LeadForm facilityId={facility.id} facilityName={facility.name} />
          ) : (
            /* Basic / unclaimed: direct contact card */
            <div className="bg-warm-gray rounded-[14px] p-7">
              <h3
                className="text-[22px] font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.5px" }}
              >
                Contact this facility
              </h3>

              {facility.phone && (
                <a
                  href={`tel:${facility.phone}`}
                  className="flex items-center gap-3 bg-white border border-border rounded-xl px-5 py-3.5 mb-3 hover:border-teal transition-colors"
                >
                  <span className="text-xl">📞</span>
                  <div>
                    <div className="text-xs text-mid font-medium">Call directly</div>
                    <div className="text-base font-semibold text-navy">{facility.phone}</div>
                  </div>
                </a>
              )}

              {facility.website && (
                <a
                  href={facility.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-teal text-white font-semibold text-base py-3.5 rounded-xl hover:opacity-90 transition-opacity mb-4"
                >
                  Visit Website →
                </a>
              )}

              {!facility.phone && !facility.website && (
                <p className="text-sm text-mid leading-relaxed mb-4">
                  Contact information not listed. Try the SAMHSA helpline below.
                </p>
              )}

              <p className="text-sm text-mid leading-relaxed">
                Need immediate help?{" "}
                <strong className="text-dark">SAMHSA National Helpline:</strong>{" "}
                <a href="tel:18006624357" className="text-teal font-semibold hover:underline">
                  1-800-662-4357
                </a>{" "}
                (free, confidential, 24/7)
              </p>

              {!facility.is_claimed && (
                <>
                  <div className="border-t border-border my-5" />
                  <p className="text-[13px] text-mid mb-2">
                    Are you the owner of this facility?
                  </p>
                  <Link
                    href={`/providers/claim?facility=${facility.id}`}
                    className="inline-block text-teal font-semibold text-sm hover:underline mb-1"
                  >
                    Claim this listing →
                  </Link>
                  <p className="text-[12px] text-mid">
                    Receive leads, add photos, and manage your profile
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
