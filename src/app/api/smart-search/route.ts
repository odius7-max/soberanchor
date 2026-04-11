import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import type {
  SearchIntent,
  MeetingResult,
  FacilityResult,
  ArticleResult,
  SmartSearchResponse,
} from "@/lib/resources";

// ─── In-memory stores (best-effort; reset on cold start) ─────────────────────

/** Cached AI results: normalised query → { data, timestamp } */
const queryCache = new Map<string, { data: SmartSearchResponse; ts: number }>();
const CACHE_TTL_MS        = 10 * 60 * 1000; // 10 min standard
const CACHE_TTL_COMMON_MS = 60 * 60 * 1000; // 1 hr for common queries
const MAX_CACHE_SIZE = 200;

/** Per-identifier: timestamp of last AI call (1/3 s throttle) */
const lastAiRequest = new Map<string, number>();

/** Per-identifier-day: number of AI calls made today */
const dailyCounts = new Map<string, number>();

const AI_THROTTLE_MS   = 3_000; // 1 request per 3 seconds
const MAX_DAILY_AUTH   = 50;
const MAX_DAILY_ANON   = 10;

// ─── Common-query normalisation → extended cache ──────────────────────────────
// Queries that match these patterns get a 1-hour TTL instead of 10 min.
const COMMON_PATTERNS = [
  /\baa\s+meetings?\b/i,
  /\bna\s+meetings?\b/i,
  /\bal.?anon\b/i,
  /\bsmart\s+recovery\b/i,
  /\brehab\b/i,
  /\bdetox\b/i,
  /\bsober\s+living\b/i,
  /\bgamblers?\s+anonymous\b/i,
  /\bovereaters?\s+anonymous\b/i,
];

function isCommonQuery(q: string): boolean {
  return COMMON_PATTERNS.some((p) => p.test(q));
}

// ─── Input sanitisation ───────────────────────────────────────────────────────

function sanitize(raw: string): string {
  return raw
    .slice(0, 200)                   // hard length cap
    .replace(/<[^>]*>/g, " ")        // strip HTML tags
    .replace(/[<>]/g, "")            // remove stray angle brackets
    .replace(/javascript\s*:/gi, "") // strip JS protocol
    .replace(/on\w+\s*=/gi, "")      // strip inline event handlers
    .trim();
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkRateLimit(
  identifier: string,
  isAuth: boolean
): { ok: boolean; message: string; retryAfter?: number } {
  // 1. Per-identifier throttle: 1 AI call per 3 seconds
  const last = lastAiRequest.get(identifier) ?? 0;
  const sinceLast = Date.now() - last;
  if (sinceLast < AI_THROTTLE_MS) {
    const wait = Math.ceil((AI_THROTTLE_MS - sinceLast) / 1000);
    return {
      ok: false,
      message: "Please wait a moment before searching again.",
      retryAfter: wait,
    };
  }

  // 2. Per-day quota
  const dayKey = `${today()}:${identifier}`;
  const count = dailyCounts.get(dayKey) ?? 0;
  const limit = isAuth ? MAX_DAILY_AUTH : MAX_DAILY_ANON;
  if (count >= limit) {
    return {
      ok: false,
      message: `Daily search limit reached (${limit}/day). Try again tomorrow.`,
      retryAfter: 86400,
    };
  }

  return { ok: true, message: "" };
}

function recordRequest(identifier: string): void {
  lastAiRequest.set(identifier, Date.now());
  const dayKey = `${today()}:${identifier}`;
  dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);

  // Prune stale daily entries (keep memory bounded)
  const todayStr = today();
  for (const key of dailyCounts.keys()) {
    if (!key.startsWith(todayStr)) dailyCounts.delete(key);
  }
}

// ─── IP extraction ────────────────────────────────────────────────────────────

function getIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

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

const CONTEXT_HINTS: Record<SearchContext, string> = {
  home:      "General search from the homepage.",
  resources: "User is browsing articles and guides — prioritise information over directories.",
  directory: "User is in the Find directory — prioritise meetings and facilities.",
  member:    "User is in their personal recovery dashboard — they may be asking about step work, sponsor relationships, or daily recovery practices.",
};

async function classifyIntent(
  query: string,
  context: SearchContext
): Promise<SearchIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `[Context: ${CONTEXT_HINTS[context]}]\n\nQuery: ${query}`,
      }],
    });

    const text =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(clean) as SearchIntent;
  } catch {
    return null;
  }
}

// ─── DB fetchers ──────────────────────────────────────────────────────────────

async function fetchMeetings(intent: SearchIntent): Promise<MeetingResult[]> {
  const slugs =
    intent.fellowship_slugs.length > 0 ? intent.fellowship_slugs : ["aa", "na"];

  const { data: fellowships } = await supabase
    .from("fellowships")
    .select("id, name, slug")
    .in("slug", slugs);

  if (!fellowships?.length) return [];

  const idToFellowship = Object.fromEntries(
    fellowships.map((f) => [
      f.id,
      { name: f.name as string, slug: f.slug as string },
    ])
  );
  const fellowshipIds = fellowships.map((f) => f.id as string);

  let q = supabase
    .from("meetings")
    .select(
      "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug"
    )
    .in("fellowship_id", fellowshipIds)
    .limit(6);

  if (intent.location) q = q.ilike("city", `%${intent.location}%`);

  const { data } = await q;

  // Retry without location if location filter returned nothing
  if (!data?.length && intent.location) {
    const { data: fallback } = await supabase
      .from("meetings")
      .select(
        "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug"
      )
      .in("fellowship_id", fellowshipIds)
      .limit(6);

    return (fallback ?? []).map((m) => toMeeting(m, idToFellowship));
  }

  return (data ?? []).map((m) => toMeeting(m, idToFellowship));
}

function toMeeting(
  m: Record<string, unknown>,
  idToFellowship: Record<string, { name: string; slug: string }>
): MeetingResult {
  const fid = m.fellowship_id as string;
  return {
    id: m.id as string,
    name: m.name as string,
    fellowship_name: idToFellowship[fid]?.name ?? "",
    fellowship_slug: idToFellowship[fid]?.slug ?? "",
    city: (m.city as string) ?? null,
    state: (m.state as string) ?? null,
    format: (m.format as string) ?? null,
    day_of_week: (m.day_of_week as string) ?? null,
    start_time: (m.start_time as string) ?? null,
    meeting_url: (m.meeting_url as string) ?? null,
    slug: (m.slug as string) ?? null,
  };
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

  if (intent.location) q = q.ilike("city", `%${intent.location}%`);

  const { data } = await q;

  if (!data?.length && intent.location) {
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

type SearchContext = "home" | "resources" | "directory" | "member";

const CONTEXT_LIMITS: Record<
  SearchContext,
  { meetings: number; facilities: number; articles: number; skipMeetings: boolean; skipFacilities: boolean }
> = {
  home:      { meetings: 6, facilities: 5, articles: 4, skipMeetings: false, skipFacilities: false },
  resources: { meetings: 0, facilities: 0, articles: 8, skipMeetings: true,  skipFacilities: true  },
  directory: { meetings: 6, facilities: 5, articles: 2, skipMeetings: false, skipFacilities: false },
  member:    { meetings: 4, facilities: 0, articles: 5, skipMeetings: false, skipFacilities: true  },
};

async function fetchArticles(
  intent: SearchIntent,
  context: SearchContext
): Promise<ArticleResult[]> {
  const pillarsByIssue: Record<string, string[]> = {
    alcohol:          ["getting_help", "understanding", "supporting", "sober_lifestyle"],
    opioids:          ["understanding", "getting_help"],
    gambling:         ["understanding", "supporting"],
    eating_disorder:  ["understanding"],
    meth:             ["understanding", "getting_help"],
    cocaine:          ["understanding", "getting_help"],
    marijuana:        ["understanding"],
    nicotine:         ["understanding"],
    sex_addiction:    ["understanding"],
    debt:             ["understanding"],
    internet_gaming:  ["understanding"],
    work:             ["understanding"],
    family_support:   ["supporting"],
    general:          ["getting_help", "supporting", "understanding"],
  };

  const base = pillarsByIssue[intent.issue] ?? ["getting_help", "understanding"];

  // member context: surface lifestyle/recovery-focused content first
  const memberPillars = ["sober_lifestyle", "supporting", ...base.filter(
    (p) => p !== "sober_lifestyle" && p !== "supporting"
  )];

  const ordered =
    context === "member"
      ? memberPillars
      : intent.who === "loved_one"
      ? ["supporting", ...base.filter((p) => p !== "supporting")]
      : base;

  const limit = CONTEXT_LIMITS[context].articles;

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar")
    .eq("is_published", true)
    .in("pillar", ordered)
    .limit(limit);

  return (data ?? []) as ArticleResult[];
}

// ─── Keyword fallback ─────────────────────────────────────────────────────────

async function keywordSearch(q: string): Promise<SmartSearchResponse> {
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (!terms.length) return emptyResponse(q);

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, author, body, pillar")
    .eq("is_published", true);

  const articles = (data ?? [])
    .map((a) => ({
      a,
      score: terms.filter((t) =>
        [a.title, a.excerpt, a.pillar, a.author]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(t)
      ).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8)
    .map(({ a }) => a as ArticleResult);

  return {
    query: q,
    intent: null,
    meetings: [],
    facilities: [],
    articles,
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

function err429(message: string, retryAfter: number) {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const context = (searchParams.get("context") ?? "home") as SearchContext;

  // 1. Input validation & sanitisation (always, before anything else)
  const q = sanitize(rawQuery);
  if (q.length < 2) {
    return Response.json(emptyResponse(q));
  }

  // 2. Cache check — context is part of the key so different contexts get distinct results.
  //    Return before auth/rate-limit: cached hits don't call the AI.
  const cacheKey = `${context}:${q.toLowerCase().slice(0, 150)}`;
  const cached = queryCache.get(cacheKey);
  const ttl = isCommonQuery(q) ? CACHE_TTL_COMMON_MS : CACHE_TTL_MS;
  if (cached && Date.now() - cached.ts < ttl) {
    return Response.json({ ...cached.data, cached: true });
  }

  // 3. Auth check — determine caller identity
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  // 4. CSRF validation for unauthenticated callers
  //    Authenticated users: valid Supabase session is sufficient proof of origin.
  //    Unauthenticated users: must present the double-submit CSRF token.
  if (!user) {
    const csrfHeader = request.headers.get("x-csrf-token") ?? "";
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get("__sa_csrf")?.value ?? "";

    if (
      !csrfHeader ||
      !csrfCookie ||
      csrfHeader.length < 10 ||
      csrfHeader !== csrfCookie
    ) {
      return Response.json({ error: "Invalid request" }, { status: 403 });
    }
  }

  // 5. Rate limiting
  //    Auth users are identified by user.id; anon users by IP.
  //    Both are subject to the per-3-second throttle and per-day cap.
  const identifier = user ? user.id : getIp(request);
  const isAuth = !!user;
  const rateCheck = checkRateLimit(identifier, isAuth);
  if (!rateCheck.ok) {
    return err429(rateCheck.message, rateCheck.retryAfter ?? 3);
  }

  // 6. Record before calling AI (prevents races from concurrent requests)
  recordRequest(identifier);

  // 7. Keyword fallback if no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = await keywordSearch(q);
    return Response.json(result);
  }

  // 8. AI classification
  const intent = await classifyIntent(q, context);
  if (!intent) {
    const result = await keywordSearch(q);
    return Response.json(result);
  }

  // 9. Parallel DB queries driven by intent + context limits
  const limits = CONTEXT_LIMITS[context];
  const [meetings, facilities, articles] = await Promise.all([
    !limits.skipMeetings && intent.fellowship_slugs.length > 0
      ? fetchMeetings(intent)
      : Promise.resolve([] as MeetingResult[]),
    !limits.skipFacilities && intent.facility_types.length > 0
      ? fetchFacilities(intent)
      : Promise.resolve([] as FacilityResult[]),
    fetchArticles(intent, context),
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

  // 10. Write to cache with appropriate TTL
  if (queryCache.size >= MAX_CACHE_SIZE) {
    queryCache.delete(queryCache.keys().next().value!);
  }
  queryCache.set(cacheKey, { data: result, ts: Date.now() });

  return Response.json(result);
}
