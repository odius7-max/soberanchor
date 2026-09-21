# SoberAnchor account entry map — planning input

Observed September 17–18, 2026. Discovery only: no defect classification, fixes, account creation, claim submission, or database changes.

## Version and evidence

Production surface: **https://soberanchor.com**. At the start of this inventory, Vercel reported READY deployment `dpl_GRd6MGFm36jQzrxp8K2A6YwFEsdk`, main SHA `76092b370c8231ae5c8182537571f4cdc955da32`, immutable URL **https://soberanchor-1igyjbfgk-odius7-maxs-projects.vercel.app**. Local HEAD matched. This is the pinned “before” version, not a promise that the moving production alias remains unchanged.

**R** = directly observed signed-out production browser; **S** = traced in matching source. Post-auth and email-confirmation results below are S, not new live account tests. No authenticated session was created for discovery. Quoted SoberAnchor strings are exact source/UI copy; route destinations are implementation facts.

## Entry inventory

All relative paths in this table are on **https://soberanchor.com**. “Generic” and “claim” outcomes are expanded below.

| ID | Surface and exact entry copy | Context carried / transition | Post-auth landing and onboarding | Evidence |
|---|---|---|---|---|
| E01 | Global desktop/mobile nav: “Sign In”; “Get Started” | Opens login/signup modal on the current page. Adds no provider role or destination. An already-present validated `next` can still apply. | Generic unless valid claim `next` is present. | R homepage; S Nav/AuthModal |
| E02 | Homepage “Sign in” | Link to `/my-recovery`; indirect auth entry. | Signed-in visitor redirects to `/dashboard`; signed-out visitor sees recovery landing CTAs. | R links; S landing |
| E03 | Homepage “Explore the program →” | `/program`; indirect entry into recovery marketing. | Program CTAs below. | R/S |
| E04 | `/my-recovery`: “Sign up free”; “Sign in”; “Get started — it's free →” | Signup/login modal, same page, no `next` added. | Generic; recovery setup. | S AuthCTAButtons/page |
| E05 | `/program`: “Start working your program →”; “Start sponsoring with these tools →” | `/my-recovery`; no sponsor-role parameter. | Recovery landing or dashboard depending on session. | S program/page |
| E06 | `/program`: “Sign in”; “Get started free”; “Create your free account →” | Signed out: `/?auth=login` or `/?auth=signup`. Signed in: `/my-recovery`. Auth query opens the modal, then is removed. | Generic; no sponsor/provider selection encoded. | S AuthAwareCTA/program |
| E07 | Top nav and footer: “For Providers” | `/for-providers`, a marketing door, not an auth mode. Footer has no direct signup/login link. | No account created by navigation. | R/S Nav/Footer |
| E08 | `/for-providers`: “Already listed? Sign in” | Opens generic login modal. No provider `next` added; handler itself does not branch on session. | Generic `afterAuth`, then dashboard mode depends on account state. | S ProviderAuthButton |
| E09 | `/for-providers`: “Claim your listing — free forever”; “Claim your listing” | Scroll to `#claim`. Section heading “Claim your free listing”; action “Open email to request your listing”. This is an email-request handoff, not auth or automatic provider account creation. | No post-auth destination or onboarding supplied by this form. | S provider page/ClaimSection |
| E10 | Eligible listing `/find/<UUID>`: “Work at {name}?” and “🏥 Claim This Listing” | `/providers/claim?facility=<UUID>`. Signed out → `/?auth=required&next=%2Fproviders%2Fclaim%3Ffacility%3D<UUID>`. | Claim-specific auth; returns to same facility; skips recovery modal setup. | S PDP/claim/middleware |
| E11 | Direct `/providers/claim`; dashboard empty facility state “Claim a Listing →” | Generic claim route. Signed out preserves `/providers/claim` as `next`. Signed in with an existing owned facility can go to facility dashboard; otherwise claim search. | Claim-specific auth, then listing selection rather than recovery setup. | S claim page/DashboardShell |
| E12 | Saved-favorite heart on listings/meetings: “Save your favorites” | Prompt: “Create a free account to save listings and keep them in an easy, accessible place to reference anytime.” Buttons “Create Account →” and “Sign In”. Opens shared auth modal; no listing/meeting `next` or save-action continuation added. | Generic. Auth completion routes onward; no automatic replay of the heart action in this flow. | S HeartButton/AuthPromptModal |
| E13 | Sponsor/sponsee invitation email: “Create Your Free Account →” | `https://soberanchor.com/?auth=signup`. No role, relationship ID, or `next` in URL. Dashboard later matches pending invitations by account email. | Generic signup; recovery dashboard/onboarding and pending relationship handling. | S both invite API routes/dashboard |
| E14 | Direct `/providers/login` | Redirect alias to `/?auth=required`; no facility context. | Generic login outcome. | S provider login page |
| E15 | Direct `/providers/dashboard` | Signed out → generic required-auth. Signed in with no active provider account → `/providers/claim`; active provider → `/dashboard?mode=facility`, retaining applicable facility selection. | Provider shell only once provider eligibility exists. | S provider dashboard/middleware |
| E16 | Direct protected recovery/dashboard URLs | `/dashboard` and descendants, recovery profile/settings and sponsee detail guards send signed-out users to `/?auth=required`. No general return-to path preserved. | Generic dashboard destination, not necessarily original subpage. | S middleware and route guards |
| E17 | Login modal “Create account”; signup “← Back to sign in” | Switches shared modal mode; existing validated claim continuation remains relevant. | Generic or claim outcome according to `next`. | R signup back link; S modal |
| E18 | Login “Forgot password?” | Recovery email request, redirect target `/auth/reset-password`. This restores an account rather than creating one. | Password-update completion routes provider to `/providers/dashboard`, otherwise `/dashboard`. Reset page also links `/providers/login` as fallback. | S AuthModal/reset page; no email sent |

No Google/Apple/social sign-in control, independent public provider credential form, or universal consumer/provider role-selection screen was found in the inspected auth callers. Admin pages are access-controlled administration, not a public account-acquisition door.

## Shared modal: exact copy and branching

| Mode | Heading / subtitle | Inputs / action |
|---|---|---|
| Generic login | “Sign In” / “Welcome back to SoberAnchor.” | Email, Password; “Sign In →” |
| Generic signup | “Create Account” / “Your data is private, portable, and always yours. Delete anytime.” | Email, Password, Confirm Password; “Create Account →”; password placeholder “Min. 8 characters” |
| Claim login | “Sign in to claim your facility” / “Use the account that manages this listing.” | Same login credentials |
| Claim signup | “Create your provider account” / “One account manages all of your locations.” | Same signup credentials; recovery-oriented trust paragraph remains in the shared signup body |
| Generic first setup | “Almost There!” / “Just a few quick things to set up your dashboard.” | “What should we call you?”; “Sobriety Date (optional)”; “Primary Fellowship (optional)”; “Go to My Dashboard →” |
| Password recovery | “Reset Password” / “We'll send a link to your email.” | “Email Address”; “Send Reset Link” |

**Generic password sign-in:** `afterAuth` checks `user_profiles.display_name`. Missing name opens the first-setup modal; an existing name closes auth and routes to `/dashboard`. Saving modal setup writes name and optional recovery fields, but does not itself mark `onboarding_completed`.

**Claim sign-in:** validated `next` wins before that profile check. Auth closes and routes to the claim. Claim UI uses “Claim Your Listing”, “Search Your Facility”, and, for a retained facility, “📍 Pre-selected from directory” / “Search different →”. Provider membership is established by the server-side claim process, not by selecting signup in the auth modal. Completed claim links “Go to your dashboard →” to `/dashboard?mode=facility&facility=<UUID>`.

## Email-confirmation map (source-derived; no new email test)

| Signup context | Confirmation target | Successful landing | Onboarding |
|---|---|---|---|
| Generic signup | `https://soberanchor.com/auth/continue` | `/dashboard` | Dashboard recovery onboarding if profile is incomplete; this callback does not run modal `afterAuth` |
| Facility claim signup | `https://soberanchor.com/auth/continue?next=%2Fproviders%2Fclaim%3Ffacility%3D<UUID>` | `/providers/claim?facility=<UUID>` | Facility remains selected; no recovery modal onboarding |
| Generic claim signup | `https://soberanchor.com/auth/continue?next=%2Fproviders%2Fclaim` | `/providers/claim` | Facility search/selection |

The signup call builds the redirect from the current origin. The signup UI without an immediate session says **“Account created! Check your email to confirm, then sign in.”**

Callback interstitial: **“Finishing sign-in…”**, **“One moment while we confirm your account.”**, with **“Continue manually”**. On session arrival, client routing begins; a three-second hard-navigation fallback applies if still on the callback page. An error or no session after eight seconds routes to `/?auth=required` with a valid `next` retained. Fallback copy: **“Taking you to sign in…”** and **“We couldn’t finish automatically. Sign in and you’ll pick up right where you left off.”** A confirmation opened in another browser may lack the PKCE verifier; source behavior is not evidence that every cross-browser confirmation succeeds automatically.

`next` accepts only `/providers/claim` or that path with exactly one valid facility UUID. It is not a general return-to mechanism. External paths, unrelated paths, fragments and extra query parameters are rejected. AuthQueryOpener removes `auth` after opening, retaining `next`; a signed-in visitor with valid `next` is routed directly to the claim. Cancelling claim auth clears continuation. Claim-page exit is deterministic: specific listing → `/find/<UUID>`; generic → `/for-providers`.

## Destination shells and switching

Dashboard selection is account-state-based: explicit `mode=facility` wins for a provider; otherwise a provider without completed recovery onboarding defaults to facility mode; other users default to recovery mode. A dual-role account can therefore land differently from a provider-only account through the same generic login.

Recovery mode displays OnboardingCard when `onboarding_completed` is false or the display name is missing. Its steps are “What should we call you?”, “What fellowship are you working?”, “What's your sobriety date?”, and “What best describes your role?”. Role choices: “Not yet”, “I have a sponsor”, “I sponsor others”, “Both”. These describe recovery relationships, not facility employment. The card exposes “Skip for now” and “Skip this step →”.

Provider mode contains Overview, My Listing, Leads, and Plan & Billing, with location selection where applicable; pending claims receive a restricted status surface. The shared dashboard exposes role modes according to eligibility. The provider recovery nudge “✨ Start your recovery journey →” links `/dashboard?intent=onboard`; this inventory confirms the link, **not** successful onboarding activation (no `intent` consumer was found in the inspected dashboard path). Global signed-in navigation is “My Journey | <display_name> ▾” or “Account ▾”, with Dashboard, Profile, Settings and Sign Out.

## Source index

Paths below are relative to the repository at the pinned SHA. Primary routing sources: `middleware.ts`, `src/lib/claim-continuation.ts`, `src/components/auth/AuthModal.tsx`, `AuthQueryOpener.tsx`, `src/app/auth/continue/page.tsx`, `src/app/auth/reset-password/page.tsx`.

Entry sources: `src/components/Nav.tsx`, `Footer.tsx`, `find/HeartButton.tsx`, `auth/AuthPromptModal.tsx`; `src/app/page.tsx`, `program/page.tsx`, `my-recovery/AuthCTAButtons.tsx`, `for-providers/ProviderAuthButton.tsx`, provider ClaimSection; `src/app/providers/{login,claim,dashboard}/page.tsx`; `src/app/api/invite-sponsor/route.ts`, `invite-sponsee/route.ts`.

Destination sources: `src/app/dashboard/page.tsx`, `src/components/dashboard/DashboardShell.tsx`, `OnboardingCard.tsx`, `src/components/providers/ClaimFlow.tsx`, `ProviderDashboardShell.tsx`.

This map describes the existing paths. It makes no defect or implementation decision for the proposed provider-path spec.
