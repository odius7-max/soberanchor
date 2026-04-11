import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES,
  getCategoryBySlug,
  getPillarsForCategory,
  readTime,
  type ArticleRow,
} from "@/lib/resources";

export const revalidate = 3600;

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const pillars = getPillarsForCategory(category);

  let articles: ArticleRow[] = [];
  if (pillars.length > 0) {
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, author, body, pillar, published_at")
      .eq("is_published", true)
      .in("pillar", pillars)
      .order("published_at", { ascending: false });
    articles = (data ?? []) as ArticleRow[];
  }

  const categoryIndex = CATEGORIES.findIndex((c) => c.slug === category);
  const prevCat = categoryIndex > 0 ? CATEGORIES[categoryIndex - 1] : null;
  const nextCat =
    categoryIndex < CATEGORIES.length - 1
      ? CATEGORIES[categoryIndex + 1]
      : null;

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

      {/* Articles */}
      <section className="py-12 px-6">
        <div className="max-w-[1120px] mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-[48px] mb-4">{cat.icon}</div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Coming soon
              </h2>
              <p className="text-mid text-base max-w-[360px] mx-auto mb-6">
                We&apos;re working on {cat.label.toLowerCase()} content. Check
                back soon or browse other topics.
              </p>
              <Link
                href="/resources"
                className="inline-block bg-navy text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-navy-dark transition-colors"
              >
                ← Back to Resources
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-mid mb-6">
                {articles.length} article{articles.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/resources/${category}/${a.slug}`}
                    className="bg-white border border-border rounded-[14px] p-7 card-hover block"
                  >
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--navy)",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="text-sm text-mid leading-relaxed mb-3 line-clamp-3">
                        {a.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[13px] text-mid">
                        {a.author ?? "SoberAnchor Team"} · {readTime(a.body)} min
                      </span>
                      <span className="text-teal font-semibold text-sm">
                        Read →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Sibling category nav */}
      {(prevCat || nextCat) && (
        <section className="border-t border-border py-8 px-6">
          <div className="max-w-[1120px] mx-auto flex justify-between items-center gap-4">
            {prevCat ? (
              <Link
                href={`/resources/${prevCat.slug}`}
                className="flex items-center gap-2 text-sm text-mid hover:text-navy transition-colors"
              >
                ← {prevCat.icon} {prevCat.label}
              </Link>
            ) : (
              <div />
            )}
            <Link
              href="/resources"
              className="text-sm text-mid hover:text-navy transition-colors"
            >
              All Resources
            </Link>
            {nextCat ? (
              <Link
                href={`/resources/${nextCat.slug}`}
                className="flex items-center gap-2 text-sm text-mid hover:text-navy transition-colors"
              >
                {nextCat.icon} {nextCat.label} →
              </Link>
            ) : (
              <div />
            )}
          </div>
        </section>
      )}

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
