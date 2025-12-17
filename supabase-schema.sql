-- Pepper's Poop Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Create the logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('poop', 'pee')),
  user_name TEXT NOT NULL CHECK (user_name IN ('Chris', 'Debbie', 'Haydn')),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for re-running this script)
DROP POLICY IF EXISTS "Allow all operations" ON logs;
DROP POLICY IF EXISTS "Allow public read" ON logs;
DROP POLICY IF EXISTS "Allow public insert" ON logs;
DROP POLICY IF EXISTS "Allow public update" ON logs;
DROP POLICY IF EXISTS "Allow public delete" ON logs;

-- Create separate policies for each operation type
-- This is more reliable than a single FOR ALL policy
CREATE POLICY "Allow public read" ON logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON logs FOR DELETE USING (true);

-- Index for fast date-based queries
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS logs_type_idx ON logs(type);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS logs_user_name_idx ON logs(user_name);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS logs_date_type_idx ON logs(created_at DESC, type);

-- Grant access to anon role (for public access via Supabase client)
GRANT ALL ON logs TO anon;
GRANT ALL ON logs TO authenticated;
