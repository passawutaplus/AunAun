-- 1. SECURITY DEFINER function returns shared supplier with hidden fields redacted, plus visible links
CREATE OR REPLACE FUNCTION public.get_shared_supplier_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  hidden text[];
  links jsonb;
  result jsonb;
BEGIN
  SELECT * INTO s FROM public.suppliers
  WHERE share_token = _token AND is_shared = true
  LIMIT 1;

  IF s.id IS NULL THEN
    RETURN NULL;
  END IF;

  hidden := COALESCE(s.share_hidden_fields, ARRAY[]::text[]);

  result := jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'category',        CASE WHEN 'category'     = ANY(hidden) THEN NULL ELSE to_jsonb(s.category) END,
    'cover_image_url', CASE WHEN 'cover_image'  = ANY(hidden) THEN NULL ELSE to_jsonb(s.cover_image_url) END,
    'rating',          CASE WHEN 'rating'       = ANY(hidden) THEN NULL ELSE to_jsonb(s.rating) END,
    'contact_name',    CASE WHEN 'contact_name' = ANY(hidden) THEN NULL ELSE to_jsonb(s.contact_name) END,
    'phone',           CASE WHEN 'phone'        = ANY(hidden) THEN NULL ELSE to_jsonb(s.phone) END,
    'line_id',         CASE WHEN 'line_id'      = ANY(hidden) THEN NULL ELSE to_jsonb(s.line_id) END,
    'email',           CASE WHEN 'email'        = ANY(hidden) THEN NULL ELSE to_jsonb(s.email) END,
    'website',         CASE WHEN 'website'      = ANY(hidden) THEN NULL ELSE to_jsonb(s.website) END,
    'map_url',         CASE WHEN 'map_url'      = ANY(hidden) THEN NULL ELSE to_jsonb(s.map_url) END,
    'address',         CASE WHEN 'address'      = ANY(hidden) THEN NULL ELSE to_jsonb(s.address) END,
    'rate_note',       CASE WHEN 'rate_note'    = ANY(hidden) THEN NULL ELSE to_jsonb(s.rate_note) END,
    'tags',            CASE WHEN 'tags'         = ANY(hidden) THEN NULL ELSE to_jsonb(s.tags) END
  );

  IF 'links' = ANY(hidden) THEN
    links := '[]'::jsonb;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'url', l.url) ORDER BY l.created_at), '[]'::jsonb)
    INTO links
    FROM public.supplier_links l WHERE l.supplier_id = s.id;
  END IF;

  result := result || jsonb_build_object('links', links);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_supplier_by_token(uuid) TO anon, authenticated;

-- 2. Remove anon direct SELECT on suppliers and supplier_links (replaced by the RPC above)
DROP POLICY IF EXISTS "Public can view shared suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view links of shared suppliers" ON public.supplier_links;

-- 3. Realtime channel policy for per-user notification topic `notif-<uid>`
CREATE POLICY "realtime notification topic owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'notif-%'
  AND SUBSTRING(realtime.topic() FROM 7) = (auth.uid())::text
);