import { supabase } from "@/lib/supabase";
import ResourcesClient, { type Article } from "./ResourcesClient";

export const revalidate = 3600;

export default async function ResourcesPage() {
  const { data } = await supabase
    .from("articles")
    .select("id, title, excerpt, author, body, pillar, slug, article_categories(categories(name))")
    .order("published_at", { ascending: false });

  const articles: Article[] = (data ?? []) as Article[];

  // Collect unique non-null pillars for filter chips
  const pillars = Array.from(
    new Set(articles.map((a) => a.pillar).filter(Boolean) as string[])
  );

  return (
    <section className="pt-12 px-6 pb-16">
      <div className="max-w-[1120px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
          Resources
        </p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Guides, articles &amp; expert advice.
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[600px] mb-8">
          Real talk about recovery — written by people who&apos;ve been there.
        </p>

        <ResourcesClient articles={articles} pillars={pillars} />
      </div>
    </section>
  );
}
