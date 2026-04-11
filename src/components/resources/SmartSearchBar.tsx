"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { pillarToCategory, readTime } from "@/lib/resources";
import type {
  SmartSearchResponse,
  MeetingResult,
  FacilityResult,
  ArticleResult,
} from "@/lib/resources";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  treatment: "Treatment Center",
  sober_living: "Sober Living",
  therapist: "Therapist",
  venue: "Sober Venue",
  outpatient: "Outpatient",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${suffix}`;
}

// ─── Result section components ────────────────────────────────────────────────

function CrisisBanner() {
  return (
    <div className="bg-[#fff4f4] border-2 border-[#e74c3c] rounded-[14px] p-5 mb-6">
      <div className="text-xs font-bold tracking-[1.5px] uppercase text-[#c0392b] mb-1">
        Crisis Resources — Available 24/7
      </div>
      <p className="text-[15px] text-dark font-medium mb-3">
        If you or someone you know is in crisis, please reach out now.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href="tel:18006624357"
          className="inline-flex items-center gap-2 bg-[#c0392b] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          📞 SAMHSA Helpline · 1-800-662-4357
        </a>
        <a
          href="tel:988"
          className="inline-flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          💬 Crisis Lifeline · Call or text 988
        </a>
      </div>
    </div>
  );
}

function MeetingCard({ m }: { m: MeetingResult }) {
  const href = m.slug ? `/find/meetings/${m.slug}` : "/find#meetings";
  const location =
    m.city && m.state
      ? `${m.city}, ${m.state}`
      : m.city ?? m.state ?? "";
  const schedule = [m.day_of_week, formatTime(m.start_time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      className="bg-white border border-border rounded-[14px] p-5 card-hover block"
    >
      <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-2.5 py-0.5 mb-2">
        {m.fellowship_name}
      </span>
      <div
        className="font-semibold text-[16px] mb-1 leading-snug"
        style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
      >
        {m.name}
      </div>
      <div className="text-[13px] text-mid space-y-0.5">
        {schedule && <div>{schedule}</div>}
        {m.format && (
          <div className="capitalize">{m.format.replace(/_/g, " ")}</div>
        )}
        {location && <div>{location}</div>}
      </div>
      {m.meeting_url && (
        <div className="mt-2 text-[12px] text-teal font-medium">
          Online meeting available
        </div>
      )}
    </Link>
  );
}

function FacilityCard({ f }: { f: FacilityResult }) {
  const href = f.slug ? `/find/${f.slug}` : "/find#facilities";
  const location =
    f.city && f.state ? `${f.city}, ${f.state}` : f.city ?? f.state ?? "";

  return (
    <Link
      href={href}
      className="bg-white border border-border rounded-[14px] p-5 card-hover block"
    >
      <span className="inline-block bg-[var(--navy-10)] border border-[var(--navy-20)] text-navy text-xs font-medium rounded-full px-2.5 py-0.5 mb-2">
        {FACILITY_TYPE_LABELS[f.facility_type] ?? f.facility_type}
      </span>
      <div
        className="font-semibold text-[16px] mb-1 leading-snug"
        style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
      >
        {f.name}
      </div>
      <div className="text-[13px] text-mid space-y-0.5">
        {location && <div>{location}</div>}
        {f.accepts_insurance && (
          <div className="text-teal font-medium">Accepts insurance</div>
        )}
        {f.phone && <div>{f.phone}</div>}
      </div>
    </Link>
  );
}

function ArticleCard({ a }: { a: ArticleResult }) {
  const cat = pillarToCategory(a.pillar ?? "");
  const href = `/resources/${cat}/${a.slug}`;

  return (
    <Link
      href={href}
      className="bg-white border border-border rounded-[14px] p-5 card-hover flex justify-between items-start gap-3"
    >
      <div className="flex-1 min-w-0">
        {a.pillar && (
          <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-2.5 py-0.5 mb-1.5">
            {a.pillar.replace(/_/g, " ")}
          </span>
        )}
        <div
          className="font-semibold text-[16px] mb-0.5 leading-snug"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          {a.title}
        </div>
        {a.excerpt && (
          <p className="text-[13px] text-mid leading-relaxed line-clamp-2">
            {a.excerpt}
          </p>
        )}
        <div className="text-[12px] text-mid mt-1.5">
          {a.author ?? "SoberAnchor Team"} · {readTime(a.body)} min
        </div>
      </div>
      <span className="text-teal font-semibold text-sm shrink-0 mt-1">→</span>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  href,
}: {
  icon: string;
  title: string;
  count: number;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span
          className="font-semibold text-[15px]"
          style={{ color: "var(--navy)", fontFamily: "var(--font-display)" }}
        >
          {title}
        </span>
        <span className="text-[12px] text-mid bg-warm-gray border border-border rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <Link
        href={href}
        className="text-[12px] text-teal font-medium hover:underline"
      >
        See all →
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SmartSearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartSearchResponse | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/smart-search?q=${encodeURIComponent(q)}`);
      const data: SmartSearchResponse = await res.json();
      setResult(data);
    } catch {
      setResult({
        query: q,
        intent: null,
        meetings: [],
        facilities: [],
        articles: [],
        crisis: false,
        ai_powered: false,
      });
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setResult(null);
    inputRef.current?.focus();
  }

  const examples = [
    "my son is addicted to pills",
    "AA meetings near me",
    "sober living in San Diego",
    "how to help someone who relapsed",
    "what's the difference between AA and SMART Recovery",
    "gambling addiction help for a family member",
  ];

  const hasResults =
    result &&
    (result.meetings.length > 0 ||
      result.facilities.length > 0 ||
      result.articles.length > 0 ||
      result.crisis);

  return (
    <div className="w-full max-w-[700px] mx-auto">
      {/* Search input */}
      <form onSubmit={handleSearch}>
        <div
          className={`flex items-center bg-white rounded-2xl border-2 transition-colors ${
            focused ? "border-teal" : "border-border"
          } shadow-sm overflow-hidden`}
        >
          <span className="pl-5 text-[20px] shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What are you looking for? Try &quot;help for gambling&quot; or &quot;my wife drinks too much&quot;"
            className="flex-1 py-4 px-4 text-base text-dark placeholder:text-mid outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-3 text-mid hover:text-dark"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-navy text-white font-semibold px-6 py-4 shrink-0 hover:bg-navy-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Example chips */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2 mt-3">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                inputRef.current?.focus();
              }}
              className="text-[12px] text-mid bg-warm-gray border border-border rounded-full px-3 py-1 hover:border-teal hover:text-teal transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-6 text-center py-8 text-mid text-sm">
          <div className="inline-block w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin mb-3" />
          <div>Finding the best resources for you…</div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-6">
          {/* AI badge */}
          {result.ai_powered && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-mid">
                Results for &ldquo;{result.query}&rdquo;
              </p>
              <span className="text-[11px] bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal font-medium rounded-full px-2.5 py-0.5">
                ✨ AI-powered
              </span>
            </div>
          )}
          {!result.ai_powered && (
            <p className="text-sm text-mid mb-4">
              Results for &ldquo;{result.query}&rdquo;
            </p>
          )}

          {!hasResults ? (
            <div className="text-center py-8 text-mid text-base">
              No results found for &ldquo;{result.query}&rdquo;.{" "}
              <button
                onClick={clearSearch}
                className="text-teal font-medium hover:underline"
              >
                Clear search
              </button>{" "}
              or browse categories below.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Crisis */}
              {result.crisis && <CrisisBanner />}

              {/* Meetings */}
              {result.meetings.length > 0 && (
                <div>
                  <SectionHeader
                    icon="🤝"
                    title="Meetings"
                    count={result.meetings.length}
                    href="/find#meetings"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.meetings.map((m) => (
                      <MeetingCard key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Facilities */}
              {result.facilities.length > 0 && (
                <div>
                  <SectionHeader
                    icon="🏥"
                    title="Treatment & Support"
                    count={result.facilities.length}
                    href="/find#facilities"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.facilities.map((f) => (
                      <FacilityCard key={f.id} f={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {result.articles.length > 0 && (
                <div>
                  <SectionHeader
                    icon="📖"
                    title="Articles & Guides"
                    count={result.articles.length}
                    href="/resources"
                  />
                  <div className="space-y-3">
                    {result.articles.map((a) => (
                      <ArticleCard key={a.id} a={a} />
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={clearSearch}
                  className="text-sm text-mid hover:text-dark underline"
                >
                  Clear search
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
