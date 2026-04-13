# AA Meeting Guide → SoberAnchor Field Mapping

## Source Reference
- Spec: https://github.com/code4recovery/spec (MIT License)
- Feed validator: https://meetingguide.org/validate
- ~100,000+ weekly meetings from 500+ AA service entities
- Refreshed twice daily by source entities

## Direct Field Mapping

| Meeting Guide Field | SoberAnchor Column | Transform | Notes |
|---|---|---|---|
| `name` | `name` | Direct copy | Required. Max 255 chars. |
| `slug` | `source_id` | Direct copy | Their unique ID. Use for upsert dedup. |
| — | `slug` | Generate from name | Our slug for URL routing. |
| `day` | `day_of_week` | Map int → string | 0=Sunday, 1=Monday...6=Saturday |
| `time` | `start_time` | Direct copy "HH:MM" → time | "18:00" → 18:00:00 |
| `end_time` | `duration_minutes` | Calculate | (end_time - time) in minutes. Default 60 if absent. |
| `location` | `location_name` | Direct copy | Building/landmark name. |
| `notes` | `notes` | Direct copy | Plain text, no HTML. |
| `group` | `group_name` | Direct copy | Group providing the meeting. |
| `address` | `address` | Direct copy | Street address only. |
| `city` | `city` | Direct copy | |
| `state` | `state` | Direct copy | 2-letter code. |
| `postal_code` | `zip` | Direct copy | |
| `latitude` | `latitude` | Direct copy | 5 decimal places. |
| `longitude` | `longitude` | Direct copy | 5 decimal places. |
| `formatted_address` | `address` | Parse if no separate fields | Fallback if atomic fields absent. |
| `conference_url` | `meeting_url` | Direct copy | Zoom/video link. |
| `conference_phone` | `conference_phone` | Direct copy | Dial-in number. |
| `conference_phone_notes` | `conference_phone_notes` | Direct copy | |
| `conference_url_notes` | `notes` | Append to notes | Meeting passwords etc. |
| `location_notes` | `location_notes` | Direct copy | Shared across meetings at same location. |
| `updated` | `last_synced_at` | Parse UTC timestamp | "YYYY-MM-DD HH:MM:SS" |
| `url` | — | Store if needed | Link to listing on area website. |
| `timezone` | `timezone` | Direct copy | tz database format e.g. "America/New_York" |
| `region` | `region` | Direct copy | Neighborhood or city. |
| `contact_1_phone` | `contact_phone` | Direct copy | First contact only. |
| `contact_1_email` | `contact_email` | Direct copy | |
| `types` | `types` | Map codes → labels | See type mapping below. |
| — | `fellowship_id` | Hardcode AA UUID | All meetings from this feed are AA. |
| — | `format` | Derive from types/URLs | See format logic below. |
| — | `source` | Set to 'api' | Identifies data origin. |
| — | `is_verified` | Set to true | Official AA data. |

## Day Mapping

```javascript
const dayMap = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};
```

## Format Derivation Logic

```javascript
function deriveFormat(meeting) {
  const hasAddress = meeting.address && !meeting.approximate;
  const hasConferenceUrl = !!meeting.conference_url;
  
  if (hasAddress && hasConferenceUrl) return 'hybrid';
  if (hasConferenceUrl && !hasAddress) return 'online';
  return 'in_person';
}
```

## Type Code → SoberAnchor Label Mapping

| MG Code | SoberAnchor Label | Category |
|---|---|---|
| `O` | `Open` | Access |
| `C` | `Closed` | Access |
| `D` | `Discussion` | Type |
| `SP` | `Speaker` | Type |
| `ST` | `Step Study` | Type |
| `B` | `Big Book Study` | Type |
| `BE` | `Beginners` | Type |
| `MED` | `Meditation` | Type |
| `LIT` | `Literature` | Type |
| `GR` | `Grapevine` | Type |
| `DR` | `Daily Reflections` | Type |
| `TR` | `Tradition Study` | Type |
| `ABSI` | `As Bill Sees It` | Type |
| `11` | `Step 11 Meditation` | Type |
| `12x12` | `12x12` | Type |
| `LS` | `Living Sober` | Type |
| `W` | `Women` | Specialty |
| `M` | `Men` | Specialty |
| `LGBTQ` | `LGBTQ+` | Specialty |
| `Y` | `Young People` | Specialty |
| `SEN` | `Seniors` | Specialty |
| `POC` | `People of Color` | Specialty |
| `N` | `Native American` | Specialty |
| `NDG` | `Indigenous` | Specialty |
| `P` | `Professionals` | Specialty |
| `CF` | `Child-Friendly` | Amenity |
| `BA` | `Babysitting Available` | Amenity |
| `OUT` | `Outdoor` | Amenity |
| `SM` | `Smoking Permitted` | Amenity |
| `FF` | `Fragrance Free` | Amenity |
| `X` | `Wheelchair Accessible` | Accessibility |
| `XB` | `Wheelchair-Accessible Bathroom` | Accessibility |
| `ASL` | `Sign Language` | Language |
| `S` | `Spanish` | Language |
| `EN` | `English` | Language |
| `FR` | `French` | Language |
| `POR` | `Portuguese` | Language |
| `RUS` | `Russian` | Language |
| `KOR` | `Korean` | Language |
| `JA` | `Japanese` | Language |
| `POL` | `Polish` | Language |
| `HI` | `Hindi` | Language |
| `AR` | `Arabic` | Language |
| `DE` | `German` | Language |
| `ITA` | `Italian` | Language |
| `TL` | `Tagalog` | Language |
| `PUN` | `Punjabi` | Language |
| `FA` | `Persian` | Language |
| `HE` | `Hebrew` | Language |
| `TC` | `Temporarily Closed` | Status |
| `H` | `Birthday` | Type |
| `CAN` | `Candlelight` | Type |
| `BRK` | `Breakfast` | Type |
| `XT` | `Cross Talk Permitted` | Type |
| `DD` | `Dual Diagnosis` | Specialty |
| `AL` | `Concurrent with Alateen` | Type |
| `AL-AN` | `Concurrent with Al-Anon` | Type |
| `DB` | `Digital Basket` | Info |
| `A` | `Secular` | Type |
| `G` | `Gay` | Specialty |
| `L` | `Lesbian` | Specialty |
| `BI` | `Bisexual` | Specialty |
| `T` | `Transgender` | Specialty |
| `NB` | `Non-Binary` | Specialty |
| `POA` | `Proof of Attendance` | Info |

## Import Strategy

### Initial Import (Edge Function or Script)

```
1. Fetch list of AA service entity JSON feed URLs
   - Source: code4recovery maintains a list of connected entities
   - Or: discover feeds via <link rel="alternate"> on AA area websites
   
2. For each feed URL:
   a. Fetch the JSON array of meetings
   b. For each meeting:
      - Map fields per table above
      - Map day int → day_of_week string
      - Map type codes → label array for types JSONB
      - Derive format from address/conference_url presence
      - Generate slug from name if not present
      - Set fellowship_id = AA UUID
      - Set source = 'api'
      - Set source_id = their slug (for dedup)
   c. Upsert into meetings table ON CONFLICT (source, source_id)
      - Update all fields except id and created_at
      - Set last_synced_at = now()

3. After all feeds processed:
   - Mark meetings not seen in this sync as potentially stale
   - Don't auto-delete — flag for review after 30 days
```

### Ongoing Sync (Supabase Edge Function on cron)

```
- Run twice daily (matches their refresh cadence)
- Only process feeds that have changed (check HTTP ETag/Last-Modified)
- Upsert new/changed meetings
- Flag meetings missing from feed for 30+ days
- Log sync stats: new, updated, flagged, total
```

### Deduplication

```
- Primary key for dedup: (source, source_id)
  WHERE source = 'api' AND source_id = meeting.slug
  
- This means AA Meeting Guide data never conflicts with:
  - Manually entered meetings (source = 'manual')
  - SAMHSA-sourced meetings (source = 'samhsa')
  - Community submissions (source = 'community')
  - Other API sources (source = 'api' but different source_id)
```

## Schema Changes Needed

1. Add `end_time` column (time) — useful for calendar integration
2. Add `country` column (text, default 'US') — for international expansion
3. Add `entity_name` column (text) — which AA service entity provided this
4. Add `entity_url` column (text) — link back to source
5. Add unique constraint: UNIQUE(source, source_id) — for upsert dedup
6. Consider adding `approximate` boolean — for online meeting locations

## Feed Discovery

AA service entities publish their feeds in several ways:
- WordPress sites with TSML plugin (auto-generates JSON)
- Google Sheets (published as JSON)
- Custom databases with JSON endpoints

A master list of connected entities may be available from:
- code4recovery GitHub (check /data directory)
- Meeting Guide app support team
- Individual AA intergroup/central office websites
