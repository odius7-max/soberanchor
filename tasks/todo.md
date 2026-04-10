# Gate Lead Form and Phone Behind Facility Claim Status

## Plan

### `src/app/find/[id]/page.tsx` — only file that needs changes

The facility is already fetched with `select("*")`, so `is_claimed`, `listing_tier`, `is_featured`, `phone`, and `website` are already available.

Changes:
1. **Verified badge** — after the existing Featured badge, add a Verified badge when `is_claimed && (listing_tier === 'enhanced' || listing_tier === 'premium')`.
2. **Phone in details section** — wrap the `📞` line so it only renders when `facility.is_claimed` is true.
3. **Sidebar** — replace the always-shown lead form with a conditional:
   - `is_claimed === true` → show existing lead form (no change)
   - `is_claimed === false/null` → show unclaimed card: website button (if available), SAMHSA helpline, divider, claim CTA linking to `/for-providers`

### `src/app/find/page.tsx` — no changes needed
Phone numbers are not currently rendered on listing cards, so the "hide phone for unclaimed" requirement is already satisfied.

## Todo

- [ ] 1. Add Verified badge to detail page header
- [ ] 2. Gate phone number in details section behind `is_claimed`
- [ ] 3. Replace sidebar with conditional: lead form (claimed) vs unclaimed card
- [ ] 4. Commit and push

## Review
<!-- filled in after completion -->
