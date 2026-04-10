# Rebuild For Providers Page

## Plan

### Files to change
1. `src/components/Nav.tsx` — add active state for `/for-providers` link (desktop + mobile)
2. `src/app/for-providers/ProviderAuthButton.tsx` (new) — tiny `"use client"` component for the "Already listed? Sign in" button that calls `openAuthModal()`
3. `src/app/for-providers/page.tsx` — full rebuild as a server component with 7 sections

### Section order
1. Hero — centered, label + heading + subtext + two CTAs + fine print
2. Value props — 3 stat cards + supporting paragraph
3. How it works — 3 numbered steps horizontal
4. What you get — 2 feature cards (free/pro) side-by-side
5. Who this is for — 3×2 provider type grid
6. Trust signals — 2×2 grid
7. FAQ — details/summary accordion (no JS needed)
8. Footer CTA — navy gradient, two buttons + email

### Nav note
The "For Providers" link is outside the main `links` array. Add `pathname === '/for-providers'` check to show teal + font-semibold active state, both desktop and mobile.

## Todo

- [ ] 1. Update Nav.tsx active state for For Providers link (desktop + mobile)
- [ ] 2. Create ProviderAuthButton.tsx client component
- [ ] 3. Rebuild for-providers/page.tsx with all 8 sections
- [ ] 4. Commit and push

## Review
<!-- filled in after completion -->
