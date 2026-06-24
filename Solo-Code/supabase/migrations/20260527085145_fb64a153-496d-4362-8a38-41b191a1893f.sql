-- Feature Suggestions
CREATE TABLE public.feature_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature','improvement','bug')),
  upvotes INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','planned','shipped','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_suggestions TO authenticated;
GRANT ALL ON public.feature_suggestions TO service_role;
ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own suggestions" ON public.feature_suggestions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own suggestions" ON public.feature_suggestions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending suggestions" ON public.feature_suggestions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'new');
CREATE POLICY "Admins update any suggestion" ON public.feature_suggestions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete suggestions" ON public.feature_suggestions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_feature_suggestions_updated_at
  BEFORE UPDATE ON public.feature_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAQs
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published faqs" ON public.faqs
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage faqs" ON public.faqs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Changelog
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'feature' CHECK (tag IN ('feature','improvement','fix')),
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.changelog_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.changelog_entries TO authenticated;
GRANT ALL ON public.changelog_entries TO service_role;
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published changelog" ON public.changelog_entries
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage changelog" ON public.changelog_entries
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed FAQs
INSERT INTO public.faqs (question, answer, category, sort_order) VALUES
  ('So1o ใช้งานฟรีไหม?', 'ช่วง Beta ใช้งานได้ฟรีทุกฟีเจอร์หลักครับ ทีมงานกำลังพัฒนาอย่างต่อเนื่อง', 'general', 1),
  ('ฟีเจอร์คำนวณภาษีเชื่อถือได้แค่ไหน?', 'เป็นการประมาณการจากสูตรภาษีไทยปีล่าสุด เพื่อช่วยวางแผน โปรดตรวจสอบกับสรรพากรหรือนักบัญชีอีกครั้งก่อนยื่นจริง', 'tax', 2),
  ('แชร์งานให้ลูกค้าดูยังไง?', 'ในหน้า Job Tracker กดปุ่มแชร์ ระบบจะสร้างลิงก์เฉพาะให้ลูกค้าเปิดดูสถานะได้โดยไม่ต้องล็อกอิน', 'sharing', 3),
  ('Smart Brief คืออะไร?', 'เครื่องมือสร้างบรีฟงานออกแบบให้ลูกค้ากรอกง่ายขึ้น พร้อมเซ็นยืนยันออนไลน์', 'brief', 4),
  ('ลืมรหัสผ่านทำยังไง?', 'ไปที่หน้าล็อกอิน กด "ลืมรหัสผ่าน" แล้วกรอกอีเมล ระบบจะส่งลิงก์รีเซ็ตให้', 'account', 5);

-- Seed Changelog
INSERT INTO public.changelog_entries (version, title, body, tag, released_at) VALUES
  ('v1.4.0', 'โหมดจำลองภาษี (Tax Sandbox)', 'ทดลองคำนวณภาษีแบบ Real-time พร้อม AI แนะนำการลดหย่อน และดาวน์โหลด PDF ได้', 'feature', now()),
  ('v1.3.0', 'Job Tracker + สลิปอัปโหลด', 'ลูกค้าอัปโหลดสลิปได้เอง พร้อมระบบยืนยันการรับเงิน', 'feature', now() - interval '7 days'),
  ('v1.2.1', 'ปรับปรุงความเร็วหน้าแดชบอร์ด', 'โหลดเร็วขึ้น ~40% บนมือถือ', 'improvement', now() - interval '14 days');