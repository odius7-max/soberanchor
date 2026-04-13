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

const queryCache = new Map<string, { data: SmartSearchResponse; ts: number }>();
const CACHE_TTL_MS        = 10 * 60 * 1000;
const CACHE_TTL_COMMON_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

const lastAiRequest = new Map<string, number>();
const dailyCounts   = new Map<string, number>();

const AI_THROTTLE_MS = 3_000;
const MAX_DAILY_AUTH = 50;
const MAX_DAILY_ANON = 10;

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

// ─── Issue → fellowship defaults (used when Haiku doesn't classify slugs) ────

const ISSUE_FELLOWSHIP_MAP: Record<string, string[]> = {
  alcohol:         ["aa", "al-anon"],
  opioids:         ["na", "nar-anon"],
  gambling:        ["ga", "gam-anon"],
  eating_disorder: ["oa", "fa"],
  meth:            ["na", "cma"],
  cocaine:         ["na", "ca"],
  marijuana:       ["na", "ma"],
  nicotine:        ["nicotine-anonymous"],
  sex_addiction:   ["saa", "sa"],
  debt:            ["da"],
  internet_gaming: ["itaa", "cgaa"],
  work:            ["aa"],
  family_support:  ["al-anon", "nar-anon", "gam-anon"],
  general:         ["aa", "na"],
};

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

/**
 * Detects whether a query is asking about today/now/near-me and returns
 * the matching day-of-week string (e.g. "Monday") or null.
 * Also handles explicit day names ("AA meetings Saturday").
 */
function detectDayFilter(query: string, nowPST: Date): string | null {
  if (/\b(today|tonight|this morning|this afternoon|this evening|right now|near me|nearby|close to me)\b/i.test(query)) {
    return DOW[nowPST.getDay()];
  }
  const m = query.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return null;
}

function buildSystemPrompt(nowPST: Date): string {
  const dayName   = DOW[nowPST.getDay()];
  const month     = nowPST.toLocaleString("en-US", { month: "long" });
  const dateStr   = `${dayName}, ${month} ${nowPST.getDate()}, ${nowPST.getFullYear()}`;
  const h         = nowPST.getHours();
  const min       = nowPST.getMinutes().toString().padStart(2, "0");
  const ampm      = h >= 12 ? "PM" : "AM";
  const timeStr   = `${h % 12 || 12}:${min} ${ampm} PST`;

  return `You are a recovery resource classifier for SoberAnchor.com, a comprehensive addiction recovery directory.

Today is ${dateStr}. The current time is ${timeStr}. When users ask for meetings today, this week, or near me, use this date to filter results by day of week. If no time context is given, show meetings for today first, then upcoming days.

Given a user's natural-language query, classify their intent and return ONLY a JSON object with these exact fields:

{
  "who": "self" | "loved_one" | "professional",
  "issue": string,
  "help_type": string[],
  "location": string | null,
  "urgency": "low" | "moderate" | "high",
  "include_crisis": boolean,
  "fellowship_slugs": string[],
  "facility_types": string[],
  "query_intent": "meeting_search" | "informational" | "facility_search" | "step_work" | "crisis",
  "name_keywords": string[],
  "meeting_types": string[],
  "meeting_languages": string[],
  "meeting_access": string
}

query_intent rules:
- "meeting_search": user wants to find specific meetings ("AA meetings near me", "meetings today", "NA meetings Saturday")
- "informational": user is asking a general question about recovery ("what happens at a first AA meeting", "how does NA work", "what is a sponsor", "what should I expect") — for this intent, prioritize articles/resources and suppress meeting listings
- "facility_search": user wants treatment centers, sober living, therapists, outpatient programs
- "step_work": user is asking about step work, a specific step, or recovery concepts related to working a program ("what does powerlessness mean", "how do I do a moral inventory", "what is step 4 about", "working step 9", "amends list", "searching and fearless", "step 1", "step work help", "I'm on step 3") — will search program_workbooks for relevant sections
- "crisis": user is in distress (want to die, can't go on, relapsed and scared, emergency, overdose, suicide)

Field rules:
- "issue": one of: alcohol, opioids, gambling, eating_disorder, meth, cocaine, marijuana, nicotine, sex_addiction, debt, internet_gaming, work, family_support, general
- "help_type": array of: meetings, treatment, sober_living, therapist, information, crisis, family_meetings
- "fellowship_slugs": choose from: aa, na, al-anon, alateen, smart-recovery, ga, gam-anon, oa, fa, eda, aba, ca, cma, ma, sa, saa, cosa, s-anon, da, itaa, cgaa, nicotine-anonymous, nar-anon, celebrate-recovery, lifering, pills-anonymous, heroin-anonymous, refuge-recovery, aca, families-anonymous
- "facility_types": array of: treatment, sober_living, therapist, venue, outpatient
- "name_keywords": if the user appears to be looking for a specific meeting or place by name, extract the distinctive name words (not fellowship names, not generic words like "meeting"/"group"/"anonymous"). Examples: "find the village meeting" → ["village"]; "serenity group AA" → ["serenity"]; "lighthouse NA meeting" → ["lighthouse"]; "AA meetings near me" → []. Leave [] for general searches with no specific name.
- "meeting_types": exact values from the types[] DB field that match the query. Use the synonym map below. Leave [] if none apply.
- "meeting_languages": exact language values from the types[] DB field. Use [] unless query mentions a language.
- "meeting_access": "Open" if user wants open meetings, "Closed" if members-only, "" if unspecified.

Inference rules:
- Loved one + alcohol → fellowship_slugs includes both "aa" (for them) AND "al-anon" (for the asker)
- Loved one + drugs → include both "na" AND "nar-anon"
- Loved one + gambling → include both "ga" AND "gam-anon"
- Treatment/rehab/detox language → facility_types includes "treatment"
- Sober house/halfway/sober living → facility_types includes "sober_living"
- Counselor/therapist/therapy → facility_types includes "therapist"
- Crisis language (want to die, can't go on, overdose, emergency, suicide) → urgency="high", include_crisis=true, query_intent="crisis"
- Any query mentioning "meeting" or a fellowship by name → always populate fellowship_slugs
- Any query mentioning treatment, rehab, detox, facility, center, sober living → always populate facility_types
- For general recovery queries with no specific issue → aa and na as fellowship_slugs
- Multi-attribute queries like "women's AA meeting in Spanish on Saturday morning" should extract ALL attributes: fellowship_slugs=["aa"], meeting_types=["Women"], meeting_languages=["Spanish"], day=Saturday, time=morning

SYNONYM MAP — map colloquial user language to exact DB values:

MEETING TYPES → populate meeting_types[] with these exact strings:
outside/outdoors/open air/park/patio → "Outdoor"
ladies/women-only/female/womens/sisters → "Women"
guys/men-only/male/mens/brothers → "Men"
gay/queer/pride/rainbow/LGBTQ/LGBT → "LGBTQ+"
newcomer/newbie/first time/just starting/never been → "Beginners"
book study/big book/BB study → "Big Book Study"
steps/step meeting/working steps/step study → "Step Study"
speaker meeting/sharing/lead → "Speaker"
talk/sharing/crosstalk/discussion meeting → "Discussion"
kids/children/family friendly/bring kids → "Child-Friendly"
candle/candlelit/candlelight → "Candlelight"
meditation/mindfulness/quiet/silent → "Meditation"
young/youth/young people/college age/20s → "Young People"
wheelchair/accessible/handicap/ADA/disability → "Wheelchair Accessible"
traditions/tradition study → "Traditions Study"
12 and 12/twelve and twelve/12x12 → "12x12"
literature/reading/lit meeting → "Literature"
as bill sees it/ABSI → "As Bill Sees It"

MEETING ACCESS → populate meeting_access:
open/anyone can come/visitors welcome/open to public/non-members → "Open"
closed/members only/private/closed meeting → "Closed"

MEETING LANGUAGE → populate meeting_languages[]:
english/english-speaking → "English"
spanish/español/hispanic/latino/latina → "Spanish"
sign language/ASL/deaf/hearing impaired → "Sign Language"

FELLOWSHIPS → populate fellowship_slugs[]:
AA/alcoholics anonymous/alcohol meetings/drinking → "aa"
NA/narcotics anonymous/drug meetings/narcotics → "na"
al-anon/alanon/loved one drinks/spouse drinks/my husband drinks/my wife drinks/family of alcoholic → "al-anon"
alateen/teen/teenager/child of alcoholic → "alateen"
SMART/smart recovery/science-based/CBT/secular recovery → "smart-recovery"
celebrate recovery/CR/christ-centered/church recovery/faith-based recovery → "celebrate-recovery"
GA/gamblers anonymous/gambling/betting/sports betting/casino → "ga"
OA/overeaters anonymous/food addiction/binge eating/compulsive eating → "oa"
CoDA/coda/codependent/codependency/people pleaser/boundaries → "coda"
ACA/ACOA/adult children/grew up with alcoholic/childhood trauma/dysfunctional family → "aca"
SAA/sex addicts/sex addiction/porn addiction/sexual compulsivity → "saa"
SLAA/love addiction/relationship addiction/love addict → "slaa"
CA/cocaine anonymous/cocaine/crack/stimulants → "ca"
CMA/crystal meth/meth/tina → "cma"
MA/marijuana anonymous/weed/pot/cannabis → "ma"
HA/heroin anonymous/heroin/opiates/fentanyl → "heroin-anonymous"
PA/pills anonymous/prescription drugs/painkillers/oxy → "pills-anonymous"
DA/debtors anonymous/debt/money problems/spending addiction → "da"
NicA/nicotine anonymous/smoking/vaping/tobacco/juul → "nicotine-anonymous"
nar-anon/naranon/family of addict/loved one uses drugs → "nar-anon"
gam-anon/gamanon/family of gambler/spouse gambles → "gam-anon"
refuge/dharma recovery/buddhist recovery/meditation recovery → "refuge-recovery"
lifering/secular/non-religious/atheist/agnostic recovery → "lifering"
WFS/women for sobriety/women-only program → "wfs"
WA/workaholics/work addiction/workaholic → "wa"

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
  directory: "User is in the Find directory — prioritise meetings and facilities.",
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

const CONTEXT_LIMITS: Record<SearchContext, { meetings: number; facilities: number; articles: number; skipMeetings: boolean; skipFacilities: boolean }> = {
  home:      { meetings: 6, facilities: 5, articles: 4, skipMeetings: false, skipFacilities: false },
  resources: { meetings: 0, facilities: 0, articles: 8, skipMeetings: true,  skipFacilities: true  },
  directory: { meetings: 8, facilities: 6, articles: 2, skipMeetings: false, skipFacilities: false },
  member:    { meetings: 4, facilities: 2, articles: 5, skipMeetings: false, skipFacilities: false },
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toMeeting(m: Record<string, unknown>, idToFellowship: Record<string, { name: string; slug: string }>): MeetingResult {
  const fid = m.fellowship_id as string;
  return {
    id:             m.id as string,
    name:           m.name as string,
    fellowship_name: idToFellowship[fid]?.name ?? "",
    fellowship_slug: idToFellowship[fid]?.slug ?? "",
    city:       (m.city as string)       ?? null,
    state:      (m.state as string)      ?? null,
    format:     (m.format as string)     ?? null,
    day_of_week:(m.day_of_week as string)?? null,
    start_time: (m.start_time as string) ?? null,
    meeting_url:(m.meeting_url as string)?? null,
    slug:       (m.slug as string)       ?? null,
  };
}

/** Parse a time string like "7:00 PM" or "19:00" into minutes since midnight for sorting. */
function parseTimeMinutes(t: string | null): number {
  if (!t) return 9999;
  const pm = /pm/i.test(t);
  const am = /am/i.test(t);
  const nums = t.match(/(\d+):(\d+)/);
  if (!nums) return 9999;
  let h = parseInt(nums[1], 10);
  const m = parseInt(nums[2], 10);
  if (pm && h !== 12) h += 12;
  if (am && h === 12) h = 0;
  return h * 60 + m;
}

async function queryMeetings(
  slugs: string[],
  location: string | null,
  limit: number,
  dayFilter?: string | null,
  nameKeywords?: string[] | null,
  meetingTypes?: string[] | null,
  meetingLanguages?: string[] | null,
  meetingAccess?: string | null,
): Promise<MeetingResult[]> {
  const { data: fellowships } = await supabase
    .from("fellowships").select("id, name, slug").in("slug", slugs);

  // If no fellowship matched but we have name keywords, fall back to a name-only
  // search across all meetings (no fellowship filter) so "village" still finds
  // meetings even when no fellowship slug was classified.
  if (!fellowships?.length) {
    if (!nameKeywords?.length) return [];
    const MEETING_SELECT = "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug";
    function nameOnlyOrFilter(keywords: string[]): string {
      return keywords.map((kw) => `name.ilike.%${kw.replace(/%/g, "")}%`).join(",");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qName: any = supabase.from("meetings").select(MEETING_SELECT).or(nameOnlyOrFilter(nameKeywords)).limit(limit);
    if (location) qName = qName.ilike("city", `%${location}%`);
    const { data: nameData } = await qName;
    return ((nameData ?? []) as Record<string, unknown>[]).map((m) => toMeeting(m, {}));
  }

  const idToFellowship = Object.fromEntries(
    fellowships.map((f) => [f.id, { name: f.name as string, slug: f.slug as string }])
  );
  const fids = fellowships.map((f) => f.id as string);

  const MEETING_SELECT = "id, name, fellowship_id, city, state, format, day_of_week, start_time, meeting_url, slug";

  // Fetch a larger batch so we can sort client-side when day filtering
  const fetchLimit = dayFilter ? Math.min(limit * 4, 100) : limit;

  /** Build the OR filter string for name keyword ILIKE matching */
  function nameOrFilter(keywords: string[]): string {
    return keywords.map((kw) => `name.ilike.%${kw.replace(/%/g, "")}%`).join(",");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyQuery = any;

  /** Apply meeting type / language / access filters against the types JSONB array */
  function applyTypeFilters(q: AnyQuery): AnyQuery {
    if (meetingTypes?.length)     q = q.overlaps("types", meetingTypes);
    if (meetingLanguages?.length) q = q.overlaps("types", meetingLanguages);
    if (meetingAccess)            q = q.filter("types", "cs", JSON.stringify([meetingAccess]));
    return q;
  }

  let q: AnyQuery = supabase.from("meetings").select(MEETING_SELECT).in("fellowship_id", fids).limit(fetchLimit);
  if (location)              q = q.ilike("city", `%${location}%`);
  if (dayFilter)             q = q.eq("day_of_week", dayFilter);
  if (nameKeywords?.length)  q = q.or(nameOrFilter(nameKeywords));
  q = applyTypeFilters(q);

  let { data } = await q;

  // Retry without location if no results
  if (!data?.length && location) {
    let qFallback: AnyQuery = supabase.from("meetings").select(MEETING_SELECT).in("fellowship_id", fids).limit(fetchLimit);
    if (dayFilter)            qFallback = qFallback.eq("day_of_week", dayFilter);
    if (nameKeywords?.length) qFallback = qFallback.or(nameOrFilter(nameKeywords));
    qFallback = applyTypeFilters(qFallback);
    const { data: fb } = await qFallback;
    data = fb;
  }

  // Retry without day filter if still no results
  if (!data?.length && dayFilter) {
    let qNoDow: AnyQuery = supabase.from("meetings").select(MEETING_SELECT).in("fellowship_id", fids).limit(limit);
    if (location)             qNoDow = qNoDow.ilike("city", `%${location}%`);
    if (nameKeywords?.length) qNoDow = qNoDow.or(nameOrFilter(nameKeywords));
    qNoDow = applyTypeFilters(qNoDow);
    const { data: fb2 } = await qNoDow;
    data = fb2;
  }

  const results = ((data ?? []) as Record<string, unknown>[]).map((m) => toMeeting(m, idToFellowship));

  // Sort by start_time ascending when day filtering so soonest meeting comes first
  if (dayFilter && results.length > 1) {
    results.sort((a: MeetingResult, b: MeetingResult) => parseTimeMinutes(a.start_time) - parseTimeMinutes(b.start_time));
  }

  return results.slice(0, limit);
}

async function queryFacilities(
  types: string[],
  location: string | null,
  limit: number,
  nameKeywords?: string[] | null,
): Promise<FacilityResult[]> {
  // Need at least a type filter or a name keyword to run a meaningful query
  if (!types.length && !nameKeywords?.length) return [];

  const FACILITY_SELECT = "id, name, facility_type, city, state, phone, website, accepts_insurance, slug, is_verified, is_featured";

  function facilityNameOrFilter(keywords: string[]): string {
    return keywords.map((kw) => `name.ilike.%${kw.replace(/%/g, "")}%`).join(",");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("facilities").select(FACILITY_SELECT)
    .order("is_featured", { ascending: false })
    .order("is_verified",  { ascending: false })
    .limit(limit);

  if (types.length)           q = q.in("facility_type", types);
  if (location)               q = q.ilike("city", `%${location}%`);
  if (nameKeywords?.length)   q = q.or(facilityNameOrFilter(nameKeywords));

  const { data } = await q;

  // Retry without location filter if no results
  if (!data?.length && location) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qFallback: any = supabase.from("facilities").select(FACILITY_SELECT)
      .order("is_featured", { ascending: false })
      .limit(limit);
    if (types.length)         qFallback = qFallback.in("facility_type", types);
    if (nameKeywords?.length) qFallback = qFallback.or(facilityNameOrFilter(nameKeywords));
    const { data: fallback } = await qFallback;
    return (fallback ?? []) as FacilityResult[];
  }

  return (data ?? []) as FacilityResult[];
}

// ─── AI-path DB fetchers ──────────────────────────────────────────────────────

async function fetchMeetings(intent: SearchIntent, limit: number, dayFilter?: string | null): Promise<MeetingResult[]> {
  // Use classified slugs; fall back to issue-based defaults; then aa+na as last resort
  const slugs =
    intent.fellowship_slugs.length > 0
      ? intent.fellowship_slugs
      : (ISSUE_FELLOWSHIP_MAP[intent.issue] ?? ["aa", "na"]);

  const nameKeywords    = intent.name_keywords?.length    ? intent.name_keywords    : null;
  const meetingTypes    = intent.meeting_types?.length    ? intent.meeting_types    : null;
  const meetingLanguages= intent.meeting_languages?.length? intent.meeting_languages: null;
  const meetingAccess   = intent.meeting_access || null;
  return queryMeetings(slugs, intent.location, limit, dayFilter, nameKeywords, meetingTypes, meetingLanguages, meetingAccess);
}

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
  return queryFacilities(types, intent.location, limit, nameKeywords);
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
// Searches meetings, facilities, and articles using simple term matching.

// Fellowship name → slug mapping for keyword detection
const FELLOWSHIP_KEYWORD_MAP: [RegExp, string[]][] = [
  [/\baa\b|alcoholics\s+anonymous/i,      ["aa"]],
  [/\bna\b|narcotics\s+anonymous/i,        ["na"]],
  [/\bal.?anon\b/i,                        ["al-anon"]],
  [/\bnar.?anon\b/i,                       ["nar-anon"]],
  [/\bgamblers?\s+anonymous\b|\bga\b/i,    ["ga"]],
  [/\bgam.?anon\b/i,                       ["gam-anon"]],
  [/\bsmart\s+recovery\b/i,               ["smart-recovery"]],
  [/\bovereaters?\s+anonymous\b|\boa\b/i, ["oa"]],
  [/\bcelebrate\s+recovery\b/i,           ["celebrate-recovery"]],
  [/\baca\b|adult\s+children/i,            ["aca"]],
  [/\bsaa\b|sex\s+addict/i,               ["saa"]],
  [/\bsa\b|sexaholics/i,                  ["sa"]],
  [/\bda\b|debtors?\s+anonymous/i,        ["da"]],
  [/\bcma\b|crystal\s+meth/i,             ["cma", "na"]],
  [/\bca\b|cocaine\s+anonymous/i,         ["ca", "na"]],
  [/\blifering\b/i,                       ["lifering"]],
  [/\brefuge\s+recovery\b/i,              ["refuge-recovery"]],
];

const FACILITY_KEYWORD_MAP: [RegExp, string[]][] = [
  [/\btreatment\b|\brehab\b|\brehabilitation\b|\binpatient\b|\bdetox\b/i, ["treatment"]],
  [/\bsober\s+living\b|\bhalfway\s+house\b|\bsober\s+house\b/i,          ["sober_living"]],
  [/\btherapist\b|\bcounselor\b|\btherapy\b|\bcounseling\b/i,            ["therapist"]],
  [/\boutpatient\b|\biop\b|\bintensive\s+outpatient\b/i,                 ["outpatient"]],
  [/\bsober\s+bar\b|\balcohol.free\s+bar\b|\bsober\s+venue\b/i,          ["venue"]],
];

function detectLocation(q: string): string | null {
  // Match "in [Location]" or "near [Location]" patterns
  const m = q.match(/\b(?:in|near)\s+([A-Za-z][A-Za-z\s]{1,30?)(?=\s*(?:$|[,\.?!]|\s+(?:and|or|for|that|with|where)))/i);
  return m?.[1]?.trim() ?? null;
}

async function keywordSearch(q: string, context: SearchContext): Promise<SmartSearchResponse> {
  const limits = CONTEXT_LIMITS[context];

  // Detect which fellowships, facility types, and location are in the query
  const mentionedSlugs: string[] = [];
  for (const [pattern, slugs] of FELLOWSHIP_KEYWORD_MAP) {
    if (pattern.test(q)) mentionedSlugs.push(...slugs);
  }

  const mentionedTypes: string[] = [];
  for (const [pattern, types] of FACILITY_KEYWORD_MAP) {
    if (pattern.test(q)) mentionedTypes.push(...types);
  }

  const wantsMeetings = !limits.skipMeetings && (mentionedSlugs.length > 0 || /\bmeeting/i.test(q));
  const wantsFacilities = !limits.skipFacilities && mentionedTypes.length > 0;
  const slugsToQuery = mentionedSlugs.length > 0 ? [...new Set(mentionedSlugs)] : ["aa", "na"];
  const typesUniq    = [...new Set(mentionedTypes)];

  const location = detectLocation(q);

  // Keyword scoring for articles
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const [meetings, facilities, articleData] = await Promise.all([
    wantsMeetings  ? queryMeetings(slugsToQuery, location, limits.meetings || 6)  : Promise.resolve([] as MeetingResult[]),
    wantsFacilities ? queryFacilities(typesUniq, location, limits.facilities || 5) : Promise.resolve([] as FacilityResult[]),
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

  return { query: q, intent: null, meetings, facilities, articles, step_work_results: [], crisis: false, ai_powered: false };
}

function emptyResponse(query: string): SmartSearchResponse {
  return { query, intent: null, meetings: [], facilities: [], articles: [], step_work_results: [], crisis: false, ai_powered: false };
}

function err429(message: string, retryAfter: number) {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

// ─── Route handler ────────────────────────────────────────────────────────────

function errorResponse(query: string, message = "Search unavailable. Please try again."): Response {
  return Response.json(
    { query, intent: null, meetings: [], facilities: [], articles: [], step_work_results: [], crisis: false, ai_powered: false, error: message },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const context  = (searchParams.get("context") ?? "home") as SearchContext;

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
  // Include current day in key for meeting-like queries so "today" doesn't serve yesterday's results
  const nowPST    = getPSTDate();
  const todayDay  = DOW[nowPST.getDay()];
  const isMeetingLike = /\bmeeting\b|\btoday\b|\btonight\b|\bnear\s+me\b|\bnearby\b/i.test(q);
  const cacheKey = `${context}:${q.toLowerCase().slice(0, 150)}${isMeetingLike ? `:${todayDay}` : ""}`;
  const cached   = queryCache.get(cacheKey);
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

  // Informational and step_work queries → suppress directory results
  const wantsMeetings = !limits.skipMeetings && !isInformational && !isStepWork && (
    intent.fellowship_slugs.length > 0 ||
    intent.help_type.some((h) => ["meetings", "family_meetings"].includes(h))
  );

  const wantsFacilities = !limits.skipFacilities && !isInformational && !isStepWork && (
    intent.facility_types.length > 0 ||
    intent.help_type.some((h) => ["treatment", "sober_living", "therapist"].includes(h))
  );

  // Day-of-week filter: meeting_search defaults to today UNLESS searching by name
  // (a name search like "find the village meeting" should find the meeting regardless of what day it meets)
  const hasNameKeywords = (intent.name_keywords?.length ?? 0) > 0;
  const dayFilter = (intent.query_intent === "meeting_search" && wantsMeetings)
    ? (detectDayFilter(q, nowPST) ?? (hasNameKeywords ? null : todayDay))
    : null;
  console.log("[smart-search] Meeting query params:", { query_intent: intent.query_intent, wantsMeetings, dayFilter, location: intent.location, fellowship_slugs: intent.fellowship_slugs });

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
  const [meetings, facilities, articles, step_work_results] = await Promise.all([
    wantsMeetings   ? fetchMeetings(intent, limits.meetings, dayFilter)   : Promise.resolve([] as MeetingResult[]),
    wantsFacilities ? fetchFacilities(intent, limits.facilities) : Promise.resolve([] as FacilityResult[]),
    fetchArticles(intent, context),
    isStepWork ? fetchStepWork(q, userFellowshipId, 5) : Promise.resolve([] as import("@/lib/resources").StepWorkResult[]),
  ]);

  const result: SmartSearchResponse = {
    query: q,
    intent,
    meetings,
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
