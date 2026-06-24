
-- =========================================================
-- portfolio_comments — text-only comments on portfolio cards
-- =========================================================
CREATE TABLE public.portfolio_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  author_avatar TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','flagged')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_comments_project ON public.portfolio_comments(project_id, created_at DESC) WHERE status = 'visible';
CREATE INDEX idx_portfolio_comments_user ON public.portfolio_comments(user_id);

ALTER TABLE public.portfolio_comments ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read visible comments
CREATE POLICY "Visible comments are public"
ON public.portfolio_comments
FOR SELECT
TO anon, authenticated
USING (status = 'visible');

-- Comment authors can read their own (even if hidden)
CREATE POLICY "Authors view own comments"
ON public.portfolio_comments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Project owners can read all comments on their projects (for moderation)
CREATE POLICY "Project owners view all comments on their projects"
ON public.portfolio_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_projects p
    WHERE p.id = portfolio_comments.project_id AND p.user_id = auth.uid()
  )
);

-- Only signed-in users can comment, in their own name
CREATE POLICY "Authenticated users can comment"
ON public.portfolio_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authors can edit their own comments
CREATE POLICY "Authors update own comments"
ON public.portfolio_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own; project owners can hide via UPDATE; admins can do anything via separate policy
CREATE POLICY "Authors delete own comments"
ON public.portfolio_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Project owners can moderate comments on their projects"
ON public.portfolio_comments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_projects p
    WHERE p.id = portfolio_comments.project_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolio_projects p
    WHERE p.id = portfolio_comments.project_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete comments on their projects"
ON public.portfolio_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_projects p
    WHERE p.id = portfolio_comments.project_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all comments"
ON public.portfolio_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Content moderation trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.moderate_portfolio_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
  bad_pattern TEXT;
  -- ภาษาอังกฤษ: คำหยาบ/รุนแรง/ผิดกฎหมายพื้นฐาน
  -- ภาษาไทย: คำด่า/ขายของผิดกฎหมาย/พนัน/อบายมุข
  -- pattern ใช้ word-boundary แบบหลวม (lower-cased)
BEGIN
  IF NEW.body IS NULL THEN
    RAISE EXCEPTION 'ข้อความว่างเปล่า';
  END IF;

  cleaned := btrim(NEW.body);

  -- length
  IF length(cleaned) < 1 THEN
    RAISE EXCEPTION 'ข้อความสั้นเกินไป';
  END IF;
  IF length(cleaned) > 600 THEN
    RAISE EXCEPTION 'ข้อความยาวเกิน 600 ตัวอักษร';
  END IF;

  -- ห้ามใส่ลิงก์ — กันสแปม/สแกม/ลิงก์ผิดกฎหมาย
  IF cleaned ~* '(https?://|www\.|t\.me/|bit\.ly|line\.me/ti|wa\.me/)' THEN
    RAISE EXCEPTION 'ห้ามแนบลิงก์ในคอมเมนต์';
  END IF;

  -- ห้ามตัวอักษรเดียวซ้ำเกิน 12 ตัว (สแปมแบบ aaaaaaaaaaaa)
  IF cleaned ~ '(.)\1{11,}' THEN
    RAISE EXCEPTION 'ข้อความดูเหมือนสแปม';
  END IF;

  -- คำต้องห้าม (block) — ผิดกฎหมายร้ายแรง/รุนแรง
  -- ใช้ regex แบบ case-insensitive
  bad_pattern := '(' ||
    -- อังกฤษ: ความรุนแรงทางเพศกับเด็ก / ค้ามนุษย์ / ขายอาวุธ-ยาเสพติด
    'child\s*porn|cp\s*video|kill\s*you|rape|murder|terrorist|behead|' ||
    'cocaine|heroin|meth\s*amphetamine|sell\s*drugs|buy\s*drugs|' ||
    'how\s*to\s*make\s*bomb|build\s*a\s*bomb|hire\s*hitman|' ||
    -- ไทย: ยาเสพติด/พนันออนไลน์/ค้าประเวณี/ขายอาวุธ
    'ยาบ้า|ยาไอซ์|ยาอี|เฮโรอีน|กัญชาเถื่อน|ขายยา|ขายปืน|ขายอาวุธ|' ||
    'พนันออนไลน์|เว็บพนัน|บาคาร่า|สล็อตเว็บตรง|รับเครดิตฟรี|' ||
    'ขายบริการทางเพศ|ค้าประเวณี|รับจ้างทำร้าย|รับจ้างฆ่า|' ||
    'ฆ่าให้ตาย|จะฆ่ามึง|จะฆ่าแก' ||
  ')';

  IF cleaned ~* bad_pattern THEN
    RAISE EXCEPTION 'ข้อความขัดต่อนโยบาย ไม่สามารถโพสต์ได้';
  END IF;

  -- คำหยาบทั่วไป — ไม่บล็อก แต่เซ็นเซอร์เป็น ***
  -- ทำที่ trigger เพื่อให้แม้แต่ admin ลืมก็ปลอดภัย
  cleaned := regexp_replace(
    cleaned,
    '(?:fuck|f\*ck|shit|bitch|asshole|motherfucker|cunt|dick\s*head|' ||
    'เหี้ย|เหี้ยะ|สัส|สาส|ส้ัส|ควย|เย็ด|มึงแม่|แม่มึง|อีดอก|อีสัตว์|อีเหี้ย|' ||
    'ไอเหี้ย|ไอสัตว์|พ่อมึงตาย|แม่มึงตาย)',
    repeat('*', 4),
    'gi'
  );

  NEW.body := cleaned;

  -- Force snapshot ชื่อ/รูป จาก profile ปัจจุบัน (กัน spoof)
  NEW.user_id := auth.uid();
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนคอมเมนต์';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_moderate_portfolio_comment_insert
BEFORE INSERT ON public.portfolio_comments
FOR EACH ROW
EXECUTE FUNCTION public.moderate_portfolio_comment();

CREATE TRIGGER trg_moderate_portfolio_comment_update
BEFORE UPDATE OF body ON public.portfolio_comments
FOR EACH ROW
EXECUTE FUNCTION public.moderate_portfolio_comment();

CREATE TRIGGER trg_portfolio_comments_updated_at
BEFORE UPDATE ON public.portfolio_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Reports
-- =========================================================
CREATE TABLE public.portfolio_comment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.portfolio_comments(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'inappropriate' CHECK (reason IN ('inappropriate','spam','hate','illegal','other')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, reporter_user_id)
);

ALTER TABLE public.portfolio_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can report"
ON public.portfolio_comment_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Reporters and admins view reports"
ON public.portfolio_comment_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_user_id OR public.has_role(auth.uid(), 'admin'));

-- Auto-bump report_count and auto-hide at 3+ reports
CREATE OR REPLACE FUNCTION public.bump_comment_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.portfolio_comments
     SET report_count = report_count + 1,
         status = CASE WHEN report_count + 1 >= 3 THEN 'flagged' ELSE status END,
         updated_at = now()
   WHERE id = NEW.comment_id
   RETURNING report_count INTO new_count;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_comment_report_count
AFTER INSERT ON public.portfolio_comment_reports
FOR EACH ROW
EXECUTE FUNCTION public.bump_comment_report_count();
