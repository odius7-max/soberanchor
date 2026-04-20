-- Phase 5 verification surfaced that fn_backfill_checkins_on_active silently
-- failed for existing check-ins when a new sponsor relationship was activated.
-- Root cause: without SECURITY DEFINER the trigger runs as the calling role
-- (often the sponsor user), which cannot UPDATE another user's check_in row
-- under RLS. Adding SECURITY DEFINER lets the function run as its owner
-- (postgres/service role) and bypass RLS for this targeted backfill.
--
-- fn_auto_share_checkin (BEFORE INSERT) is unaffected — it fires in the
-- sponsee's own session and already works correctly.

CREATE OR REPLACE FUNCTION public.fn_backfill_checkins_on_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status <> 'active') THEN
    UPDATE check_ins
    SET is_shared_with_sponsor = true
    WHERE user_id = NEW.sponsee_id
      AND is_shared_with_sponsor = false;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill any existing check-ins that were missed due to the security gap.
UPDATE check_ins ci
SET is_shared_with_sponsor = true
WHERE is_shared_with_sponsor = false
  AND EXISTS (
    SELECT 1 FROM sponsor_relationships sr
    WHERE sr.sponsee_id = ci.user_id
      AND sr.status = 'active'
  );
