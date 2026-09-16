import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import type {
  SearchIntent,
  FacilityResult,
  ArticleResult,
  SmartSearchResponse,
} from "@/lib/resources";

// ─── In-memory stores (best-effort; reset on cold start) ─────────────────────

const queryCache = new Map<string, { data: SmartSearchResponse; ts: number }>();
const CACHE_TTL_MS        = 10 * 60 * 1000;
const CACHE_TTL_COMMON_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

const lastAiRequest = new Map<string, number>();
const dailyCounts   = new Map<string, number>();

const AI_THROTTLE_MS = 3_000;
const MAX_DAILY_AUTH = 50;
const MAX_DAILY_ANON = 10;

// Common facility-search patterns get a longer cache TTL.
const COMMON_PATTERNS = [
  /\brehab\b/i,
  /\bdetox\b/i,
  /\bsober\s+living\b/i,
];

function isCommonQuery(q: string): boolean {
  return COMMON_PATTERNS.some((p) => p.test(q));
}

// ─── Input sanitisation ───────────────────────────────────────────────────────

function sanitize(raw: string): string {
  return raw
    .slice(0, 200)
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkRateLimit(identifier: string, isAuth: boolean): { ok: boolean; message: string; retryAfter?: number } {
  const last = lastAiRequest.get(identifier) ?? 0;
  const sinceLast = Date.now() - last;
  if (sinceLast < AI_THROTTLE_MS) {
    const wait = Math.ceil((AI_THROTTLE_MS - sinceLast) / 1000);
    return { ok: false, message: "Please wait a moment before searching again.", retryAfter: wait };
  }
  const dayKey = `${today()}:${identifier}`;
  const count  = dailyCounts.get(dayKey) ?? 0;
  const limit  = isAuth ? MAX_DAILY_AUTH : MAX_DAILY_ANON;
  if (count >= limit) {
    return { ok: false, message: `Daily search limit reached (${limit}/day). Try again tomorrow.`, retryAfter: 86400 };
  }
  return { ok: true, message: "" };
}

function recordRequest(identifier: string): void {
  lastAiRequest.set(identifier, Date.now());
  const dayKey = `${today()}:${identifier}`;
  dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);
  const todayStr = today();
  for (const key of dailyCounts.keys()) {
    if (!key.startsWith(todayStr)) dailyCounts.delete(key);
  }
}

function getIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// ─── Claude classification ────────────────────────────────────────────────────

/** Returns the current wall-clock time in the America/Los_Angeles timezone. */
function getPSTDate(): Date {
  // toLocaleString with a timezone produces a string that, when parsed,
  // gives a Date whose getHours/getDay/etc. reflect that timezone.
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;

function buildSystemPrompt(nowPST: Date): string {
  const dayName   = DOW[nowPST.getDay()];
  const month     = nowPST.toLocaleString("en-US", { month: "long" });
  const dateStr   = `${dayName}, ${month} ${nowPST.getDate()}, ${nowPST.getFullYear()}`;
  const h         = nowPST.getHours();
  const min       = nowPST.getMinutes().toString().padStart(2, "0");
  const ampm      = h >= 12 ? "PM" : "AM";
  const timeStr   = `${h % 12 || 12}:${min} ${ampm} PST`;

  return `You are a recovery resource classifier for SoberAnchor.com, a comprehensive addiction recovery directory.

Today is ${dateStr}. The current time is ${timeStr}. Use this for any time-sensitive context.

Given a user's natural-language query, classify their intent and return ONLY a JSON object with these exact fields:

{
  "who": "self" | "loved_one" | "professional",
  "issue": string,
  "help_type": string[],
  "location": string | null,
  "urgency": "low" | "moderate" | "high",
  "include_crisis": boolean,
  "facility_types": string[],
  "query_intent": "meeting_search" | "informational" | "facility_search" | "step_work" | "crisis",
  "name_keywords": string[],
  "payment_types": string[],
  "care_levels": string[],
  "special_populations": string[]
}

query_intent rules:
- "meeting_search": user wants to find in-person/online recovery meetings ("AA meetings near me", "meetings today", "NA meetings Saturday"). SoberAnchor does not host a meeting directory — the UI hands these queries off to fellowship meeting finders.
- "informational": user is asking a general question about recovery ("what happens at a first AA meeting", "how does NA work", "what is a sponsor", "what should I expect") — for this intent, prioritize articles/resources
- "facility_search": user wants treatment centers, sober living, therapists, outpatient programs
- "step_work": user is asking about step work, a specific step, or recovery concepts related to working a program ("what does powerlessness mean", "how do I do a moral inventory", "what is step 4 about", "working step 9", "amends list", "searching and fearless", "step 1", "step work help", "I'm on step 3") — will search program_workbooks for relevant sections
- "crisis": user is in distress (want to die, can't go on, relapsed and scared, emergency, overdose, suicide)

Field rules:
- "issue": one of: alcohol, opioids, gambling, eating_disorder, meth, cocaine, marijuana, nicotine, sex_addiction, debt, internet_gaming, work, family_support, general
- "help_type": array of: meetings, treatment, sober_living, therapist, information, crisis, family_meetings
- "facility_types": array of: treatment, sober_living, therapist, venue, outpatient
- "name_keywords": if the user appears to be looking for a specific place by name, extract the distinctive name words (not generic words like "center"/"rehab"). Examples: "serenity ranch rehab" → ["serenity"]; "sunrise detox" → ["sunrise"]; "detox in Texas" → []. Leave [] for general searches with no specific name.
- "payment_types": array of normalized payment tokens the user mentions for a treatment center. Map: medicaid → "medicaid"; medicare → "medicare"; private insurance/BCBS/blue cross/aetna/cigna/united/"my insurance"/"take my insurance" → "private_insurance"; self pay/cash/out of pocket/private pay/no insurance → "self_pay"; tricare/military/VA insurance → "military". [] if none mentioned.
- "care_levels": array of normalized level-of-care tokens for a treatment center. Map: detox/detoxification/withdrawal/"medically supervised withdrawal" → "detox"; residential/"live-in"/"stay overnight" → "residential"; inpatient/hospital → "inpatient"; outpatient/OP → "outpatient"; IOP/"intensive outpatient" → "iop"; PHP/"partial hospitalization"/"day program" → "php". [] if none mentioned.
- "special_populations": array of normalized population tokens for a treatment center. Map: veterans/vets → "veterans"; men/male/"men's" → "men"; women/female/"women's"/pregnant → "women"; "young adults"/youth/teens/"college age" → "young_adult"; seniors/"older adults"/elderly → "seniors"; "dual diagnosis"/"co-occurring"/"mental health" → "co_occurring"; trauma/PTSD/abuse survivors → "trauma". [] if none mentioned.

Inference rules:
- Treatment/rehab/detox language → facility_types includes "treatment"
- Sober house/halfway/sober living → facility_types includes "sober_living"
- Counselor/therapist/therapy → facility_types includes "therapist"
- Crisis language (want to die, can't go on, overdose, emergency, suicide) → urgency="high", include_crisis=true, query_intent="crisis"
- Any query mentioning treatment, rehab, detox, facility, center, sober living → always populate facility_types

SYNONYM MAP — map colloquial user language to exact DB values:

FACILITY TYPES → populate facility_types[]:
rehab/rehabilitation/treatment center/inpatient/residential/detox → "treatment"
sober living/sober house/halfway house/recovery housing/oxford house → "sober_living"
therapist/counselor/therapy/counseling/psychologist/LCSW/MFT/addiction counselor → "therapist"
outpatient/IOP/intensive outpatient/PHP/partial hospitalization/day program → "outpatient"
meeting hall/venue/meeting space/club/alano club/recovery club → "venue"

CRISIS LANGUAGE → set query_intent="crisis", urgency="high", include_crisis=true:
suicidal/want to die/kill myself/hurting myself/self-harm
overdose/relapsed right now/using right now/about to use
need help now/urgent/emergency/can't go on/crisis

STEP WORK LANGUAGE → set query_intent="step_work":
step work/working steps/12 steps/step 1 through step 12
moral inventory/resentments/amends/powerlessness
sponsor/sponsorship/find a sponsor/need a sponsor
big book/basic text/literature/program book (when asking for content, not a meeting)
CBA/cost benefit analysis (SMART Recovery)
laundry list/14 traits (ACA)
three circles/inner circle (SAA)
hurts habits hangups/8 principles (Celebrate Recovery)
detachment/detach with love/three Cs (Al-Anon)

Return ONLY the JSON object, no explanation or markdown.`;
}

type SearchContext = "home" | "resources" | "directory" | "member";

const CONTEXT_HINTS: Record<SearchContext, string> = {
  home:      "General search from the homepage.",
  resources: "User is browsing articles and guides — prioritise information over directories.",
  directory: "User is in the Find directory — prioritise treatment centers, sober living, and therapists.",
  member:    "User is in their personal recovery dashboard — they may be asking about step work, sponsor relationships, or daily recovery practices.",
};

async function classifyIntent(query: string, context: SearchContext, nowPST: Date): Promise<SearchIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: buildSystemPrompt(nowPST),
      messages: [{ role: "user", content: `[Context: ${CONTEXT_HINTS[context]}]\n\nQuery: ${query}` }],
    });

    const text  = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(clean) as SearchIntent;
    // Ensure query_intent always has a value (graceful fallback for older cached responses)
    if (!parsed.query_intent) {
      const q = query.toLowerCase();
      parsed.query_intent = /\bstep\s*\d+|\bstep work\b|\binventory\b|\bamends?\b|\bpowerless/i.test(q)
        ? "step_work"
        : "meeting_search";
    }
    return parsed;
  } catch {
    return null;
  }
}

// ─── Context limits ───────────────────────────────────────────────────────────

const CONTEXT_LIMITS: Record<SearchContext, { facilities: number; articles: number; skipFacilities: boolean }> = {
  home:      { facilities: 5, articles: 4, skipFacilities: false },
  resources: { facilities: 0, articles: 8, skipFacilities: true  },
  directory: { facilities: 6, articles: 2, skipFacilities: false },
  member:    { facilities: 2, articles: 5, skipFacilities: false },
};

// ─── Facility facet mapping ───────────────────────────────────────────────────
// facilities.state stores 2-letter codes, and the enriched SAMHSA service_detail
// JSONB holds payment, level-of-care, and population facts. These tables translate
// the classifier's normalized tokens into exact DB values so search actually filters.

// US state name / abbreviation → 2-letter code
const US_STATES: Record<string, string> = {
  alabama:"AL", alaska:"AK", arizona:"AZ", arkansas:"AR", california:"CA",
  colorado:"CO", connecticut:"CT", delaware:"DE", "district of columbia":"DC",
  florida:"FL", georgia:"GA", hawaii:"HI", idaho:"ID", illinois:"IL",
  indiana:"IN", iowa:"IA", kansas:"KS", kentucky:"KY", louisiana:"LA",
  maine:"ME", maryland:"MD", massachusetts:"MA", michigan:"MI", minnesota:"MN",
  mississippi:"MS", missouri:"MO", montana:"MT", nebraska:"NE", nevada:"NV",
  "new hampshire":"NH", "new jersey":"NJ", "new mexico":"NM", "new york":"NY",
  "north carolina":"NC", "north dakota":"ND", ohio:"OH", oklahoma:"OK",
  oregon:"OR", pennsylvania:"PA", "rhode island":"RI", "south carolina":"SC",
  "south dakota":"SD", tennessee:"TN", texas:"TX", utah:"UT", vermont:"VT",
  virginia:"VA", washington:"WA", "west virginia":"WV", wisconsin:"WI",
  wyoming:"WY", "puerto rico":"PR", "washington dc":"DC", "d.c.":"DC",
};
const STATE_ABBRS = new Set(Object.values(US_STATES));

type ResolvedLocation = { state: string | null; city: string | null };

/**
 * Resolve free-text location into a state code and/or city. "Texas"/"TX" → state,
 * "Austin" → city, "Austin, TX" → both. This fixes the old city-only match that
 * silently missed every state-name search.
 */
function resolveLocation(loc: string | null): ResolvedLocation {
  if (!loc) return { state: null, city: null };
  const raw = loc.trim();
  if (!raw) return { state: null, city: null };

  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const st = US_STATES[parts[1].toLowerCase()]
      ?? (STATE_ABBRS.has(parts[1].toUpperCase()) ? parts[1].toUpperCase() : null);
    return { state: st, city: parts[0] };
  }

  const lower = raw.toLowerCase();
  if (US_STATES[lower]) return { state: US_STATES[lower], city: null };
  if (raw.length === 2 && STATE_ABBRS.has(raw.toUpperCase())) return { state: raw.toUpperCase(), city: null };
  return { state: null, city: raw };
}

// normalized care_level token → exact service_detail value (TC = Type of Care, SET = Service Setting)
const CARE_LEVEL_MATCH: Record<string, { key: string; value: string }> = {
  detox:       { key: "TC",  value: "Detoxification" },
  residential: { key: "SET", value: "Residential/24-hour residential" },
  inpatient:   { key: "SET", value: "Hospital inpatient/24-hour hospital inpatient" },
  outpatient:  { key: "SET", value: "Outpatient" },
  iop:         { key: "SET", value: "Intensive outpatient treatment" },
  php:         { key: "SET", value: "Outpatient day treatment or partial hospitalization" },
};

// normalized payment token → exact service_detail PAY value
const PAYMENT_MATCH: Record<string, string> = {
  medicaid:          "Medicaid",
  medicare:          "Medicare",
  private_insurance: "Private health insurance",
  self_pay:          "Cash or self-payment",
  military:          "Federal military insurance (e.g., TRICARE)",
};

// normalized population token → exact service_detail SG value
const POPULATION_MATCH: Record<string, string> = {
  veterans:     "Veterans",
  men:          "Adult men",
  women:        "Adult women",
  young_adult:  "Young adults",
  seniors:      "Seniors or older adults",
  co_occurring: "Clients with co-occurring mental and substance use disorders",
  trauma:       "Clients who have experienced trauma",
};

/**
 * Build a jsonb containment object for `service_detail` from the classifier's
 * facet tokens. Different SAMHSA keys are AND-ed (facility must have all).
 * Returns null when no facet was requested.
 */
function buildServiceContainment(intent: SearchIntent): Record<string, { values: string[] }> | null {
  const acc: Record<string, string[]> = {};
  const add = (key: string, val: string) => {
    (acc[key] ??= []);
    if (!acc[key].includes(val)) acc[key].push(val);
  };

  for (const t of intent.care_levels ?? [])         { const m = CARE_LEVEL_MATCH[t]; if (m) add(m.key, m.value); }
  for (const t of intent.payment_types ?? [])       { const v = PAYMENT_MATCH[t];    if (v) add("PAY", v); }
  for (const t of intent.special_populations ?? []) { const v = POPULATION_MATCH[t]; if (v) add("SG", v); }

  const keys = Object.keys(acc);
  if (!keys.length) return null;
  const out: Record<string, { values: string[] }> = {};
  for (const k of keys) out[k] = { values: acc[k] };
  return out;
}

async function queryFacilities(
  types: string[],
  loc: ResolvedLocation,
  limit: number,
  nameKeywords?: string[] | null,
  serviceContainment?: Record<string, { values: string[] }> | null,
): Promise<FacilityResult[]> {
  // Need at least a type filter or a name keyword to run a meaningful query
  if (!types.length && !nameKeywords?.length) return [];

  const FACILITY_SELECT = "id, name, facility_type, city, state, phone, website, accepts_insurance, slug, is_verified, is_featured";

  function facilityNameOrFilter(keywords: string[]): string {
    return keywords.map((kw) => `name.ilike.%${kw.replace(/%/g, "")}%`).join(",");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("facilities").select(FACILITY_SELECT)
    .order("is_verified",  { ascending: false })
    .order("name")
    .limit(limit);

  if (types.length)          q = q.in("facility_type", types);
  if (loc.state)             q = q.eq("state", loc.state);
  if (loc.city)              q = q.ilike("city", `%${loc.city}%`);
  if (nameKeywords?.length)  q = q.or(facilityNameOrFilter(nameKeywords));
  if (serviceContainment)    q = q.contains("service_detail", serviceContainment);

  const { data } = await q;

  // NOTE: intentionally NO silent location/facet fallback. If the filters match
  // nothing, an empty result is the honest answer ("no centers match these
  // filters") — the UI should offer to relax a filter rather than us quietly
  // returning an unrelated, unfiltered list.
  return (data ?? []) as FacilityResult[];
}

// ─── AI-path DB fetchers ──────────────────────────────────────────────────────

async function fetchFacilities(intent: SearchIntent, limit: number): Promise<FacilityResult[]> {
  // Use classified types; fall back to help_type-inferred types
  let types = intent.facility_types;
  if (!types.length) {
    const inferred: string[] = [];
    if (intent.help_type.includes("treatment"))   inferred.push("treatment");
    if (intent.help_type.includes("sober_living")) inferred.push("sober_living");
    if (intent.help_type.includes("therapist"))    inferred.push("therapist");
    types = inferred;
  }

  const nameKeywords = intent.name_keywords?.length ? intent.name_keywords : null;
  const loc = resolveLocation(intent.location);
  const serviceContainment = buildServiceContainment(intent);
  return queryFacilities(types, loc, limit, nameKeywords, serviceContainment);
}

async function fetchArticles(intent: SearchIntent, context: SearchContext): Promise<ArticleResult[]> {
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

  const memberPillars = ["sober_lifestyle", "supporting", ...base.filter((p) => p !== "sober_lifestyle" && p !== "supporting")];
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

// ─── Step work fetcher ────────────────────────────────────────────────────────

const STEP_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function extractStepNumber(query: string): number | null {
  const m = query.match(/\bstep\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!isNaN(n)) return n >= 1 && n <= 12 ? n : null;
  return STEP_WORDS[m[1].toLowerCase()] ?? null;
}

async function fetchStepWork(
  query: string,
  fellowshipId: string | null,
  limit: number,
): Promise<import("@/lib/resources").StepWorkResult[]> {
  type WorkbookRow = {
    id: string; title: string; slug: string; step_number: number;
    description: string | null; fellowship_id: string; prompts: unknown;
  };

  let q = supabase
    .from("program_workbooks")
    .select("id, title, slug, step_number, description, fellowship_id, prompts")
    .eq("is_active", true)
    .order("sort_order");

  if (fellowshipId) q = q.eq("fellowship_id", fellowshipId);

  const stepNum = extractStepNumber(query);
  if (stepNum !== null) q = q.eq("step_number", stepNum);

  const { data: workbooks } = await q.limit(60) as { data: WorkbookRow[] | null };
  if (!workbooks?.length) return [];

  // Fetch fellowship abbreviations for display
  const fids = [...new Set(workbooks.map((w) => w.fellowship_id).filter(Boolean))];
  const fellowshipNames: Record<string, string> = {};
  if (fids.length) {
    const { data: fws } = await supabase
      .from("fellowships").select("id, name, abbreviation").in("id", fids);
    for (const f of fws ?? []) {
      fellowshipNames[f.id as string] = (f.abbreviation ?? f.name) as string;
    }
  }

  // Score by keyword relevance against title + description
  const STOP = /\b(step|work|what|how|do|i|a|an|the|is|are|about|does|mean|in|on|my|to|be|it|at|by|or|of|for|and|this|that|which|with|have|from)\b/gi;
  const terms = query.replace(STOP, " ").toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = workbooks.map((w) => {
    const text = [w.title, w.description].filter(Boolean).join(" ").toLowerCase();
    const score = terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
    return { w, score };
  });

  // When step number matched, all workbooks for that step are relevant; otherwise filter by score
  const relevant = stepNum !== null ? scored : scored.filter((s) => s.score > 0);
  relevant.sort((a, b) => b.score - a.score || a.w.step_number - b.w.step_number);

  return relevant.slice(0, limit).map(({ w }) => ({
    id: w.id,
    title: w.title,
    slug: w.slug,
    step_number: w.step_number,
    description: w.description ?? null,
    fellowship_name: fellowshipNames[w.fellowship_id] ?? null,
    prompt_count: Array.isArray(w.prompts) ? (w.prompts as unknown[]).length : 0,
  }));
}

// ─── Keyword fallback (no AI key or classification failure) ───────────────────
// Searches facilities and articles using simple term matching.

const FACILITY_KEYWORD_MAP: [RegExp, string[]][] = [
  [/\btreatment\b|\brehab\b|\brehabilitation\b|\binpatient\b|\bdetox\b/i, ["treatment"]],
  [/\bsober\s+living\b|\bhalfway\s+house\b|\bsober\s+house\b/i,          ["sober_living"]],
  [/\btherapist\b|\bcounselor\b|\btherapy\b|\bcounseling\b/i,            ["therapist"]],
  [/\boutpatient\b|\biop\b|\bintensive\s+outpatient\b/i,                 ["outpatient"]],
  [/\bsober\s+bar\b|\balcohol.free\s+bar\b|\bsober\s+venue\b/i,          ["venue"]],
];

function detectLocation(q: string): string | null {
  // Match "in [Location]" or "near [Location]" patterns
  const m = q.match(/\b(?:in|near)\s+([A-Za-z][A-Za-z\s]{1,30}?)(?=\s*(?:$|[,\.?!]|\s+(?:and|or|for|that|with|where)))/i);
  return m?.[1]?.trim() ?? null;
}

async function keywordSearch(q: string, context: SearchContext): Promise<SmartSearchResponse> {
  const limits = CONTEXT_LIMITS[context];

  // Detect which facility types and location are in the query
  const mentionedTypes: string[] = [];
  for (const [pattern, types] of FACILITY_KEYWORD_MAP) {
    if (pattern.test(q)) mentionedTypes.push(...types);
  }

  const wantsFacilities = !limits.skipFacilities && mentionedTypes.length > 0;
  const typesUniq    = [...new Set(mentionedTypes)];

  const location = detectLocation(q);

  // Keyword scoring for articles
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const [facilities, articleData] = await Promise.all([
    wantsFacilities ? queryFacilities(typesUniq, resolveLocation(location), limits.facilities || 5) : Promise.resolve([] as FacilityResult[]),
    terms.length > 0
      ? supabase.from("articles").select("id, title, slug, excerpt, author, body, pillar").eq("is_published", true)
      : Promise.resolve({ data: null }),
  ]);

  const articles = terms.length > 0
    ? ((articleData as { data: unknown[] | null }).data ?? [])
        .map((a) => {
          const row = a as Record<string, unknown>;
          return {
            a: row,
            score: terms.filter((t) =>
              [row.title, row.excerpt, row.pillar, row.author].filter(Boolean).join(" ").toLowerCase().includes(t)
            ).length,
          };
        })
        .filter(({ score }) => score > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, limits.articles || 8)
        .map(({ a }) => a as ArticleResult)
    : [];

  return { query: q, intent: null, facilities, articles, step_work_results: [], crisis: false, ai_powered: false };
}

function emptyResponse(query: string): SmartSearchResponse {
  return { query, intent: null, facilities: [], articles: [], step_work_results: [], crisis: false, ai_powered: false };
}

function err429(message: string, retryAfter: number) {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

// ─── Route handler ────────────────────────────────────────────────────────────

function errorResponse(query: string, message = "Search unavailable. Please try again."): Response {
  return Response.json(
    { query, intent: null, facilities: [], articles: [], step_work_results: [], crisis: false, ai_powered: false, error: message },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const rawContext = searchParams.get("context") ?? "home";
  const context  = (rawContext in CONTEXT_LIMITS ? rawContext : "home") as SearchContext;

  try {
    return await handleSearch(request, rawQuery, context);
  } catch (err) {
    console.error("[smart-search] Unhandled error:", err);
    return errorResponse(sanitize(rawQuery));
  }
}

async function handleSearch(request: Request, rawQuery: string, context: SearchContext): Promise<Response> {
  // 1. Sanitise
  const q = sanitize(rawQuery);
  if (q.length < 2) return Response.json(emptyResponse(q));

  // 2. Cache (before auth/rate-limit — cached results don't hit the AI)
  const nowPST    = getPSTDate();
  const cacheKey  = `${context}:${q.toLowerCase().slice(0, 150)}`;
  const cached    = queryCache.get(cacheKey);
  const ttl      = isCommonQuery(q) ? CACHE_TTL_COMMON_MS : CACHE_TTL_MS;
  if (cached && Date.now() - cached.ts < ttl) {
    return Response.json({ ...cached.data, cached: true });
  }

  // 3. Auth
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  // 4. CSRF (anon only — authenticated session is sufficient proof of origin)
  if (!user) {
    const csrfHeader = request.headers.get("x-csrf-token") ?? "";
    const cookieStore = await cookies();
    const csrfCookie  = cookieStore.get("__sa_csrf")?.value ?? "";
    if (!csrfHeader || !csrfCookie || csrfHeader.length < 10 || csrfHeader !== csrfCookie) {
      return Response.json({ error: "Invalid request" }, { status: 403 });
    }
  }

  // 5. Rate limit
  const identifier = user ? user.id : getIp(request);
  const rateCheck  = checkRateLimit(identifier, !!user);
  if (!rateCheck.ok) return err429(rateCheck.message, rateCheck.retryAfter ?? 3);

  // 6. Record usage
  recordRequest(identifier);

  // 7. Keyword fallback when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = await keywordSearch(q, context);
    return Response.json(result);
  }

  // 8. AI classification
  const intent = await classifyIntent(q, context, nowPST);
  console.log("[smart-search] Haiku intent:", JSON.stringify(intent));
  if (!intent) {
    // Classification failed — fall back to keyword search across all tables
    const result = await keywordSearch(q, context);
    return Response.json(result);
  }

  // 9. Decide which tables to query
  const limits = CONTEXT_LIMITS[context];
  const isInformational = intent.query_intent === "informational";
  const isStepWork      = intent.query_intent === "step_work";

  // Informational and step_work queries → suppress directory results.
  // meeting_search returns no directory results either — the UI hands those off
  // to fellowship meeting finders (see ODI-57).
  const wantsFacilities = !limits.skipFacilities && !isInformational && !isStepWork && (
    intent.facility_types.length > 0 ||
    intent.help_type.some((h) => ["treatment", "sober_living", "therapist"].includes(h))
  );

  // For step_work intent: get user's primary fellowship to scope workbook results
  let userFellowshipId: string | null = null;
  if (isStepWork && user) {
    const { data: primaryM } = await supabaseServer
      .from("sobriety_milestones")
      .select("fellowship_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle();
    userFellowshipId = (primaryM as { fellowship_id?: string | null } | null)?.fellowship_id ?? null;

    // Fallback: any milestone with a fellowship
    if (!userFellowshipId) {
      const { data: anyM } = await supabaseServer
        .from("sobriety_milestones")
        .select("fellowship_id")
        .eq("user_id", user.id)
        .not("fellowship_id", "is", null)
        .limit(1)
        .maybeSingle();
      userFellowshipId = (anyM as { fellowship_id?: string | null } | null)?.fellowship_id ?? null;
    }
  }

  // 10. Parallel DB queries
  const [facilities, articles, step_work_results] = await Promise.all([
    wantsFacilities ? fetchFacilities(intent, limits.facilities) : Promise.resolve([] as FacilityResult[]),
    fetchArticles(intent, context),
    isStepWork ? fetchStepWork(q, userFellowshipId, 5) : Promise.resolve([] as import("@/lib/resources").StepWorkResult[]),
  ]);

  const result: SmartSearchResponse = {
    query: q,
    intent,
    facilities,
    articles,
    step_work_results,
    crisis: intent.include_crisis || intent.urgency === "high",
    ai_powered: true,
  };

  // 11. Cache result
  if (queryCache.size >= MAX_CACHE_SIZE) {
    queryCache.delete(queryCache.keys().next().value!);
  }
  queryCache.set(cacheKey, { data: result, ts: Date.now() });

  return Response.json(result);
}
