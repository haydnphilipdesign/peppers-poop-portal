-- Additive stage. Back up first; see docs/phase4-walk-design.md.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pepper_private;
REVOKE ALL ON SCHEMA pepper_private FROM PUBLIC, anon, authenticated;
CREATE TABLE public.walks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL,
  user_name text NOT NULL CHECK (user_name IN ('Chris','Debbie','Haydn')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  provenance text NOT NULL DEFAULT 'explicit' CHECK (provenance IN ('explicit','legacy_single','legacy_estimate')),
  deleted_at timestamptz
);
ALTER TABLE public.logs ADD COLUMN walk_id uuid REFERENCES public.walks(id);
CREATE INDEX walks_created_at_idx ON public.walks(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX logs_walk_id_idx ON public.logs(walk_id);
ALTER TABLE public.walks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public active walks" ON public.walks FOR SELECT USING (deleted_at IS NULL);
REVOKE ALL ON public.walks FROM anon, authenticated;
GRANT SELECT ON public.walks TO anon, authenticated;
GRANT ALL ON public.walks TO service_role;
DROP POLICY "Allow public read" ON public.logs;
CREATE POLICY "Allow public read" ON public.logs FOR SELECT USING (
  walk_id IS NULL OR EXISTS (SELECT 1 FROM public.walks w WHERE w.id = walk_id AND w.deleted_at IS NULL)
);
CREATE TABLE pepper_private.walk_requests (
  request_id uuid PRIMARY KEY, payload jsonb NOT NULL, result jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pepper_private.legacy_walk_map (
  log_id uuid PRIMARY KEY, walk_id uuid NOT NULL, original jsonb NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pepper_private.legacy_log_archive (
  log_id uuid PRIMARY KEY, original jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA pepper_private FROM PUBLIC, anon, authenticated;

-- One transaction, a durable receipt and a revision lock for every operation.
CREATE FUNCTION public.mutate_walk_v2(
  p_request_id uuid, p_operation text, p_walk_id uuid,
  p_expected_revision integer, p_created_at timestamptz, p_user_name text,
  p_has_poop boolean, p_has_pee boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  payload jsonb; previous pepper_private.walk_requests%ROWTYPE;
  target public.walks%ROWTYPE; result jsonb;
BEGIN
  IF p_request_id IS NULL OR p_operation IS NULL OR p_operation NOT IN ('create','update','delete') THEN
    RAISE EXCEPTION 'Invalid walk request' USING ERRCODE = '22023';
  END IF;
  payload := jsonb_build_object('operation',p_operation,'walkId',p_walk_id,'revision',p_expected_revision,
    'time',p_created_at,'user',p_user_name,'poop',p_has_poop,'pee',p_has_pee);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO previous FROM pepper_private.walk_requests WHERE request_id = p_request_id;
  IF FOUND THEN
    IF previous.payload <> payload THEN
      RAISE EXCEPTION 'Request ID reused with different input' USING ERRCODE = 'P0001';
    END IF;
    RETURN previous.result;
  END IF;
  IF p_operation <> 'delete' AND (p_created_at IS NULL OR p_user_name IS NULL
    OR p_user_name NOT IN ('Chris','Debbie','Haydn') OR p_has_poop IS NULL OR p_has_pee IS NULL) THEN
    RAISE EXCEPTION 'Invalid walk input' USING ERRCODE = '22023';
  END IF;
  IF p_operation = 'create' THEN
    INSERT INTO public.walks(created_at,user_name) VALUES(p_created_at,p_user_name) RETURNING * INTO target;
  ELSE
    SELECT * INTO target FROM public.walks WHERE id = p_walk_id FOR UPDATE;
    IF NOT FOUND OR target.deleted_at IS NOT NULL OR p_expected_revision IS NULL OR target.revision <> p_expected_revision THEN
      RAISE EXCEPTION 'This walk changed or was removed. Refresh and select it again.' USING ERRCODE = 'P0001';
    END IF;
    IF p_operation = 'delete' THEN
      UPDATE public.walks SET deleted_at = now(), revision = revision + 1 WHERE id = target.id RETURNING * INTO target;
    ELSE
      UPDATE public.walks SET created_at = p_created_at, user_name = p_user_name, revision = revision + 1
        WHERE id = target.id RETURNING * INTO target;
      DELETE FROM public.logs WHERE walk_id = target.id
        AND ((type = 'poop' AND NOT p_has_poop) OR (type = 'pee' AND NOT p_has_pee));
      UPDATE public.logs SET created_at = p_created_at, user_name = p_user_name WHERE walk_id = target.id;
    END IF;
  END IF;
  IF p_operation <> 'delete' THEN
    IF p_has_poop AND NOT EXISTS (SELECT 1 FROM public.logs WHERE walk_id = target.id AND type = 'poop') THEN
      INSERT INTO public.logs(walk_id,created_at,user_name,type) VALUES(target.id,target.created_at,target.user_name,'poop');
    END IF;
    IF p_has_pee AND NOT EXISTS (SELECT 1 FROM public.logs WHERE walk_id = target.id AND type = 'pee') THEN
      INSERT INTO public.logs(walk_id,created_at,user_name,type) VALUES(target.id,target.created_at,target.user_name,'pee');
    END IF;
  END IF;
  result := jsonb_build_object('walkId',target.id,'revision',target.revision);
  INSERT INTO pepper_private.walk_requests(request_id,payload,result) VALUES(p_request_id,payload,result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_walk_v2(uuid,text,uuid,integer,timestamptz,text,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_walk_v2(uuid,text,uuid,integer,timestamptz,text,boolean,boolean) TO service_role;

-- Compatibility for the additive deployment window. Never accept a partial
-- parent or a group spanning multiple parents from an old client.
CREATE FUNCTION pepper_private.legacy_target(p_ids uuid[]) RETURNS public.walks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.walks%ROWTYPE; linked uuid; ids uuid[];
BEGIN
  IF p_ids IS NULL OR cardinality(p_ids) = 0 OR cardinality(p_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_ids) x) THEN
    RAISE EXCEPTION 'Invalid log IDs';
  END IF;
  LOCK TABLE public.logs IN SHARE ROW EXCLUSIVE MODE;
  IF (SELECT count(*) FROM public.logs WHERE id = ANY(p_ids)) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Logs changed. Refresh first.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.logs WHERE id = ANY(p_ids) AND walk_id IS NULL) THEN
    IF EXISTS (SELECT 1 FROM public.logs WHERE id = ANY(p_ids) AND walk_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Mixed migrated and unmigrated logs';
    END IF;
    INSERT INTO public.walks(created_at,user_name,provenance)
      SELECT created_at,user_name,CASE WHEN cardinality(p_ids) = 1 THEN 'legacy_single' ELSE 'legacy_estimate' END
      FROM public.logs WHERE id = ANY(p_ids) ORDER BY created_at DESC,id DESC LIMIT 1 RETURNING * INTO target;
    INSERT INTO pepper_private.legacy_log_archive SELECT id,to_jsonb(l) - 'walk_id' FROM public.logs l WHERE id = ANY(p_ids) ON CONFLICT DO NOTHING;
    INSERT INTO pepper_private.legacy_walk_map(log_id,walk_id,original)
      SELECT id,target.id,to_jsonb(l) - 'walk_id' FROM public.logs l WHERE id = ANY(p_ids);
    UPDATE public.logs SET walk_id = target.id WHERE id = ANY(p_ids);
  ELSE
    SELECT walk_id INTO linked FROM public.logs WHERE id = p_ids[1];
    SELECT array_agg(id ORDER BY id) INTO ids FROM public.logs WHERE walk_id = linked;
    IF ids <> (SELECT array_agg(x ORDER BY x) FROM unnest(p_ids) x) THEN
      RAISE EXCEPTION 'This selection is not one complete walk. Reload the app.';
    END IF;
    SELECT * INTO target FROM public.walks WHERE id = linked FOR UPDATE;
  END IF;
  RETURN target;
END;
$$;
REVOKE ALL ON FUNCTION pepper_private.legacy_target(uuid[]) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.insert_walk(p_created_at timestamptz,p_user_name text,p_has_poop boolean,p_has_pee boolean)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (p_has_poop OR p_has_pee) THEN RAISE EXCEPTION 'Legacy clients require a bathroom outcome'; END IF;
  result := public.mutate_walk_v2(gen_random_uuid(),'create',NULL,NULL,p_created_at,p_user_name,p_has_poop,p_has_pee);
  RETURN ARRAY(SELECT id FROM public.logs WHERE walk_id = (result->>'walkId')::uuid ORDER BY id);
END;
$$;
CREATE OR REPLACE FUNCTION public.replace_walk(p_log_ids uuid[],p_created_at timestamptz,p_user_name text,p_has_poop boolean,p_has_pee boolean)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.walks%ROWTYPE;
BEGIN
  IF NOT (p_has_poop OR p_has_pee) THEN RAISE EXCEPTION 'Legacy clients require a bathroom outcome'; END IF;
  target := pepper_private.legacy_target(p_log_ids);
  PERFORM public.mutate_walk_v2(gen_random_uuid(),'update',target.id,target.revision,p_created_at,p_user_name,p_has_poop,p_has_pee);
  RETURN ARRAY(SELECT id FROM public.logs WHERE walk_id = target.id ORDER BY id);
END;
$$;
CREATE OR REPLACE FUNCTION public.delete_walk(p_log_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.walks%ROWTYPE;
BEGIN
  target := pepper_private.legacy_target(p_log_ids);
  PERFORM public.mutate_walk_v2(gen_random_uuid(),'delete',target.id,target.revision,NULL,NULL,NULL,NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.insert_walk(timestamptz,text,boolean,boolean), public.replace_walk(uuid[],timestamptz,text,boolean,boolean), public.delete_walk(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_walk(timestamptz,text,boolean,boolean), public.replace_walk(uuid[],timestamptz,text,boolean,boolean), public.delete_walk(uuid[]) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
