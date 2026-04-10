# Resources Page — Supabase + Filter Chips

## Plan

The current `src/app/resources/page.tsx` is a static server component with hardcoded articles and non-functional filter chips.

### Assumptions about DB schema
- `articles` table columns: `id`, `title`, `excerpt`, `author`, `read_time_min`, `pillar`, `slug`, `published_at`
- `article_categories` junction: `article_id`, `category_id`
- `categories` table: `id`, `name`

### Approach
- Keep `page.tsx` as an async server component — fetch all articles + their categories from Supabase using `import { supabase } from "@/lib/supabase"` (same pattern as `find/page.tsx`).
- Create a new client component `src/app/resources/ResourcesClient.tsx` to handle interactive filter chip state.
- The server component passes all articles + all unique pillars to the client component.
- The client component filters articles locally by active pillar and/or active category chip.

## Todo

- [x] 1. Create `src/app/resources/ResourcesClient.tsx` — client component with filter chip state + article grid
- [x] 2. Update `src/app/resources/page.tsx` — async server component that fetches from Supabase and passes data to `ResourcesClient`

## Review

### Changes made
- **`src/app/resources/page.tsx`** — converted to an `async` server component. Fetches `articles` joined with `article_categories → categories` from Supabase. Derives unique pillars from data. Passes both down to `ResourcesClient`. Added `revalidate = 3600` (same as `find/page.tsx`).
- **`src/app/resources/ResourcesClient.tsx`** (new) — `"use client"` component. Holds `activePillar` and `activeCategory` state. Renders two rows of filter chips: pillar chips (top) and category chips (derived from the junction data). Filters articles locally — no extra fetches. Shows an empty state if no articles match.

### Notes
- The Supabase query uses the join syntax `article_categories(categories(name))` which requires the FK relationship to be set up in Supabase between `article_categories.category_id → categories.id`.
- Column names assumed: `excerpt`, `read_time_min`, `pillar`, `slug`. Adjust the select string in `page.tsx` if your schema uses different names.
