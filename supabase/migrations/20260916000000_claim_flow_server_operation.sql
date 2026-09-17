-- ODI-68 / CLAIM-FLOW-SPEC §1 — server-enforced atomic claim operation.
--
-- The old client path (ClaimFlow.claimFacility) wrote directly to facilities and
-- provider_accounts. Those tables are deliberately locked down (facilities:
-- SELECT-only; provider_accounts: SELECT/UPDATE own, no INSERT), so the claim
-- silently failed. The fix moves the whole operation server-side into ONE
-- database transaction rather than adding client-write policies.
--
-- Nothing here changes RLS on facilities or provider_accounts.

-- ── 1. Uniqueness: one provider account per auth user ────────────────────────
-- Verified before writing this migration: provider_accounts has 0 rows and no
-- duplicate auth_user_id values, so the constraint applies cleanly. Partial
-- (WHERE NOT NULL) because the FK to auth.users is ON DELETE SET NULL, which
-- can legitimately leave several orphaned rows with a NULL auth_user_id.
CREATE UNIQUE INDEX IF NOT EXISTS provider_accounts_auth_user_id_key
  ON public.provider_accounts (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ── 2. Rate-limit ledger ─────────────────────────────────────────────────────
-- Shared storage, not a process-local Map: Vercel runs many instances and a
-- per-process counter would not bound anything. Only NEW claims insert a row,
-- so a same-owner re-read or a retry after a lost response never consumes an
-- allowance. Written exclusively by the claim RPC (service_role).
CREATE TABLE IF NOT EXISTS public.provider_claim_attempts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id uuid        NOT NULL,
  facility_id  uuid        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_claim_attempts_user_time_idx
  ON public.provider_claim_attempts (auth_user_id, created_at DESC);

ALTER TABLE public.provider_claim_attempts ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service_role bypasses RLS, every other role is denied.

-- ── 3. Durable rejection records (spec §8, option A — facility-specific) ─────
-- Rejecting a claim clears that facility's flags and ownership ONLY. The
-- provider account stays active and keeps its other locations;
-- provider_accounts.is_active = false remains a separate, explicit, admin-only
-- account suspension that is never auto-triggered by a rejection.
--
-- The row is what lets a returning claimant see a durable "not approved"
-- outcome instead of silently losing provider mode, and it is what blocks a
-- silent re-claim of the same facility (retry requires support).
CREATE TABLE IF NOT EXISTS public.facility_claim_rejections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         uuid        NOT NULL REFERENCES public.facilities(id)         ON DELETE CASCADE,
  auth_user_id        uuid                 REFERENCES auth.users(id)                ON DELETE SET NULL,
  provider_account_id uuid                 REFERENCES public.provider_accounts(id)  ON DELETE SET NULL,
  rejected_by         uuid,
  rejected_at         timestamptz NOT NULL DEFAULT now()
);

-- One durable record per (claimant, facility); a re-rejection refreshes it.
CREATE UNIQUE INDEX IF NOT EXISTS facility_claim_rejections_user_facility_key
  ON public.facility_claim_rejections (facility_id, auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.facility_claim_rejections ENABLE ROW LEVEL SECURITY;

-- Tightly scoped read: a claimant may read only their own rejection records.
-- No INSERT/UPDATE/DELETE policy — all writes go through service_role.
DROP POLICY IF EXISTS "Claimants read own rejections" ON public.facility_claim_rejections;
CREATE POLICY "Claimants read own rejections"
  ON public.facility_claim_rejections
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- ── 4. Hostname normalisation ────────────────────────────────────────────────
-- Shared by the claim RPC and (via the API) the admin queue's display logic, so
-- auto-verification and the "domain match" badge cannot drift apart.
--
-- Deliberately strict: only http(s) URLs yield a host. Anything malformed
-- returns NULL, which downgrades the claim to pending — the safe direction.
-- Comparison by the caller is exact equality, never a suffix match, so
-- "notexample.com" and "evil.example.com" can never match "example.com".
CREATE OR REPLACE FUNCTION public.fn_claim_normalize_host(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v text;
BEGIN
  IF p_url IS NULL THEN RETURN NULL; END IF;

  v := btrim(lower(p_url));
  IF v !~ '^https?://' THEN RETURN NULL; END IF;   -- require an explicit http(s) scheme

  v := regexp_replace(v, '^https?://', '');
  v := split_part(v, '/', 1);                       -- drop path
  v := split_part(v, '?', 1);
  v := split_part(v, '#', 1);

  IF position('@' IN v) > 0 THEN                    -- drop userinfo credentials
    v := substring(v FROM position('@' IN v) + 1);
  END IF;

  v := regexp_replace(v, ':[0-9]+$', '');           -- drop port
  v := regexp_replace(v, '\.+$', '');               -- drop trailing dot (FQDN form)
  v := regexp_replace(v, '^www\.', '');             -- drop a single leading www.

  -- Reject anything that is not a plain a-z0-9.- hostname with at least one dot.
  -- (Punycode IDNs are already a-z0-9- after the xn-- prefix; unicode hostnames
  -- are rejected rather than half-normalised.)
  IF v !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' THEN
    RETURN NULL;
  END IF;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_claim_email_domain(p_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v text;
BEGIN
  IF p_email IS NULL THEN RETURN NULL; END IF;
  v := btrim(lower(p_email));
  IF position('@' IN v) = 0 THEN RETURN NULL; END IF;

  v := substring(v FROM length(v) - position('@' IN reverse(v)) + 2);  -- after the LAST @
  v := regexp_replace(v, '\.+$', '');
  v := regexp_replace(v, '^www\.', '');

  IF v !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' THEN
    RETURN NULL;
  END IF;

  RETURN v;
END;
$$;

-- ── 5. The claim operation ───────────────────────────────────────────────────
-- One transaction: rate limit, account lookup/creation, availability check,
-- verification decision and facility linking all commit together or not at all.
-- There is no "insert an account then best-effort delete it" path.
--
-- SECURITY DEFINER with a pinned search_path and schema-qualified objects. The
-- actor's identity is a parameter supplied by the route from getUser() — never
-- from the request body — and EXECUTE is granted to service_role only.
CREATE OR REPLACE FUNCTION public.claim_facility(
  p_auth_user_id      uuid,
  p_user_email        text,
  p_facility_id       uuid,
  p_contact_name      text DEFAULT NULL,
  p_contact_phone     text DEFAULT NULL,
  p_organization_name text DEFAULT NULL,
  p_rate_limit        integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_facility    public.facilities%ROWTYPE;
  v_account_id  uuid;
  v_active      boolean;
  v_email_dom   text;
  v_site_dom    text;
  v_verify      boolean := false;
  v_rows        integer;
  v_recent      integer;
BEGIN
  IF p_auth_user_id IS NULL OR p_facility_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  -- Lock order is fixed for every caller — user first, then the facility row —
  -- so two requests can never build a deadlock cycle. The user lock serialises
  -- account creation for one person claiming two facilities at once; the row
  -- lock serialises two people racing for one facility.
  PERFORM pg_advisory_xact_lock(hashtext('claim_user:' || p_auth_user_id::text));

  SELECT * INTO v_facility
  FROM public.facilities
  WHERE id = p_facility_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT id, is_active INTO v_account_id, v_active
  FROM public.provider_accounts
  WHERE auth_user_id = p_auth_user_id
  FOR UPDATE;

  -- An account suspended by an admin stays suspended; never silently reactivate.
  IF v_account_id IS NOT NULL AND v_active IS FALSE THEN
    RETURN jsonb_build_object('ok', false, 'code', 'account_inactive');
  END IF;

  -- Idempotent same-owner path: return the CURRENT persisted status untouched.
  -- A retry after a lost response must not duplicate anything, and a retry
  -- after a manual approval must not downgrade verified back to pending.
  IF v_account_id IS NOT NULL AND v_facility.provider_account_id = v_account_id THEN
    RETURN jsonb_build_object(
      'ok', true,
      'facility_id', v_facility.id,
      'status', CASE WHEN v_facility.is_verified THEN 'verified' ELSE 'pending' END,
      'already_owned', true
    );
  END IF;

  -- Fail closed on ANY sign of existing ownership, including the flags-only
  -- state (is_claimed = true with a NULL provider_account_id, e.g. demo …0003).
  -- Contradictory data must never be overwritten in a claimant's favour.
  IF v_facility.is_claimed OR v_facility.provider_account_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_claimed');
  END IF;

  -- A previously rejected claim for THIS facility cannot be silently re-made.
  -- Other facilities owned by the same account are unaffected (spec §8 A).
  PERFORM 1 FROM public.facility_claim_rejections
  WHERE facility_id = p_facility_id AND auth_user_id = p_auth_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'claim_rejected');
  END IF;

  -- Rate limit: new claims only, counted in shared storage inside this same
  -- transaction, so a burst of parallel requests cannot slip past the check.
  SELECT count(*) INTO v_recent
  FROM public.provider_claim_attempts
  WHERE auth_user_id = p_auth_user_id
    AND created_at > now() - interval '1 hour';

  IF v_recent >= p_rate_limit THEN
    RETURN jsonb_build_object('ok', false, 'code', 'rate_limited');
  END IF;

  -- Verification is decided here, from the server-authenticated email and the
  -- persisted website. The client has no way to influence it.
  v_email_dom := public.fn_claim_email_domain(p_user_email);
  v_site_dom  := public.fn_claim_normalize_host(v_facility.website);
  v_verify    := v_email_dom IS NOT NULL
             AND v_site_dom  IS NOT NULL
             AND v_email_dom = v_site_dom;

  IF v_account_id IS NULL THEN
    INSERT INTO public.provider_accounts (auth_user_id, contact_name, contact_email, contact_phone, organization_name)
    VALUES (
      p_auth_user_id,
      COALESCE(NULLIF(btrim(p_contact_name), ''), v_facility.name),
      p_user_email,
      NULLIF(btrim(p_contact_phone), ''),
      NULLIF(btrim(p_organization_name), '')
    )
    RETURNING id INTO v_account_id;
  END IF;

  -- Guarded update: the WHERE clause re-asserts availability, so if anything
  -- changed under us the row count is 0 and the whole transaction rolls back
  -- rather than stealing a facility from another owner.
  UPDATE public.facilities
  SET provider_account_id = v_account_id,
      is_claimed          = true,
      is_verified         = v_verify,
      updated_at          = now()
  WHERE id = p_facility_id
    AND is_claimed = false
    AND provider_account_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'claim_facility: expected exactly 1 facility update, got %', v_rows;
  END IF;

  INSERT INTO public.provider_claim_attempts (auth_user_id, facility_id)
  VALUES (p_auth_user_id, p_facility_id);

  RETURN jsonb_build_object(
    'ok', true,
    'facility_id', p_facility_id,
    'status', CASE WHEN v_verify THEN 'verified' ELSE 'pending' END,
    'already_owned', false
  );
END;
$$;

-- Service-role only. An anon or authenticated caller must not be able to reach
-- this function through PostgREST at all.
REVOKE ALL ON FUNCTION public.claim_facility(uuid, text, uuid, text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_facility(uuid, text, uuid, text, text, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_facility(uuid, text, uuid, text, text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_facility(uuid, text, uuid, text, text, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.fn_claim_normalize_host(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_claim_email_domain(text)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_claim_normalize_host(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_domain(text)   TO service_role;
