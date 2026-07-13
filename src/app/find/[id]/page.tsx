import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/find/LeadForm";
import HeartButton from "@/components/find/HeartButton";
import BackButton from "@/components/find/BackButton";
import { getUserSavedIds } from "../actions";
import {
  levelsOfCare,
  matMeds,
  detoxTypes,
  populations,
  paymentTypes,
  accreditation,
  recoverySupport,
  facilityBadges,
  hasServiceDetail,
  vals,
  type ServiceDetail,
} from "@/lib/facility-services";

export const revalidate = 3600;

// ─── Small presentational helpers ────────────────────────────────────────────

function Chip({ label, variant = "default" }: { label: string; variant?: "default" | "strong" | "teal" | "detox" | "pay" }) {
  const styles: Record<string, string> = {
    default: "bg-warm-gray border-border text-dark",
    strong: "bg-white border-navy text-navy font-semibold",
    teal: "bg-[rgba(42,138,153,0.08)] border-[rgba(42,138,153,0.25)] text-teal font-semibold",
    detox: "bg-[rgba(192,57,43,0.06)] border-[rgba(192,57,43,0.2)] text-[#B0392B] font-semibold",
    pay: "bg-[rgba(39,174,96,0.08)] border-[rgba(39,174,96,0.25)] text-[#1e824c] font-semibold",
  };
  return (
    <span className={`inline-block rounded-full border px-3 py-1.5 text-[13px] font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

function ChipRow({ items, variant }: { items: string[]; variant?: "default" | "strong" | "teal" | "detox" | "pay" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Chip key={i} label={i} variant={variant} />
      ))}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="text-[17px] font-bold text-navy tracking-[-0.3px] mb-1">{title}</h3>
      {sub && <p className="text-[13px] text-mid leading-[1.5] mb-3">{sub}</p>}
      <div className={sub ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FacilityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: facility }, savedList] = await Promise.all([
    supabase.from("facilities").select("*").eq("id", id).single(),
    getUserSavedIds(),
  ]);

  if (!facility) notFound();

  const savedEntry = savedList.find((s) => s.facility_id === id);
  const savedId = savedEntry?.id ?? null;

  const { data: insuranceRows } = await supabase
    .from("facility_insurance")
    .select("insurance_name")
    .eq("facility_id", id);
  const insurances = insuranceRows?.map((r) => r.insurance_name) || [];

  const showLeadForm = facility.listing_tier === "enhanced" || facility.listing_tier === "premium";

  // Enriched SAMHSA service detail (may be null for not-yet-enriched facilities).
  const sd = (facility.service_detail ?? null) as ServiceDetail | null;
  const enriched = hasServiceDetail(sd);

  const badges = facilityBadges(sd);
  const loc = levelsOfCare(sd);
  const mat = matMeds(sd);
  const detox = detoxTypes(sd);
  const approaches = vals(sd, "TAP");
  const who = populations(sd);
  const support = recoverySupport(sd);
  const accred = accreditation(sd);
  const counseling = vals(sd, "ECS");
  const assessments = [...vals(sd, "ASPT"), ...vals(sd, "SCR")];
  const ancillary = vals(sd, "AS");
  const ages = vals(sd, "AGE");
  const sexes = vals(sd, "SN");
  const pay = paymentTypes(sd);

  const typeLabel =
    loc.find((l) => l.includes("Residential"))
      ? "Residential Treatment Center"
      : loc.find((l) => l.includes("Outpatient") || l.includes("IOP"))
        ? "Outpatient Treatment"
        : facility.facility_type
          ? facility.facility_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
          : null;

  const mapsUrl =
    facility.latitude && facility.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`
      : null;

  const badgeClass: Record<string, string> = {
    navy: "bg-[rgba(0,51,102,0.08)] text-navy border-[rgba(0,51,102,0.15)]",
    teal: "bg-[rgba(42,138,153,0.1)] text-teal border-[rgba(42,138,153,0.2)]",
    gold: "bg-[rgba(212,165,116,0.15)] text-[#9A7B54] border-[rgba(212,165,116,0.35)]",
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-6 pb-16">
      <BackButton fallback="/find" label="← Back to Results" />

      {/* Badge row */}
      <div className="flex gap-2 flex-wrap items-center mt-4">
        {badges.map((b) => (
          <span
            key={b.label}
            className={`inline-block text-xs font-semibold rounded-full px-3 py-1 border ${badgeClass[b.kind]}`}
          >
            {b.label}
          </span>
        ))}
        {facility.is_featured && (
          <span className="inline-block bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-medium rounded-full px-3 py-1">
            ⭐ Featured
          </span>
        )}
        {facility.is_verified && facility.is_claimed && (
          <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1">
            ✓ Verified
          </span>
        )}
        {facility.source === "samhsa" && (
          <span
            className="inline-block text-xs font-medium rounded-full px-3 py-1"
            style={{ color: "#4A6785", background: "rgba(74,103,133,0.08)", border: "1px solid rgba(74,103,133,0.2)" }}
          >
            SAMHSA Listed
          </span>
        )}
        <div className="ml-auto">
          <HeartButton facilityId={facility.id} initialSavedId={savedId} size={22} />
        </div>
      </div>

      <h1
        className="text-[32px] font-semibold mt-2 mb-1.5"
        style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
      >
        {facility.name}
      </h1>
      <div className="text-[13px] text-mid mb-6">
        📍 {facility.city}, {facility.state}
        {typeLabel && <> · {typeLabel}</>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
        {/* ── Left: details ── */}
        <div>
          {/* Map / location card */}
          <div className="border border-border rounded-[14px] overflow-hidden mb-6">
            <div
              className="h-[150px] relative flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #e8f1f4, #dbe7ea)" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(0,51,102,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,51,102,0.05) 1px,transparent 1px)",
                  backgroundSize: "26px 26px",
                }}
              />
              <div className="text-[34px] relative z-[1]" style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.2))" }}>
                📍
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 px-4 py-3.5">
              <div>
                <div className="font-semibold text-navy text-sm">
                  {facility.address_line1 || `${facility.city}, ${facility.state}`}
                </div>
                <div className="text-[13px] text-mid">
                  {facility.city}, {facility.state} {facility.zip}
                </div>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal font-semibold text-[13px] whitespace-nowrap hover:underline"
                >
                  Get directions →
                </a>
              )}
            </div>
          </div>

          {enriched ? (
            <>
              {loc.length > 0 && (
                <Section title="Levels of care" sub="What kind of treatment this facility provides.">
                  <ChipRow items={loc} variant="strong" />
                </Section>
              )}
              {detox.length > 0 && (
                <Section title="Medical detox" sub="Supervised withdrawal management for:">
                  <ChipRow items={detox} variant="detox" />
                </Section>
              )}
              {mat.length > 0 && (
                <Section
                  title="Medications for addiction treatment (MAT)"
                  sub="FDA-approved medications offered or supported here."
                >
                  <ChipRow items={mat} variant="teal" />
                </Section>
              )}
              {approaches.length > 0 && (
                <Section title="Treatment approaches">
                  <ChipRow items={approaches} />
                </Section>
              )}
              {who.length > 0 && (
                <Section title="Who they help" sub="Specialized programs and populations served.">
                  <ChipRow items={who} />
                </Section>
              )}
              {support.length > 0 && (
                <Section title="Recovery support & aftercare">
                  <ChipRow items={support} />
                </Section>
              )}
              {accred.length > 0 && (
                <Section title="Licensing & accreditation">
                  <ul className="list-none p-0 m-0">
                    {accred.map((a) => (
                      <li key={a} className="text-[13.5px] text-dark py-1 leading-[1.5]">
                        <span className="text-[var(--green-ok)] font-bold">✓</span> {a}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {(counseling.length > 0 || assessments.length > 0 || ancillary.length > 0) && (
                <details className="mt-2 border-t border-border pt-4">
                  <summary className="cursor-pointer font-semibold text-teal text-sm list-none">
                    Show all services &amp; assessments
                  </summary>
                  <div className="pt-4 space-y-4">
                    {counseling.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[1px] text-mid mb-2">
                          Education &amp; counseling
                        </div>
                        <ChipRow items={counseling} />
                      </div>
                    )}
                    {assessments.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[1px] text-mid mb-2">
                          Assessment &amp; screening
                        </div>
                        <ChipRow items={assessments} />
                      </div>
                    )}
                    {ancillary.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[1px] text-mid mb-2">
                          Ancillary services
                        </div>
                        <ChipRow items={ancillary} />
                      </div>
                    )}
                  </div>
                </details>
              )}
            </>
          ) : (
            /* Fallback for not-yet-enriched facilities */
            <>
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
              {insurances.length > 0 && (
                <>
                  <h3 className="text-base font-semibold text-navy mb-2.5">Insurance Accepted</h3>
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {insurances.map((ins) => (
                      <Chip key={ins} label={ins} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="lg:sticky lg:top-[84px] flex flex-col gap-4">
          {showLeadForm ? (
            <LeadForm facilityId={facility.id} facilityName={facility.name} />
          ) : (
            <div className="bg-warm-gray rounded-[14px] p-6">
              <h3
                className="text-[20px] font-semibold mb-4"
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
            </div>
          )}

          {/* Payment & insurance */}
          {(pay.length > 0 || insurances.length > 0 || facility.accepts_insurance || facility.accepts_private_pay) && (
            <div className="border border-border rounded-[14px] p-5">
              <h3 className="text-base font-semibold text-navy mb-3">Payment &amp; insurance</h3>
              {pay.length > 0 ? (
                <ChipRow items={pay} variant="pay" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {facility.accepts_insurance && <Chip label="Accepts insurance" variant="pay" />}
                  {facility.accepts_private_pay && <Chip label="Self-pay" variant="pay" />}
                </div>
              )}
              {vals(sd, "PYAS").length > 0 && (
                <div className="text-[13px] text-[#1e824c] mt-3 leading-[1.5]">
                  💚 {vals(sd, "PYAS").join(" · ")}
                </div>
              )}
              {insurances.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                  {insurances.map((ins) => (
                    <Chip key={ins} label={ins} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Claim CTA */}
          {!facility.is_claimed && (
            <div
              className="rounded-[14px] p-5 text-white"
              style={{ background: "linear-gradient(135deg, var(--navy), #1a4a5e)" }}
            >
              <div className="font-semibold text-[15px] mb-3">Is this your facility?</div>
              <Link
                href={`/providers/claim?facility=${facility.id}`}
                className="block w-full text-center font-semibold text-white rounded-xl py-3 mb-3 transition-opacity hover:opacity-90"
                style={{ background: "var(--teal)", fontSize: 14, textDecoration: "none" }}
              >
                🏥 Claim This Listing
              </Link>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                Add photos, respond to leads, and connect with people seeking help — free.
              </p>
            </div>
          )}

          {(ages.length > 0 || sexes.length > 0) && (
            <div className="text-xs text-mid text-center">
              {ages.length > 0 && <>Ages: {ages.join(", ")}</>}
              {ages.length > 0 && sexes.length > 0 && " · "}
              {sexes.join(" & ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
