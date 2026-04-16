-- Sponsor Program Builder: Phase 3 — Assign + Review

-- Sponsor can mark a completed task as reviewed (with optional feedback in sponsor_note).
-- Separate timestamp keeps "completed" and "reviewed" as distinct states without
-- widening the status enum.
ALTER TABLE sponsor_tasks
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sponsor_tasks_sponsee_status
  ON sponsor_tasks(sponsee_id, status);

CREATE INDEX IF NOT EXISTS idx_sponsor_tasks_sponsor_completed
  ON sponsor_tasks(sponsor_id, completed_at)
  WHERE status = 'completed';
