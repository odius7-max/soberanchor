# Provider Path Plan — v1 (for Codex review)

*Claude, 2026-09-18. Inputs: `docs/planning/entry-point-map.md` and `docs/planning/competitor-door-teardown.md` (Astra, pinned at prod 76092b3); decisions ratified by Travis 2026-09-17/18. Covers ODI-78 (role-aware path, expanded), ODI-76 (session-blind CTAs), ODI-66 R1/R2 (claim-entry polish). One branch. This is a plan for review, not yet a build spec — Codex: challenge the data model, the entry matrix, and anything that fights the existing claim-flow architecture.*

## 1. Goal and principles

A treatment-facility staffer should never see sobriety prompts, step work, or "Friend"; a person seeking recovery should never be asked about business roles. Principles, in priority order:

1. **Recovery path stays frictionless.** It is the majority path and its visitors may be in crisis. No new questions, no role picker on their journey. (This is why entry-point inference beat an explicit picker.)
2. **Intent before credentials** — the unanimous competitor pattern (PT, Zocdoc, Recovery.com, Yelp all mark provider intent at the door). Provider-ness is established by *where you enter*, not discovered after login.
3. **Provider identity exists before any claim.** Today provider-ness = "has a provider_account," which only a completed claim creates. That's backwards for a provider who signs up first and finds their facility second.
4. **Both doors have quiet escape hatches** (ratified: present but not prominent). People enter the wrong door in both directions.
5. **Recovery features hidden for providers, opt-in** (ratified): a provider who is also in recovery adds their journey deliberately; it is never assumed.

## 2. Data model

Add **`user_profiles.account_role`**: enum `member | provider` (default `member`), plus keep the existing implicit dual-role capability: a `provider` who opts into recovery (or a `member` who claims a facility) becomes effectively dual — represented as `account_role` (primary identity, drives default shell + onboarding) **plus** feature-presence flags that already exist (provider_account row; recovery onboarding state). No `dual` enum value: primary role + capabilities is simpler and matches the current DashboardShell heuristic, which we formalize rather than replace.

- Set at signup from entry context. Carrier: extend the proven `next` allowlist with one new path, **`/providers/welcome`** — provider entries sign up with `next=/providers/welcome`, which survives the email-confirmation callback exactly like claim continuations do (E10 machinery, already hardened by the R5 fix). Landing on /providers/welcome (authenticated) writes `account_role='provider'` and shows provider onboarding. Claim-path signups (`next=/providers/claim...`) also write `provider` on claim-page arrival. Direct/generic signups stay `member` and never see a role question.
- Migration: one-time — demoprovider account → `provider`; all other existing users → `member` (default). Run by Claude against recorded IDs.

## 3. Entry matrix (changes keyed to Astra's map IDs)

| ID | Surface | Change |
|---|---|---|
| E08 | /for-providers "Already listed? Sign in" | **Session-aware (fixes ODI-76):** signed-in → "Go to your dashboard" link (mode=facility); signed-out → auth modal in provider context with `next=/providers/welcome` fallback (or the claim `next` if one is in flight) |
| NEW | /for-providers | Add a true signup door: "Create your provider account →" → provider-context signup, `next=/providers/welcome`. (Today the page's only "signup" is the email-request form — a provider cannot actually create an account here.) |
| E01/E17 | Generic auth modal | Quiet footer link in signup mode: "Here for your facility? **Provider sign-up →**" — swaps modal to provider context. Not shown in login mode. (Ratified: available, not prominent.) |
| E10/E11 | Claim paths | Keep (already provider-appropriate). One copy fix: the provider signup modal body currently reuses the recovery trust paragraph — replace with provider-appropriate reassurance in provider context. On completion, write `account_role='provider'`. |
| E14 | /providers/login | Alias now opens the modal in provider context instead of bare `?auth=required` |
| E13, E12, E02–E06 | Member entries | Unchanged. Zero new friction on the recovery path. |

## 4. Onboarding split

- **Provider onboarding** (on /providers/welcome, replaces the recovery first-setup modal for `account_role='provider'`): "What should we call you?" (name) + optional organization name → then the funnel: "Find your facility" search → hands into the existing claim flow; or "My facility isn't listed" → the ODI-77 contact path. No sobriety date, no fellowship, no step work. The empty state IS the claim funnel.
- **Recovery onboarding**: unchanged, plus one quiet line on the first setup card: "Here for your facility? **Switch to provider setup →**" (flips role, swaps onboarding — the wrong-door escape, both directions symmetric with §3-E01).
- Fix the dead link: `intent=onboard` currently has no consumer. The provider shell's "Start your recovery journey →" opt-in must actually launch recovery onboarding and mark the account dual-capable. This is the ratified "hidden, opt-in" mechanism — it has to work.

## 5. Shells and routing

- `account_role='provider'` → dashboard defaults to **facility mode**; nav account button reads "**Provider | {org or name}**" (never "My Journey | Friend"); recovery tabs absent unless opted in. Provider with no facility → My Facility shows the find-your-facility funnel (§4).
- `member` → exactly today's experience.
- Dual (provider + opted-in recovery, or member + claimed facility) → both modes available; **remember last-used mode** per account (small persisted preference) instead of today's onboarding-state heuristic; explicit `?mode=` still wins.
- Sign-IN routing: role decides the default landing; the existing claim-`next` override keeps winning.

## 6. Claim-entry polish (ODI-66 R1/R2, same components)

- **R1:** cancel/close on claim auth returns to the originating listing (validated `from`/referrer per the original C1 spec), not the homepage.
- **R2:** reloading `/?next=<claim>` while signed out reconstructs the auth prompt (a visible "Continue signing in to claim {facility}" card or auto-reopened modal) instead of a bare homepage with a stranded `next`.

## 7. Out of scope

ODI-77 full rework (form → real intake) · ODI-53 editor · sponsor/sponsee invitation `next` continuation (worth its own small issue — E13 loses context today) · any pricing/tier copy (ODI-80) · Sponsor Pro surfaces.

## 8. Acceptance (headline cases; full checklist at spec stage)

1. Signup from /for-providers "Create your provider account" → email confirm → lands on provider welcome, **zero recovery prompts anywhere**, role=provider persisted; finds facility → claim → dashboard facility mode.
2. Cold generic signup → recovery onboarding exactly as today (regression guard: no new questions).
3. Wrong-door both ways: generic signup → quiet switch → provider setup; provider shell → "Start your recovery journey" → recovery onboarding actually launches (intent=onboard consumed), account becomes dual, both modes navigable, last-mode remembered.
4. Signed-in provider on /for-providers sees "Go to your dashboard," never a login modal (ODI-76 repro chain as regression test).
5. Claim-auth cancel returns to the listing (R1); reload mid-auth keeps a visible way forward (R2).
6. Existing demo fixtures unaffected; demoprovider migrated to role=provider and lands in facility mode by default.

## 9. Open questions for Codex review

1. Is `user_profiles.account_role` the right home vs. auth user_metadata? (Profiles table is RLS-governed and joinable; metadata avoids a migration — plan prefers profiles.)
2. `/providers/welcome` as the next-allowlist extension vs. widening the allowlist prefix — keep the allowlist exact-match strict either way.
3. Does formalizing "remember last mode" conflict with any existing DashboardShell state?
4. The E01 quiet switch link: signup-mode only, or also login mode? (Plan says signup only — a returning user's role is already known.)
5. Anything in the R5 continuation fix (SELF_ROUTING_PATHS etc.) that /providers/welcome must register with?
