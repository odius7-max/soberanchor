# SoberAnchor — Decisions Log
> Single source of truth for architectural and product decisions.
> Update this file whenever a decision is made. Claude Code and all project conversations should reference this.

Last updated: April 10, 2026

---

## Auth
- Email + password is primary auth method for BOTH providers and sponsor/sponsee
- Phone OTP deferred until Twilio 10DLC registration is approved
- Same Supabase Auth (`auth.users`) for all user types — routed post-login by role
- Forgot password uses `supabase.auth.resetPasswordForEmail(email)`
- Custom SMTP needed to brand emails as "SoberAnchor" (currently shows "Supabase Auth" as sender)
- Admin check is on `auth.users` UUID only — works regardless of which role the user has
- **Dual-role support:** A user can have BOTH a `provider_accounts` record AND a `user_profiles` record (same `auth_user_id`)
  - Example: treatment center counselor who is also in recovery and wants sponsor/sponsee tools
  - Post-login routing: if BOTH roles exist → show role switcher ("Provider Dashboard" / "My Recovery"); if one role → go directly to that dashboard; if neither → role selection/onboarding
  - Nav should include a role switcher for dual-role users (e.g., small toggle or dropdown)

## Account Creation & Onboarding
- **Account creation is minimal:** email, password, display name only. No fellowship, no sobriety date during signup. Reduce friction to zero.
- **Post-login onboarding:** After first login, show a warm onboarding flow (not a modal wall — a friendly prompt on the dashboard). Ask: (1) What's your primary fellowship? (dropdown from fellowships table), (2) What's your sobriety date?, (3) Are you a sponsor, sponsee, or both?
- **Onboarding is skippable** — user can dismiss and fill in later from their profile/settings. Track via `user_profiles.onboarding_completed`.
- **Multiple sobriety dates:** Users can have multiple sobriety milestones for different substances/behaviors (e.g., alcohol on 9/23/2023, marijuana on 3/1/2024). Stored in `sobriety_milestones` table with `label`, `sobriety_date`, `fellowship_id`, and `is_primary` flag. The primary milestone is what shows on the dashboard day counter and profile.
- **Fellowship selection:** Linked to the `fellowships` table. This determines which step work program is shown. If no fellowship selected, default to showing AA (most common) with option to change.

## Listing Tiers (Revenue Model)
- **Basic (Free):** Listed in directory, phone & website visible, 1 photo, NO lead capture form, NO leads inbox
- **Enhanced ($149/mo):** Everything in Basic + lead capture form + leads inbox + featured badge ⭐ + verified badge ✓ + up to 10 photos + respond to reviews + basic analytics
- **Premium ($399/mo):** Everything in Enhanced + top-of-results placement + unlimited photos + full analytics + event posting + priority support
- Lead capture form on consumer listing detail page ONLY renders for enhanced/premium tiers
- Stripe integration deferred — upgrade buttons trigger contact form for now

## Directory Architecture
- Five separate directory pages by resource type — NEVER mix types in same results
- `/find` is a hub page (category selector with counts), NOT a mixed results page
- `/find/treatment-centers` → `WHERE facility_type IN ('treatment', 'outpatient')`
- `/find/sober-living` → `WHERE facility_type = 'sober_living'`
- `/find/therapists` → `WHERE facility_type = 'therapist'`
- `/find/meetings` → `FROM meetings table` (separate table)
- `/find/sober-venues` → `WHERE facility_type = 'venue'`
- Each page has type-specific filters, card layouts, and detail pages
- Guided discovery flow routes to appropriate directory page based on answers
- SEO-optimized location URLs: `/find/treatment-centers/san-diego`
- Filter UI pattern applies to BOTH the main `/find` hub AND each distinct directory page

## Directory Filters UI Pattern
- **Layout:** Single card with two collapsible accordion sections — Location and Filters
- **Accordion headers** show: label + hint text + current value + caret toggle
  - Location: "LOCATION (city, zip, or address)" → right side shows "Vista, CA · 15 mi"
  - Filters: "FILTERS (fellowship, day, time, format, specialty)" → right side shows "All" or active filter summary
- **Accordion behavior:** Start open on first visit. After first search, collapse. Save open/closed state in localStorage so returning visitors see collapsed view with remembered settings
- **Filter controls:** Horizontal row of compact dropdown selects (stack vertically on mobile)
- **Active filters:** Show as removable pills below the accordion card, inline with result count + sort dropdown
- **Sort options** vary by type: meetings get "Soonest first," treatment gets "Nearest first" and "Top rated"

## Geo Strategy (Default Radius by Type)
- Treatment centers: 50 miles (people travel for treatment)
- Sober living: 25 miles (needs to be commutable)
- Therapists: 25 miles + telehealth toggle (removes geo limit)
- Meetings (in-person): 15 miles (needs to be driveable, attended frequently)
- Meetings (virtual): No geo limit — show all, filtered by time/fellowship
- Sober venues: 15 miles (local hangouts)
- Auto-detect location via browser geolocation or IP, default to showing "near [City]"
- If location unavailable, prompt user to enter city/zip

## Type-Specific Filters
- **Meetings:** Fellowship (AA, NA, Al-Anon, GA, OA, SMART, CR), Day, Time (morning/afternoon/evening/late night), Format (in-person/online/hybrid), Specialty (women, men, LGBTQ+, young people, beginners, Spanish, speaker, step study) + "Include virtual" toggle
- **Treatment centers:** Type (inpatient, outpatient, detox, MAT, dual-diagnosis), Substance (alcohol, opioids, stimulants, meth, marijuana), Insurance
- **Sober living:** Gender (men's, women's, co-ed), Price range, Features (12-step, pet-friendly, job support, near transit)
- **Therapists:** Specialty (addiction, dual-diagnosis, trauma, family, eating disorders), License (LMFT, LCSW, PsyD, CADC), Insurance + "Include telehealth" toggle
- **Sober venues:** Type (bar, cafe, event space, restaurant), Amenities (live music, dog-friendly, food menu, outdoor)

## Meeting Real-Time Indicators
- Show "Live now" with coral accent for meetings currently in progress
- Show "In 45 min" countdown for upcoming meetings
- "Join meeting" button on online meeting cards (links to Zoom/conference URL)
- Virtual meetings display user's local time (convert from meeting timezone)

## Favorites & Saved Listings (Logged-In Users)
- **Two lists:** Favorites (go-to recurring list) and Watchlist (maybes/backlog)
- Users can save both meetings AND facilities to either list
- Optional personal note per save ("Tuesday night group with Mike", "backup meeting")
- **Member center** shows organized favorites: "My Meetings" and "My Saved Listings" sections
- Saved meetings show next occurrence, day/time, format — easy at-a-glance schedule
- Heart/bookmark icon on every listing card and detail page for quick save
- Schema: `saved_listings` table with `user_id`, `meeting_id` OR `facility_id`, `list_type` (favorite/watchlist), `note`, RLS enabled
- **Saved searches:** Users can save a filter configuration with a name ("My Friday AA meetings"). Schema: `saved_searches` table with `resource_type`, `name`, `filters` (jsonb), location, radius. Future: notify when new listings match.
- **For unauthenticated users:** Location and filter preferences saved in localStorage. Prompt to create account to save favorites: "Create a free account to save your meetings and get back to them anytime."

## Database Architecture
- Single `facilities` table with `facility_type` enum discriminator — no need for separate tables per type
- `meetings` table is separate (already exists with 19 rows)
- `facility_type` enum values: treatment, sober_living, therapist, venue, outpatient, telehealth
- 22 facilities seeded in San Diego area (11 treatment, 5 sober living, 2 therapists, 3 venues, 1 outpatient)
- PostGIS enabled for geo queries
- SAMHSA API identified for bulk facility import (1,468 CA facilities pulled, script needs service_role key fix)

## Provider Portal
- Provider dashboard has 4 tabs: Overview, My Listing, Leads, Plan & Billing
- Leads tab shows upgrade CTA for basic tier providers (no leads without paying)
- Overview stat cards gate "New Leads" behind tier check
- Visual reference: `docs/provider-dashboard.jsx`

## Provider Verification (Claim Flow)
- Hybrid approach: auto-verify first, manual review as fallback
- Level 1: Email domain match — if provider signup email domain matches facility website domain, auto-verify (`is_claimed = true, is_verified = true`)
- Level 3: No domain match — claim accepted but pending (`is_claimed = true, is_verified = false`), appears in admin claims queue
- Admin manually reviews and approves/rejects

## Admin Panel
- Lives at `/admin`, protected by `ADMIN_USER_IDS` env variable (TJ: `06909557-b720-43a0-bd64-3d9f0f35a4af`)
- Returns 404 (not 403) to non-admins — don't reveal route exists
- Uses service_role Supabase client (bypasses RLS)
- **Claims queue:** pending provider claims, approve/reject, domain mismatch highlighting
- **Facility management:** searchable table, inline toggle verified/featured/claimed, edit any listing
- **User management:** tabs for providers and members, deactivate accounts
- **Leads overview:** all leads across all facilities, filter/export CSV
- **Content management:** article CRUD with publish/draft toggle (Phase 2)
- Admin notification: email to TJ/Angel when new claim needs manual review

## Sponsor/Sponsee System
- **Bidirectional connections:** Both sponsors AND sponsees can initiate a connection request (search by email)
- **Gran-sponsor chain:** A person can be a sponsor to some AND a sponsee to someone else simultaneously — the `sponsor_relationships` table supports this (same user_id can appear as `sponsor_id` in one row and `sponsee_id` in another)
- **Connection flow:** Either party searches by email → sends request → creates `sponsor_relationships` row with `status = 'pending'` → other party accepts/declines on their dashboard
- **Invite flow:** If person doesn't have an account, store pending relationship with email — they see the request after sign-up (email invite later once SMTP is configured)
- **My Dashboard shows:** "My Sponsor" section (who I'm connected to as sponsee) + pending sponsor requests
- **Sponsor View tab shows:** "My Sponsees" list + pending sponsee requests + stats (active sponsees, pending reviews, checked in today)
- **Post-login redirect:** Authenticated users land on `/my-recovery` (not homepage). Providers land on `/providers/dashboard`. Dual-role users land on `/my-recovery` with role switcher available. Unauthenticated visitors see public homepage.
- **Logo click:** SoberAnchor logo always goes to the public homepage, regardless of auth state. "My Recovery" pill is the entry point to the member center.
- **Step work frameworks** to be seeded in `program_workbooks` — starting with AA 12-step, then NA, SMART Recovery (4-Point), Celebrate Recovery
- **AA 12-step workbook SEEDED:** 16 sections, 85 prompts covering all 12 steps with reading assignments, open reflection, yes/no questions, structured inventory tables (resentments, fears, relationships, amends), and daily practice exercises
- **Step work interaction:** Sponsor assigns workbook exercises → sponsee completes them → submits for review → sponsor reviews and provides feedback (draft → submitted → reviewed → needs_revision)
- **Three completion methods:** (1) Digital — fill out online, auto-saves, sponsor reviews digitally. (2) Print — export prompts as PDF, write by hand, sponsor marks complete in system. (3) Discussion — work through verbally in person, sponsor marks complete with note.
- **Step completion tracking:** `step_completions` table tracks high-level "is this step done" per user per fellowship. Separate from detailed `step_work_entries`. Both sponsor and sponsee can mark steps complete. Sponsor approval is tracked separately (`sponsor_approved`).
- **Print-friendly export:** Each step section should have a "Print this section" option that generates a clean PDF of the prompts with space for handwritten answers. This is important — many people in recovery prefer writing by hand.
- **Prompt types in JSONB:** `text` (textarea), `yesno` (toggle + conditional textarea), `table` (dynamic rows with columns), `reading` (reference card + textarea), `scale` (slider with labels)
- **No step locking:** All steps are accessible from the start (not locked behind completion of previous steps). The 12 steps are designed to be worked in order with a sponsor, but the tool should not enforce this rigidly. The overview page visually emphasizes the current step but doesn't prevent access to others.
- **Competitor landscape:** No existing app has built sponsor/sponsee collaborative step work. Steps Away, Twelve Steps Companion, and various PDF worksheets exist but are all solo experiences. The two-sided workflow (assign → complete → review → feedback) is SoberAnchor's unique differentiator.

## Two-Product Ecosystem
- SoberAnchor.com = directory-first website (search, discover, connect with providers)
- Soberthdays = companion app (sobriety tracking, milestones, medallion commerce on Shopify)
- Cross-promotion is subtle, not intrusive
- Shop exists in footer, not primary nav

## Tech Stack
- Frontend: Next.js (App Router) on Vercel
- Backend/DB: Supabase (project: `ybpwqqbnfphdmsktghqd`, org: `yazswbplsiyiedljurtm`, region: `us-west-1`)
- Auth: Supabase Auth (email + password)
- Styling: Tailwind CSS with SoberAnchor design tokens
- Deployment: Vercel (`soberanchor.vercel.app`)
- Ecommerce: Shopify (Soberthdays)
- SMS (future): Twilio (pending 10DLC registration)

## Design Tokens
- Navy: #003366 (nav, headlines, key UI anchors)
- Teal: #2A8A99 (links, CTAs, accent elements)
- Gold: #D4A574 (milestones, featured badges, sparingly)
- Canvas: white/off-white dominant (80%+)
- Display font: Cormorant Garamond (serif)
- Body font: Outfit (sans-serif)
- Tone: warm, trustworthy, human — antithesis of clinical directories

## Brand
- Co-founders: Angel Johnson (recovery advocate, 5+ years sober) and Travis "TJ" Johnson (product analytics)
- LLC: Why Knot Gifts LLC
- Tagline: "Your Anchor to Sober Living"
- Voice: warm, personal, non-clinical, inclusive, judgment-free
- Domain email exists for soberanchor.com

## Privacy & Trust Commitment
- **Create account page only** (not sign-in) shows a warm trust callout signed "— Angel"
- Trust message: "I built SoberAnchor because I've walked this path myself. Recovery work is deeply personal — your journal entries, step work, and check-ins are yours alone. Here's my commitment: Your sponsor only sees what you explicitly share. We will never sell your data or share your personal recovery information with anyone. And if you ever want to leave, everything you've written can be deleted completely — no retention period, no backups kept. — Angel"
- **Core promises:** Never sell data. Never share personal recovery information (journal, step work, check-ins) with anyone. Sponsor only sees explicitly shared items. Full deletion available anytime — no retention, no backups.
- **Do NOT promise "no ads"** — contextual directory ads (provider placement) may be a future revenue stream. But personal recovery data is never used for ad targeting, ever.
- **Sign-in page:** Just a subtle one-liner: "Your data is always private and deletable."

## Content & SEO
- Full content strategy documented in `RESOURCES-CONTENT-STRATEGY.md`
- **7 content tiers:** Fellowship Guides, Getting Help, Supporting a Loved One, Understanding Addiction, Life in Recovery, Local Guides, Books & Media
- 10 articles seeded in database
- SEO flywheel: article ranks → links to directory → captures lead → revenue funds more content
- **Fellowship guide pages** (one per fellowship) are the highest SEO value — "what is AA" gets 40K+ monthly searches
- **Local guides** are the SEO powerhouse for directory traffic — start with San Diego, expand city by city
- URL structure: `/resources/fellowships/[slug]`, `/resources/guides/[slug]`, `/resources/local/[city]/[topic]`

## AI-Powered Smart Search
- Single search bar on Resources page and homepage that understands natural language
- User types "my son is addicted to pills" → Claude classifies intent → returns structured JSON → frontend queries Supabase and shows personalized results across meetings, facilities, articles, and crisis resources
- Uses Anthropic API (`claude-haiku-4-5-20251001`) for cost efficiency — ~$0.0002 per query, ~$2/month at 10K searches
- Cache common query patterns to avoid unnecessary API calls
- Fallback to traditional keyword search if AI unavailable
- Rate limit: 1 AI search per 3 seconds per user
- Always show crisis resources if emotional distress detected
- Full spec in `RESOURCES-CONTENT-STRATEGY.md`

## Build Priority Order
1. Auth flow (email + password, forgot password) ✅
2. Provider dashboard layout with tabs ✅
3. Listing edit/save functionality ✅
4. Claim existing facility flow (hybrid auto-verify / manual queue) ✅
5. Admin panel — claims queue + facility management ✅
6. Sponsor/sponsee system (bidirectional connections, sponsor view tab)
7. Consumer directory pages (5 separate pages by facility_type) with filter UI (accordion pattern, geo, type-specific dropdowns)
8. Meeting detail page (map, Zoom link, format tags, Add to Calendar, Get Directions)
9. Meeting data sync Edge Function (AA via Meeting Guide API, NA via BMLT, weekly cron)
10. Favorites & saved listings (heart icon on cards, My Meetings in member center, favorites vs watchlist)
11. Saved searches (save filter configs with name, load from member center)
12. Lead capture form on consumer listing page (tier-gated)
13. Leads inbox with status management
14. RLS policies
15. Step work frameworks (seed AA 12-step prompts, interactive step work UI)
16. Admin panel — users, leads overview, content management
17. Plan & billing page (static for now, Stripe later)

---

## Meeting Data Sync
- Supabase Edge Function (`sync-meetings`) pulls from external APIs and upserts into meetings table
- **AA meetings:** Meeting Guide API format via TSML WordPress plugin feeds (aasandiego.org, ncsandiegoaa.org)
- **NA meetings:** BMLT API (worldwide NA meeting database)
- Scheduled weekly via pg_cron (Sunday 3am PT)
- `meeting_data_sources` config table tracks feed URLs, last sync time, and count
- Sync uses `source_id` for upsert — no duplicates, existing data updated
- Manual meetings (GA, OA, Al-Anon, etc.) not affected by sync — only touches `source = 'api'`
- Meeting detail page should show: map, Zoom link, phone dial-in, format tags, location notes, Add to Calendar, Get Directions
- Full spec in `docs/MEETING-SYNC-SPEC.md`

## Open / Deferred
- Phone OTP auth: blocked on Twilio 10DLC registration
- Custom SMTP: needed for branded emails and sponsor/sponsee invite emails (Resend or SendGrid)
- SAMHSA bulk import: script exists but needs service_role key fix for Supabase seeding
- Stripe payment integration: deferred, upgrade buttons use contact form for now
- Additional meeting feeds: GA, OA, Al-Anon, SMART Recovery (no APIs — need scraping or manual curation)
- Step work content: AA 12-step DONE (16 sections, 85 prompts seeded). Still need: NA, Al-Anon, Celebrate Recovery, SMART Recovery 4-Point Program
- Step work print/PDF export: build clean printable version of each step's prompts
- Geographic focus: San Diego first, then California, then national
