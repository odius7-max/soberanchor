-- Enrichment: persist the SAMHSA service category/value detail that the
-- original import parsed but discarded. Additive only; existing data untouched.
alter table public.facilities
  add column if not exists service_detail   jsonb,
  add column if not exists last_enriched_at timestamptz;

comment on column public.facilities.service_detail is
  'Parsed SAMHSA services: { <category_code>: { label, values[] } }. Populated by the SAMHSA re-import (samhsa-transform).';
