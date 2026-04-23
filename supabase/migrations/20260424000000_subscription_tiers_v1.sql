-- Phase V.1a: Replace 30-day trial with Free / Pro / Founding tier system
-- Safe to run: user_subscriptions has zero rows (confirmed via discovery query).

-- ─── 1. Drop old table ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users read own subscription"   ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.user_subscriptions;

DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- ─── 2. New user_subscriptions table ─────────────────────────────────────────

CREATE TABLE public.user_subscriptions (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL DEFAULT 'free'
                             CHECK (plan IN ('free', 'pro', 'founding')),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'past_due', 'canceled')),
  -- Stripe placeholders — populated in V.1c
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN DEFAULT FALSE,
  -- Price lock for grandfathered subscribers
  grandfather_price_cents  INTEGER,
  -- Audit trail
  granted_by               TEXT,   -- 'signup' | 'admin' | 'stripe' | 'migration_v1'
  granted_at               TIMESTAMPTZ DEFAULT NOW(),
  granted_note             TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- All writes go through RPCs (SECURITY DEFINER) or the service_role admin client.
-- No INSERT / UPDATE / DELETE policies for regular users.

-- ─── 3. Seed: every existing auth.users row starts as 'free' ─────────────────

INSERT INTO public.user_subscriptions (user_id, plan, granted_by, granted_note)
SELECT
  id,
  'free',
  'migration_v1',
  'Auto-created during Phase V.1a migration'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ─── 4. get_subscription_state(user_id) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_subscription_state(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan          TEXT;
  v_status        TEXT;
  v_is_pro        BOOLEAN;
  v_sponsee_count INTEGER;
BEGIN
  SELECT plan, status INTO v_plan, v_status
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  -- Defensive: auto-create a free row if somehow missing
  IF v_plan IS NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan, granted_by)
    VALUES (p_user_id, 'free', 'signup')
    ON CONFLICT (user_id) DO NOTHING;
    v_plan   := 'free';
    v_status := 'active';
  END IF;

  v_is_pro := v_plan IN ('pro', 'founding');

  SELECT COUNT(*) INTO v_sponsee_count
  FROM public.sponsor_relationships
  WHERE sponsor_id = p_user_id
    AND status = 'active';

  RETURN json_build_object(
    'plan',             v_plan,
    'status',           v_status,
    'is_pro',           v_is_pro,
    'is_founding',      v_plan = 'founding',
    'sponsee_count',    v_sponsee_count,
    'can_add_sponsee',  v_is_pro OR v_sponsee_count = 0,
    'has_pro_features', v_is_pro
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_subscription_state(UUID) TO authenticated;

-- ─── 5. admin_grant_subscription(target_user_id, plan, note) ─────────────────
-- No is_admin check here — the API route at /api/admin/grant-subscription gates
-- access using ADMIN_USER_IDS. Only service_role can call this function.

CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  p_target_user_id UUID,
  p_plan           TEXT,
  p_note           TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_plan NOT IN ('free', 'pro', 'founding') THEN
    RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan, granted_by, granted_note, granted_at)
  VALUES (p_target_user_id, p_plan, 'admin', p_note, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan         = EXCLUDED.plan,
    granted_by   = 'admin',
    granted_note = EXCLUDED.granted_note,
    granted_at   = NOW(),
    updated_at   = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_grant_subscription(UUID, TEXT, TEXT) TO service_role;

-- ─── 6. Shim: get_sponsor_access → get_subscription_state ────────────────────
-- Keeps stale browser clients working during the deploy window.

CREATE OR REPLACE FUNCTION public.get_sponsor_access(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  state JSON;
BEGIN
  state := public.get_subscription_state(p_user_id);
  RETURN jsonb_build_object(
    'has_access',      (state->>'is_pro')::BOOLEAN OR (state->>'can_add_sponsee')::BOOLEAN,
    'status',          CASE WHEN (state->>'is_pro')::BOOLEAN THEN 'active' ELSE 'none' END,
    'days_remaining',  0,
    'trial_available', FALSE,
    'plan_name',       state->>'plan'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── 7. Shim: start_sponsor_trial → error (trials retired) ───────────────────

CREATE OR REPLACE FUNCTION public.start_sponsor_trial(p_user_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'success', FALSE,
    'error',   'Trial period retired — see pricing page for Free vs Pro tiers'
  );
$$ LANGUAGE sql SECURITY DEFINER;
