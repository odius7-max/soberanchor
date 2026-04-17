-- Trigger 1: BEFORE INSERT on check_ins
-- Auto-sets is_shared_with_sponsor = true when the user has an active sponsor at insert time.
-- Prevents any client-side bug (or removed toggle) from leaving check-ins unshared.

CREATE OR REPLACE FUNCTION fn_auto_share_checkin()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_shared_with_sponsor = false OR NEW.is_shared_with_sponsor IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM sponsor_relationships
      WHERE sponsee_id = NEW.user_id
        AND status = 'active'
    ) THEN
      NEW.is_shared_with_sponsor := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_share_checkin ON check_ins;
CREATE TRIGGER trg_auto_share_checkin
  BEFORE INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION fn_auto_share_checkin();

-- Trigger 2: AFTER INSERT OR UPDATE on sponsor_relationships
-- When a relationship transitions to 'active', backfill all prior check_ins for that sponsee.
-- Covers the common edge case: member logs for weeks, then adds sponsor.

CREATE OR REPLACE FUNCTION fn_backfill_checkins_on_active()
RETURNS trigger LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS trg_backfill_checkins_on_active ON sponsor_relationships;
CREATE TRIGGER trg_backfill_checkins_on_active
  AFTER INSERT OR UPDATE ON sponsor_relationships
  FOR EACH ROW EXECUTE FUNCTION fn_backfill_checkins_on_active();
