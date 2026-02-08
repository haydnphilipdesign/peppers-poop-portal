-- Pepper's Portal Database Schema (hardened)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('poop', 'pee')),
  user_name TEXT NOT NULL CHECK (user_name IN ('Chris', 'Debbie', 'Haydn')),
  notes TEXT
);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON logs;
DROP POLICY IF EXISTS "Allow public insert" ON logs;
DROP POLICY IF EXISTS "Allow public update" ON logs;
DROP POLICY IF EXISTS "Allow public delete" ON logs;

CREATE POLICY "Allow public read" ON logs
  FOR SELECT
  USING (true);

REVOKE ALL ON TABLE logs FROM anon;
REVOKE ALL ON TABLE logs FROM authenticated;
GRANT SELECT ON TABLE logs TO anon;
GRANT SELECT ON TABLE logs TO authenticated;

CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS logs_type_idx ON logs(type);
CREATE INDEX IF NOT EXISTS logs_user_name_idx ON logs(user_name);
CREATE INDEX IF NOT EXISTS logs_date_type_idx ON logs(created_at DESC, type);

CREATE OR REPLACE FUNCTION insert_walk(
  p_created_at TIMESTAMPTZ,
  p_user_name TEXT,
  p_has_poop BOOLEAN,
  p_has_pee BOOLEAN
) RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_ids UUID[] := ARRAY[]::UUID[];
  new_id UUID;
BEGIN
  IF NOT p_has_poop AND NOT p_has_pee THEN
    RAISE EXCEPTION 'insert_walk requires at least one log type';
  END IF;

  IF p_has_poop THEN
    INSERT INTO logs (created_at, type, user_name)
    VALUES (p_created_at, 'poop', p_user_name)
    RETURNING id INTO new_id;
    inserted_ids := array_append(inserted_ids, new_id);
  END IF;

  IF p_has_pee THEN
    INSERT INTO logs (created_at, type, user_name)
    VALUES (p_created_at, 'pee', p_user_name)
    RETURNING id INTO new_id;
    inserted_ids := array_append(inserted_ids, new_id);
  END IF;

  RETURN inserted_ids;
END;
$$;

CREATE OR REPLACE FUNCTION replace_walk(
  p_log_ids UUID[],
  p_created_at TIMESTAMPTZ,
  p_user_name TEXT,
  p_has_poop BOOLEAN,
  p_has_pee BOOLEAN
) RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_log_ids IS NULL OR array_length(p_log_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'replace_walk requires log ids';
  END IF;

  IF NOT p_has_poop AND NOT p_has_pee THEN
    RAISE EXCEPTION 'replace_walk requires at least one log type';
  END IF;

  DELETE FROM logs
  WHERE id = ANY (p_log_ids);

  RETURN insert_walk(p_created_at, p_user_name, p_has_poop, p_has_pee);
END;
$$;

CREATE OR REPLACE FUNCTION delete_walk(
  p_log_ids UUID[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_log_ids IS NULL OR array_length(p_log_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'delete_walk requires log ids';
  END IF;

  DELETE FROM logs
  WHERE id = ANY (p_log_ids);
END;
$$;

REVOKE ALL ON FUNCTION insert_walk(TIMESTAMPTZ, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_walk(UUID[], TIMESTAMPTZ, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_walk(UUID[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION insert_walk(TIMESTAMPTZ, TEXT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION replace_walk(UUID[], TIMESTAMPTZ, TEXT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION delete_walk(UUID[]) TO service_role;
