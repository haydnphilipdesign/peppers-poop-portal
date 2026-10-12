-- Install preview/recovery helpers. This does NOT convert history.
BEGIN;
CREATE VIEW pepper_private.legacy_candidates AS
WITH gaps AS (
  SELECT l.*, CASE WHEN created_at - lag(created_at) OVER (ORDER BY created_at,id) <= interval '30 minutes' THEN 0 ELSE 1 END AS boundary
  FROM public.logs l WHERE walk_id IS NULL
), numbered AS (
  SELECT *, sum(boundary) OVER (ORDER BY created_at,id) AS group_number FROM gaps
)
SELECT (array_agg(id ORDER BY created_at,id))[1] AS walk_id,
  array_agg(id ORDER BY created_at,id) AS log_ids,
  max(created_at) AS created_at,
  (array_agg(user_name ORDER BY created_at DESC,id DESC))[1] AS user_name,
  count(*) AS outcome_count,
  count(DISTINCT user_name) > 1 AS mixed_walkers,
  count(*) > count(DISTINCT type) AS repeated_outcomes,
  count(*) > count(DISTINCT created_at) AS same_timestamp,
  max(created_at) - min(created_at) > interval '30 minutes' AS long_chain,
  min(created_at) AS first_at
FROM numbered GROUP BY group_number;

CREATE FUNCTION pepper_private.legacy_fingerprint() RETURNS text
LANGUAGE sql SET search_path = '' AS $$
  SELECT md5(coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at,l.id)::text,'[]'))
  FROM public.logs l WHERE walk_id IS NULL;
$$;

CREATE FUNCTION pepper_private.preview_legacy_walks(p_timezone text DEFAULT 'America/New_York') RETURNS jsonb
LANGUAGE sql SET search_path = '' AS $$
WITH windows AS (
  SELECT 'day' AS scope, to_char(created_at AT TIME ZONE p_timezone,'YYYY-MM-DD') AS period,
    id,created_at,user_name FROM public.logs WHERE walk_id IS NULL
  UNION ALL
  SELECT 'month',to_char(created_at AT TIME ZONE p_timezone,'YYYY-MM'),id,created_at,user_name FROM public.logs WHERE walk_id IS NULL
), gaps AS (
  SELECT *, CASE WHEN created_at - lag(created_at) OVER (PARTITION BY scope,period ORDER BY created_at,id) <= interval '30 minutes' THEN 0 ELSE 1 END AS boundary FROM windows
), numbered AS (
  SELECT *,sum(boundary) OVER (PARTITION BY scope,period ORDER BY created_at,id) AS n FROM gaps
), old_groups AS (
  SELECT scope,period,n,(array_agg(user_name ORDER BY created_at DESC,id DESC))[1] AS user_name FROM numbered GROUP BY scope,period,n
), before_counts AS (
  SELECT scope,period,user_name,count(*) AS walks FROM old_groups GROUP BY scope,period,user_name
), new_windows AS (
  SELECT 'day' AS scope,to_char(created_at AT TIME ZONE p_timezone,'YYYY-MM-DD') AS period,user_name FROM pepper_private.legacy_candidates
  UNION ALL
  SELECT 'month',to_char(created_at AT TIME ZONE p_timezone,'YYYY-MM'),user_name FROM pepper_private.legacy_candidates
), after_counts AS (
  SELECT scope,period,user_name,count(*) AS walks FROM new_windows GROUP BY scope,period,user_name
), comparisons AS (
  SELECT coalesce(b.scope,a.scope) AS scope,coalesce(b.period,a.period) AS period,coalesce(b.user_name,a.user_name) AS user_name,
    coalesce(b.walks,0) AS before_walks,coalesce(a.walks,0) AS after_walks,
    5 * (coalesce(a.walks,0)-coalesce(b.walks,0)) AS points_delta
  FROM before_counts b FULL JOIN after_counts a USING(scope,period,user_name)
)
SELECT jsonb_build_object('timezone',p_timezone,'fingerprint',pepper_private.legacy_fingerprint(),
  'sourceCount',(SELECT count(*) FROM public.logs WHERE walk_id IS NULL),
  'groups',coalesce((SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'crosses_day',(first_at AT TIME ZONE p_timezone)::date <> (created_at AT TIME ZONE p_timezone)::date,
    'crosses_month',to_char(first_at AT TIME ZONE p_timezone,'YYYY-MM') <> to_char(created_at AT TIME ZONE p_timezone,'YYYY-MM'),
    'provenance',CASE WHEN outcome_count = 1 THEN 'legacy_single' ELSE 'legacy_estimate' END) ORDER BY created_at,walk_id)
    FROM pepper_private.legacy_candidates c),'[]'::jsonb),
  'comparisons',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY scope,period,user_name) FROM comparisons c),'[]'::jsonb));
$$;

CREATE FUNCTION pepper_private.backfill_legacy_walks(p_fingerprint text,p_timezone text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE preview jsonb; candidate record; converted integer := 0;
BEGIN
  IF p_timezone IS NULL THEN RAISE EXCEPTION 'A reviewed timezone is required'; END IF;
  LOCK TABLE public.walks,public.logs IN SHARE ROW EXCLUSIVE MODE;
  preview := pepper_private.preview_legacy_walks(p_timezone);
  IF p_fingerprint IS NULL OR p_fingerprint <> preview->>'fingerprint' THEN
    RAISE EXCEPTION 'Source changed. Export and review a new preview.';
  END IF;
  FOR candidate IN SELECT * FROM pepper_private.legacy_candidates ORDER BY created_at,walk_id LOOP
    INSERT INTO public.walks(id,created_at,user_name,provenance) VALUES(candidate.walk_id,candidate.created_at,candidate.user_name,
      CASE WHEN candidate.outcome_count = 1 THEN 'legacy_single' ELSE 'legacy_estimate' END);
    INSERT INTO pepper_private.legacy_log_archive(log_id,original)
      SELECT id,to_jsonb(l) - 'walk_id' FROM public.logs l WHERE id = ANY(candidate.log_ids) ON CONFLICT DO NOTHING;
    INSERT INTO pepper_private.legacy_walk_map(log_id,walk_id,original)
      SELECT id,candidate.walk_id,to_jsonb(l) - 'walk_id' FROM public.logs l WHERE id = ANY(candidate.log_ids);
    UPDATE public.logs SET walk_id = candidate.walk_id WHERE id = ANY(candidate.log_ids);
    converted := converted + 1;
  END LOOP;
  RETURN jsonb_build_object('convertedWalks',converted,'reviewedPreview',preview);
END;
$$;

CREATE FUNCTION pepper_private.recover_legacy_backfill() RETURNS integer
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE recovered integer;
BEGIN
  LOCK TABLE public.walks,public.logs IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM pepper_private.legacy_walk_map m LEFT JOIN public.walks w ON w.id = m.walk_id
      LEFT JOIN public.logs l ON l.id = m.log_id
      WHERE w.id IS NULL OR w.revision <> 1 OR w.deleted_at IS NOT NULL OR l.id IS NULL
        OR l.walk_id IS DISTINCT FROM m.walk_id OR (to_jsonb(l) - 'walk_id') <> m.original)
    OR EXISTS (SELECT 1 FROM public.logs l WHERE l.walk_id IN (SELECT walk_id FROM pepper_private.legacy_walk_map)
      AND NOT EXISTS(SELECT 1 FROM pepper_private.legacy_walk_map m WHERE m.log_id = l.id)) THEN
    RAISE EXCEPTION 'Legacy records changed after conversion. Restore/reconcile from archive instead.';
  END IF;
  SELECT count(DISTINCT walk_id) INTO recovered FROM pepper_private.legacy_walk_map;
  UPDATE public.logs SET walk_id = NULL WHERE id IN (SELECT log_id FROM pepper_private.legacy_walk_map);
  DELETE FROM public.walks WHERE id IN (SELECT walk_id FROM pepper_private.legacy_walk_map);
  DELETE FROM pepper_private.legacy_walk_map;
  RETURN recovered;
END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA pepper_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pepper_private FROM PUBLIC, anon, authenticated;
COMMIT;

-- Export this result BEFORE backfill. Run conversion separately, substituting
-- the fingerprint and timezone returned here (never compute it inline):
-- SELECT pepper_private.backfill_legacy_walks('REVIEWED_FINGERPRINT','America/New_York');
SELECT pepper_private.preview_legacy_walks('America/New_York');
