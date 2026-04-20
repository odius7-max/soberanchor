-- Phase R.1 — Extend user_custom_meetings for entry-first meeting flow.
--
-- The table already exists (originally wired for a dormant CheckInModal save path)
-- with: id, user_id, name, type, recurrence, day_of_week, time_local, is_active,
-- is_private, created_at, updated_at. RLS is owner-only (+ sponsor-read when
-- is_private=false). meeting_attendance.custom_meeting_id already FKs here
-- (ON DELETE SET NULL) so historical attendance survives soft-delete.
--
-- This migration adds the five columns needed for Phase R UI + an MRU index:
--   fellowship_id, format, location, topic, last_attended_at.
-- Leaves the existing schema (type, recurrence, is_private) untouched so the
-- dormant CheckInModal write path keeps working.

ALTER TABLE public.user_custom_meetings
  ADD COLUMN IF NOT EXISTS fellowship_id    uuid REFERENCES public.fellowships(id),
  ADD COLUMN IF NOT EXISTS format           text CHECK (format IN ('in_person', 'online', 'hybrid')),
  ADD COLUMN IF NOT EXISTS location         text,
  ADD COLUMN IF NOT EXISTS topic            text,
  ADD COLUMN IF NOT EXISTS last_attended_at timestamptz;

-- MRU index for the check-in saved-meetings chips. Active meetings only, most
-- recently attended first. NULLS LAST so never-attended rows sink below recent.
CREATE INDEX IF NOT EXISTS idx_user_custom_meetings_mru
  ON public.user_custom_meetings (user_id, last_attended_at DESC NULLS LAST)
  WHERE is_active = true;

-- Column documentation.
COMMENT ON COLUMN public.user_custom_meetings.fellowship_id IS
  'Fellowship the meeting belongs to. UI defaults to the user''s primary fellowship. Nullable for backward compat with the dormant write path that pre-dates Phase R — new code always supplies.';
COMMENT ON COLUMN public.user_custom_meetings.format IS
  'Meeting format: in_person | online | hybrid. Optional in v1.';
COMMENT ON COLUMN public.user_custom_meetings.location IS
  'Free-text location — city, venue, Zoom link, whatever the member wants. No geocoding, no structure. Optional.';
COMMENT ON COLUMN public.user_custom_meetings.topic IS
  'Free-text topic or focus (e.g., Step 4, gratitude, women''s speaker, powerlessness). Optional.';
COMMENT ON COLUMN public.user_custom_meetings.last_attended_at IS
  'Bumped to now() when a check-in references this meeting via meeting_attendance.custom_meeting_id. Drives MRU ordering for check-in saved-meetings chips.';
