# SoberAnchor Provider Portal — Build Spec for Claude Code

## Overview

Build the provider-facing portal for SoberAnchor.com. This is the B2B side of a recovery resource directory. Providers (treatment centers, sober living homes, therapists, venues) sign up, claim/edit their listing, and (on paid tiers) receive leads from consumers.

**Tech Stack:**
- Frontend: Next.js (App Router)
- Backend/DB: Supabase (project ID: `ybpwqqbnfphdmsktghqd`, region: `us-west-1`)
- Auth: Supabase Auth (phone OTP via Twilio — already configured)
- Styling: Tailwind CSS with SoberAnchor design tokens (see below)
- Deployment: Vercel

---

## Design Tokens

```css
--navy: #003366
--navy-dark: #002244
--teal: #2A8A99
--teal-light: #3AA5B6
--gold: #D4A574
--off-white: #FAFAF8
--warm-gray: #F5F3F0
--border: #E8E4DF
--mid: #888888
--dark: #2C2C2C
--green: #27AE60
```

**Typography:**
- Display/headings: `Cormorant Garamond` (serif), weights 400-700
- Body: `Outfit` (sans-serif), weights 300-700

**Design principles:**
- White/off-white dominant (80%+), pages breathe
- Navy for nav, headlines, key UI anchors — NOT section backgrounds
- Teal for links, CTAs, accent elements
- Gold for featured badges, premium feel — used sparingly
- Warm, trustworthy, human — antithesis of clinical directories
- Nautical subtle undercurrent (anchor icons, rope textures) but not overwhelming

---

## Database Schema (Already Exists in Supabase)

### `provider_accounts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | gen_random_uuid() |
| auth_user_id | uuid (FK → auth.users.id) | nullable |
| contact_name | text | required |
| contact_email | text | required |
| contact_phone | text | nullable |
| organization_name | text | nullable |
| subscription_tier | enum: basic, enhanced, premium | default: basic |
| is_active | boolean | default: true |
| created_at | timestamptz | default: now() |
| updated_at | timestamptz | default: now() |

### `facilities`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | gen_random_uuid() |
| provider_account_id | uuid (FK → provider_accounts.id) | nullable (null = unclaimed) |
| name | text | required |
| slug | text | unique |
| description | text | nullable |
| phone | text | nullable |
| email | text | nullable |
| website | text | nullable |
| address_line1 | text | nullable |
| address_line2 | text | nullable |
| city | text | nullable |
| state | text | nullable |
| zip | text | nullable |
| latitude | float8 | nullable |
| longitude | float8 | nullable |
| facility_type | enum: treatment, sober_living, therapist, venue, outpatient, telehealth | required |
| listing_tier | enum: basic, enhanced, premium | default: basic |
| is_verified | boolean | default: false |
| is_featured | boolean | default: false |
| is_claimed | boolean | default: false |
| accepts_insurance | boolean | default: false |
| accepts_private_pay | boolean | default: false |
| avg_rating | numeric | default: 0 |
| review_count | integer | default: 0 |
| operating_hours | jsonb | nullable |
| samhsa_id | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `facility_insurance` (1:many from facilities)
id, facility_id (FK), insurance_name

### `facility_amenities` (1:many from facilities)
id, facility_id (FK), amenity_name

### `facility_categories` (many:many junction)
facility_id (FK → facilities), category_id (FK → categories)

### `facility_photos`
id, facility_id (FK), url, alt_text, sort_order, created_at

### `leads`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| facility_id | uuid (FK → facilities.id) | required |
| first_name | text | nullable |
| phone | text | nullable |
| insurance_provider | text | nullable |
| seeking | enum: inpatient, outpatient, detox, sober_living, therapy, unsure | |
| who_for | enum: self, family, friend, professional | default: self |
| referral_source | text | nullable |
| notes | text | nullable |
| status | enum: new, contacted, converted, closed | default: new |
| created_at | timestamptz | |

### `provider_subscriptions`
id, provider_account_id (FK), tier (enum), status (enum: active, cancelled, expired), monthly_rate, start_date, end_date, created_at

### `categories` (22 rows exist)
id, parent_id (self-ref), name, slug, description, icon_emoji, type (enum: substance, behavioral, family, secular, other), sort_order

### Existing seed data:
- 22 categories (7 top-level + 15 sub)
- 37 fellowships
- 22 San Diego-area facilities
- 19 meetings
- 40 insurance records
- 10 articles

---

## Auth Flow

**Single auth system (Supabase Auth), two user types, email + password as primary method:**

A single user can have BOTH roles (provider + sponsor/sponsee). One `auth.users` record can link to both `provider_accounts` and `user_profiles`. Example: a treatment center counselor who is also in recovery.

1. After login, check BOTH `provider_accounts` and `user_profiles` for matching `auth_user_id`
   - Both exist → show role switcher page: "Provider Dashboard" / "My Recovery"
   - Provider only → route to `/providers/dashboard`
   - User profile only → route to sponsor/sponsee dashboard
   - Neither → show role selection / onboarding

**Provider sign-up flow:**
1. User clicks "Claim your listing" on `/for-providers`
2. Modal/page with: facility name, contact name, email, password, phone, facility type
3. Email confirmation via Supabase Auth (magic link or email OTP)
4. Creates `auth.users` record (or reuses existing if already registered as sponsor/sponsee) + `provider_accounts` record
5. If claiming existing facility: link `provider_account_id` on `facilities` row, set `is_claimed = true`
6. If new facility: create new `facilities` row linked to provider account
7. Redirect to `/providers/dashboard`

**Sponsor/Sponsee sign-up flow:**
1. User clicks sign-up from consumer site
2. Form with: display name, email, password
3. Email confirmation via Supabase Auth
4. Creates `auth.users` record (or reuses existing if already registered as provider) + `user_profiles` record
5. Redirect to sponsor/sponsee dashboard

**Sign-in (all user types):**
1. Email + password login (single login page for everyone)
2. Check BOTH `provider_accounts` AND `user_profiles` by `auth_user_id`
3. If both → role switcher page with cards: "Provider Dashboard" / "My Recovery"
4. If one → route directly to that dashboard
5. For dual-role users: include a role switcher in the nav (small dropdown or toggle) so they can switch without logging out

**Forgot password:**
1. User clicks "Forgot password?" on login page
2. Calls `supabase.auth.resetPasswordForEmail(email)`
3. User receives email with reset link
4. Link opens password reset form
5. Calls `supabase.auth.updateUser({ password: newPassword })`

**Future enhancement (once Twilio 10DLC is approved):**
- Add phone OTP as alternative sign-in method
- Add SMS-based 2FA as optional security upgrade

---

## Pages to Build

### 1. `/for-providers` — Landing Page (Public)

**Hero section:**
- Headline: "Families are searching for help. Make sure they find you."
- Sub: "SoberAnchor connects treatment centers, sober living homes, therapists, and recovery professionals with high-intent visitors at the moment they need you most."
- CTA: "Claim your listing — free forever" → opens sign-up flow
- CTA: "Already listed? Sign in" → phone OTP login

**Tier comparison section:**
Three cards showing Basic / Enhanced / Premium (see tier details below)

**Value props:**
- "Your facility is probably already listed" (SAMHSA data bootstrap)
- "Leads delivered to your inbox" (Enhanced+)
- "No contracts. Cancel anytime."

### 2. `/providers/dashboard` — Provider Dashboard (Authenticated)

Four tabs:

#### Tab: Overview
- Stat cards: Listing Views, New Leads (or upgrade CTA if basic), Contact Clicks
- Upgrade banner (if basic tier) — navy gradient, gold accent, "Get more visibility, more leads"
- Recent leads list (if enhanced+) OR soft upsell banner (if basic)

#### Tab: My Listing
- Listing preview card (how it appears to consumers)
- Edit form: name, description, phone, email, website, address, city/state/zip
- Side panel: current plan + upgrade CTA, listing status (claimed/verified/featured), services & amenities (editable badges), insurance accepted (editable badges)
- Edit mode toggle: fields switch between read-only and editable
- Save triggers Supabase update on `facilities` row

#### Tab: Leads (Enhanced+ only)
- **Basic tier:** Full-page upgrade CTA — "Unlock Lead Capture" with explanation and upgrade button
- **Enhanced/Premium:** Filter chips (All, New, Contacted, Converted, Closed) with counts
- Lead cards showing: name, phone, insurance, seeking type, who for, status badge, time ago
- Action buttons: "Mark Contacted" (new→contacted), "Mark Converted" (contacted→converted)
- Status updates trigger Supabase update on `leads` row

#### Tab: Plan & Billing
- Three tier comparison cards (see below)
- Current plan highlighted
- FAQ section
- (Future: Stripe integration for payment — for now, upgrade buttons can trigger a contact form or email)

### 3. `/providers/claim` — Claim Flow (can be modal or page)

- Search box: "Search for your facility"
- Query `facilities` table by name (fuzzy match)
- Results list with facility name, city, type
- "This is my facility" → verify via phone/email → link to provider account
- "I don't see my facility" → create new listing form

---

## Listing Tier Business Logic

### Basic (Free)
- Listed in directory with basic info
- Phone & website visible on listing (consumers contact directly)
- 1 photo
- NO lead capture form on listing detail page
- NO leads inbox
- NO analytics beyond listing view count

### Enhanced ($149/mo)
- Everything in Basic
- Lead capture form appears on listing detail page ("Contact This Facility")
- Leads inbox in dashboard
- Featured badge ⭐ on listing card
- Verified badge ✓
- Up to 10 photos
- Respond to reviews
- Basic analytics (views, leads, contact clicks)

### Premium ($399/mo)
- Everything in Enhanced
- Top-of-results placement in search/directory
- Unlimited photos
- Full analytics dashboard
- Event posting
- Priority support

**Critical:** The lead capture form on the consumer-facing listing detail page should ONLY render if `facilities.listing_tier` is 'enhanced' or 'premium'. Basic listings show phone and website but no form.

---

## Consumer-Facing Listing Detail Page Update

The existing listing detail page (consumer side) needs to be updated to conditionally show the lead form:

```
IF facility.listing_tier IN ('enhanced', 'premium'):
  Show "Get in Touch" lead capture form (first name, phone, insurance, seeking, who_for)
  On submit: INSERT into leads table
ELSE:
  Show facility phone number and website prominently
  Show "Contact this facility directly" messaging
  No form, no lead capture
```

---

## RLS Policies Needed

```sql
-- Provider can only see/edit their own provider_account
CREATE POLICY provider_own_account ON provider_accounts
  FOR ALL USING (auth_user_id = auth.uid());

-- Provider can only edit facilities they own
CREATE POLICY provider_own_facilities ON facilities
  FOR UPDATE USING (
    provider_account_id IN (
      SELECT id FROM provider_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Provider can only see leads for their facilities
CREATE POLICY provider_own_leads ON leads
  FOR SELECT USING (
    facility_id IN (
      SELECT id FROM facilities WHERE provider_account_id IN (
        SELECT id FROM provider_accounts WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Provider can update lead status
CREATE POLICY provider_update_leads ON leads
  FOR UPDATE USING (
    facility_id IN (
      SELECT id FROM facilities WHERE provider_account_id IN (
        SELECT id FROM provider_accounts WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Anyone can INSERT leads (consumer submitting contact form)
CREATE POLICY anyone_insert_leads ON leads
  FOR INSERT WITH CHECK (true);

-- Public can read facilities (directory is public)
CREATE POLICY public_read_facilities ON facilities
  FOR SELECT USING (true);
```

Enable RLS on: `provider_accounts`, `leads`, `facility_photos`
(facilities already has RLS disabled for public read — may need to enable and add both public read + provider write policies)

---

## Consumer Directory Architecture (Separate Pages Per Resource Type)

**Critical UX principle:** Someone searching for a treatment center has completely different intent from someone looking for a sober bar. These should NEVER appear in the same result set. Each resource type gets its own dedicated page with type-specific filters, card layouts, and detail pages.

### Directory URL Structure

```
/find                          → Hub page (category selector with counts, NOT mixed results)
/find/treatment-centers        → WHERE facility_type IN ('treatment', 'outpatient')
/find/sober-living             → WHERE facility_type = 'sober_living'
/find/therapists               → WHERE facility_type = 'therapist'
/find/meetings                 → FROM meetings table (separate table)
/find/sober-venues             → WHERE facility_type = 'venue'
```

**SEO-optimized location pages:**
```
/find/treatment-centers/san-diego
/find/sober-living/vista-ca
/find/therapists/carlsbad
/find/meetings/oceanside
/find/sober-venues/north-park-san-diego
```

### `/find` Hub Page

NOT a results page. It's a category selector showing:
- Card for each resource type with count and description
- Example: "🏥 Treatment Centers · 12 near San Diego" → links to /find/treatment-centers
- Example: "👥 Meetings · 19 near San Diego" → links to /find/meetings
- Global location input at top (auto-detect or manual)
- Also serves as entry point from the guided discovery flow

### Type-Specific Filters

Each directory page gets filters relevant to its resource type:

**Treatment Centers:**
- Insurance accepted
- Substance type (alcohol, opioids, stimulants, etc.)
- Treatment type (inpatient, outpatient, detox, MAT)
- Dual-diagnosis
- Distance/location

**Sober Living:**
- Gender (men's, women's, co-ed)
- Price range
- 12-step friendly
- Pet-friendly
- Distance/location

**Therapists:**
- Specialty (addiction, dual-diagnosis, trauma, family)
- License type (LMFT, LCSW, PsyD)
- Insurance accepted
- Telehealth available
- Distance/location

**Meetings:**
- Fellowship (AA, NA, GA, OA, Al-Anon, SMART Recovery, etc.)
- Day of week
- Time of day
- Format (in-person, online, hybrid)
- Specialty (women-only, LGBTQ+, young people, Spanish-language)
- Distance/location

**Sober Venues:**
- Venue type (bar, cafe, event space)
- Amenities (live music, dog-friendly, food)
- Distance/location

### Type-Specific Card Layouts

Each type renders its own card component with relevant info:

- **Treatment center card:** Name, city, treatment types, insurance badges, rating, Featured badge
- **Sober living card:** Name, city, gender, price, amenity badges, rating
- **Therapist card:** Name + credentials, city, specialties, insurance, telehealth badge
- **Meeting card:** Fellowship icon, name, location, day/time, format badge, specialty tags
- **Venue card:** Name, neighborhood, venue type, amenity badges, rating

### Type-Specific Detail Pages

```
/find/treatment-centers/[slug]  → Full listing with lead form (if enhanced+)
/find/sober-living/[slug]       → Full listing with lead form (if enhanced+)
/find/therapists/[slug]         → Profile with lead form (if enhanced+)
/find/meetings/[slug]           → Meeting detail card (no lead form, just info)
/find/sober-venues/[slug]       → Venue profile (no lead form, just info + map)
```

### Guided Discovery Flow → Directory Routing

The guided discovery flow (Steps 1-4) routes to the appropriate directory page:
- "Meetings & support groups near me" → /find/meetings?category=alcohol (pre-filtered)
- "Treatment centers & professional help" → /find/treatment-centers?category=alcohol
- "Support for me as a family member" → /find/meetings?fellowship=al-anon
- "All of the above" → /find?category=alcohol (hub page with all types shown)

### Database Note

The schema does NOT need to change. The `facilities` table stays as-is with the `facility_type` enum discriminator. The `meetings` table is already separate. This is purely a frontend routing and query concern — each page simply adds a WHERE clause on `facility_type`.

---

## File Structure

```
app/
├── find/
│   ├── page.tsx                          # Hub page (category selector)
│   ├── treatment-centers/
│   │   ├── page.tsx                      # Treatment center directory
│   │   └── [slug]/page.tsx               # Treatment center detail
│   ├── sober-living/
│   │   ├── page.tsx                      # Sober living directory
│   │   └── [slug]/page.tsx               # Sober living detail
│   ├── therapists/
│   │   ├── page.tsx                      # Therapist directory
│   │   └── [slug]/page.tsx               # Therapist detail/profile
│   ├── meetings/
│   │   ├── page.tsx                      # Meeting finder
│   │   └── [slug]/page.tsx               # Meeting detail
│   └── sober-venues/
│       ├── page.tsx                      # Sober venue directory
│       └── [slug]/page.tsx               # Venue detail
├── for-providers/
│   └── page.tsx                          # Public landing page
├── providers/
│   ├── layout.tsx                        # Auth guard + provider nav
│   ├── dashboard/
│   │   └── page.tsx                      # Dashboard with tabs
│   ├── claim/
│   │   └── page.tsx                      # Claim/create facility flow
│   └── login/
│       └── page.tsx                      # Phone OTP login
├── admin/
│   ├── layout.tsx                        # Admin auth guard (ADMIN_USER_IDS check)
│   ├── page.tsx                          # Dashboard overview
│   ├── claims/
│   │   └── page.tsx                      # Provider claims queue
│   ├── facilities/
│   │   ├── page.tsx                      # Facility management table
│   │   └── [id]/page.tsx                 # Edit facility
│   ├── users/
│   │   └── page.tsx                      # User management
│   ├── leads/
│   │   └── page.tsx                      # All leads overview
│   └── content/
│       ├── page.tsx                      # Article management
│       └── [id]/page.tsx                 # Edit article
components/
├── directory/
│   ├── DirectoryHub.tsx                  # Category selector cards
│   ├── TreatmentCenterCard.tsx           # Type-specific card
│   ├── SoberLivingCard.tsx
│   ├── TherapistCard.tsx
│   ├── MeetingCard.tsx
│   ├── VenueCard.tsx
│   ├── DirectoryFilters.tsx              # Shared filter shell
│   ├── TreatmentFilters.tsx              # Type-specific filters
│   ├── MeetingFilters.tsx
│   ├── LocationSearch.tsx                # Shared location input
│   └── LeadCaptureForm.tsx              # Tier-gated contact form
├── providers/
│   ├── OverviewTab.tsx
│   ├── ListingTab.tsx
│   ├── LeadsTab.tsx
│   ├── PlanTab.tsx
│   ├── TierCard.tsx
│   ├── StatCard.tsx
│   ├── LeadCard.tsx
│   ├── StatusBadge.tsx
│   └── ClaimFlow.tsx
├── admin/
│   ├── AdminNav.tsx                      # Sidebar navigation
│   ├── ClaimsQueue.tsx
│   ├── FacilityTable.tsx
│   ├── UserTable.tsx
│   ├── LeadsTable.tsx
│   └── AdminStats.tsx
├── ui/                                   # Shared UI components
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   └── Card.tsx
lib/
├── supabase/
│   ├── client.ts                         # Browser Supabase client
│   ├── server.ts                         # Server Supabase client (user context)
│   ├── admin.ts                          # Server Supabase client (service_role for admin)
│   └── middleware.ts                     # Auth middleware
├── types/
│   └── database.ts                       # TypeScript types from Supabase
└── utils/
    └── provider.ts                       # Helper functions (tier checks, etc.)
```

---

## Reference UI

The file `provider-dashboard.jsx` in this project is a working React prototype with mock data. It shows the exact layout, styling, and interaction patterns. Use it as the visual reference but rebuild with:
- Next.js App Router patterns
- Tailwind CSS (matching the design tokens above)
- Real Supabase queries instead of mock data
- Proper auth guards and RLS

---

## Admin Panel (`/admin`)

An internal admin dashboard for TJ and Angel to manage the platform without touching the database directly or using Claude Code.

### Access Control

Use an environment variable to define admin users:

```env
ADMIN_USER_IDS=uuid-for-tj,uuid-for-angel
```

Middleware on `/admin/*` routes checks `auth.uid()` against this list. Non-admins get a 404 (not a 403 — don't reveal the admin route exists).

### Admin Pages

#### `/admin` — Dashboard Overview
- Key metrics: total facilities, total claimed, total verified, total leads (this month), total users
- Recent activity feed: new claims, new leads, new user signups
- Quick links to each admin section

#### `/admin/claims` — Provider Claims Queue
This is the primary workflow page. When a provider claims a listing, it appears here for review.

**Hybrid verification flow:**
1. Provider claims a facility
2. System checks: does their signup email domain match the facility's `website` domain?
   - Domain match → auto-verify: set `is_claimed = true`, `is_verified = true`, skip the queue
   - No match → set `is_claimed = true`, `is_verified = false`, add to claims queue
3. Admin reviews pending claims in the queue

**Queue UI:**
- Table/list showing: facility name, provider name, provider email, facility website, claim date, status
- Highlight domain mismatches (e.g., provider email is `bob@gmail.com` but facility website is `serenityridge.com`)
- Action buttons: Approve (sets `is_verified = true`) | Reject (sets `is_claimed = false`, unlinks `provider_account_id`)
- Filter: Pending | Approved | Rejected

#### `/admin/facilities` — Facility Management
- Searchable/filterable table of all facilities
- Columns: name, city, type, tier, claimed, verified, featured, leads count
- Inline actions: toggle verified, toggle featured, change tier
- Click to edit: full facility edit form (same fields as provider edit, but unrestricted)
- Bulk actions: verify multiple, feature multiple
- Add new facility manually
- Delete facility (soft delete or hard delete with confirmation)

#### `/admin/users` — User Management
- Two tabs: Providers | Members (sponsor/sponsee)
- **Providers tab:** provider name, email, organization, linked facility, tier, signup date, active status
  - Actions: deactivate, change tier, view their dashboard
- **Members tab:** display name, email, signup date, active status
  - Actions: deactivate account

#### `/admin/leads` — Leads Overview
- All leads across all facilities (not scoped to one provider)
- Columns: lead name, phone, facility name, seeking, who_for, status, date
- Filter by: facility, status, date range
- Export to CSV (useful for reporting)
- Shows aggregate stats: total leads, conversion rate, leads by facility

#### `/admin/content` — Article Management (Phase 2)
- List all articles with publish status
- Create/edit articles with markdown editor
- Toggle published/draft
- Manage categories and content pillars

### Admin Notification System

When a provider claims a listing and it doesn't auto-verify, notify admins:
- **MVP:** Send an email to TJ and Angel via Supabase Edge Function triggered by INSERT on `provider_accounts`
- **Later:** In-app notification badge on the admin nav showing pending claims count

### Database Changes Needed

```sql
-- No new tables needed. The admin panel reads/writes existing tables:
-- facilities (toggle is_verified, is_featured, is_claimed, edit all fields)
-- provider_accounts (view, deactivate, change tier)
-- leads (view all, export)
-- user_profiles (view, deactivate)
-- articles (create, edit, publish)

-- RLS policy for admin access:
-- Admin bypasses RLS by using the service_role key on server-side API routes
-- All /admin/* pages are server components that use the service_role Supabase client
-- This means NO new RLS policies — admin routes use the privileged client
```

### Admin File Structure

```
app/
├── admin/
│   ├── layout.tsx                # Admin auth guard (checks ADMIN_USER_IDS)
│   ├── page.tsx                  # Dashboard overview
│   ├── claims/
│   │   └── page.tsx              # Claims queue
│   ├── facilities/
│   │   ├── page.tsx              # Facility list
│   │   └── [id]/page.tsx         # Edit facility
│   ├── users/
│   │   └── page.tsx              # User management (tabs: providers, members)
│   ├── leads/
│   │   └── page.tsx              # All leads overview
│   └── content/
│       ├── page.tsx              # Article list
│       └── [id]/page.tsx         # Edit article
components/
├── admin/
│   ├── AdminNav.tsx              # Sidebar navigation
│   ├── ClaimsQueue.tsx
│   ├── FacilityTable.tsx
│   ├── UserTable.tsx
│   ├── LeadsTable.tsx
│   └── AdminStats.tsx
```

---

## Priority Order

1. Auth flow (email + password login/signup for both user types, forgot password)
2. Provider dashboard layout with tabs
3. Listing edit/save functionality
4. Claim existing facility flow (with hybrid auto-verify / manual queue)
5. Admin panel — claims queue + facility management (needed to verify providers)
6. Consumer directory pages (5 separate pages by facility_type)
7. Lead capture form on consumer listing page (tier-gated)
8. Leads inbox with status management
9. RLS policies
10. Admin panel — users, leads overview, content management
11. Plan & billing page (static for now, Stripe later)

---

## Notes

- Supabase project: `ybpwqqbnfphdmsktghqd`
- Supabase org: `yazswbplsiyiedljurtm`
- Region: `us-west-1`
- PostGIS is enabled for geo queries
- Twilio phone auth is configured in Supabase but blocked pending 10DLC registration — use email + password as primary auth for now
- Auth method is email + password for BOTH provider portal AND sponsor/sponsee — same Supabase Auth, different post-login routing
- Include "Forgot password?" link on all login pages using Supabase's built-in resetPasswordForEmail
- 22 facilities already seeded in San Diego area (11 treatment, 5 sober living, 2 therapists, 3 venues, 1 outpatient)
- 19 meetings seeded in separate `meetings` table
- The `facilities` table uses a `facility_type` enum to distinguish resource types — do NOT mix types in the same results page
- Each directory page (`/find/treatment-centers`, `/find/meetings`, etc.) queries with a WHERE clause on `facility_type` — no schema changes needed
- `user_profiles` table exists for the sponsor/sponsee feature — separate from providers
