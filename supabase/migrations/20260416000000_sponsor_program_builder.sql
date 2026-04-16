-- Sponsor Program Builder: Phase 1 schema

-- 1. sponsor_program_templates
CREATE TABLE sponsor_program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fellowship_id UUID NOT NULL REFERENCES fellowships(id),
  name TEXT NOT NULL DEFAULT 'My Program',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_sponsor_program_unique
  ON sponsor_program_templates(sponsor_id, fellowship_id);

ALTER TABLE sponsor_program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors manage own programs" ON sponsor_program_templates
  FOR ALL USING (auth.uid() = sponsor_id);

-- 2. sponsor_task_library
CREATE TABLE sponsor_task_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES sponsor_program_templates(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'reflection'
    CHECK (category IN ('reading', 'writing', 'reflection', 'action')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  subsection TEXT,
  source TEXT NOT NULL DEFAULT 'custom'
    CHECK (source IN ('custom', 'example')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_library_program ON sponsor_task_library(program_id, step_number, sort_order);

ALTER TABLE sponsor_task_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors manage own library" ON sponsor_task_library
  FOR ALL USING (auth.uid() = sponsor_id);

-- 3. soberanchor_example_tasks
CREATE TABLE soberanchor_example_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fellowship_id UUID NOT NULL REFERENCES fellowships(id),
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'reflection'
    CHECK (category IN ('reading', 'writing', 'reflection', 'action')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_example_tasks_fellowship_step
  ON soberanchor_example_tasks(fellowship_id, step_number, sort_order);

ALTER TABLE soberanchor_example_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read examples" ON soberanchor_example_tasks
  FOR SELECT USING (true);

-- 4. Extend sponsor_tasks
ALTER TABLE sponsor_tasks
  ADD COLUMN IF NOT EXISTS library_task_id UUID REFERENCES sponsor_task_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS step_number INTEGER,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subsection TEXT;
