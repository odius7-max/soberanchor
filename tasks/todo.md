# Recovery Tools Page + Homepage Card Swap

## Plan

### Change 1 — `src/app/page.tsx`
- Replace last entry in `categories` array ("For Loved Ones") with a new "Track Your Journey" card pointing to `/my-recovery`
- The card renders differently from the directory cards: teal border, pills (Check-ins, Journal, Steps, Sponsor) below the subtitle
- Since the card needs different rendering, extract the grid render into inline conditional or add a `special` flag to the category object
- Update tagline string from `"Your Anchor to Sober Living"` → `"Your Anchor to Living Sober"`

### Change 2 — `src/app/my-recovery/page.tsx` (new file)
- Static server component (no auth, pure marketing)
- Four sections top to bottom:
  1. **Hero** — centered, label + heading + subtext + two CTA buttons + fine print
  2. **Two perspectives** — off-white bg, two side-by-side feature cards (recovery / sponsor)
  3. **Trust & security** — white bg, 2×2 grid of trust items
  4. **How it works** — off-white bg, three numbered horizontal steps
- Use design system variables: `var(--font-display)`, `var(--navy)`, `var(--teal)`, `var(--gold)`, `bg-off-white`, `bg-warm-gray`, `border-border`, etc.

## Todo

- [ ] 1. Update `categories` array and tagline in `src/app/page.tsx`
- [ ] 2. Update card grid render to handle the special "Track Your Journey" card (teal border + pills)
- [ ] 3. Create `src/app/my-recovery/page.tsx` with all four sections
- [ ] 4. Commit and push

## Review
<!-- filled in after completion -->
