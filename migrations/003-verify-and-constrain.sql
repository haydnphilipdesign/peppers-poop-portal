-- Only after reviewed backfill, with writes still paused.
BEGIN;
LOCK TABLE public.walks,public.logs IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.logs WHERE walk_id IS NULL) THEN
    RAISE EXCEPTION 'Unlinked outcomes remain. Stop cutover.';
  END IF;
  IF EXISTS(SELECT 1 FROM pepper_private.legacy_walk_map m
    LEFT JOIN public.logs l ON l.id = m.log_id
    LEFT JOIN public.walks w ON w.id = m.walk_id
    LEFT JOIN pepper_private.legacy_log_archive a ON a.log_id = m.log_id
    WHERE l.id IS NULL OR l.walk_id IS DISTINCT FROM m.walk_id
      OR w.id IS NULL OR w.revision <> 1 OR w.deleted_at IS NOT NULL
      OR (to_jsonb(l) - 'walk_id') IS DISTINCT FROM m.original OR a.original IS DISTINCT FROM m.original) THEN
    RAISE EXCEPTION 'Historical source or mapping changed. Stop cutover.';
  END IF;
END $$;
ALTER TABLE public.logs ALTER COLUMN walk_id SET NOT NULL;
NOTIFY pgrst, 'reload schema';
COMMIT;
