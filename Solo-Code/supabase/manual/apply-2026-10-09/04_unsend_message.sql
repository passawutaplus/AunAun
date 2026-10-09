-- Review fix (2026-10-07): public.unsend_message did not exist, so "ยกเลิกข้อความ" in chat always failed.
-- Soft-deletes the caller's own non-system message within 24 h (matches UNSEND_WINDOW_MS in useChat.ts).

CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE shared.messages
     SET deleted_at = now()
   WHERE id = p_message_id
     AND sender_id = v_uid
     AND deleted_at IS NULL
     AND coalesce(message_type, 'text') <> 'system'
     AND created_at > now() - interval '24 hours';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'UNSEND_NOT_ALLOWED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.unsend_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unsend_message(uuid) TO authenticated;
