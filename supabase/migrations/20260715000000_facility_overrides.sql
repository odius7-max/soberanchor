-- ODI-52: two-layer provider content model + media storage.
--
-- SAMHSA base facts live in `facilities` (immutable base layer). Approved,
-- consumer-visible provider content lives in `facility_overrides.published`.
-- The PDP renders `published[key] ?? facilities[key]`. SAMHSA re-imports never
-- touch this table; provider content never mutates the SAMHSA columns.
--
-- Scope: schema + read path only. Provider write policies + the moderation
-- queue land in ODI-53; Stripe/tier activation in ODI-54.

create table if not exists public.facility_overrides (
  facility_id  uuid primary key references public.facilities(id) on delete cascade,
  -- Approved, consumer-visible content. The PDP reads ONLY this column.
  published    jsonb not null default '{}'::jsonb,
  -- Provider-submitted content awaiting moderation (written/managed in ODI-53).
  draft        jsonb,
  draft_status text check (draft_status in ('pending','approved','rejected')),
  submitted_at timestamptz,
  reviewed_at  timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.facility_overrides enable row level security;

-- Intentionally NO public policy on the base table: anon/authenticated get zero
-- rows on direct access, so `draft` can never leak pre-moderation. The admin
-- seed path uses the service role (bypasses RLS); provider write policies land
-- in ODI-53.

-- Approach (a) from the spec: a public projection exposing ONLY facility_id +
-- published. A security-definer view (Postgres default) bypasses the base-table
-- RLS to return published to anon, while `draft` stays unreachable — it is not
-- selected by the view and direct table reads return nothing. The PDP queries
-- this view, never the table.
create or replace view public.facility_overrides_public as
  select facility_id, published
  from public.facility_overrides;

grant select on public.facility_overrides_public to anon, authenticated;

-- Provider media (logos, photos, staff headshots). Public read; no public write
-- in this phase — uploads come in ODI-53 via service role / provider policies.
-- Seed fixtures upload via the dashboard / service role.
insert into storage.buckets (id, name, public)
  values ('facility-media', 'facility-media', true)
  on conflict (id) do nothing;
