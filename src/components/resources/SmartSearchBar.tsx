"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { pillarToCategory, readTime, type ArticleRow } from "@/lib/resources";

type SearchResult = {
  articles: ArticleRow[];
  query: string;
};

export default function SmartSearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/smart-search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResult({ articles: data.articles ?? [], query: q });
    } catch {
      setResult({ articles: [], query: q });
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
    "sober living San Diego",
    "how to help someone who relapsed",
  ];

  return (
    <div className="w-full max-w-[700px] mx-auto">
      <form onSubmit={handleSearch} className="relative">
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
            placeholder="What are you looking for? (e.g. &quot;help for gambling&quot;)"
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

      {/* Example queries */}
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

      {/* Results */}
      {result && (
        <div className="mt-6">
          {result.articles.length === 0 ? (
            <div className="text-center py-8 text-mid text-base">
              No results found for &ldquo;{result.query}&rdquo;.{" "}
              <button
                onClick={clearSearch}
                className="text-teal font-medium hover:underline"
              >
                Clear search
              </button>{" "}
              or browse the categories below.
            </div>
          ) : (
            <>
              <p className="text-sm text-mid mb-4">
                {result.articles.length} result
                {result.articles.length !== 1 ? "s" : ""} for &ldquo;
                {result.query}&rdquo;
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.articles.map((a) => {
                  const cat = pillarToCategory(a.pillar ?? "");
                  const href = `/resources/${cat}/${a.slug}`;
                  return (
                    <Link
                      key={a.id}
                      href={href}
                      className="bg-white border border-border rounded-[14px] p-6 card-hover block"
                    >
                      {a.pillar && (
                        <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-2">
                          {a.pillar.replace(/_/g, " ")}
                        </span>
                      )}
                      <h3
                        className="text-[18px] font-semibold mb-1"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--navy)",
                        }}
                      >
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-sm text-mid leading-relaxed mb-2 line-clamp-2">
                          {a.excerpt}
                        </p>
                      )}
                      <div className="text-[13px] text-mid">
                        {a.author ?? "SoberAnchor Team"} ·{" "}
                        {readTime(a.body)} min read
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-4">
                <button
                  onClick={clearSearch}
                  className="text-sm text-mid hover:text-dark underline"
                >
                  Clear search
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
