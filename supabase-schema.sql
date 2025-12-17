-- Pepper's Poop Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Create the logs table
CREATE TABLE logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('poop', 'pee')),
  user_name TEXT NOT NULL CHECK (user_name IN ('Chris', 'Debbie', 'Haydn')),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required for this family app)
-- In a production app, you'd want more restrictive policies
CREATE POLICY "Allow all operations" ON logs FOR ALL USING (true);

-- Index for fast date-based queries
CREATE INDEX logs_created_at_idx ON logs(created_at DESC);

-- Index for filtering by type
CREATE INDEX logs_type_idx ON logs(type);

-- Index for filtering by user
CREATE INDEX logs_user_name_idx ON logs(user_name);

-- Composite index for common queries
CREATE INDEX logs_date_type_idx ON logs(created_at DESC, type);

-- Grant access to anon role (for public access via Supabase client)
GRANT ALL ON logs TO anon;
GRANT ALL ON logs TO authenticated;
