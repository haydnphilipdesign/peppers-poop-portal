-- Pepper's Portal Activities & Reminders Schema (hardened)
-- Run this in your Supabase SQL Editor after the logs schema.

CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('toys', 'dinner')),
  logged_by TEXT NOT NULL CHECK (logged_by IN ('Chris', 'Debbie', 'Haydn')),
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('Chris', 'Debbie', 'Haydn'))
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read activities" ON activities;
DROP POLICY IF EXISTS "Allow public insert activities" ON activities;
DROP POLICY IF EXISTS "Allow public update activities" ON activities;
DROP POLICY IF EXISTS "Allow public delete activities" ON activities;

CREATE POLICY "Allow public read activities" ON activities
  FOR SELECT
  USING (true);

REVOKE ALL ON TABLE activities FROM anon;
REVOKE ALL ON TABLE activities FROM authenticated;
GRANT SELECT ON TABLE activities TO anon;
GRANT SELECT ON TABLE activities TO authenticated;

CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('simparica', 'grooming', 'vet')),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by TEXT CHECK (completed_by IN ('Chris', 'Debbie', 'Haydn')),
  notes TEXT
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public insert reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public update reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public delete reminders" ON reminders;

CREATE POLICY "Allow public read reminders" ON reminders
  FOR SELECT
  USING (true);

REVOKE ALL ON TABLE reminders FROM anon;
REVOKE ALL ON TABLE reminders FROM authenticated;
GRANT SELECT ON TABLE reminders TO anon;
GRANT SELECT ON TABLE reminders TO authenticated;

CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON reminders(due_date);
CREATE INDEX IF NOT EXISTS reminders_type_idx ON reminders(type);
CREATE INDEX IF NOT EXISTS reminders_completed_at_idx ON reminders(completed_at);
