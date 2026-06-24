
-- Function: DB usage stats (admin only)
CREATE OR REPLACE FUNCTION public.get_db_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
  total_size bigint;
  tables_info jsonb;
BEGIN
  -- Only admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Total DB size (public schema only — what user data costs)
  SELECT COALESCE(SUM(pg_total_relation_size(format('public.%I', tablename)::regclass)), 0)
  INTO total_size
  FROM pg_tables
  WHERE schemaname = 'public';

  -- Per-table info
  SELECT jsonb_agg(
    jsonb_build_object(
      'table', tablename,
      'size_bytes', pg_total_relation_size(format('public.%I', tablename)::regclass),
      'row_estimate', (SELECT reltuples::bigint FROM pg_class WHERE oid = format('public.%I', tablename)::regclass)
    )
    ORDER BY pg_total_relation_size(format('public.%I', tablename)::regclass) DESC
  )
  INTO tables_info
  FROM pg_tables
  WHERE schemaname = 'public';

  result := jsonb_build_object(
    'total_size_bytes', total_size,
    'tables', COALESCE(tables_info, '[]'::jsonb)
  );
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_db_usage_stats() TO authenticated;

-- Function: Storage usage stats (admin only)
CREATE OR REPLACE FUNCTION public.get_storage_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket', b.id,
      'public', b.public,
      'file_count', COALESCE(o.cnt, 0),
      'size_bytes', COALESCE(o.bytes, 0)
    )
  )
  INTO result
  FROM storage.buckets b
  LEFT JOIN (
    SELECT
      bucket_id,
      COUNT(*) AS cnt,
      COALESCE(SUM((metadata->>'size')::bigint), 0) AS bytes
    FROM storage.objects
    GROUP BY bucket_id
  ) o ON o.bucket_id = b.id;

  RETURN jsonb_build_object('buckets', COALESCE(result, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_stats() TO authenticated;
