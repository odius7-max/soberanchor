-- Required for OnboardingCard.complete() upsert(..., { onConflict: 'user_id,label' }).
-- Without this unique constraint, the upsert fails with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- surfacing to the user as "Failed to save your sobriety date. Please try again."

ALTER TABLE public.sobriety_milestones
  ADD CONSTRAINT sobriety_milestones_user_label_unique UNIQUE (user_id, label);
