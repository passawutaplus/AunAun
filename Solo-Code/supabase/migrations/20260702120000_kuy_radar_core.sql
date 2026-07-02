-- Kuy Radar Admin module (Aplus1) — shared schema tables + RLS + RPCs

CREATE TABLE IF NOT EXISTS shared.kuy_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  product_service text,
  target_customer text,
  location text,
  language text NOT NULL DEFAULT 'both' CHECK (language IN ('th', 'en', 'both')),
  main_keyword text,
  pain_points text[] DEFAULT '{}',
  goals text[] DEFAULT '{}',
  preferred_platforms text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  keyword_type text NOT NULL DEFAULT 'main',
  intent text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  platform text NOT NULL,
  source_url text NOT NULL,
  lead_name text NOT NULL,
  matched_keyword text,
  intent text,
  pain_point text,
  post_summary text,
  engagement integer NOT NULL DEFAULT 0,
  lead_score integer,
  urgency_level text,
  buying_signal text,
  suggested_offer text,
  outreach_message text,
  status text NOT NULL DEFAULT 'new',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  platform text NOT NULL,
  profile_url text NOT NULL,
  category text,
  followers integer,
  engagement numeric,
  posting_frequency text,
  top_content_angle text,
  main_offer text,
  price_signal text,
  strength text,
  weakness text,
  opportunity_gap text,
  threat_level text,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES shared.kuy_competitors(id) ON DELETE SET NULL,
  platform text NOT NULL,
  content_url text NOT NULL,
  content_type text,
  title text,
  caption text,
  hook text,
  cta text,
  engagement integer,
  hashtags text[] DEFAULT '{}',
  sentiment text,
  ai_summary text,
  why_it_worked text,
  suggested_adaptation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  key_findings text[] NOT NULL DEFAULT '{}',
  recommendation text,
  confidence_score numeric,
  compliance_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'general',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES shared.kuy_leads(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'dm',
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  language text NOT NULL DEFAULT 'th',
  file_url text,
  export_format text NOT NULL,
  compliance_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.kuy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES shared.kuy_businesses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_language text NOT NULL DEFAULT 'both',
  timezone text NOT NULL DEFAULT 'Asia/Bangkok',
  data_retention_days integer NOT NULL DEFAULT 365,
  export_default_format text NOT NULL DEFAULT 'csv',
  ai_mock_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, business_id)
);

CREATE TABLE IF NOT EXISTS shared.kuy_export_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES shared.kuy_businesses(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format text NOT NULL,
  report_type text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  compliance_confirmed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kuy_leads_business ON shared.kuy_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_kuy_competitors_business ON shared.kuy_competitors(business_id);
CREATE INDEX IF NOT EXISTS idx_kuy_content_business ON shared.kuy_content_items(business_id);
CREATE INDEX IF NOT EXISTS idx_kuy_insights_business ON shared.kuy_insights(business_id);

ALTER TABLE shared.kuy_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.kuy_export_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kuy_businesses','kuy_keywords','kuy_leads','kuy_competitors','kuy_content_items',
    'kuy_insights','kuy_campaigns','kuy_outreach_messages','kuy_reports','kuy_settings','kuy_export_audit_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS kuy_admin_all ON shared.%I', t);
    EXECUTE format(
      'CREATE POLICY kuy_admin_all ON shared.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'))',
      t
    );
  END LOOP;
END $$;

CREATE POLICY kuy_biz_owner ON shared.kuy_businesses FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY kuy_kw_owner ON shared.kuy_keywords FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_leads_owner ON shared.kuy_leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_comp_owner ON shared.kuy_competitors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_content_owner ON shared.kuy_content_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_ins_owner ON shared.kuy_insights FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_camp_owner ON shared.kuy_campaigns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_out_owner ON shared.kuy_outreach_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_rep_owner ON shared.kuy_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = business_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY kuy_set_owner ON shared.kuy_settings FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY kuy_export_insert ON shared.kuy_export_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY kuy_export_select ON shared.kuy_export_audit_log FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.kuy_log_export(
  _business_id uuid,
  _export_format text,
  _report_type text,
  _row_count integer,
  _compliance_confirmed boolean,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบ';
  END IF;

  INSERT INTO shared.kuy_export_audit_log (
    business_id, actor_id, export_format, report_type, row_count, compliance_confirmed, metadata
  ) VALUES (
    _business_id, auth.uid(), _export_format, _report_type, _row_count, _compliance_confirmed, coalesce(_metadata, '{}'::jsonb)
  ) RETURNING id INTO new_id;

  IF public.has_role(auth.uid(), 'admin') THEN
    PERFORM public.log_admin_audit(
      'kuy_radar.export',
      'kuy_business',
      coalesce(_business_id::text, ''),
      jsonb_build_object(
        'export_format', _export_format,
        'report_type', _report_type,
        'row_count', _row_count,
        'compliance_confirmed', _compliance_confirmed
      ) || coalesce(_metadata, '{}'::jsonb)
    );
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.kuy_log_export(uuid, text, text, integer, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kuy_log_export(uuid, text, text, integer, boolean, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.kuy_delete_business_data(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบ';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') AND NOT EXISTS (
    SELECT 1 FROM shared.kuy_businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  DELETE FROM shared.kuy_outreach_messages WHERE business_id = _business_id;
  DELETE FROM shared.kuy_reports WHERE business_id = _business_id;
  DELETE FROM shared.kuy_insights WHERE business_id = _business_id;
  DELETE FROM shared.kuy_content_items WHERE business_id = _business_id;
  DELETE FROM shared.kuy_competitors WHERE business_id = _business_id;
  DELETE FROM shared.kuy_leads WHERE business_id = _business_id;
  DELETE FROM shared.kuy_keywords WHERE business_id = _business_id;
  DELETE FROM shared.kuy_campaigns WHERE business_id = _business_id;
  DELETE FROM shared.kuy_settings WHERE business_id = _business_id;
  DELETE FROM shared.kuy_businesses WHERE id = _business_id;

  IF public.has_role(auth.uid(), 'admin') THEN
    PERFORM public.log_admin_audit('kuy_radar.delete_business', 'kuy_business', _business_id::text, '{}'::jsonb);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kuy_delete_business_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kuy_delete_business_data(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kuy_seed_demo_business(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM shared.kuy_businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  INSERT INTO shared.kuy_leads (business_id, platform, source_url, lead_name, matched_keyword, intent, pain_point, lead_score, status)
  VALUES
    (_business_id, 'TikTok', 'https://www.tiktok.com/@example/video/1', 'Mali Beauty Review', 'รีวิวคลินิก', 'ถามราคา', 'กลัวเจ็บ', 92, 'qualified'),
    (_business_id, 'Facebook', 'https://www.facebook.com/groups/example/posts/1', 'Bangkok Review Group', 'รีวิว', 'เปรียบเทียบ', 'หาคลินิกที่ดี', 84, 'follow_up');

  INSERT INTO shared.kuy_competitors (business_id, competitor_name, platform, profile_url, threat_level, main_offer)
  VALUES
    (_business_id, 'Glow Clinic BKK', 'Instagram', 'https://www.instagram.com/example', 'high', 'consult ฟรี');
END;
$$;

REVOKE ALL ON FUNCTION public.kuy_seed_demo_business(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kuy_seed_demo_business(uuid) TO authenticated;
