"use client";

import { useState } from "react";

export type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  body: string | null;
  pillar: string | null;
  slug: string | null;
  article_categories: { categories: { name: string } | null }[];
};

type Props = {
  articles: Article[];
  pillars: string[];
};

export default function ResourcesClient({ articles, pillars }: Props) {
  const [activePillar, setActivePillar] = useState("All");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Collect unique categories across all articles
  const allCategories = Array.from(
    new Set(
      articles.flatMap((a) =>
        a.article_categories
          .map((ac) => ac.categories?.name)
          .filter(Boolean) as string[]
      )
    )
  );

  const filtered = articles.filter((a) => {
    const pillarMatch =
      activePillar === "All" || a.pillar === activePillar;
    const categoryMatch =
      !activeCategory ||
      a.article_categories.some((ac) => ac.categories?.name === activeCategory);
    return pillarMatch && categoryMatch;
  });

  function handlePillarClick(p: string) {
    setActivePillar(p);
    setActiveCategory(null);
  }

  function handleCategoryClick(c: string) {
    setActiveCategory((prev) => (prev === c ? null : c));
  }

  return (
    <>
      {/* Pillar filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {["All", ...pillars].map((p) => (
          <button
            key={p}
            onClick={() => handlePillarClick(p)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium cursor-pointer transition-all ${
              activePillar === p
                ? "bg-navy text-white border border-navy"
                : "bg-warm-gray border border-border text-dark hover:bg-navy hover:text-white hover:border-navy"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      {allCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-7">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => handleCategoryClick(c)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium cursor-pointer transition-all ${
                activeCategory === c
                  ? "bg-teal text-white border border-teal"
                  : "bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal hover:bg-teal hover:text-white hover:border-teal"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Article grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-mid text-base">No articles found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-border rounded-[14px] p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {a.pillar && (
                <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-2.5">
                  {a.pillar}
                </span>
              )}
              <h3
                className="text-[22px] font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                {a.title}
              </h3>
              {a.excerpt && (
                <p className="text-sm text-mid leading-relaxed mb-3">{a.excerpt}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-mid">
                  {a.author ?? "SoberAnchor Team"}
                  {a.body
                    ? ` · ${Math.ceil(a.body.split(" ").length / 200)} min`
                    : ""}
                </span>
                <span className="text-teal font-semibold text-sm">Read →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
