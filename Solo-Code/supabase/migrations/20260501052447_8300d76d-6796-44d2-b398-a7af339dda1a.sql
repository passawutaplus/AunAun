-- 1) Replace permissive hire_requests INSERT policy with one that checks the target owns a published project
DROP POLICY IF EXISTS "Anyone can submit hire requests" ON public.hire_requests;

CREATE POLICY "Anyone can submit hire requests to published owners"
ON public.hire_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolio_projects p
    WHERE p.user_id = hire_requests.owner_user_id
      AND p.status = 'published'
  )
);

-- 2) Harden the comment moderation trigger so author_name/author_avatar can't be spoofed
CREATE OR REPLACE FUNCTION public.moderate_portfolio_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned TEXT;
  bad_pattern TEXT;
  _display_name TEXT;
  _avatar_url TEXT;
BEGIN
  IF NEW.body IS NULL THEN
    RAISE EXCEPTION 'ข้อความว่างเปล่า';
  END IF;

  cleaned := btrim(NEW.body);

  IF length(cleaned) < 1 THEN
    RAISE EXCEPTION 'ข้อความสั้นเกินไป';
  END IF;
  IF length(cleaned) > 600 THEN
    RAISE EXCEPTION 'ข้อความยาวเกิน 600 ตัวอักษร';
  END IF;

  IF cleaned ~* '(https?://|www\.|t\.me/|bit\.ly|line\.me/ti|wa\.me/)' THEN
    RAISE EXCEPTION 'ห้ามแนบลิงก์ในคอมเมนต์';
  END IF;

  IF cleaned ~ '(.)\1{11,}' THEN
    RAISE EXCEPTION 'ข้อความดูเหมือนสแปม';
  END IF;

  bad_pattern := '(' ||
    'child\s*porn|cp\s*video|kill\s*you|rape|murder|terrorist|behead|' ||
    'cocaine|heroin|meth\s*amphetamine|sell\s*drugs|buy\s*drugs|' ||
    'how\s*to\s*make\s*bomb|build\s*a\s*bomb|hire\s*hitman|' ||
    'ยาบ้า|ยาไอซ์|ยาอี|เฮโรอีน|กัญชาเถื่อน|ขายยา|ขายปืน|ขายอาวุธ|' ||
    'พนันออนไลน์|เว็บพนัน|บาคาร่า|สล็อตเว็บตรง|รับเครดิตฟรี|' ||
    'ขายบริการทางเพศ|ค้าประเวณี|รับจ้างทำร้าย|รับจ้างฆ่า|' ||
    'ฆ่าให้ตาย|จะฆ่ามึง|จะฆ่าแก' ||
  ')';

  IF cleaned ~* bad_pattern THEN
    RAISE EXCEPTION 'ข้อความขัดต่อนโยบาย ไม่สามารถโพสต์ได้';
  END IF;

  cleaned := regexp_replace(
    cleaned,
    '(?:fuck|f\*ck|shit|bitch|asshole|motherfucker|cunt|dick\s*head|' ||
    'เหี้ย|เหี้ยะ|สัส|สาส|ส้ัส|ควย|เย็ด|มึงแม่|แม่มึง|อีดอก|อีสัตว์|อีเหี้ย|' ||
    'ไอเหี้ย|ไอสัตว์|พ่อมึงตาย|แม่มึงตาย)',
    repeat('*', 4),
    'gi'
  );

  NEW.body := cleaned;

  -- Force identity from authenticated user — overrides any client-supplied values
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนคอมเมนต์';
  END IF;
  NEW.user_id := auth.uid();

  SELECT COALESCE(display_name, brand_name, 'ผู้ใช้'),
         COALESCE(avatar_url, logo_url)
    INTO _display_name, _avatar_url
    FROM public.profiles
   WHERE user_id = auth.uid()
   LIMIT 1;

  NEW.author_name := COALESCE(_display_name, 'ผู้ใช้');
  NEW.author_avatar := _avatar_url;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger is attached (idempotent)
DROP TRIGGER IF EXISTS trg_moderate_portfolio_comment ON public.portfolio_comments;
CREATE TRIGGER trg_moderate_portfolio_comment
BEFORE INSERT OR UPDATE ON public.portfolio_comments
FOR EACH ROW EXECUTE FUNCTION public.moderate_portfolio_comment();

-- 3) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon (keep authenticated where needed)
REVOKE EXECUTE ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;

-- get_public_profile is meant to be public-readable for portfolio pages
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

-- has_role is referenced by RLS policies, so authenticated needs EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_stats() TO authenticated;
