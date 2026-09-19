-- ODI-78 / PROVIDER-PATH-SPEC §0 — workspace state, stored away from user_profiles.
--
-- Storage home decision (spec §0 requires verifying RLS before choosing):
-- user_profiles is NOT owner-only. It carries two non-owner policies —
--   SELECT "Sponsors can view sponsee profiles"  (active sponsor reads the row)
--   UPDATE "sponsor_can_mark_sponsee_ready"      (active sponsor writes the row)
-- Postgres RLS is row-level, not column-level, so any column added to
-- user_profiles becomes readable AND writable by that user's sponsor. Putting
-- workspace state there would leak a provider's employer (organization_name) to
-- their recovery sponsor, and would let a sponsor flip a sponsee's workspace.
-- Spec §0's stated fallback therefore applies: a new self-only table.
--
-- This table is a UX PREFERENCE record. It is never an authorization role.
-- Access to facilities and leads continues to derive solely from an active
-- provider_account plus facility ownership (§0 concept 4).

create table if not exists public.user_setup (
  user_id                     uuid primary key references auth.users(id) on delete cascade,

  -- §0 concept 2 — workspace state.
  -- 'member' | 'provider'. Default member so an absent row reads as a plain
  -- member, which is what every existing user is.
  primary_workspace           text        not null default 'member'
                                          check (primary_workspace in ('member','provider')),
  -- Last workspace the user INTENTIONALLY chose. Never written from a first
  -- default render (A4). Sponsor mode is a member-mode sub-state, not a value here.
  last_workspace              text        check (last_workspace in ('member','provider')),

  -- Enablement timestamps. NULL = that workspace was never enabled. Kept
  -- separate from completion: a workspace can be enabled with setup unfinished.
  provider_started_at         timestamptz,
  recovery_enabled_at         timestamptz,

  -- §0 concept 3 — provider setup completion, tracked independently of
  -- user_profiles.onboarding_completed, which stays recovery-only.
  provider_setup_completed_at timestamptz,

  -- Collected at /providers/welcome, before any provider_account exists. Mapped
  -- into the provider account by the existing atomic claim operation on first
  -- claim (§3) — never by creating a duplicate provider_account.
  organization_name           text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.user_setup enable row level security;

-- Read: owner only. Deliberately narrower than user_profiles — nothing here is
-- shared with sponsors.
drop policy if exists "Users read own setup" on public.user_setup;
create policy "Users read own setup"
  on public.user_setup for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies, by design. Every write goes through the one
-- idempotent server operation (POST /api/workspace/initialize) using the service
-- role, which is what structurally enforces spec §0's "all writes via one
-- operation, never from a GET/render". A client cannot write this table at all.

create index if not exists user_setup_primary_workspace_idx
  on public.user_setup (primary_workspace);
