import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, pillarToCategory, readTime, type ArticleRow } from "@/lib/resources";
import SmartSearchBar from "@/components/resources/SmartSearchBar";

export const revalidate = 3600;

export default async function ResourcesPage() {
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(4);

  const featured: ArticleRow[] = (data ?? []) as ArticleRow[];

  // Count articles per category
  const { data: allData } = await supabase
    .from("articles")
    .select("pillar")
    .eq("is_published", true);

  const countByCategory: Record<string, number> = {};
  for (const row of allData ?? []) {
    const cat = pillarToCategory(row.pillar ?? "");
    countByCategory[cat] = (countByCategory[cat] ?? 0) + 1;
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-off-white py-16 px-6 border-b border-border">
        <div className="max-w-[1120px] mx-auto text-center">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
            Resources
          </p>
          <h1
            className="text-[clamp(28px,3.5vw,44px)] font-semibold leading-[1.15] mb-3"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--navy)",
              letterSpacing: "-1px",
            }}
          >
            Find the right guide, whatever you&apos;re facing.
          </h1>
          <p className="text-mid text-base leading-relaxed max-w-[560px] mx-auto mb-10">
            From the first 30 days to years of sustained recovery — for you or
            for someone you love.
          </p>
          <SmartSearchBar />
        </div>
      </section>

      {/* Category cards */}
      <section className="py-14 px-6">
        <div className="max-w-[1120px] mx-auto">
          <h2
            className="text-[clamp(22px,2.5vw,30px)] font-semibold mb-8"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--navy)",
              letterSpacing: "-0.5px",
            }}
          >
            Browse by topic
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const count = countByCategory[cat.slug] ?? 0;
              return (
                <Link
                  key={cat.slug}
                  href={`/resources/${cat.slug}`}
                  className="bg-white border border-border rounded-[14px] p-6 card-hover block"
                >
                  <div className="text-[28px] mb-3">{cat.icon}</div>
                  <div
                    className="text-base font-semibold mb-1"
                    style={{ color: "var(--navy)", fontFamily: "var(--font-display)" }}
                  >
                    {cat.label}
                  </div>
                  <p className="text-[13px] text-mid leading-relaxed mb-3">
                    {cat.description}
                  </p>
                  {count > 0 && (
                    <span className="text-[12px] text-teal font-medium">
                      {count} article{count !== 1 ? "s" : ""}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured articles */}
      {featured.length > 0 && (
        <section className="bg-off-white py-14 px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <h2
                className="text-[clamp(22px,2.5vw,30px)] font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--navy)",
                  letterSpacing: "-0.5px",
                }}
              >
                Latest articles
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {featured.map((a) => {
                const cat = pillarToCategory(a.pillar ?? "");
                return (
                  <Link
                    key={a.id}
                    href={`/resources/${cat}/${a.slug}`}
                    className="bg-white border border-border rounded-[14px] p-7 card-hover block"
                  >
                    {a.pillar && (
                      <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-3">
                        {a.pillar.replace(/_/g, " ")}
                      </span>
                    )}
                    <h3
                      className="text-xl font-semibold mb-1.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--navy)",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="text-sm text-mid leading-relaxed mb-3 line-clamp-2">
                        {a.excerpt}
                      </p>
                    )}
                    <div className="text-[13px] text-mid">
                      {a.author ?? "SoberAnchor Team"} · {readTime(a.body)} min read
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Crisis resources */}
      <section className="py-10 px-6 border-t border-border">
        <div className="max-w-[1120px] mx-auto">
          <div className="bg-[#fff4f4] border border-[#ffd5d5] rounded-[14px] p-6 flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[240px]">
              <div className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#c0392b] mb-1">
                Crisis Resources
              </div>
              <div
                className="text-xl font-semibold mb-0.5"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Need help right now?
              </div>
              <p className="text-[14px] text-mid">
                Free, confidential support available 24/7.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:18006624357"
                className="bg-[#c0392b] text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                SAMHSA Helpline<br />
                <span className="font-normal text-xs">1-800-662-4357 (free)</span>
              </a>
              <a
                href="tel:988"
                className="bg-navy text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Crisis Lifeline<br />
                <span className="font-normal text-xs">Call or text 988</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
