-- Prevent duplicate meetings that share the same real-world identity:
-- same name, day, start time, and physical location.
--
-- Partial index (latitude IS NOT NULL) so online meetings — which have no
-- coordinates — are not incorrectly blocked. Two online meetings with the
-- same name/day/time from different feeds are distinct enough to coexist;
-- the existing UNIQUE(source, source_id) constraint already deduplicates
-- within a single feed.
--
-- The import route uses ON CONFLICT DO NOTHING so bulk imports silently
-- skip any row that would violate this constraint.

CREATE UNIQUE INDEX IF NOT EXISTS meetings_unique_identity
  ON meetings (name, day_of_week, start_time, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
