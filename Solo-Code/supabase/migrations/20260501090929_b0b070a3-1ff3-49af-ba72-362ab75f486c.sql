-- กันใบสมัคร Tester ซ้ำต่อ user_id (กัน race จาก double-tab/double-click)
-- ใช้ UNIQUE INDEX แทน UNIQUE CONSTRAINT เพื่อ idempotent (ใช้ IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS tester_applications_user_id_uidx
  ON public.tester_applications (user_id);