# Meeting Data Sync — Build Spec

## Overview

Build a Supabase Edge Function that pulls real meeting data from external APIs and upserts it into the `meetings` table. Schedule it to run weekly via pg_cron.

## Data Sources

### 1. Meeting Guide API (AA meetings)

The Meeting Guide API is the standard format for AA meeting data. Most AA intergroups use the TSML WordPress plugin which exposes a JSON feed.

**San Diego area feeds:**
- AA San Diego: `https://aasandiego.org/wp-admin/admin-ajax.php?action=meetings`
- North County SD AA: `https://ncsandiegoaa.org/wp-admin/admin-ajax.php?action=meetings`

**Alternative TSML endpoint format (try both):**
- `https://[site]/wp-json/tsml/v1/meetings`

**JSON format (Meeting Guide spec):**
```json
{
  "name": "Sunday Serenity",
  "slug": "sunday-serenity-14",
  "day": 0,               // 0=Sunday, 1=Monday, ... 6=Saturday
  "time": "18:00",
  "end_time": "19:30",
  "location": "Alano Club",
  "group": "The Serenity Group",
  "notes": "Ring buzzer. Meeting is on the 2nd floor.",
  "url": "https://intergroup.org/meetings/sunday-serenity",
  "types": ["O", "T", "LGBTQ"],
  "conference_url": "https://zoom.us/j/123456",
  "conference_phone": "+1-555-555-5555",
  "address": "123 Main Street",
  "city": "Anytown",
  "state": "CA",
  "postal_code": "98765",
  "country": "US",
  "latitude": "32.7157",
  "longitude": "-117.1611",
  "region": "North Park",
  "location_notes": "Parking in rear",
  "updated": "2024-05-31 14:32:23"
}
```

**Meeting type codes (common ones):**
- O = Open, C = Closed
- D = Discussion, SP = Speaker, ST = Step Study, BB = Big Book
- W = Women, M = Men, LGBTQ = LGBTQ+
- TC = Temporary Closure, ONL = Online
- EN = English, S = Spanish
- BE = Beginners, Y = Young People
- X = Wheelchair Accessible

### 2. BMLT API (NA meetings)

The BMLT (Basic Meeting List Toolbox) is the standard for NA meeting data worldwide.

**Endpoint for San Diego area:**
```
https://bmlt.socalwcna.org/main_server/client_interface/json/?switcher=GetSearchResults&geo_width_km=80&lat_val=32.7157&long_val=-117.1611&sort_key=time
```

(Note: The exact BMLT server URL for the San Diego NA area may vary. Search for it at https://doihavethebmlt.org)

## Edge Function: `sync-meetings`

### Logic:
1. Fetch JSON from each configured data source
2. Map external format to our `meetings` table schema
3. Upsert by `source` + `source_id` (so re-runs update existing rows, don't duplicate)
4. Set `last_synced_at = now()`
5. Log results (how many inserted, updated, errors)

### Field mapping (Meeting Guide → meetings table):

| Meeting Guide Field | meetings Column | Notes |
|---------------------|-----------------|-------|
| name | name | |
| slug | slug | Prefix with source: `aa-sd-{slug}` |
| day | day_of_week | Convert 0-6 to Sunday-Saturday |
| time | start_time | |
| end_time | (calculate) | duration_minutes = end_time - start_time |
| location | location_name | |
| group | group_name | |
| notes | notes | |
| conference_url | meeting_url | Zoom/Google Meet link |
| conference_phone | conference_phone | |
| types | types (jsonb) | Store array of type codes |
| types | specialties (jsonb) | Map relevant codes to specialties |
| types → O/C | format | Map to in_person/online/hybrid based on ONL type + conference_url presence |
| address | address | |
| city | city | |
| state | state | |
| postal_code | zip | |
| latitude | latitude | |
| longitude | longitude | |
| region | region | |
| location_notes | location_notes | |

### Fellowship mapping:
- Meeting Guide API feeds → fellowship = AA (look up fellowship_id for "Alcoholics Anonymous")
- BMLT feeds → fellowship = NA (look up fellowship_id for "Narcotics Anonymous")

### Source tracking:
- `source` = 'api' (the enum value for API-sourced meetings)
- `source_id` = `{source_prefix}-{original_slug}` (e.g., `aasandiego-sunday-serenity-14`)

## Configuration

Store data source URLs in a config table or as Edge Function secrets:

```sql
-- Option: simple config table
CREATE TABLE IF NOT EXISTS meeting_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  feed_url text NOT NULL,
  feed_type text NOT NULL, -- 'meeting_guide' or 'bmlt'
  fellowship_slug text NOT NULL, -- maps to fellowships.slug
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  last_sync_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed San Diego sources
INSERT INTO meeting_data_sources (name, feed_url, feed_type, fellowship_slug) VALUES
('AA San Diego', 'https://aasandiego.org/wp-admin/admin-ajax.php?action=meetings', 'meeting_guide', 'aa'),
('North County SD AA', 'https://ncsandiegoaa.org/wp-admin/admin-ajax.php?action=meetings', 'meeting_guide', 'aa');
```

## Scheduling (pg_cron)

Run weekly on Sunday at 3am PT:

```sql
-- Store project URL and key in vault
SELECT vault.create_secret('https://ybpwqqbnfphdmsktghqd.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_ANON_KEY', 'publishable_key');

-- Schedule weekly sync
SELECT cron.schedule(
  'sync-meetings-weekly',
  '0 10 * * 0', -- Every Sunday at 10:00 UTC (3am PT)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-meetings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key')
    ),
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

## Manual trigger

The Edge Function should also be callable manually (for testing or on-demand refresh):

```bash
curl -X POST https://ybpwqqbnfphdmsktghqd.supabase.co/functions/v1/sync-meetings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "manual"}'
```

## Admin UI integration

On the admin panel, add a "Meeting Sources" section (can be Phase 2):
- List configured data sources with last sync time and count
- "Sync Now" button to manually trigger the Edge Function
- "Add Source" to configure new feeds

## Error handling

- If a feed is unreachable, log the error but don't delete existing meetings
- If a meeting from the feed no longer appears, DON'T delete it — it might be temporarily missing. Add a `is_active` field or soft-delete approach later.
- Rate limit: don't hit the same feed more than once per hour

## Notes

- The `meetings` table already has all needed columns including: slug, meeting_url, conference_phone, types, location_notes, region, source_id, source, last_synced_at
- Existing manually-seeded meetings (source = 'manual') should not be affected by the sync
- The sync should only touch meetings where source = 'api'
- Keep the old manual meetings as-is for fellowships we don't have API feeds for (GA, OA, etc.)
