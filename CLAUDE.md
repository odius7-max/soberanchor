# CLAUDE.md — SoberAnchor Development Standards

## Coding Behavior (read first)
Before writing any code in this repo, load the **karpathy-guidelines** skill at
`.claude/skills/karpathy-guidelines/SKILL.md`. Its four principles — Think
Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution —
govern *how* you write code. The rules below govern *what* SoberAnchor needs.

## Project Context
- **Stack:** Next.js + Supabase + Tailwind, deployed on Vercel at soberanchor.com
- **Supabase project:** ybpwqqbnfphdmsktghqd (us-west-1)
- **Source of truth:** DECISIONS.md (architecture), RECOVERY-PROGRAM-SKILL.md (step work programs)
- **AI Search:** Claude Haiku (claude-haiku-4-5-20251001) at /api/smart-search
- **Project path:** C:\Users\Travis\Downloads\soberanchor-project\soberanchor

## Pre-Push QA Checklist (MANDATORY)

Before pushing ANY change, verify all of the following:

### 1. Viewport Testing
- [ ] Desktop (1440px) — layout correct, no overflow
- [ ] Tablet (768px) — responsive adjustments working
- [ ] Mobile (375px) — stacked layouts, horizontal scroll where needed
- [ ] Check that text does not truncate or wrap unexpectedly at any viewport

### 2. Overlay / Popup / Dropdown Checks
- [ ] z-index: Any component that renders on top of other content (modals, dropdowns, popovers, tooltips) must have sufficient z-index to appear above page content
- [ ] overflow: Parent containers must not clip overlays — use portals for modals if needed
- [ ] click propagation: e.stopPropagation() on all interactive elements inside overlays so clicks don't bleed through to underlying content
- [ ] close behavior: X button works, Escape key works, clicking backdrop closes (for modals)
- [ ] background scroll: Body scroll should be locked when a modal is open

### 3. Auth State Testing
- [ ] Test the change while logged in (member view)
- [ ] Test the change while logged out (public view)
- [ ] If the feature requires auth, unauthenticated users should see a helpful prompt to create an account — not an error or blank screen
- [ ] Admin pages should return 404 for non-admins (not 403)

### 4. Shared Component Impact
If modifying a shared component (nav, modal, card, button, form), check EVERY page that uses it:
- [ ] Nav changes → check homepage, directory, meetings, resources, member center, admin, provider dashboard
- [ ] Card changes → check facility listings, meeting listings, article cards
- [ ] Modal changes → check save listing, check-in, AI search, milestone management
- [ ] Form changes → check sign up, sign in, lead capture, provider claim, step work prompts

### 5. Data Integrity
- [ ] Verify Supabase queries return expected data — check with real user IDs
- [ ] Confirm RLS policies allow the intended access (user sees own data, public reads work)
- [ ] If writing data, confirm the write actually persists — reload the page and verify
- [ ] If modifying onboarding or account creation, test with a NEW account (not existing test accounts)

### 6. Mobile-Specific
- [ ] Horizontal scroll containers have fade hints (gradient on edges indicating more content)
- [ ] Hide scrollbars on mobile scroll containers (use scrollbar-width: none)
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal page overflow (check for elements wider than viewport)
- [ ] Modals and overlays are usable on small screens

## Coding Standards

### CSS / Styling
- Use Tailwind utility classes — avoid inline styles except for truly dynamic values
- Mobile-first responsive: base styles for mobile, then `md:` and `lg:` breakpoints
- Never use fixed z-index values without checking existing z-index hierarchy
- Dropdowns/popovers: z-50 minimum. Modals: z-100. Toast notifications: z-150
- All colors must use the design system variables (navy, teal, gold, warm-gray)
- No hardcoded colors in components — reference the CSS variables or Tailwind config

### Components
- Modals render via portal (at document root level) — never nested inside cards or list items
- Close buttons use × icon, not text like "Esc" or "Close"
- All interactive overlays must handle: click outside to close, Escape key, X button
- Form validation shows errors in green for success, red for errors — never red for success messages
- Loading states: show skeleton or spinner, never blank space
- Empty states: show helpful message with action CTA, never just blank

### Supabase / Database
- Use service_role client for admin routes only — never expose in client-side code
- All new tables MUST have RLS enabled with appropriate policies before pushing
- Use the anon client for public reads, authenticated client for user-specific data
- When creating records that span multiple tables (e.g., onboarding), wrap in a transaction or ensure all writes complete before marking the operation as done
- Never trust that a migration ran — verify with a SELECT after applying

### API Routes
- All API routes that accept user input: validate input length, strip HTML, check auth
- AI search: inject current date/time into system prompt, extract name keywords for text search
- Rate limiting on any route that calls external APIs (Anthropic, etc.)
- Return appropriate HTTP status codes: 200 success, 400 bad request, 401 unauthorized, 404 not found, 429 rate limited

### Step Work / Recovery Programs
- Read RECOVERY-PROGRAM-SKILL.md before making any changes to step work
- Prompt types: text, yesno, table, scale — render each correctly
- Step completion status must sync across ALL display locations (dashboard, step work page, sponsor view)
- Never hardcode step counts (not all programs have 12 steps)
- Never hardcode fellowship slugs — check program_workbooks dynamically
- All prompts must be self-contained (no external book/page references)

### Navigation
- Authenticated nav: Find Help, Meetings, Resources, For Providers, My Recovery pill
- Unauthenticated nav: Find Help, Meetings, Resources, Our Story, For Providers, Sign In, Get Started
- My Recovery pill format: "My Recovery | [display_name] ▾" — no avatar circle
- Dropdown order: Dashboard, Profile, Settings, Sign Out (with divider before Sign Out)
- Provider Dashboard only shows if user has provider_accounts record
- Admin accessible at /admin — returns 404 for non-admin users

### Git
- Commit messages should describe WHAT changed and WHY
- Push only after completing the QA checklist above
- If a fix touches more than 3 files, list them in the commit message

## Common Pitfalls (Learn from Past Bugs)

1. **Onboarding writes** — Always verify ALL data is saved before marking onboarding_completed = true
2. **Click propagation** — Any clickable element inside a card that also has an onClick needs e.stopPropagation()
3. **Display name "Friend"** — Default display name should prompt user to set their real name
4. **Day of week filtering** — Inject current date server-side, never rely on client timezone for meeting queries
5. **Step completion sync** — If step_completions says done, every UI surface must agree (dashboard, step work list, sponsor view)
6. **Multi-select filters** — Use custom dropdown components with checkboxes, not native HTML select elements
7. **Mobile nav** — Too many items on one row causes wrapping. Test at 375px.
8. **Provider account cleanup** — When rejecting a provider claim, also deactivate the provider_accounts record
9. **Milestone display** — Dashboard hero must read from sobriety_milestones table, not just user_profiles
10. **AI search** — Always include name keyword ILIKE search alongside AI classification results
