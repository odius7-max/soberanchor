# SAMHSA FindTreatment.gov → SoberAnchor Facility Mapping

## API Endpoint
`https://findtreatment.gov/locator/exportsAsJson/v2`

No auth required. Public API. Updated annually via N-SUMHSS survey.

## Query Parameters

| Param | Value | Description |
|-------|-------|-------------|
| `sType` | `sa` | Substance abuse facilities only |
| `limitType` | `0` | Search by state |
| `limitValue` | State ID (see table below) | Which state |
| `pageSize` | `500` | Max per page |
| `page` | `1`, `2`, etc. | Pagination |
| `sort` | `0` | Default sort |

## State ID Table (NOT FIPS codes — SAMHSA uses their own IDs)

| ID | State | ID | State | ID | State |
|----|-------|----|-------|----|-------|
| 1 | Alaska | 18 | Maryland | 35 | Oklahoma |
| 2 | Alabama | 19 | Maine | 36 | Oregon |
| 3 | Arkansas | 20 | Michigan | 37 | Pennsylvania |
| 4 | American Samoa | 21 | Minnesota | 38 | Puerto Rico |
| 5 | Arizona | 22 | Missouri | 39 | Rhode Island |
| 6 | California | 23 | Mississippi | 40 | South Carolina |
| 7 | Colorado | 24 | Montana | 41 | South Dakota |
| 8 | Connecticut | 25 | North Carolina | 42 | Tennessee |
| 9 | District of Columbia | 26 | North Dakota | 43 | Texas |
| 10 | Delaware | 27 | Nebraska | 44 | Utah |
| 11 | Florida | 28 | New Hampshire | 45 | Virginia |
| 12 | Georgia | 29 | New Jersey | 46 | Virgin Islands |
| 13 | Guam | 30 | New Mexico | 47 | Vermont |
| 14 | Hawaii | 31 | Nevada | 48 | Washington |
| 15 | Iowa | 32 | New York | 49 | Wisconsin |
| 16 | Idaho | 33 | Ohio | 50 | West Virginia |
| 17 | Illinois | 34 | US Minor Outlying Islands | 51 | Wyoming |

## Priority Import Order (by treatment facility density)

Phase 1: CA (6), FL (11), NY (32), TX (43), PA (37)
Phase 2: OH (33), IL (17), MI (20), GA (12), NC (25)
Phase 3: All remaining states

## Response Format

The API returns JSON with a `rows` array and pagination info:
```json
{
  "page": 1,
  "pageSize": 500,
  "totalPages": 3,
  "recordCount": 1468,
  "rows": [
    {
      "name1": "Facility Name",
      "name2": "DBA or Secondary Name",
      "street1": "123 Main St",
      "street2": "Suite 100",
      "city": "San Diego",
      "state": "CA",
      "zip": "92101",
      "phone": "619-555-0100",
      "website": "https://example.com",
      "latitude": 32.7157,
      "longitude": -117.1611,
      "type_facility": "",
      "services": ["SA", "DT", "HH"],
      "payments": ["MD", "MI", "PI"],
      ...
    }
  ]
}
```

## Field Mapping

| SAMHSA Field | SoberAnchor Column | Transform |
|---|---|---|
| `frid` or `_id` | `samhsa_id` | Direct — unique facility ID for dedup |
| `name1` | `name` | Primary name. Use `name2` as subtitle if different. |
| `street1` | `address_line1` | Direct |
| `street2` | `address_line2` | Direct |
| `city` | `city` | Direct |
| `state` | `state` | Direct (2-letter code) |
| `zip` | `zip` | First 5 chars only |
| `phone` | `phone` | Format: (XXX) XXX-XXXX |
| `website` | `website` | Direct. Validate URL format. |
| `latitude` | `latitude` | `float(raw.latitude or 0)` — handle None values |
| `longitude` | `longitude` | `float(raw.longitude or 0)` — handle None values |
| `type_facility` | — | Usually empty. Derive type from service codes instead. |
| — | `facility_type` | Derive from service codes (see below) |
| — | `slug` | Generate from name + city + state |
| — | `listing_tier` | Set to 'basic' |
| — | `is_verified` | Set to true (SAMHSA-verified) |
| — | `is_featured` | Set to false |
| — | `is_claimed` | Set to false |
| — | `accepts_insurance` | true if payments includes MI, MD, or insurance codes |
| — | `accepts_private_pay` | true if payments includes PI or SS |

## Facility Type Derivation (from service codes)

SAMHSA `type_facility` is often empty. Derive from service codes:

```javascript
function deriveFacilityType(services, raw) {
  const s = new Set(services || []);
  
  // Detox or residential = treatment
  if (s.has('DT') || s.has('HH') || s.has('RL') || s.has('RES')) return 'treatment';
  
  // Outpatient indicators
  if (s.has('OP') || s.has('IOT') || s.has('OTR')) return 'outpatient';
  
  // Default to treatment for substance abuse facilities
  return 'treatment';
}
```

## Service Code Mapping → Categories

| SAMHSA Code | Meaning | Maps to Category |
|---|---|---|
| SA | Substance abuse treatment | General |
| DT | Detoxification | Treatment type |
| HH | Hospital inpatient | Treatment type |
| RL | Residential long-term (30+ days) | Treatment type |
| RS | Residential short-term (< 30 days) | Treatment type |
| OP | Outpatient | Treatment type |
| IOT | Intensive outpatient | Treatment type |
| OTR | Opioid treatment | Opioids category |
| BU | Buprenorphine | MAT/Opioids |
| NU | Naltrexone | MAT |
| DM | Methadone detox | MAT/Opioids |
| MM | Methadone maintenance | MAT/Opioids |

## Payment Code Mapping → Insurance

| SAMHSA Code | Meaning | SoberAnchor |
|---|---|---|
| MD | Medicaid | Medi-Cal (in CA) / Medicaid |
| MC | Medicare | Medicare |
| MI | Military insurance (TRICARE) | TRICARE |
| PI | Private insurance | accepts_insurance = true |
| SS | Sliding scale | accepts_private_pay = true |
| NP | No payment accepted | Free |
| SF | Self-pay | accepts_private_pay = true |

## Known Data Quality Issues

1. `raw.get("field", "")` doesn't catch `None` values — use `or 0` / `or ""` pattern
2. `type_facility` field returns empty strings — derive from service codes
3. Some facilities have 0,0 coordinates — skip or geocode later
4. Phone numbers come in various formats — normalize to (XXX) XXX-XXXX
5. Website field may be empty or malformed — validate URL
6. Duplicate facilities can appear across pages — dedup on samhsa_id

## Import Strategy

1. Loop through state IDs (start with priority states)
2. For each state: paginate through all pages (pageSize=500)
3. Transform each facility per mapping above
4. Upsert into facilities ON CONFLICT (samhsa_id)
5. Link to categories via facility_categories junction table
6. Link to insurance via facility_insurance table
7. 0.5s sleep between page requests to avoid rate limiting
8. Log: imported, skipped (bad data), errors per state
