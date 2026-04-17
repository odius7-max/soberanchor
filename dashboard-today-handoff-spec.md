# Dashboard "Today" Redesign — Handoff Spec

**Status:** Ready for implementation
**Owner (design):** Travis
**Target branch:** `dev`
**Source of truth for visual:** `dashboard-today-wireframe.html` (v5.1, in repo root)
**Related specs:** `DECISIONS.md`, `RECOVERY-PROGRAM-SKILL.md`, `CLAUDE.md` (pre-push QA)
**Supabase project:** `ybpwqqbnfphdmsktghqd` (us-west-1)

---

## 1. Overview

The current `/dashboard` renders a catalog of 6+ equal-weight cards with no hierarchy. Beta feedback (Angel) surfaced: "What is a member supposed to do and in what order?" This redesign reframes the authenticated landing from an inventory into a **daily action queue** with cross-role pull-through.

Three user-visible shifts:

1. **"Today's practice" action queue** — a ranked list of 4–6 daily items (check-in, step work, meeting, enrichment). The existing card grid stays available on sub-tabs; the default landing is the queue.
2. **Unified check-in** — one modal captures mood + meeting attendance + optional note in a single flow. 5-point mood scale. Smart meeting chips (personal meetings supported).
3. **Cross-role pull-through** — struggling sponsees, step-work reviews, and milestone reminders surface in the sponsor's own Today queue, not in a separate tab.

Additional supporting work: subnav visual separation, hero gold hierarchy rebalance, "My Recovery" → "My Journey" rename, celebration panel with close + auto-dismiss, mood-aware rough-day variant with compassionate callout.

### Non-goals (this push)
- Weekly / streak history view (gamification Phase 2 — see `gamification-wireframes.html`)
- Admin controls for the quote library (seed via migration, admin UI later)
- Provider dashboard changes (the tab exists; no structural change this round)
- Step-work prompt rendering changes
- Email/push notifications for milestone reminders (in-app only for Phase 1)

### Rollout
- Feature flag: `NEXT_PUBLIC_TODAY_QUEUE_ENABLED` (env, read client-side). Default `false` on prod, `true` on dev.
- Rollback: flip the flag. All new tables are additive; no existing columns change (only an enum addition).

---

## 2. Implementation phases

Implement in order. Each phase is shippable to `dev` and independently reviewable.

| Phase | Scope | Files touched |
|---|---|---|
| A | DB migrations (3 new tables, enum addition, RLS) | `supabase/migrations/*` |
| B | Design tokens + global CSS additions | `src/app/globals.css` |
| C | Dashboard hero rebalance + `TodayCard` components + priority/query logic | `src/app/dashboard/page.tsx`, `src/components/dashboard/DashboardShell.tsx`, `DashboardBanner.tsx`, new `TodayCard/*` |
| D | Unified check-in modal + celebration panel (default + rough-day variants) | `src/components/dashboard/CheckInModal.tsx`, new `CelebrationPanel.tsx` |
| E | Sponsor pull-through + milestone reminder windows | `src/components/dashboard/SponsorView.tsx`, new `lib/today-queue.ts` |
| F | Caught-up state + full copy deck wire-in | `TodayCard/*`, `CelebrationPanel.tsx`, copy constants |
| G | QA pass (CLAUDE.md checklist) + a11y + feature-flag gate | all of the above |

---

## 3. Phase A — Database migrations

All new tables MUST have RLS enabled with appropriate policies before pushing (CLAUDE.md rule). Migrations are additive — no existing column drops.

### A.1 · Migration filename

`supabase/migrations/20260417000000_today_queue.sql`

### A.2 · Mood enum addition

The `check_ins.mood` column is currently a string union: `'great' | 'good' | 'okay' | 'struggling' | 'crisis'`. Add **`hard`** as the 4th point on the 5-point scale used in the new UI. `crisis` stays valid for legacy/server-triggered flags but is not shown in the new modal UI.

If `check_ins.mood` is a Postgres `TEXT` column with a CHECK constraint or enum type, update accordingly. If it's unconstrained text today (the component uses a TS union), no migration is strictly required — document the set. Verify via:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'check_ins' AND column_name = 'mood';
```

If a CHECK constraint exists: `ALTER TABLE check_ins DROP CONSTRAINT <name>; ALTER TABLE check_ins ADD CONSTRAINT check_ins_mood_check CHECK (mood IN ('great','good','okay','hard','struggling','crisis'));`

### A.3 · `user_custom_meetings` table

Stores personal meetings members log from the check-in flow (e.g. coffee with sister, church small group, 1:1 with sponsor) separately from the public `meetings` directory.

```sql
CREATE TABLE public.user_custom_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public','personal','sponsor','other')),
  recurrence TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','weekly','custom')),
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun per JS Date.getDay
  time_local TIME,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,  -- content-private, count-shared
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_custom_meetings_user ON public.user_custom_meetings(user_id, is_active);

ALTER TABLE public.user_custom_meetings ENABLE ROW LEVEL SECURITY;

-- Owner can read/write their own custom meetings
CREATE POLICY "own custom meetings read"
  ON public.user_custom_meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own custom meetings write"
  ON public.user_custom_meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Active sponsors can read NAME and TYPE of their sponsee's custom meetings
-- IF is_private = FALSE. For is_private = TRUE the sponsor gets counts only
-- via a view (below), never the name.
CREATE POLICY "sponsor reads sponsee public custom meetings"
  ON public.user_custom_meetings FOR SELECT
  USING (
    is_private = FALSE
    AND EXISTS (
      SELECT 1 FROM public.sponsor_relationships sr
      WHERE sr.sponsor_user_id = auth.uid()
        AND sr.sponsee_user_id = user_custom_meetings.user_id
        AND sr.status = 'active'
    )
  );
```

> **Sponsor table name check** — confirm `sponsor_relationships` is the actual table (check `DECISIONS.md` / the existing `SponsorView.tsx` query). If it's named differently (e.g. `user_sponsors`), update the RLS clause.

### A.4 · `sponsor_meeting_counts_view` (privacy-preserving)

A view so sponsors see **only aggregate counts** of private custom meetings, never names.

```sql
CREATE OR REPLACE VIEW public.sponsor_sponsee_meeting_counts AS
SELECT
  ucm.user_id AS sponsee_user_id,
  DATE_TRUNC('week', ma.attended_at)::DATE AS week_start,
  COUNT(*) FILTER (WHERE ucm.is_private = TRUE)  AS private_count,
  COUNT(*) FILTER (WHERE ucm.is_private = FALSE) AS shared_count
FROM public.meeting_attendance ma
LEFT JOIN public.user_custom_meetings ucm
  ON ucm.id = ma.custom_meeting_id
GROUP BY ucm.user_id, DATE_TRUNC('week', ma.attended_at);

GRANT SELECT ON public.sponsor_sponsee_meeting_counts TO authenticated;
```

> Requires adding `custom_meeting_id UUID NULL REFERENCES user_custom_meetings(id)` to `meeting_attendance` (see A.5). Existing rows are untouched (nullable column).

### A.5 · `meeting_attendance` column addition

```sql
ALTER TABLE public.meeting_attendance
  ADD COLUMN IF NOT EXISTS custom_meeting_id UUID
    REFERENCES public.user_custom_meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_custom
  ON public.meeting_attendance(custom_meeting_id)
  WHERE custom_meeting_id IS NOT NULL;
```

Writes from the unified check-in either set `meeting_id` (public directory) or `custom_meeting_id` (personal), never both. Add a CHECK:

```sql
ALTER TABLE public.meeting_attendance
  ADD CONSTRAINT meeting_attendance_single_source
  CHECK (
    (meeting_id IS NOT NULL AND custom_meeting_id IS NULL) OR
    (meeting_id IS NULL AND custom_meeting_id IS NOT NULL) OR
    (meeting_id IS NULL AND custom_meeting_id IS NULL)  -- free-text fallback
  );
```

### A.6 · `inspiration_quotes` table

Quote library for the hero daily quote + struggling-mood celebration callout.

```sql
CREATE TABLE public.inspiration_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  attribution TEXT,
  tone_tag TEXT NOT NULL CHECK (tone_tag IN ('morning','reflective','struggling','caught_up','general')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspiration_quotes_tone ON public.inspiration_quotes(tone_tag, is_active);

ALTER TABLE public.inspiration_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active quotes"
  ON public.inspiration_quotes FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

-- Writes: service role only (admin UI is a later project)
```

**Seed data** — insert ~20 quotes spread across tone tags. Seed SQL in Appendix §12.

### A.7 · `sponsor_milestone_reminders` table

Tracks which milestones have been surfaced to which sponsor so we don't re-notify. Also captures dismissal state.

```sql
CREATE TABLE public.sponsor_milestone_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_label TEXT NOT NULL,      -- e.g. "2 years", "30 days"
  milestone_date DATE NOT NULL,
  surfaced_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,           -- when sponsor marks "chip ordered / plan made"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sponsor_user_id, sponsee_user_id, milestone_label, milestone_date)
);

CREATE INDEX idx_milestone_reminders_sponsor
  ON public.sponsor_milestone_reminders(sponsor_user_id, milestone_date);

ALTER TABLE public.sponsor_milestone_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsor reads own reminders"
  ON public.sponsor_milestone_reminders FOR SELECT
  USING (auth.uid() = sponsor_user_id);

CREATE POLICY "sponsor writes own reminders"
  ON public.sponsor_milestone_reminders FOR ALL
  USING (auth.uid() = sponsor_user_id)
  WITH CHECK (auth.uid() = sponsor_user_id);
```

Populated by a nightly edge function (Phase 2) or lazily computed on dashboard load (Phase 1, acceptable for beta scale). See §7.2 for the surface-window logic.

### A.8 · Verify migration

After applying, run the list in psql:

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('user_custom_meetings','inspiration_quotes','sponsor_milestone_reminders');

SELECT COUNT(*) FROM public.inspiration_quotes;  -- should be ~20
```

**Never trust that a migration ran** (CLAUDE.md) — include the verify SELECTs in the PR description.

---

## 4. Phase B — Design tokens + CSS

Add tokens to `src/app/globals.css`. Pattern: add to `:root` block, mirror in `@theme inline` where a Tailwind utility is wanted.

### B.1 · New tokens

```css
/* Add to :root */
--gold-hero: #f0c040;          /* punchy hero gold (distinct from --gold) */
--green-ok: #27AE60;           /* already aliased in @theme as --color-green */
--green-bg: rgba(39,174,96,0.12);
--red-alert: #C0392B;
--red-alert-bg: rgba(192,57,43,0.1);
--teal-bg: rgba(42,138,153,0.08);  /* alias for --teal-10, clearer naming */

/* Shadow for subnav band */
--shadow-subnav-inset: inset 0 1px 0 rgba(0,0,0,0.015);
```

```css
/* Add to @theme inline */
--color-gold-hero: #f0c040;
--color-red-alert: #C0392B;
```

### B.2 · Subnav band

The current subnav sits directly on white and visually blurs with the top nav. Give it a warm-gray band with inset shadow:

```css
.subnav-band {
  background: var(--warm-gray);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-subnav-inset);
}
```

Apply this class to the element that wraps the mode tab bar in `DashboardShell.tsx` (currently lines ~137–141).

### B.3 · `today-label` headline

Retire the tiny all-caps "section-label" treatment for the Today card head. New spec (use Tailwind or component CSS):

- size: 22px desktop, 18px mobile (`text-[22px] md:text-[22px] max-md:text-[18px]`)
- weight: 700
- color: `var(--navy)`
- letter-spacing: `-0.4px`

### B.4 · Celebration panel styles

Port the CSS from `dashboard-today-wireframe.html` §celebrate block into a component-scoped CSS module or inline Tailwind. Minimum needed: `.celebrate`, `.confetti`, `.close-x`, `.callout-soft`, `.streak`, `.done-btn`, `.secondary-btn`, `.auto-dismiss-note`. See wireframe lines 175–258 for the full block — reuse verbatim.

### B.5 · Do NOT use

- No hardcoded hex colors in new components (CLAUDE.md rule)
- No `style={{ color: '#...' }}` in JSX — use tokens only
- No `font-display` references in new code (Cormorant retired; the alias stays only for legacy components)

---

## 5. Phase C — Dashboard hero + Today card

### C.1 · File structure

New files:

```
src/components/dashboard/today/
├── TodayCard.tsx              # Container — header + subtitle + items + footer
├── TodayItem.tsx              # Single row (icon + label + sub + CTA)
├── CaughtUpState.tsx          # Empty/caught-up variant
├── useTodayQueue.ts           # Hook that builds the ranked item list
└── today-queue-types.ts       # TypeScript types
src/lib/today-queue.ts         # Server-side priority computation
```

Existing files edited:

```
src/components/dashboard/DashboardBanner.tsx   # gold hierarchy rebalance, quote injection
src/components/dashboard/DashboardShell.tsx    # rename tab, add subnav-band class
src/app/dashboard/page.tsx                      # feature flag + render TodayCard when enabled
src/components/Nav.tsx                          # no changes expected
```

### C.2 · `DashboardBanner.tsx` updates

**Rename & tokens only — no structural change.** Currently renders greeting, days sober, fellowship, current step, next milestone. Apply the visual changes:

| Element | Current | New |
|---|---|---|
| Greeting text | 20px | 22px |
| Days sober (strong) | 14px, `--gold-hero` | **22px**, `--gold-hero`, letter-spacing -0.4px |
| "NEXT MILESTONE" label | 11px, 0.75 opacity gold | 11px, **full-opacity** `--gold-hero`, letter-spacing 1px |
| Milestone value | white, 13px | white, 13px, weight 600 |
| Step band "Step 1 · Powerlessness" | 13px gold | **no change** — already correct |
| Daily quote (NEW) | n/a | 15px italic, 0.82 opacity white, `border-top: 1px solid rgba(255,255,255,0.08)`, attribution 12px 0.5 opacity |

**Daily quote fetch:** server-side in `page.tsx`, one row from `inspiration_quotes` filtered by tone tag (morning 5a–noon, reflective noon–6p, caught_up 6p–5a). Pass as prop to `DashboardBanner`. Rotate daily using `date + user_id` as seed for stability.

```ts
// src/lib/daily-quote.ts
export async function getDailyQuote(
  supabase: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<{ text: string; attribution: string | null } | null> {
  const hour = now.getHours();
  const tone =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'reflective' :
    'reflective';  // evening/night falls back to reflective
  const seed = `${now.toISOString().slice(0,10)}-${userId}`;
  const { data } = await supabase
    .from('inspiration_quotes')
    .select('text, attribution, tone_tag')
    .in('tone_tag', [tone, 'general'])
    .eq('is_active', true);
  if (!data?.length) return null;
  // Deterministic pick based on seed hash
  const idx = Math.abs(hashCode(seed)) % data.length;
  return data[idx];
}
```

### C.3 · `TodayCard.tsx` — layout spec

```
┌──────────────────────────────────────────────┐
│  Today's practice            Thu, Apr 16     │ ← head (20px padding, 22px label)
│  Small things that keep you grounded.        │ ← subtitle (13px mid gray)
│  Your pace, your order — skip what doesn't   │
│  fit today.                                  │
├──────────────────────────────────────────────┤
│  [⚓] Log today's check-in       [Check in →]│ ← TodayItem (gold accent for hero action)
│       Mood · meeting · a note                │
├──────────────────────────────────────────────┤
│  [📝] Continue Step 1: Powerlessness [Continue →]
│       1 prompt in progress · started yesterday│
├──────────────────────────────────────────────┤
│  ... up to 6 items ...                       │
├──────────────────────────────────────────────┤
│  Come back tomorrow — practice updates daily.│ ← footer (12px mid)
└──────────────────────────────────────────────┘
```

Spacing: wrapper border-radius 12px, card shadow `var(--shadow-card)`, items separated by `1px var(--border)`. Item row: 16–18px vertical padding, 20px horizontal. Icon container: 40×40px, rounded 10px, bg `var(--teal-bg)` or `var(--gold-10)` for gold variant.

### C.4 · `TodayItem` props

```ts
type TodayItem = {
  id: string;                   // stable for keys
  icon: string;                 // emoji OR component
  variant?: 'default' | 'gold' | 'alert';
  label: string;                // required
  sub?: string;                 // optional subline
  cta: string;                  // "Check in →" etc.
  href?: string;                // navigate on click
  onClick?: () => void;         // for modal-opening items (e.g. check-in)
  priority: number;             // for ranking
  completed?: boolean;          // renders with strike-through + check mark
};
```

Completed items stay visible (checked through) until the 4am rollover — see §5.5.

### C.5 · `useTodayQueue` — ranking logic

Given the user's state, produce an ordered `TodayItem[]`. Priority tiers (CLAUDE.md reference — cross-role pull-through):

**Tier 1 — Alerts (role: sponsor only)**
- Struggling sponsee check-in in last 24h → priority 1000, `alert` variant, red
- Sponsee 3+ consecutive "hard" days → priority 950, alert variant (softer)
- Sponsee silent 3+ days → priority 900

**Tier 2 — Self, daily habit**
- Today's check-in not yet logged → priority 500, `gold` variant
- Step work in progress → priority 450
- Weekly meeting count < target → priority 400

**Tier 3 — Sponsor tasks**
- Step-work submissions awaiting review (oldest first) → 300 − (hours waiting)
- Upcoming sponsee milestone within window (§7.2) → priority 250

**Tier 4 — Enrichment**
- Recommended reading tied to current step → priority 100

Rendering caps at **6 items**. Overflow rolls into a single "3 more →" row linking to the existing tabs.

### C.6 · `page.tsx` wiring

```tsx
// Inside the dashboard page server component
const todayQueue = await buildTodayQueue(supabase, user.id);
const dailyQuote = await getDailyQuote(supabase, user.id);

return (
  <DashboardShell {...existingProps}>
    <DashboardBanner {...existingProps} dailyQuote={dailyQuote} />
    {process.env.NEXT_PUBLIC_TODAY_QUEUE_ENABLED === 'true' ? (
      <TodayCard items={todayQueue.items} caughtUp={todayQueue.caughtUp} />
    ) : (
      <ExistingCardGrid />
    )}
    {/* Right rail (Progress / People / History) stays as-is */}
  </DashboardShell>
);
```

### C.7 · "Day rollover" logic

The "today" window runs **4am local time → 4am next day**. Implement server-side using the user's timezone:

```ts
// src/lib/today-window.ts
export function getTodayWindow(tz: string, now = new Date()): { start: Date; end: Date } {
  const local = toZonedTime(now, tz);
  const hour = local.getHours();
  const start = new Date(local);
  start.setHours(4, 0, 0, 0);
  if (hour < 4) start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
```

`user_profiles.timezone` must exist (IANA name). If null, default to `America/Los_Angeles` and flag to the user in Settings (out of scope for this PR).

---

## 6. Phase D — Unified check-in modal + celebration

### D.1 · Files

```
src/components/dashboard/CheckInModal.tsx          # EXISTING — major rewrite
src/components/dashboard/checkin/
├── MoodScale.tsx          # 5-point emoji row
├── MeetingChips.tsx       # smart chips + custom form expansion
├── CustomMeetingForm.tsx  # inline form for +Custom
├── CelebrationPanel.tsx   # post-save success state (default + rough-day)
└── checkin-types.ts
```

### D.2 · `CheckInModal` structure

The modal replaces the existing 3-section layout (mood / meeting / notes) with a single vertical flow. No tabs, no steps — one page, one Save.

```
┌────────────────────────────────────────────┐
│  Check in · Thursday, April 16         ×   │
│  Only mood is required.                    │
├────────────────────────────────────────────┤
│  How are you today?                        │
│  [😖] [😕] [😐] [🙂] [😊]                   │  ← MoodScale
│   Strug. Hard  Okay  Good  Great            │
├────────────────────────────────────────────┤
│  Meeting today? (optional)                 │
│  ○ Tue 7pm · Lambda Nexus AA  usual        │  ← MeetingChips
│  ○ Mon 12pm · Fresh Start                  │
│  ○ Sun 10am · Sister coffee    personal    │
│  ○ + Different meeting                     │
│  ○ + Custom meeting                        │
│  ○ No meeting today                        │
├────────────────────────────────────────────┤
│  A note? (optional)                        │
│  [________textarea________________]         │
│  Private by default. Visible to your sponsor.│
├────────────────────────────────────────────┤
│           [  Save check-in  ]              │
└────────────────────────────────────────────┘
```

**Required field:** mood only. Meeting and note are optional. Save button disabled until a mood is selected.

### D.3 · `MoodScale` spec

5 chips, horizontal row, gap 6px on desktop / 2px on mobile. Each chip:
- Width: min 56px, grows to fit
- Height: 64px desktop, 52px mobile
- Stacked: emoji (28px desktop / 20px mobile) above label (12px / 10px mobile)
- Border: 1px `var(--border)`, border-radius: 12px
- Selected: border `var(--teal)` 2px, bg `var(--teal-bg)`, label weight 700
- `struggling` selected: border `var(--red-alert)`, bg `var(--red-alert-bg)` (subtle visual acknowledgement, never "scary")
- `great` selected: border `var(--gold-hero)`, bg rgba(240,192,64,0.08)

Mood values map to:
```ts
const MOODS = [
  { key: 'struggling', emoji: '😖', label: 'Struggling', tone: 'rough' },
  { key: 'hard',       emoji: '😕', label: 'Hard',       tone: 'rough' },
  { key: 'okay',       emoji: '😐', label: 'Okay',       tone: 'neutral' },
  { key: 'good',       emoji: '🙂', label: 'Good',       tone: 'positive' },
  { key: 'great',      emoji: '😊', label: 'Great',      tone: 'positive' },
] as const;
```

`crisis` is NOT rendered in this UI but stays a valid DB value. `tone` drives the celebration variant (see D.6).

### D.4 · `MeetingChips` — smart ranking

Server query (on modal open, via a route handler or server action):

```sql
-- Top meetings: union of public meeting_attendance + user_custom_meetings,
-- cluster by meeting_id + day_of_week, rank by recency × frequency
WITH recent AS (
  SELECT
    COALESCE(meeting_id::text, 'custom:' || custom_meeting_id::text) AS key,
    MAX(attended_at) AS last_attended,
    COUNT(*) AS freq_90d
  FROM public.meeting_attendance
  WHERE user_id = $1 AND attended_at > NOW() - INTERVAL '90 days'
  GROUP BY key
)
SELECT key, last_attended, freq_90d,
       (freq_90d * 10 + EXTRACT(EPOCH FROM (NOW() - last_attended))/-86400.0) AS score
FROM recent
ORDER BY score DESC
LIMIT 4;
```

Resolve `key` against `meetings` + `user_custom_meetings` tables to produce chip labels. First chip gets a small teal "usual" pill if it's been attended 4+ weeks running.

**Empty state (0 logged meetings):**
- Chip 1: "+ Add your first meeting" → opens meeting directory picker
- Chip 2: "+ Custom meeting" → opens `CustomMeetingForm`
- Chip 3: "No meeting today"

**High-count state (10+ unique):** show top 3 + "+ Different meeting" (opens full picker).

### D.5 · `CustomMeetingForm` — inline expansion

Triggered by the "+ Custom meeting" chip. Expands in-place (no nested modal):

```
┌────────────────────────────────────────────┐
│  Custom meeting                            │
│  ─────────────────────────────────────     │
│  Name  [_________________________________]  │
│                                            │
│  Type  [○ Public] [● Personal] [○ Sponsor] │
│        [○ Other]                           │
│                                            │
│  Recurs  [○ Just today] [● Weekly on Sun]  │
│          [○ Daily] [○ Custom]   [AUTO]     │
│                                            │
│  [×] Save to my meetings for next time     │
│  [×] Private — share count only with sponsor│
│                                            │
│            [ Save meeting ]                │
└────────────────────────────────────────────┘
```

**Smart recurrence detection** (on form open):
- Query `meeting_attendance` for matching patterns by name / day-of-week
- 3+ same-day-of-week attendances → pre-select "Weekly on {Day}" with gold `AUTO` badge
- 4+ consecutive days → pre-select "Daily"
- Otherwise default to "Just today"

On save: upsert `user_custom_meetings` (if "Save to my meetings" checked) then insert `meeting_attendance` with `custom_meeting_id` set.

### D.6 · Save handler

Replace existing `handleSave` (currently CheckInModal.tsx ~line 39–46). New flow:

```ts
async function handleSave(state: CheckinState) {
  // 1. Insert check_in row (existing behavior + new schema)
  const { error: ciError } = await supabase.from('check_ins').insert({
    user_id: userId,
    mood: state.mood,
    sober_today: true,
    notes: state.note || null,
    // deprecating meetings_attended / called_sponsor — handle via separate flows
  });
  if (ciError) return { error: ciError.message };

  // 2. If meeting selected, insert meeting_attendance
  if (state.meeting) {
    await supabase.from('meeting_attendance').insert({
      user_id: userId,
      meeting_id: state.meeting.kind === 'public' ? state.meeting.id : null,
      custom_meeting_id: state.meeting.kind === 'custom' ? state.meeting.id : null,
      meeting_name: state.meeting.name,
      attended_at: new Date().toISOString(),
      checkin_method: 'dashboard_quick',
      notes: state.note || null,
    });
  }

  // 3. If custom meeting and "save to my meetings", upsert
  if (state.newCustom) {
    await supabase.from('user_custom_meetings').insert({ ... });
  }

  // 4. Log activity (existing)
  await logCheckInActivity({...});

  // 5. Compute streak for celebration panel
  const streak = await computeStreak(supabase, userId);

  // 6. Return celebration props — caller swaps modal body
  return { streak, mood: state.mood, summary: buildSummary(state) };
}
```

### D.7 · `CelebrationPanel` — default variant

Shown immediately after a successful `Good`/`Great`/`Okay` check-in. CSS ported from wireframe §celebrate.

Behavior:
- Confetti fires on mount (CSS-only, 2.4s animation, no JS library)
- Streak badge renders IF streak ≥ 2 days
- Close (×) button top-right, always visible
- 8-second auto-dismiss (useEffect + setTimeout), clearable on any interaction
- Primary CTA "Keep going" dismisses + scrolls to next unchecked TodayItem
- Secondary CTA "Done for today" dismisses the entire modal

```tsx
<CelebrationPanel
  mood="okay"
  streak={937}
  summary={{ mood: 'okay', meeting: 'Lambda Nexus AA', note: 'concrete anchor bolts...' }}
  onClose={closeModal}
  onKeepGoing={() => { closeModal(); scrollToNextItem(); }}
/>
```

### D.8 · `CelebrationPanel` — rough-day variant (mood: `struggling` or `hard`)

When `mood.tone === 'rough'`:
- Confetti still fires BUT filter to warm palette only — omit `--gold-hero`, use `--gold`, `--teal`, `--teal-light`, cream
- Streak badge HIDDEN (don't make it about the streak on a hard day)
- Headline: `struggling` → "You showed up. That's the work." / `hard` → "Some days are heavier. You did this one anyway."
- `callout-soft` block rendered with a quote where `tone_tag = 'struggling'` (fetched via same `getDailyQuote` pattern, tone override)
- Primary CTA: `struggling` → "Call my sponsor" (teal, links to sponsor contact), `hard` → "Keep going"
- Secondary CTA: always "Done for today"
- Auto-dismiss: **12 seconds** (longer so the member can read the quote)

### D.9 · Modal lifecycle + a11y

- Modal renders via portal at `document.body` (CLAUDE.md rule)
- `role="dialog"`, `aria-labelledby="checkin-title"`, `aria-modal="true"`
- Focus trap inside modal, initial focus on first mood chip (struggling or the currently-selected)
- Escape closes (calls `onClose`)
- Clicking backdrop closes
- Body scroll locked while open
- `aria-live="polite"` on the CelebrationPanel so screen readers announce the completion

### D.10 · Copy strings

All strings in one object for easier future localization. Put in `src/lib/copy/checkin.ts`:

```ts
export const CHECKIN_COPY = {
  title: (date: string) => `Check in · ${date}`,
  subtitle: 'Only mood is required.',
  moodQ: 'How are you today?',
  meetingQ: 'Meeting today?',
  meetingQOptional: 'Meeting today? (optional)',
  noteQ: 'A note? (optional)',
  noteHelper: 'Private by default. Visible to your sponsor.',
  noteCounterCustom: 'Private to you — not shared.',  // when user toggles private on custom meeting
  save: 'Save check-in',
  saving: 'Saving…',
  customLabel: '+ Custom meeting',
  noMeeting: 'No meeting today',
} as const;
```

See §11 for full copy deck including celebration variants.

---

## 7. Phase E — Sponsor pull-through + milestones

### E.1 · Struggling sponsee query

```sql
-- Surface sponsees whose most recent check-in in last 24h was 'struggling'
SELECT
  sr.sponsee_user_id,
  up.display_name,
  ci.mood,
  ci.created_at,
  ci.notes
FROM public.sponsor_relationships sr
JOIN public.user_profiles up ON up.user_id = sr.sponsee_user_id
JOIN LATERAL (
  SELECT mood, created_at, notes
  FROM public.check_ins
  WHERE user_id = sr.sponsee_user_id
  ORDER BY created_at DESC LIMIT 1
) ci ON TRUE
WHERE sr.sponsor_user_id = $1
  AND sr.status = 'active'
  AND ci.created_at > NOW() - INTERVAL '24 hours'
  AND ci.mood = 'struggling';
```

Returns 0..N rows. Each becomes a Tier-1 alert in the sponsor's `TodayCard`. Alert copy: `"Angel checked in as struggling · 2h ago"`. CTA: `Reach out →` → links to `/dashboard/sponsees/[id]` (existing route) with a deep-link anchor to the check-in.

### E.2 · Milestone reminder windows

Reference table (implement as a constant in `src/lib/milestone-windows.ts`):

| Milestone | Days total | Surface N days before |
|---|---|---|
| 24h / desire | 1 | 0 (day-of) |
| 30 days | 30 | 7 |
| 60 days | 60 | 10 |
| 90 days | 90 | 10 |
| 6 months | 180 | 14 |
| 9 months | 270 | 14 |
| **1 year** | 365 | **21** |
| 18 months | 548 | 10 |
| Annual (2yr+) | 365×N | 14 |

```ts
export const MILESTONE_WINDOWS: Array<{ days: number; label: string; leadDays: number }> = [
  { days: 1,   label: '24 hours',  leadDays: 0 },
  { days: 30,  label: '30 days',   leadDays: 7 },
  { days: 60,  label: '60 days',   leadDays: 10 },
  { days: 90,  label: '90 days',   leadDays: 10 },
  { days: 180, label: '6 months',  leadDays: 14 },
  { days: 270, label: '9 months',  leadDays: 14 },
  { days: 365, label: '1 year',    leadDays: 21 },
  { days: 548, label: '18 months', leadDays: 10 },
];

// 2-year+ annual milestones generated dynamically:
export function getUpcomingMilestones(sobrietyDate: Date, now = new Date()) {
  const daysSober = Math.floor((+now - +sobrietyDate) / 86_400_000);
  const candidates = [
    ...MILESTONE_WINDOWS,
    // Annual after 2 years
    ...Array.from({ length: 30 }, (_, i) => ({
      days: 365 * (i + 2),
      label: `${i + 2} years`,
      leadDays: 14,
    })),
  ];
  return candidates.filter(m =>
    m.days >= daysSober &&
    m.days - daysSober <= m.leadDays
  );
}
```

### E.3 · Milestone reminder insert logic

On dashboard load, for each sponsee:
1. Compute `daysSober = today - sobriety_date`
2. Call `getUpcomingMilestones(sobrietyDate)` — returns 0..1 in-window milestones
3. If in-window AND no `sponsor_milestone_reminders` row for this (sponsor, sponsee, label, date) → insert one with `surfaced_at = NOW()`
4. Fetch all non-dismissed reminders with `milestone_date >= today` for this sponsor → render as TodayItems

Item copy:
- Day-of: `"🎉 {name} is celebrating {label} today — reach out"`
- Inside window: `"🎉 {name} hits {label} on {formatted_date}"` sub: `"{N} days out · time to order a chip or plan something"`
- CTA: `"Plan their {label} →"`

Click action: open a simple "Mark planned" confirmation (optional for v1 — can be just a navigate-to-profile).

### E.4 · Sponsor Today queue builder

```ts
export async function buildTodayQueue(supabase, userId: string): Promise<TodayQueueResult> {
  const items: TodayItem[] = [];

  // Tier 1 — alerts
  items.push(...await getStrugglingSponseeAlerts(supabase, userId));
  items.push(...await getSilentSponseeAlerts(supabase, userId));

  // Tier 2 — self
  items.push(...await getSelfDailyItems(supabase, userId));

  // Tier 3 — sponsor tasks
  items.push(...await getPendingReviews(supabase, userId));
  items.push(...await getMilestoneReminders(supabase, userId));

  // Tier 4 — enrichment
  items.push(...await getRecommendedReading(supabase, userId));

  // Rank + cap
  items.sort((a, b) => b.priority - a.priority);
  const visible = items.slice(0, 6);
  const overflow = items.length - visible.length;

  return {
    items: visible,
    overflowCount: overflow,
    caughtUp: items.every(i => i.completed),
  };
}
```

---

## 8. Phase F — Caught-up state + copy deck

### 8.1 · Caught-up trigger

All Tier 1–2 items completed for today AND no Tier 3 tasks outstanding. (A sponsor with review waits is NOT "caught up" even if their own check-in is done.)

### 8.2 · `CaughtUpState` component

```tsx
<CaughtUpState
  summary={{ mood, meetingName, stepProgress }}
  streak={12}
/>
```

Layout:
- 🌊 emoji, 46px
- Headline: "Anchored for today." (24px navy, weight 700)
- Paragraph: "Checked in, logged a meeting, spent time on Step 1. Come back tomorrow — practice updates daily."
- Divider (1px border, max-width 200px, centered)
- Summary line: `"Today you · checked in 'okay' · logged Lambda Nexus AA · answered 1 Step 1 prompt"`
- Right rail persists (Progress / People / History) so the member can still browse

**Important:** caught-up is NOT a full takeover. The right rail (sponsor/sponsee management, progress, history) stays visible. Members always retain the ability to Add sponsor / Invite sponsee.

### 8.3 · Copy deck — all user-facing strings

Put in `src/lib/copy/today.ts`:

```ts
export const TODAY_COPY = {
  // Today card
  headline: "Today's practice",
  subtitle: "Small things that keep you grounded. Your pace, your order — skip what doesn't fit today.",
  footer: "Come back tomorrow — practice updates daily.",
  overflowMore: (n: number) => `${n} more →`,

  // Sponsor subtitle override when struggling alert present
  subtitleSponsorAlert: (sponseeName: string) =>
    `${sponseeName} needs you first — then tend to yourself.`,

  // Caught-up
  caughtUpTitle: "Anchored for today.",
  caughtUpBody: "Come back tomorrow — practice updates daily.",
  caughtUpSummary: (parts: string[]) => `Today you · ${parts.join(' · ')}`,

  // Celebration — default
  celebrateTitle: "Anchored in for today.",
  celebrateStreakBadge: (days: number) => `Day ${days} · +1 streak`,

  // Celebration — rough-day headlines by mood
  celebrateStruggling: "You showed up. That's the work.",
  celebrateHard: "Some days are heavier. You did this one anyway.",
  celebrateOkay: "Anchored in for today.",
  celebrateGood: "Anchored in for today.",
  celebrateGreat: "A great one. Anchored in.",

  // Celebration callouts (rough-day only)
  calloutStruggling: "Even on the hardest days, checking in is the path. Keep walking it — things can shift when you let them.",
  calloutHard: "The work isn't feeling good. It's staying present. You stayed.",

  // Celebration CTAs
  ctaKeepGoing: "Keep going",
  ctaDoneForToday: "Done for today",
  ctaCallSponsor: "Call my sponsor",
  autoDismissDefault: "Auto-closes in 8s · or press × to return to your day",
  autoDismissRough: "Auto-closes in 12s on rough days · or press × to return to your day",
} as const;
```

### 8.4 · Subnav rename

In `DashboardShell.tsx` (line ~137–141):

```tsx
// Before
{ key: 'recovery', label: '✨ My Recovery', ... }
// After
{ key: 'recovery', label: '⚓ My Journey', ... }
```

Icon swap ✨ → ⚓ matches the brand. The internal key stays `'recovery'` to avoid breaking any URL hash state.

---

## 9. Phase G — QA + a11y + rollout

Run the CLAUDE.md pre-push checklist. Highlights specific to this feature:

### G.1 · Viewport testing (CLAUDE.md §1)
- [ ] Desktop 1440px — `TodayCard` + right rail sit side-by-side, no overflow
- [ ] Tablet 768px — cards stack, subnav remains horizontal
- [ ] Mobile 375px — single column, mood chips fit in row (test "Struggling" label doesn't truncate; abbrev to "Strug." below 400px)
- [ ] Celebration modal fits on 375×667 (iPhone SE)

### G.2 · Overlay / popup (CLAUDE.md §2)
- [ ] CheckInModal renders via portal (never nested inside card)
- [ ] z-index: modal `z-100`, celebration panel inherits, confetti `z-1` behind content
- [ ] Escape closes, backdrop click closes, × closes
- [ ] Body scroll locked when modal open (`useBodyScrollLock` hook)
- [ ] Celebration × works; auto-dismiss timer pauses on hover/focus

### G.3 · Auth states (CLAUDE.md §3)
- [ ] Logged in, onboarded → full Today queue
- [ ] Logged in, not onboarded → `OnboardingCard` takes precedence (existing behavior)
- [ ] Logged out → redirect to sign-in (existing behavior)
- [ ] Sponsor but no sponsees → Tier 1 + 3 items are empty, just own self-care surfaces

### G.4 · Shared-component impact (CLAUDE.md §4)
- Nav subnav styling changes → verify on every page that uses `DashboardShell`: `/dashboard`, `/dashboard/step-work`, `/dashboard/sponsees`, `/dashboard/admin` (admin returns 404 for non-admins)
- CheckInModal changes → verify no other route opens it

### G.5 · Data integrity (CLAUDE.md §5)
- [ ] Create a brand-new test account, run through onboarding, open dashboard → queue renders without errors
- [ ] Insert a struggling check-in as test sponsee, log in as sponsor → alert appears
- [ ] Create a custom meeting with `is_private=true`, log in as sponsor → meeting name NOT visible, count IS visible
- [ ] Run the migrations on a snapshot DB first if possible

### G.6 · Mobile-specific (CLAUDE.md §6)
- Mood chips row: no horizontal overflow. If chips + labels don't fit, shorten labels (see above).
- Meeting chip list: may need scrollable container on mobile if >5 chips; add edge-fade gradient.
- Touch targets: all CTAs ≥44×44px; close × is 32×32 with invisible 44×44 hit area.

### G.7 · Accessibility
- Focus order: Check-in modal → mood scale (left-to-right) → meeting chips → note textarea → Save button → Close ×
- Mood chips use `role="radiogroup"`, each chip `role="radio"` with `aria-checked`
- Meeting chips use `role="radiogroup"`
- Celebration panel: `aria-live="polite"`; confetti purely decorative, `aria-hidden="true"` on `.confetti` span container
- Color contrast: verify `--gold-hero` (#f0c040) on navy background for WCAG AA — run accessibility review skill on the banner post-implementation
- Reduced motion: respect `prefers-reduced-motion: reduce` — disable confetti animation, skip fade-up

### G.8 · Feature flag + rollout

1. Add to `.env.local` for dev: `NEXT_PUBLIC_TODAY_QUEUE_ENABLED=true`
2. Prod (`.env.production`): `false` initially
3. Deploy to dev, link Travis for review
4. Beta test with Angel + 2 others (20-min session: see §10 validation notes)
5. Flip to `true` on prod after validation

### G.9 · Rollback

The DB migrations are additive. To rollback:
1. Flip env flag to `false`
2. Optional: `DROP TABLE user_custom_meetings, inspiration_quotes, sponsor_milestone_reminders CASCADE;` if reverting DB (not recommended — leave tables, just hide UI)

---

## 10. Validation (post-push, pre-prod)

20-minute walk-through with Angel + 2 others. Test questions:

1. Does the Today concept reduce confusion vs. the old grid?
2. Does the unified check-in feel faster than 3 separate actions?
3. Does the struggling-sponsee alert read correctly — helpful or alarming?
4. Does the caught-up state feel rewarding or empty?
5. Does the confetti feel warm or cheesy? (Separately for default and rough-day variants.)
6. Does "Today's practice" as a label land? Better than "Anchored Today"?
7. Do members find the +Custom meeting flow intuitive?
8. Does the close (×) on the celebration panel feel natural?

Log findings → file issues on the `dev` branch.

---

## 11. Appendix — Complete copy strings

### 11.1 · Today card

| Context | String |
|---|---|
| Headline | `Today's practice` |
| Subtitle (default) | `Small things that keep you grounded. Your pace, your order — skip what doesn't fit today.` |
| Subtitle (sponsor w/ struggling alert) | `{Sponsee} needs you first — then tend to yourself.` |
| Footer | `Come back tomorrow — practice updates daily.` |
| Overflow row | `{N} more →` |

### 11.2 · Today items (dynamic labels)

| Item | Label | Sub |
|---|---|---|
| Check-in | `Log today's check-in` | `Mood · meeting · a note — takes 30 seconds` |
| Step work | `Continue Step {N}: {step_title}` | `{N} prompts in progress · started {relative}` |
| Meeting target | `Log a meeting this week` | `{done} of {target} weekly target · or adjust your goal` |
| Reading | `Read: "{article_title}"` | `Recommended for Step {N} · {minutes} min read` |
| Sponsor review | `Review {N} step-work submissions` | `{sponsee_names} — oldest waiting {hours}h` |
| Milestone reminder | `{Sponsee} hits {milestone} on {date}` | `{N} days out · time to order a chip or plan something` |
| Struggling alert | `{Sponsee} checked in as struggling` | `{hours}h ago · "{first_40_chars_of_note}"` |

### 11.3 · Caught-up

- Title: `Anchored for today.`
- Body: `Come back tomorrow — practice updates daily.`
- Summary: `Today you · checked in "{mood}" · logged {meeting_name} · answered {N} {step_label} prompt{s}`

### 11.4 · Celebration headlines by mood

| Mood | Headline | Streak badge shown? |
|---|---|---|
| struggling | `You showed up. That's the work.` | no |
| hard | `Some days are heavier. You did this one anyway.` | no |
| okay | `Anchored in for today.` | yes (if ≥2 day) |
| good | `Anchored in for today.` | yes |
| great | `A great one. Anchored in.` | yes |

### 11.5 · Rough-day callouts (paired with a rotating quote)

- struggling: `Even on the hardest days, checking in is the path. Keep walking it — things can shift when you let them.`
- hard: `The work isn't feeling good. It's staying present. You stayed.`

### 11.6 · CTAs

- Primary (default): `Keep going`
- Primary (struggling): `Call my sponsor` (teal bg)
- Secondary: `Done for today`
- Close hover title: `Close — return to today's practice`

### 11.7 · Auto-dismiss notes

- Default: `Auto-closes in 8s · or press × to return to your day`
- Rough-day: `Auto-closes in 12s on rough days · or press × to return to your day`

---

## 12. Appendix — `inspiration_quotes` seed data

```sql
INSERT INTO public.inspiration_quotes (text, attribution, tone_tag) VALUES
  -- Morning
  ('You are not your addiction. You are so much more.', 'Unknown', 'morning'),
  ('Small steps, steady ground.', NULL, 'morning'),
  ('Today is a good day to begin again.', NULL, 'morning'),
  ('Be gentle with yourself. You are doing the best you can.', NULL, 'morning'),
  ('One day at a time — and if that''s too much, one hour.', 'AA wisdom', 'morning'),

  -- Reflective
  ('We cannot give what we do not have. Tend to yourself, and the rest follows.', 'Anonymous', 'reflective'),
  ('Progress, not perfection.', 'AA wisdom', 'reflective'),
  ('You''ve survived 100% of your hardest days.', NULL, 'reflective'),
  ('The quality of your recovery is the quality of your life.', NULL, 'reflective'),

  -- Struggling
  ('Courage doesn''t always roar. Sometimes it''s the quiet voice at the end of the day saying, ''I will try again tomorrow.''', 'Mary Anne Radmacher', 'struggling'),
  ('The only way out is through.', 'Robert Frost', 'struggling'),
  ('Rock bottom became the solid foundation on which I rebuilt my life.', 'J.K. Rowling', 'struggling'),
  ('You don''t have to see the whole staircase. Just take the first step.', 'Martin Luther King Jr.', 'struggling'),
  ('Every day is Day 1 when you need it to be.', NULL, 'struggling'),
  ('You showed up. That''s the work.', NULL, 'struggling'),

  -- Caught-up / evening
  ('I will try again tomorrow.', 'Mary Anne Radmacher', 'caught_up'),
  ('Today is kept. Rest well.', NULL, 'caught_up'),
  ('A good day, ordinary and kept.', NULL, 'caught_up'),

  -- General
  ('One day at a time.', 'AA', 'general'),
  ('This too shall pass.', NULL, 'general');
```

---

## 13. Implementation order (recommended commit sequence)

1. **Commit 1:** `feat(db): add today-queue migrations + seed quotes` — just Phase A
2. **Commit 2:** `feat(css): add hero-gold + subnav-band tokens` — Phase B
3. **Commit 3:** `feat(dashboard): rebalance banner + rename to My Journey` — Phase C.2 + subnav rename
4. **Commit 4:** `feat(dashboard): TodayCard + useTodayQueue (member only)` — Phase C rest, no sponsor logic yet
5. **Commit 5:** `feat(checkin): unified modal + 5-point mood + custom meetings` — Phase D.1–D.6
6. **Commit 6:** `feat(checkin): celebration panel + rough-day variant` — Phase D.7–D.10
7. **Commit 7:** `feat(dashboard): sponsor pull-through + milestone reminders` — Phase E
8. **Commit 8:** `feat(dashboard): caught-up state + copy constants` — Phase F
9. **Commit 9:** `chore: feature-flag gate + QA polish` — Phase G

Each commit should pass the CLAUDE.md pre-push QA independently.

---

## 14. Known deferrals (Phase 2 backlog)

- Nightly edge function to materialize `sponsor_milestone_reminders` (currently lazy on load)
- Admin UI for `inspiration_quotes`
- Weekly streak-bar view (links to existing `gamification-wireframes.html`)
- Email/push for milestone reminders
- "Mark chip ordered" completion state on milestone items
- Provider dashboard parity (the tab exists; Today queue not extended to providers yet)
- Retire the Cormorant Garamond `--font-display` alias once all legacy components migrate

---

**End of spec. Questions → @travis in the PR.**
