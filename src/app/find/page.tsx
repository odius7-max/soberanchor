import { supabase } from "@/lib/supabase";
import Link from "next/link";

const chips = [
  "Alcohol",
  "Drugs",
  "Gambling",
  "Eating / Food",
  "Behavioral",
  "For Loved Ones",
  "Online / Virtual",
];

const typeIcons: Record<string, string> = {
  treatment_center: "🏥",
  sober_living: "🏠",
  outpatient: "💊",
  therapist: "💆",
  venue: "🍹",
  default: "📍",
};

export const revalidate = 3600; // revalidate every hour

export default async function FindPage() {
  // Fetch facilities from Supabase
  const { data: facilities } = await supabase
    .from("facilities")
    .select("*")
    .order("name")
    .limit(20);

  // Fetch meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, fellowships(name, abbreviation)")
    .order("day_of_week")
    .limit(10);

  return (
    <>
      <section className="pt-12 px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
            Directory
          </p>
          <h1
            className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Find what you need.
          </h1>
          <p className="text-mid text-base leading-relaxed max-w-[600px] mb-7">
            Search across treatment centers, sober living, meetings, therapists,
            venues, and more.
          </p>

          {/* Search bar */}
          <div className="bg-warm-gray border border-border rounded-[14px] p-6 mb-5">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-navy mb-1">
                  Location
                </label>
                <input
                  placeholder="📍 San Diego, CA"
                  className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm outline-none focus:border-teal"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-navy mb-1">
                  Category
                </label>
                <select
                  className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option>All Categories</option>
                  <option>Treatment Centers</option>
                  <option>Sober Living Homes</option>
                  <option>Meetings &amp; Support Groups</option>
                  <option>Therapists &amp; Counselors</option>
                  <option>Sober Venues &amp; Events</option>
                </select>
              </div>
              <div className="self-end">
                <button className="bg-navy text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-navy-dark transition-colors">
                  Search
                </button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-4">
              {chips.map((c) => (
                <span
                  key={c}
                  className="bg-white border border-border rounded-full px-4 py-1.5 text-[13px] font-medium text-dark cursor-pointer hover:bg-navy hover:text-white hover:border-navy transition-all"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="px-6 pb-16">
        <div className="max-w-[1120px] mx-auto">
          {/* Facilities */}
          {facilities && facilities.length > 0 && (
            <>
              <h2
                className="text-lg font-semibold mt-6 mb-3"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Treatment &amp; Recovery Facilities
              </h2>
              <p className="text-sm text-mid mb-4">
                {facilities.length} facilities in San Diego area
              </p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {facilities.map((f: any) => (
                <Link
                  key={f.id}
                  href={`/find/${f.id}`}
                  className="block bg-white border border-border rounded-[14px] mb-3.5 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex flex-wrap">
                    <div
                      className="w-[160px] min-h-[160px] shrink-0 flex items-center justify-center text-[42px]"
                      style={{ background: "var(--teal-10)" }}
                    >
                      {typeIcons[f.facility_type || "default"] ||
                        typeIcons.default}
                    </div>
                    <div className="flex-1 p-5 px-6 min-w-0">
                      {f.is_featured && (
                        <span className="inline-block bg-[var(--gold-10)] border border-gold-light/30 text-[#9A7B54] text-xs font-medium rounded-full px-3 py-0.5 mb-1.5">
                          Featured
                        </span>
                      )}
                      <h3 className="text-[17px] text-navy font-semibold">
                        {f.name}
                      </h3>
                      <div className="text-[13px] text-mid mt-1">
                        📍 {f.city}, {f.state}
                        {f.facility_type && (
                          <>
                            {" · "}
                            {String(f.facility_type)
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-sm text-dark/70 mt-2 line-clamp-2">
                          {f.description}
                        </p>
                      )}
                      <div className="flex justify-end mt-3">
                        <span className="text-teal font-semibold text-sm">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}

          {/* Meetings */}
          {meetings && meetings.length > 0 && (
            <>
              <h2
                className="text-lg font-semibold mt-10 mb-3"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Meetings &amp; Support Groups
              </h2>
              <p className="text-sm text-mid mb-4">
                {meetings.length} meetings found
              </p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {meetings.map((m: any) => {
                const fellowship = m.fellowships;
                return (
                  <div
                    key={m.id}
                    className="bg-white border border-border rounded-[14px] mb-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap">
                      <div
                        className="w-[160px] min-h-[120px] shrink-0 flex items-center justify-center text-[42px]"
                        style={{ background: "var(--gold-10)" }}
                      >
                        👥
                      </div>
                      <div className="flex-1 p-5 px-6 min-w-0">
                        <h3 className="text-[17px] text-navy font-semibold">
                          {m.name}
                        </h3>
                        <div className="text-[13px] text-mid mt-1">
                          📍 {m.location_name || "Online"} ·{" "}
                          {m.day_of_week} {m.start_time}
                          {m.format && <> · {m.format}</>}
                        </div>
                        {fellowship && (
                          <div className="flex gap-1.5 flex-wrap mt-2">
                            <span className="bg-warm-gray border border-border rounded-full px-3 py-0.5 text-xs font-medium text-dark">
                              {fellowship.abbreviation || fellowship.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Fallback if no data */}
          {(!facilities || facilities.length === 0) &&
            (!meetings || meetings.length === 0) && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <h2
                  className="text-2xl font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--navy)",
                  }}
                >
                  Directory loading...
                </h2>
                <p className="text-mid">
                  Data is being populated. Check back soon.
                </p>
              </div>
            )}
        </div>
      </section>
    </>
  );
}
