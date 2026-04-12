import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── Fellowship groupings ────────────────────────────────────────────────────
// twelve_step fellowships are split by subject matter; everything else
// (secular, faith, harm_reduction) goes into the Secular/Alternative bucket.

const FAMILY_SLUGS = new Set([
  "al-anon", "alateen", "nar-anon", "gam-anon",
  "aca", "cosa", "s-anon", "families-anonymous",
]);

const BEHAVIORAL_SLUGS = new Set([
  "ga", "oa", "fa", "eda", "aba",
  "saa", "slaa", "sca", "da", "spenders-anonymous",
  "itaa", "cgaa", "workaholics-anonymous", "cla", "ospa",
]);

type Group = {
  id: string;
  label: string;
  icon: string;
  description: string;
  slugs?: Set<string>;
  approachMatch?: string[];
};

const GROUPS: Group[] = [
  {
    id: "substance",
    label: "Substance-Based Fellowships",
    icon: "💊",
    description:
      "Programs focused on recovery from alcohol, drugs, and other substances. Most use the 12 steps.",
    // twelve_step + not in FAMILY or BEHAVIORAL = substance by default
  },
  {
    id: "behavioral",
    label: "Behavioral Fellowships",
    icon: "🧠",
    description:
      "Recovery programs for compulsive behaviors — gambling, eating, sex, spending, gaming, and more.",
    slugs: BEHAVIORAL_SLUGS,
  },
  {
    id: "family",
    label: "Family & Loved Ones",
    icon: "❤️",
    description:
      "Support groups for families, partners, and friends affected by someone else's addiction.",
    slugs: FAMILY_SLUGS,
  },
  {
    id: "secular",
    label: "Secular & Alternative Programs",
    icon: "✨",
    description:
      "Science-based, faith-based, and non-12-step approaches to recovery.",
    approachMatch: ["secular", "faith", "harm_reduction"],
  },
];

type FellowshipRow = {
  id: string;
  name: string;
  abbreviation: string;
  approach: string;
  description: string | null;
  slug: string;
  website: string | null;
};

type CategoryShape = {
  slug: string;
  label: string;
  description: string;
  icon: string;
};

function assignGroup(f: FellowshipRow): string {
  if (["secular", "faith", "harm_reduction"].includes(f.approach)) return "secular";
  if (FAMILY_SLUGS.has(f.slug)) return "family";
  if (BEHAVIORAL_SLUGS.has(f.slug)) return "behavioral";
  return "substance";
}

const APPROACH_LABEL: Record<string, string> = {
  twelve_step: "12-Step",
  secular: "Secular",
  faith: "Faith-Based",
  harm_reduction: "Harm Reduction",
};

const APPROACH_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  twelve_step:    { bg: "rgba(0,51,102,0.06)",   color: "var(--navy)",  border: "rgba(0,51,102,0.14)" },
  secular:        { bg: "rgba(42,138,153,0.08)", color: "var(--teal)",  border: "rgba(42,138,153,0.2)" },
  faith:          { bg: "rgba(212,165,116,0.1)", color: "#9A7B54",      border: "rgba(212,165,116,0.25)" },
  harm_reduction: { bg: "rgba(39,174,96,0.08)",  color: "#27AE60",      border: "rgba(39,174,96,0.2)" },
};

export default async function FellowshipsPage({ cat }: { cat: CategoryShape }) {
  // Fetch all three data sets in parallel
  const [fellowshipsRes, meetingCountsRes, stepWorkRes] = await Promise.all([
    supabase
      .from("fellowships")
      .select("id, name, abbreviation, approach, description, slug, website")
      .order("approach")
      .order("name"),
    supabase
      .from("meetings")
      .select("fellowship_id")
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          if (row.fellowship_id) counts[row.fellowship_id] = (counts[row.fellowship_id] ?? 0) + 1;
        }
        return counts;
      }),
    supabase
      .from("program_workbooks")
      .select("fellowship_id")
      .eq("is_active", true)
      .then(({ data }) => new Set((data ?? []).map((r) => r.fellowship_id as string))),
  ]);

  const fellowships = (fellowshipsRes.data ?? []) as FellowshipRow[];
  const meetingCounts = meetingCountsRes as Record<string, number>;
  const stepWorkFellowships = stepWorkRes as Set<string>;

  // Group
  const grouped = new Map<string, FellowshipRow[]>(GROUPS.map((g) => [g.id, []]));
  for (const f of fellowships) {
    grouped.get(assignGroup(f))!.push(f);
  }

  const prevCat = null; // fellowships is first in CATEGORIES
  const nextCat = { slug: "guides", label: "Getting Help", icon: "🏥" };

  return (
    <div>
      {/* Header */}
      <section className="bg-off-white border-b border-border py-12 px-6">
        <div className="max-w-[1120px] mx-auto">
          <nav className="text-[13px] text-mid mb-4">
            <Link href="/resources" className="hover:text-teal">
              Resources
            </Link>
            <span className="mx-2 text-border">›</span>
            <span className="text-dark font-medium">{cat.label}</span>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-[40px]">{cat.icon}</span>
            <div>
              <h1
                className="text-[clamp(24px,3vw,36px)] font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--navy)",
                  letterSpacing: "-0.5px",
                }}
              >
                {cat.label}
              </h1>
              <p className="text-mid text-[15px] leading-relaxed mt-1 max-w-[560px]">
                {cat.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fellowship groups */}
      <section className="py-12 px-6">
        <div className="max-w-[1120px] mx-auto space-y-14">
          {GROUPS.map((group) => {
            const items = grouped.get(group.id) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={group.id}>
                {/* Group header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[28px]">{group.icon}</span>
                    <h2
                      className="text-[22px] font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                    >
                      {group.label}
                    </h2>
                    <span className="text-[12px] text-mid bg-warm-gray border border-border rounded-full px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-[14px] text-mid ml-[44px]">{group.description}</p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((f) => {
                    const count = meetingCounts[f.id] ?? 0;
                    const hasStepWork = stepWorkFellowships.has(f.id);
                    const approachStyle = APPROACH_STYLE[f.approach] ?? APPROACH_STYLE.twelve_step;

                    return (
                      <div
                        key={f.id}
                        className="bg-white border border-border rounded-[14px] p-5 flex flex-col gap-3"
                      >
                        {/* Top row: abbreviation badge + approach badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className="text-[13px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                            style={{
                              background: "var(--navy)",
                              color: "#fff",
                              fontFamily: "var(--font-display)",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {f.abbreviation}
                          </span>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                              style={{
                                background: approachStyle.bg,
                                color: approachStyle.color,
                                borderColor: approachStyle.border,
                              }}
                            >
                              {APPROACH_LABEL[f.approach] ?? f.approach}
                            </span>
                            {hasStepWork && (
                              <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                                style={{
                                  background: "rgba(42,138,153,0.08)",
                                  color: "var(--teal)",
                                  borderColor: "rgba(42,138,153,0.2)",
                                }}
                              >
                                Step Work ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <h3
                            className="text-[17px] font-semibold leading-snug mb-1"
                            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                          >
                            {f.name}
                          </h3>
                          {f.description && (
                            <p className="text-[13px] text-mid leading-relaxed">
                              {f.description}
                            </p>
                          )}
                        </div>

                        {/* Meeting count */}
                        {count > 0 && (
                          <p className="text-[12px] text-mid">
                            {count.toLocaleString()} meeting{count !== 1 ? "s" : ""} listed
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-auto pt-1">
                          <Link
                            href={`/find/meetings?fellowship=${f.slug}`}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-navy rounded-lg px-3 py-1.5 hover:bg-navy-dark transition-colors"
                          >
                            Find Meetings →
                          </Link>
                          {f.website && (
                            <a
                              href={f.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[13px] font-medium text-mid border border-border rounded-lg px-3 py-1.5 hover:border-teal hover:text-teal transition-colors"
                            >
                              Official Site ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sibling category nav */}
      <section className="border-t border-border py-8 px-6">
        <div className="max-w-[1120px] mx-auto flex justify-between items-center gap-4">
          {prevCat ? (
            <Link
              href={`/resources/${(prevCat as { slug: string }).slug}`}
              className="flex items-center gap-2 text-sm text-mid hover:text-navy transition-colors"
            >
              ← {(prevCat as { icon: string }).icon} {(prevCat as { label: string }).label}
            </Link>
          ) : (
            <div />
          )}
          <Link href="/resources" className="text-sm text-mid hover:text-navy transition-colors">
            All Resources
          </Link>
          {nextCat && (
            <Link
              href={`/resources/${nextCat.slug}`}
              className="flex items-center gap-2 text-sm text-mid hover:text-navy transition-colors"
            >
              {nextCat.icon} {nextCat.label} →
            </Link>
          )}
        </div>
      </section>

      {/* Crisis bar */}
      <section className="bg-[#fff4f4] border-t border-[#ffd5d5] py-6 px-6">
        <div className="max-w-[1120px] mx-auto flex flex-wrap gap-4 items-center justify-between">
          <p className="text-sm text-mid">
            <strong className="text-dark">Need help right now?</strong>{" "}
            SAMHSA Helpline:{" "}
            <a href="tel:18006624357" className="text-[#c0392b] font-medium hover:underline">
              1-800-662-4357
            </a>{" "}
            · Crisis Lifeline:{" "}
            <a href="tel:988" className="text-[#c0392b] font-medium hover:underline">
              988
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
