import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return Response.json({ articles: [] });
  }

  // Keyword search across title, excerpt, and pillar
  // Uses ilike on title and excerpt; Supabase doesn't support full-text OR across columns natively via ilike
  // so we fetch candidates and filter in JS for simplicity
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (!data) return Response.json({ articles: [] });

  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return Response.json({ articles: [] });

  const scored = data
    .map((a) => {
      const haystack = [a.title, a.excerpt, a.pillar, a.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = terms.filter((t) => haystack.includes(t)).length;
      return { article: a, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);

  return Response.json({ articles: scored.slice(0, 8) });
}
