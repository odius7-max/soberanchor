-- Add 'dashboard_quick' to checkin_method enum.
-- Used by CheckInModal (dashboard flow). 'manual' reserved for future /check-in page.
ALTER TYPE checkin_method ADD VALUE IF NOT EXISTS 'dashboard_quick';
