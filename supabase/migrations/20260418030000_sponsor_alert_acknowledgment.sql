ALTER TABLE check_ins
  ADD COLUMN sponsor_acknowledged_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN check_ins.sponsor_acknowledged_at IS
  'When the active sponsor marked this rough-mood check-in as handled. NULL = unacknowledged.';

CREATE OR REPLACE FUNCTION public.acknowledge_sponsee_checkin(p_check_in_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsee_id uuid;
BEGIN
  SELECT user_id INTO v_sponsee_id FROM check_ins WHERE id = p_check_in_id;
  IF v_sponsee_id IS NULL THEN
    RAISE EXCEPTION 'Check-in not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM sponsor_relationships
    WHERE sponsor_id = auth.uid()
      AND sponsee_id = v_sponsee_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE check_ins
  SET sponsor_acknowledged_at = now()
  WHERE id = p_check_in_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_sponsee_checkin(uuid) TO authenticated;
