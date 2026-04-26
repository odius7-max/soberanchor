import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCategoryBySlug,
  pillarToCategory,
  readTime,
  type ArticleRow,
} from "@/lib/resources";

export const revalidate = 3600;

// Render article body: split on double newlines → paragraphs
function ArticleBody({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="text-base text-dark leading-[1.85] space-y-5">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar, published_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) notFound();

  const article = data as ArticleRow;

  // Validate the article belongs to the requested category
  const articleCategory = pillarToCategory(article.pillar ?? "");
  if (articleCategory !== category) notFound();

  const mins = readTime(article.body);

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Related articles (same pillar, different slug)
  const { data: relatedData } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar, published_at")
    .eq("is_published", true)
    .eq("pillar", article.pillar ?? "")
    .neq("slug", slug)
    .limit(3);

  const related: ArticleRow[] = (relatedData ?? []) as ArticleRow[];

  // Directory CTA based on pillar
  const directoryCTA = getDirectoryCTA(article.pillar ?? "");

  return (
    <div>
      {/* Article header */}
      <section className="bg-off-white border-b border-border py-12 px-6">
        <div className="max-w-[760px] mx-auto">
          {/* Breadcrumb */}
          <nav className="text-[13px] text-mid mb-5">
            <Link href="/resources" className="hover:text-teal">
              Resources
            </Link>
            <span className="mx-2 text-border">›</span>
            <Link
              href={`/resources/${category}`}
              className="hover:text-teal"
            >
              {cat.label}
            </Link>
            <span className="mx-2 text-border">›</span>
            <span className="text-dark">{article.title}</span>
          </nav>

          {article.pillar && (
            <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-4">
              {article.pillar.replace(/_/g, " ")}
            </span>
          )}

          <h1
            className="text-[clamp(26px,3.5vw,40px)] font-semibold leading-[1.15] mb-5"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--navy)",
              letterSpacing: "-0.8px",
            }}
          >
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-[13px] text-mid">
            <span className="font-medium text-dark">
              {article.author ?? "SoberAnchor Team"}
            </span>
            {publishedDate && (
              <>
                <span className="text-border">·</span>
                <span>{publishedDate}</span>
              </>
            )}
            <span className="text-border">·</span>
            <span>{mins} min read</span>
          </div>
        </div>
      </section>

      {/* Article body */}
      <section className="py-12 px-6">
        <div className="max-w-[760px] mx-auto">
          {/* Key takeaways */}
          {article.excerpt && (
            <div className="bg-[var(--teal-10)] border border-[var(--teal-20)] rounded-[14px] p-6 mb-8">
              <div className="text-xs font-bold tracking-[1.5px] uppercase text-teal mb-2">
                Key Takeaways
              </div>
              <p className="text-[15px] text-dark leading-[1.7]">
                {article.excerpt}
              </p>
            </div>
          )}

          {/* Body */}
          {article.body ? (
            <ArticleBody body={article.body} />
          ) : (
            <p className="text-mid text-base">Content coming soon.</p>
          )}

          {/* Directory CTA */}
          {directoryCTA && (
            <div className="mt-12 bg-navy rounded-[14px] p-7 text-white">
              <div className="text-xs font-bold tracking-[1.5px] uppercase text-teal mb-2">
                {directoryCTA.label}
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {directoryCTA.title}
              </h3>
              <p className="text-white/70 text-sm mb-4">
                {directoryCTA.description}
              </p>
              <Link
                href={directoryCTA.href}
                className="inline-block bg-teal text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                {directoryCTA.cta}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="bg-off-white border-t border-border py-12 px-6">
          <div className="max-w-[760px] mx-auto">
            <h2
              className="text-xl font-semibold mb-6"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--navy)",
              }}
            >
              Related articles
            </h2>
            <div className="space-y-4">
              {related.map((r) => {
                const relatedCategory = pillarToCategory(r.pillar ?? "");
                const href = r.slug
                  ? `/resources/${relatedCategory}/${r.slug}`
                  : `/resources/${relatedCategory}`;

                return (
                  <Link
                    key={r.id}
                    href={href}
                    className="bg-white border border-border rounded-[14px] p-5 card-hover flex justify-between items-center gap-4"
                  >
                    <div>
                      <div
                        className="font-semibold text-[16px] mb-0.5"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--navy)",
                        }}
                      >
                        {r.title}
                      </div>
                      <div className="text-[13px] text-mid">
                        {r.author ?? "SoberAnchor Team"} · {readTime(r.body)} min
                      </div>
                    </div>
                    <span className="text-teal font-semibold text-sm shrink-0">
                      Read →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Crisis bar */}
      <section className="bg-[#fff4f4] border-t border-[#ffd5d5] py-6 px-6">
        <div className="max-w-[760px] mx-auto flex flex-wrap gap-4 items-center justify-between">
          <p className="text-sm text-mid">
            <strong className="text-dark">Need help right now?</strong>{" "}
            SAMHSA Helpline:{" "}
            <a
              href="tel:18006624357"
              className="text-[#c0392b] font-medium hover:underline"
            >
              1-800-662-4357
            </a>{" "}
            · Crisis Lifeline:{" "}
            <a
              href="tel:988"
              className="text-[#c0392b] font-medium hover:underline"
            >
              988
            </a>
          </p>
          <Link
            href="/resources"
            className="text-sm text-mid hover:text-navy transition-colors"
          >
            ← Back to Resources
          </Link>
        </div>
      </section>
    </div>
  );
}

type DirectoryCTA = {
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

function getDirectoryCTA(pillar: string): DirectoryCTA | null {
  switch (pillar) {
    case "getting_help":
    case "explainer":
      return {
        label: "Find Treatment",
        title: "Ready to take the next step?",
        description:
          "Browse treatment centers, detox facilities, and sober living homes near you.",
        href: "/find#facilities",
        cta: "Search Treatment Centers →",
      };
    case "supporting":
      return {
        label: "Find Support",
        title: "Support groups for families",
        description:
          "Al-Anon, Nar-Anon, Gam-Anon, and more — find meetings for the people who love someone in addiction.",
        href: "/find#meetings",
        cta: "Find Family Meetings →",
      };
    case "understanding":
      return {
        label: "Get Help",
        title: "Find the right help",
        description:
          "Connect with treatment centers, therapists, and meetings that specialize in what you're facing.",
        href: "/find",
        cta: "Search the Directory →",
      };
    case "sober_lifestyle":
      return {
        label: "Find Meetings",
        title: "Find your people",
        description:
          "AA, NA, SMART Recovery, and dozens more fellowships — meetings happening near you today.",
        href: "/find#meetings",
        cta: "Find Meetings Near You →",
      };
    case "local_guide":
      return {
        label: "Local Directory",
        title: "Browse local resources",
        description:
          "Treatment centers, sober living, meetings, and therapists — filtered by location.",
        href: "/find",
        cta: "Search Your Area →",
      };
    default:
      return {
        label: "Directory",
        title: "Find the right resource",
        description:
          "Search our directory of meetings, treatment centers, therapists, and sober venues.",
        href: "/find",
        cta: "Search the Directory →",
      };
  }
}
