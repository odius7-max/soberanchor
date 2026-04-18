-- Today Queue: Phase A — new tables, enum addition, column additions
-- Spec: dashboard-today-handoff-spec.md §3

-- ── A.2 · Mood enum: add 'hard' as 4th point (crisis stays for legacy use) ──
-- ALTER TYPE ... ADD VALUE is allowed inside a transaction in PG 12+.
-- 'hard' will NOT appear in new modal UI if this value is already present.
ALTER TYPE check_in_mood ADD VALUE IF NOT EXISTS 'hard' BEFORE 'struggling';

-- ── A.3 · user_custom_meetings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_custom_meetings (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT      NOT NULL,
  type          TEXT      NOT NULL CHECK (type IN ('public','personal','sponsor','other')),
  recurrence    TEXT      NOT NULL DEFAULT 'once'
                          CHECK (recurrence IN ('once','daily','weekly','custom')),
  day_of_week   SMALLINT  CHECK (day_of_week BETWEEN 0 AND 6),
  time_local    TIME,
  is_active     BOOLEAN   NOT NULL DEFAULT TRUE,
  is_private    BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_custom_meetings_user
  ON public.user_custom_meetings(user_id, is_active);

ALTER TABLE public.user_custom_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own custom meetings read"
  ON public.user_custom_meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own custom meetings write"
  ON public.user_custom_meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sponsors may read name+type of non-private sponsee meetings
CREATE POLICY "sponsor reads sponsee public custom meetings"
  ON public.user_custom_meetings FOR SELECT
  USING (
    is_private = FALSE
    AND EXISTS (
      SELECT 1 FROM public.sponsor_relationships sr
      WHERE sr.sponsor_id = auth.uid()
        AND sr.sponsee_id = user_custom_meetings.user_id
        AND sr.status = 'active'
    )
  );

-- ── A.5 · meeting_attendance column addition ─────────────────────────────────
-- Must happen before the view (A.4) that references it.
ALTER TABLE public.meeting_attendance
  ADD COLUMN IF NOT EXISTS custom_meeting_id UUID
    REFERENCES public.user_custom_meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_custom
  ON public.meeting_attendance(custom_meeting_id)
  WHERE custom_meeting_id IS NOT NULL;

-- Exactly one source: public meeting, custom meeting, or free-text (both null)
ALTER TABLE public.meeting_attendance
  ADD CONSTRAINT meeting_attendance_single_source
  CHECK (
    (meeting_id IS NOT NULL AND custom_meeting_id IS NULL) OR
    (meeting_id IS NULL     AND custom_meeting_id IS NOT NULL) OR
    (meeting_id IS NULL     AND custom_meeting_id IS NULL)
  );

-- ── A.4 · sponsor_sponsee_meeting_counts view ────────────────────────────────
-- Privacy-preserving: sponsors see only aggregate counts of private meetings.
CREATE OR REPLACE VIEW public.sponsor_sponsee_meeting_counts AS
SELECT
  ucm.user_id                                AS sponsee_user_id,
  DATE_TRUNC('week', ma.attended_at)::DATE   AS week_start,
  COUNT(*) FILTER (WHERE ucm.is_private = TRUE)  AS private_count,
  COUNT(*) FILTER (WHERE ucm.is_private = FALSE) AS shared_count
FROM public.meeting_attendance ma
LEFT JOIN public.user_custom_meetings ucm
  ON ucm.id = ma.custom_meeting_id
GROUP BY ucm.user_id, DATE_TRUNC('week', ma.attended_at);

GRANT SELECT ON public.sponsor_sponsee_meeting_counts TO authenticated;

-- ── A.6 · inspiration_quotes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspiration_quotes (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT    NOT NULL,
  attribution TEXT,
  tone_tag    TEXT    NOT NULL
              CHECK (tone_tag IN ('morning','reflective','struggling','caught_up','general')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_quotes_tone
  ON public.inspiration_quotes(tone_tag, is_active);

ALTER TABLE public.inspiration_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active quotes"
  ON public.inspiration_quotes FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

-- Seed data (~20 quotes across all tone tags)
INSERT INTO public.inspiration_quotes (text, attribution, tone_tag) VALUES
  -- Morning
  ('You are not your addiction. You are so much more.', 'Unknown', 'morning'),
  ('Small steps, steady ground.', NULL, 'morning'),
  ('Today is a good day to begin again.', NULL, 'morning'),
  ('Be gentle with yourself. You are doing the best you can.', NULL, 'morning'),
  ('One day at a time — and if that''s too much, one hour.', 'AA wisdom', 'morning'),

  -- Reflective
  ('We cannot give what we do not have. Tend to yourself, and the rest follows.', 'Anonymous', 'reflective'),
  ('Progress, not perfection.', 'AA wisdom', 'reflective'),
  ('You''ve survived 100% of your hardest days.', NULL, 'reflective'),
  ('The quality of your recovery is the quality of your life.', NULL, 'reflective'),

  -- Struggling
  ('Courage doesn''t always roar. Sometimes it''s the quiet voice at the end of the day saying, ''I will try again tomorrow.''', 'Mary Anne Radmacher', 'struggling'),
  ('The only way out is through.', 'Robert Frost', 'struggling'),
  ('Rock bottom became the solid foundation on which I rebuilt my life.', 'J.K. Rowling', 'struggling'),
  ('You don''t have to see the whole staircase. Just take the first step.', 'Martin Luther King Jr.', 'struggling'),
  ('Every day is Day 1 when you need it to be.', NULL, 'struggling'),
  ('You showed up. That''s the work.', NULL, 'struggling'),

  -- Caught-up / evening
  ('I will try again tomorrow.', 'Mary Anne Radmacher', 'caught_up'),
  ('Today is kept. Rest well.', NULL, 'caught_up'),
  ('A good day, ordinary and kept.', NULL, 'caught_up'),

  -- General
  ('One day at a time.', 'AA', 'general'),
  ('This too shall pass.', NULL, 'general');

-- ── A.7 · sponsor_milestone_reminders ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sponsor_milestone_reminders (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_user_id  UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsee_user_id  UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_label  TEXT  NOT NULL,
  milestone_date   DATE  NOT NULL,
  surfaced_at      TIMESTAMPTZ,
  dismissed_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sponsor_user_id, sponsee_user_id, milestone_label, milestone_date)
);

CREATE INDEX IF NOT EXISTS idx_milestone_reminders_sponsor
  ON public.sponsor_milestone_reminders(sponsor_user_id, milestone_date);

ALTER TABLE public.sponsor_milestone_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsor reads own reminders"
  ON public.sponsor_milestone_reminders FOR SELECT
  USING (auth.uid() = sponsor_user_id);

CREATE POLICY "sponsor writes own reminders"
  ON public.sponsor_milestone_reminders FOR ALL
  USING (auth.uid() = sponsor_user_id)
  WITH CHECK (auth.uid() = sponsor_user_id);
