# Auth CTAs, Sponsor Toggle, Conditional Sponsor Tab

## Plan

### Change 1 — /my-recovery CTA buttons
- The page is a server component. Create a tiny `"use client"` component `src/app/my-recovery/AuthCTAButtons.tsx` that calls `useAuth().openAuthModal()`.
- Replace the two `<Link>` CTA buttons in `page.tsx` with this client component.
- The bottom "Get started" CTA also becomes a button that opens the modal.

### Change 2 — Sponsor toggle in PrivacyTab
- Add `isAvailableSponsor: boolean` prop to `PrivacyTab`.
- Add local state for it. On toggle: update `user_profiles.is_available_sponsor` via Supabase client, then call `router.refresh()` so the server component re-fetches.
- Render the toggle row in the Account section with label, description, and an on/off pill button.
- Update `DashboardShell.tsx` to pass `isSponsor` down to `PrivacyTab`.

### Change 3 — Sponsor View tab conditional
- Already implemented in `DashboardShell.tsx` (line 65 spreads the sponsor role only when `isSponsor === true`).
- No code change needed — just needs the toggle (Change 2) to trigger `router.refresh()` to take effect.

## Todo

- [ ] 1. Create `src/app/my-recovery/AuthCTAButtons.tsx` client component
- [ ] 2. Update `src/app/my-recovery/page.tsx` to use `AuthCTAButtons`
- [ ] 3. Add sponsor toggle to `PrivacyTab.tsx` (new prop + Supabase update + router.refresh)
- [ ] 4. Pass `isAvailableSponsor` prop to `PrivacyTab` in `DashboardShell.tsx`
- [ ] 5. Commit and push

## Review
<!-- filled in after completion -->
