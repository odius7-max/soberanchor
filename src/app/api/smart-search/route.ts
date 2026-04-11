import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import type {
  SearchIntent,
  MeetingResult,
  FacilityResult,
  ArticleResult,
  SmartSearchResponse,
} from "@/lib/resources";

// ─── In-memory cache (best-effort; resets on cold starts) ────────────────────
const queryCache = new Map<string, { data: SmartSearchResponse; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 200;

// ─── Claude classification ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a recovery resource classifier for SoberAnchor.com, a comprehensive addiction recovery directory.

Given a user's natural-language query, classify their intent and return ONLY a JSON object with these exact fields:

{
  "who": "self" | "loved_one" | "professional",
  "issue": string,
  "help_type": string[],
  "location": string | null,
  "urgency": "low" | "moderate" | "high",
  "include_crisis": boolean,
  "fellowship_slugs": string[],
  "facility_types": string[]
}

Field rules:
- "issue": one of: alcohol, opioids, gambling, eating_disorder, meth, cocaine, marijuana, nicotine, sex_addiction, debt, internet_gaming, work, family_support, general
- "help_type": array of: meetings, treatment, sober_living, therapist, information, crisis, family_meetings
- "fellowship_slugs": choose from: aa, na, al-anon, alateen, smart-recovery, ga, gam-anon, oa, fa, eda, aba, ca, cma, ma, sa, saa, cosa, s-anon, da, itaa, cgaa, nicotine-anonymous, nar-anon, celebrate-recovery, lifering, pills-anonymous, heroin-anonymous, refuge-recovery, aca, families-anonymous
- "facility_types": array of: treatment, sober_living, therapist, venue, outpatient

Inference rules:
- Loved one + alcohol → fellowship_slugs includes both "aa" (for them) AND "al-anon" (for the asker)
- Loved one + drugs → include both "na" AND "nar-anon"
- Loved one + gambling → include both "ga" AND "gam-anon"
- Treatment/rehab/detox language → facility_types includes "treatment"
- Sober house/halfway/sober living → facility_types includes "sober_living"
- Counselor/therapist/therapy → facility_types includes "therapist"
- Crisis language (want to die, can't go on, overdose, emergency, suicide) → urgency="high", include_crisis=true
- For general recovery queries with no specific issue → aa and na as fellowship_slugs
- Return ONLY the JSON object, no explanation or markdown`;

async function classifyIntent(query: string): Promise<SearchIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const text =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(clean) as SearchIntent;
  } catch {
    return null;
  }
}

// ─── DB fetchers ─────────────────────────────────────────────────────────────

async function fetchMeetings(intent: SearchIntent): Promise<MeetingResult[]> {
  const slugs =
    intent.fellowship_slugs.length > 0 ? intent.fellowship_slugs : ["aa", "na"];

  const { data: fellowships } = await supabase
    .from("fellowships")
    .select("id, name, slug")
    .in("slug", slugs);

  if (!fellowships?.length) return [];

  const idToFellowship = Object.fromEntries(
    fellowships.map((f) => [f.id, { name: f.name as string, slug: f.slug as string }])
  );
  const fellowshipIds = fellowships.map((f) => f.id as string);

  let q = supabase
    .from("meetings")
    .select(
      "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug"
    )
    .in("fellowship_id", fellowshipIds)
    .limit(6);

  if (intent.location) {
    q = q.ilike("city", `%${intent.location}%`);
  }

  const { data } = await q;
  if (!data?.length) {
    // If location filter returned nothing, retry without location
    if (intent.location) {
      const { data: fallback } = await supabase
        .from("meetings")
        .select(
          "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug"
        )
        .in("fellowship_id", fellowshipIds)
        .limit(6);
      return (fallback ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        fellowship_name: idToFellowship[m.fellowship_id]?.name ?? "",
        fellowship_slug: idToFellowship[m.fellowship_id]?.slug ?? "",
        city: m.city,
        state: m.state,
        format: m.format,
        day_of_week: m.day_of_week,
        start_time: m.start_time,
        meeting_url: m.meeting_url,
        slug: m.slug,
      }));
    }
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    name: m.name,
    fellowship_name: idToFellowship[m.fellowship_id]?.name ?? "",
    fellowship_slug: idToFellowship[m.fellowship_id]?.slug ?? "",
    city: m.city,
    state: m.state,
    format: m.format,
    day_of_week: m.day_of_week,
    start_time: m.start_time,
    meeting_url: m.meeting_url,
    slug: m.slug,
  }));
}

async function fetchFacilities(
  intent: SearchIntent
): Promise<FacilityResult[]> {
  const types = intent.facility_types;
  if (!types.length) return [];

  let q = supabase
    .from("facilities")
    .select(
      "id, name, facility_type, city, state, phone, website, accepts_insurance, slug, is_verified, is_featured"
    )
    .in("facility_type", types)
    .order("is_featured", { ascending: false })
    .order("is_verified", { ascending: false })
    .limit(5);

  if (intent.location) {
    q = q.ilike("city", `%${intent.location}%`);
  }

  const { data } = await q;
  if (!data?.length && intent.location) {
    // Retry without location
    const { data: fallback } = await supabase
      .from("facilities")
      .select(
        "id, name, facility_type, city, state, phone, website, accepts_insurance, slug, is_verified, is_featured"
      )
      .in("facility_type", types)
      .order("is_featured", { ascending: false })
      .limit(5);
    return (fallback ?? []) as FacilityResult[];
  }

  return (data ?? []) as FacilityResult[];
}

async function fetchArticles(intent: SearchIntent): Promise<ArticleResult[]> {
  // Map issue + who to relevant pillars
  const pillarsByIssue: Record<string, string[]> = {
    alcohol: ["getting_help", "understanding", "supporting", "sober_lifestyle"],
    opioids: ["understanding", "getting_help"],
    gambling: ["understanding", "supporting"],
    eating_disorder: ["understanding"],
    meth: ["understanding", "getting_help"],
    cocaine: ["understanding", "getting_help"],
    marijuana: ["understanding"],
    nicotine: ["understanding"],
    sex_addiction: ["understanding"],
    debt: ["understanding"],
    internet_gaming: ["understanding"],
    work: ["understanding"],
    family_support: ["supporting"],
    general: ["getting_help", "supporting", "understanding"],
  };

  const issuePillars = pillarsByIssue[intent.issue] ?? ["getting_help", "understanding"];
  // If asking for/about a loved one, push supporting pillar first
  const pillars =
    intent.who === "loved_one"
      ? ["supporting", ...issuePillars.filter((p) => p !== "supporting")]
      : issuePillars;

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar")
    .eq("is_published", true)
    .in("pillar", pillars)
    .limit(4);

  return (data ?? []) as ArticleResult[];
}

// ─── Keyword fallback (no API key) ───────────────────────────────────────────

async function keywordSearch(q: string): Promise<SmartSearchResponse> {
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (!terms.length) {
    return emptyResponse(q);
  }

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar")
    .eq("is_published", true);

  const scored = (data ?? [])
    .map((a) => {
      const hay = [a.title, a.excerpt, a.pillar, a.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return { a, score: terms.filter((t) => hay.includes(t)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8)
    .map(({ a }) => a as ArticleResult);

  return {
    query: q,
    intent: null,
    meetings: [],
    facilities: [],
    articles: scored,
    crisis: false,
    ai_powered: false,
  };
}

function emptyResponse(query: string): SmartSearchResponse {
  return {
    query,
    intent: null,
    meetings: [],
    facilities: [],
    articles: [],
    crisis: false,
    ai_powered: false,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return Response.json(emptyResponse(q));
  }

  // Cache lookup
  const cacheKey = q.toLowerCase().slice(0, 150);
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json({ ...cached.data, cached: true });
  }

  // Fallback to keyword search if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = await keywordSearch(q);
    return Response.json(result);
  }

  // AI classification
  const intent = await classifyIntent(q);
  if (!intent) {
    // Classification failed — fall back to keyword
    const result = await keywordSearch(q);
    return Response.json(result);
  }

  const wantsMeetings = intent.fellowship_slugs.length > 0;
  const wantsFacilities = intent.facility_types.length > 0;

  // Parallel Supabase queries
  const [meetings, facilities, articles] = await Promise.all([
    wantsMeetings
      ? fetchMeetings(intent)
      : Promise.resolve([] as MeetingResult[]),
    wantsFacilities
      ? fetchFacilities(intent)
      : Promise.resolve([] as FacilityResult[]),
    fetchArticles(intent),
  ]);

  const result: SmartSearchResponse = {
    query: q,
    intent,
    meetings,
    facilities,
    articles,
    crisis: intent.include_crisis || intent.urgency === "high",
    ai_powered: true,
  };

  // Write to cache (evict oldest entry if full)
  if (queryCache.size >= MAX_CACHE_SIZE) {
    queryCache.delete(queryCache.keys().next().value!);
  }
  queryCache.set(cacheKey, { data: result, ts: Date.now() });

  return Response.json(result);
}
