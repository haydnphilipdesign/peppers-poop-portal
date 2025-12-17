-- Pepper's Portal - Activities & Reminders Schema
-- Run this in your Supabase SQL Editor after the initial schema

-- Activities table (for daily routines like toys, dinner)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('toys', 'dinner')),
  logged_by TEXT NOT NULL CHECK (logged_by IN ('Chris', 'Debbie', 'Haydn')),
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('Chris', 'Debbie', 'Haydn'))
);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update activities" ON activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete activities" ON activities FOR DELETE USING (true);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);

-- Grant access
GRANT ALL ON activities TO anon;
GRANT ALL ON activities TO authenticated;

-- Reminders table (for scheduled recurring events)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('simparica', 'grooming', 'vet')),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by TEXT CHECK (completed_by IN ('Chris', 'Debbie', 'Haydn')),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for reminders
CREATE POLICY "Allow public read reminders" ON reminders FOR SELECT USING (true);
CREATE POLICY "Allow public insert reminders" ON reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reminders" ON reminders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete reminders" ON reminders FOR DELETE USING (true);

-- Indexes for reminders
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON reminders(due_date);
CREATE INDEX IF NOT EXISTS reminders_type_idx ON reminders(type);
CREATE INDEX IF NOT EXISTS reminders_completed_at_idx ON reminders(completed_at);

-- Grant access
GRANT ALL ON reminders TO anon;
GRANT ALL ON reminders TO authenticated;
