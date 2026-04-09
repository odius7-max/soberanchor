import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function FacilityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: facility } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .single();

  if (!facility) notFound();

  // Get insurance accepted
  const { data: insuranceRows } = await supabase
    .from("facility_insurance")
    .select("insurance_name")
    .eq("facility_id", id);

  const insurances = insuranceRows?.map((r) => r.insurance_name) || [];

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6 pb-16">
      <Link
        href="/find"
        className="text-teal text-sm font-medium hover:underline"
      >
        ← Back to Results
      </Link>

      {facility.is_featured && (
        <span className="inline-block mt-4 bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-medium rounded-full px-3 py-1">
          Featured
        </span>
      )}

      <h1
        className="text-[32px] font-semibold mt-2 mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
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
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            About This Facility
          </h2>
          <p className="text-[15px] text-dark leading-[1.7] mb-5">
            {facility.description ||
              "Contact this facility for more information about their programs and services."}
          </p>

          <h3 className="text-base font-semibold text-navy mb-2.5">Details</h3>
          <div className="text-sm text-dark leading-[2.2] mb-6">
            📍 {facility.address || `${facility.city}, ${facility.state}`}
            <br />
            {facility.phone && (
              <>
                📞 {facility.phone}
                <br />
              </>
            )}
            {facility.website && (
              <>
                🌐 {facility.website}
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

        {/* Right: Lead Form */}
        <div className="lg:sticky lg:top-[84px]">
          <div className="bg-warm-gray rounded-[14px] p-7">
            <h3
              className="text-[22px] font-semibold mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--navy)",
              }}
            >
              Get in Touch
            </h3>
            <p className="text-sm text-mid mb-5">
              Request information about this facility. Free and confidential.
            </p>

            <label className="block text-[13px] font-semibold text-navy mb-1.5">
              First Name
            </label>
            <input
              type="text"
              placeholder="Your first name"
              className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
            />

            <label className="block text-[13px] font-semibold text-navy mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="(555) 555-5555"
              className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4"
            />

            <label className="block text-[13px] font-semibold text-navy mb-1.5">
              Insurance Provider
            </label>
            <select className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4">
              <option value="">Select your insurance</option>
              <option>Blue Cross / Blue Shield</option>
              <option>Aetna</option>
              <option>Cigna</option>
              <option>United Healthcare</option>
              <option>Kaiser</option>
              <option>Medi-Cal / Medicaid</option>
              <option>Medicare</option>
              <option>No Insurance / Self-Pay</option>
              <option>Other</option>
            </select>

            <label className="block text-[13px] font-semibold text-navy mb-1.5">
              Who is this for?
            </label>
            <select className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4">
              <option>Myself</option>
              <option>A family member</option>
              <option>A friend</option>
              <option>A client / patient</option>
            </select>

            <button className="w-full bg-teal text-white font-semibold text-base py-3.5 rounded-xl hover:bg-teal-light transition-colors mt-1">
              Request Information →
            </button>
            <p className="text-xs text-mid text-center mt-2">
              🔒 Your information is confidential and will only be shared with
              this facility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
