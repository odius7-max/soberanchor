import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/find/LeadForm";
import HeartButton from "@/components/find/HeartButton";
import BackButton from "@/components/find/BackButton";
import FeaturedBadge from "@/components/find/FeaturedBadge";
import SimilarCentersNearby from "@/components/find/SimilarCentersNearby";
import { getUserSavedIds } from "../actions";
import {
  facilityTier,
  tierAtLeast,
  facilityMediaUrl,
  type FacilityPublished,
} from "@/lib/facility-tier";
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

const DAY_LABELS: [string, string][] = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

/** Extract a YouTube/Vimeo embed URL from a watch/share URL. */
function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FacilityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: facility }, savedList, { data: overrideRow }] = await Promise.all([
    supabase.from("facilities").select("*").eq("id", id).single(),
    getUserSavedIds(),
    // Reads ONLY published (via the security-definer view) — drafts never leak.
    supabase.from("facility_overrides_public").select("published").eq("facility_id", id).maybeSingle(),
  ]);

  if (!facility) notFound();

  const savedEntry = savedList.find((s) => s.facility_id === id);
  const savedId = savedEntry?.id ?? null;

  const { data: insuranceRows } = await supabase
    .from("facility_insurance")
    .select("insurance_name")
    .eq("facility_id", id);
  const insurances = insuranceRows?.map((r) => r.insurance_name) || [];

  // ── Tier + two-layer content resolution ──
  const tier = facilityTier(facility);
  const isClaimed = tier !== "unclaimed";      // claimed | enhanced | premium
  const isEnhanced = tierAtLeast(tier, "enhanced"); // enhanced | premium
  const isPremium = tier === "premium";

  // ODI-84: presentation follows the TIER, but the inquiry path follows
  // OWNERSHIP. A row can carry listing_tier='enhanced' with no verified owner
  // attached (admin sets the tier directly, or a claim was reverted), and a
  // lead submitted against it has nobody to route to — the mirror image of the
  // "captured and left undelivered" case PROVIDER-PREMIUM-SPEC bans. Such a
  // facility still gets its gallery, branding and styled contact buttons; it
  // just never shows the form.
  const canReceiveInquiries =
    isEnhanced &&
    !!facility.is_claimed &&
    !!facility.is_verified &&
    facility.provider_account_id != null;

  const published = (overrideRow?.published ?? {}) as FacilityPublished;

  // Render = override if present, else SAMHSA base. Contact facts fall back to
  // the SAMHSA columns so the real phone/website appear on every tier.
  const displayPhone = published.phone ?? facility.phone;
  const displayWebsite = published.website ?? facility.website;

  // Photos: claimed = strip (max 3), enhanced/premium = full gallery + hero.
  // Cap enforced at render — the data may hold more (hard rule #5).
  const allPhotos = (published.photos ?? [])
    .map((p) => ({ url: facilityMediaUrl(p.path), caption: p.caption ?? "" }))
    .filter((p): p is { url: string; caption: string } => !!p.url);
  const photos = isEnhanced ? allPhotos : allPhotos.slice(0, 3);
  const logoUrl = isEnhanced ? facilityMediaUrl(published.logo) : null;
  const embedUrl = isEnhanced && published.video_url ? toEmbedUrl(published.video_url) : null;
  const staff = isEnhanced ? (published.staff ?? []) : [];
  const amenities = isEnhanced ? (published.amenities ?? []) : [];

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
        {/* Agrees with FeaturedBand: Premium tier AND the is_featured flag.
            Premium implies is_featured in the ladder, but the flag is set
            independently by admin, so a Premium row with the flag off is not in
            the band and must not wear the badge either. */}
        {isPremium && facility.is_featured && <FeaturedBadge />}
        {/* Family-facing surfaces say "Verified" or nothing — never "Claimed".
            Same condition as the directory cards (FacilitiesDirectory, find/page)
            so one facility can't read Verified in the list and Claimed on its
            page. A claimed-but-unverified listing carries no badge here. */}
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

      {/* Name + optional logo (enhanced+) */}
      <div className="flex items-center gap-3 mt-2 mb-1.5">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={`${facility.name} logo`}
            width={56}
            height={56}
            className="rounded-lg object-contain border border-border bg-white shrink-0"
            style={{ width: 56, height: 56 }}
          />
        )}
        <h1
          className="text-[32px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
        >
          {facility.name}
        </h1>
      </div>
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

          {/* Photos — claimed: strip (≤3); enhanced/premium: hero + gallery */}
          {photos.length > 0 && (
            <div className="mb-6">
              {isEnhanced ? (
                <>
                  <div className="rounded-[14px] overflow-hidden border border-border mb-2 relative aspect-[16/9]">
                    <Image src={photos[0].url} alt={photos[0].caption || facility.name} fill className="object-cover" />
                  </div>
                  {photos.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.slice(1).map((p, i) => (
                        <div key={i} className="rounded-[10px] overflow-hidden border border-border relative aspect-square">
                          <Image src={p.url} alt={p.caption || `${facility.name} photo`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="rounded-[10px] overflow-hidden border border-border relative aspect-square">
                      <Image src={p.url} alt={p.caption || `${facility.name} photo`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About — claimed+ moderated content */}
          {isClaimed && published.about && (
            <Section title="About">
              <p className="text-[15px] text-dark leading-[1.7] whitespace-pre-line">{published.about}</p>
            </Section>
          )}

          {/* Hours — claimed+ */}
          {isClaimed && published.hours && (
            <Section title="Hours">
              <ul className="list-none p-0 m-0 text-[13.5px] text-dark">
                {DAY_LABELS.filter(([k]) => published.hours![k]).map(([k, label]) => (
                  <li key={k} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-mid">{label}</span>
                    <span className="font-medium">{published.hours![k]}</span>
                  </li>
                ))}
              </ul>
              {published.hours.note && <p className="text-[13px] text-teal mt-2">{published.hours.note}</p>}
            </Section>
          )}

          {/* Video — enhanced+ */}
          {embedUrl && (
            <Section title="Video">
              <div className="rounded-[14px] overflow-hidden border border-border relative aspect-video">
                <iframe
                  src={embedUrl}
                  title={`${facility.name} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </Section>
          )}

          {/* ── SAMHSA service facts — render on EVERY tier (hard rule #1) ── */}
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
            /* Fallback for not-yet-enriched facilities (no About override) */
            !(isClaimed && published.about) && (
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
            )
          )}

          {/* Amenities — enhanced+ */}
          {amenities.length > 0 && (
            <Section title="Amenities">
              <ChipRow items={amenities} variant="teal" />
            </Section>
          )}

          {/* Staff — enhanced+ */}
          {staff.length > 0 && (
            <Section title="Our team">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {staff.map((s, i) => {
                  const url = facilityMediaUrl(s.photo);
                  return (
                    <div key={i} className="text-center">
                      {url ? (
                        <Image src={url} alt={s.name} width={72} height={72} className="rounded-full object-cover mx-auto mb-2" style={{ width: 72, height: 72 }} />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-full bg-warm-gray border border-border mx-auto mb-2 flex items-center justify-center text-2xl">👤</div>
                      )}
                      <div className="text-sm font-semibold text-navy leading-tight">{s.name}</div>
                      {s.title && <div className="text-[12px] text-mid mt-0.5">{s.title}</div>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="lg:sticky lg:top-[84px] flex flex-col gap-4">
          {isEnhanced ? (
            /* Enhanced/Premium: styled contact CTAs + lead form */
            <>
              <div className="flex flex-col gap-2.5">
                {displayPhone && (
                  <a
                    href={`tel:${displayPhone}`}
                    className="flex items-center justify-center gap-2 bg-navy text-white font-semibold text-base py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    📞 Call {displayPhone}
                  </a>
                )}
                {displayWebsite && (
                  <a
                    href={displayWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-teal text-white font-semibold text-base py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
              {canReceiveInquiries && (
                <LeadForm facilityId={facility.id} facilityName={facility.name} />
              )}
            </>
          ) : (
            /* Unclaimed/Claimed: plain contact links */
            <div className="bg-warm-gray rounded-[14px] p-6">
              <h3
                className="text-[20px] font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.5px" }}
              >
                Contact this facility
              </h3>
              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="flex items-center gap-3 bg-white border border-border rounded-xl px-5 py-3.5 mb-3 hover:border-teal transition-colors"
                >
                  <span className="text-xl">📞</span>
                  <div>
                    <div className="text-xs text-mid font-medium">Call directly</div>
                    <div className="text-base font-semibold text-navy">{displayPhone}</div>
                  </div>
                </a>
              )}
              {displayWebsite && (
                <a
                  href={displayWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-teal font-semibold text-sm hover:underline mb-4"
                >
                  Visit website →
                </a>
              )}
              {!displayPhone && !displayWebsite && (
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

          {/* Payment & insurance — highlighted (gold) for enhanced+ */}
          {(pay.length > 0 || insurances.length > 0 || facility.accepts_insurance || facility.accepts_private_pay || (isEnhanced && published.insurance_notes)) && (
            <div
              className={`rounded-[14px] p-5 ${isEnhanced ? "border-2 border-[rgba(212,165,116,0.55)] bg-[var(--gold-10)]" : "border border-border"}`}
            >
              <h3 className="text-base font-semibold text-navy mb-3">Payment &amp; insurance</h3>
              {pay.length > 0 ? (
                <ChipRow items={pay} variant="pay" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {facility.accepts_insurance && <Chip label="Accepts insurance" variant="pay" />}
                  {facility.accepts_private_pay && <Chip label="Self-pay" variant="pay" />}
                </div>
              )}
              {isEnhanced && published.insurance_notes && (
                <div className="text-[13px] text-dark mt-3 leading-[1.5]">{published.insurance_notes}</div>
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

          {/* Claim banner — unclaimed only */}
          {tier === "unclaimed" && (
            <div
              className="rounded-[14px] p-5 text-white"
              style={{ background: "linear-gradient(135deg, var(--navy), #1a4a5e)" }}
            >
              <div className="font-semibold text-[15px] mb-3">Work at {facility.name}?</div>
              <Link
                href={`/providers/claim?facility=${facility.id}`}
                className="block w-full text-center font-semibold text-white rounded-xl py-3 mb-3 transition-opacity hover:opacity-90"
                style={{ background: "var(--teal)", fontSize: 14, textDecoration: "none" }}
              >
                🏥 Claim This Listing
              </Link>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                Add photos, keep your information accurate, and protect your listing from unauthorized changes — free.
              </p>
            </div>
          )}

          {/* Similar centers nearby — unclaimed/claimed ONLY (the upgrade lever) */}
          {!isEnhanced && (
            <SimilarCentersNearby
              facilityId={facility.id}
              facilityType={facility.facility_type}
              city={facility.city}
              state={facility.state}
              latitude={facility.latitude}
              longitude={facility.longitude}
            />
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
