ALTER TABLE public.user_profiles
  ADD COLUMN sponsor_marked_ready_at TIMESTAMPTZ,
  ADD COLUMN sponsor_marked_ready_by UUID REFERENCES auth.users(id);

-- Active sponsors may update ONLY these two columns + is_available_sponsor on
-- their sponsee's profile row. Column-level restriction is enforced at the
-- application layer; this policy grants the row-level write path.
CREATE POLICY "sponsor_can_mark_sponsee_ready"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_relationships sr
      WHERE sr.sponsor_id = auth.uid()
        AND sr.sponsee_id = user_profiles.id
        AND sr.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sponsor_relationships sr
      WHERE sr.sponsor_id = auth.uid()
        AND sr.sponsee_id = user_profiles.id
        AND sr.status = 'active'
    )
  );
