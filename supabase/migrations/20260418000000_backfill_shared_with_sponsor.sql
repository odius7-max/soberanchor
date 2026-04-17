-- Backfill is_shared_with_sponsor for existing sponsee check-ins
-- Only updates rows for users who had an active sponsor at the time of check-in
UPDATE check_ins ci
SET is_shared_with_sponsor = true
WHERE is_shared_with_sponsor = false
  AND EXISTS (
    SELECT 1 FROM sponsor_relationships sr
    WHERE sr.sponsee_id = ci.user_id
      AND sr.status = 'active'
      AND sr.created_at <= ci.created_at
  );
