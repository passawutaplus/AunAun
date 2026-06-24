-- =========================================================
-- 1. SECURITY FIXES on existing objects
-- =========================================================

-- 1a) Remove duplicate "public" role storage policies (kept the authenticated ones)
DROP POLICY IF EXISTS "Users upload own brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own brand logos" ON storage.objects;

-- 1b) Restrict execution of SECURITY DEFINER function to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 1c) Explicitly deny UPDATE on user_roles for all non-admin users (defense in depth)
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- 2. Reusable updated_at trigger (already exists but ensure)
-- =========================================================
-- public.update_updated_at_column() already exists per project state.

-- =========================================================
-- 3. PORTFOLIO PROJECTS
-- =========================================================
CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  cover TEXT,
  category TEXT NOT NULL DEFAULT 'Graphic',
  description TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft','private')),
  price_min INTEGER,
  price_max INTEGER,
  days_spent INTEGER,
  palette TEXT[] NOT NULL DEFAULT '{}',
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  author JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_portfolio_projects_user ON public.portfolio_projects(user_id);
CREATE INDEX idx_portfolio_projects_status ON public.portfolio_projects(status);
CREATE INDEX idx_portfolio_projects_published ON public.portfolio_projects(status, updated_at DESC) WHERE status = 'published';

-- Anyone (including anon) can view PUBLISHED projects (this is a public discovery feed)
CREATE POLICY "Published projects are public"
  ON public.portfolio_projects FOR SELECT
  USING (status = 'published');

-- Owner can see all their own projects (drafts + published + private)
CREATE POLICY "Owners view own projects"
  ON public.portfolio_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own projects"
  ON public.portfolio_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own projects"
  ON public.portfolio_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own projects"
  ON public.portfolio_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_portfolio_projects_updated
  BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. PORTFOLIO LIKES (anti-duplicate, atomic count)
-- =========================================================
CREATE TABLE public.portfolio_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.portfolio_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portfolio_likes_project ON public.portfolio_likes(project_id);

CREATE POLICY "Anyone can view likes" ON public.portfolio_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.portfolio_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can unlike" ON public.portfolio_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 5. SAVED CLIENTS (สมุดลูกค้า)
-- =========================================================
CREATE TABLE public.saved_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('individual','company')),
  industry TEXT,
  phone TEXT,
  line_id TEXT,
  email TEXT,
  social TEXT,
  preferred_channel TEXT CHECK (preferred_channel IN ('line','phone','email','social')),
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  rate INTEGER,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saved_clients_user ON public.saved_clients(user_id);

CREATE POLICY "Owners view own saved clients" ON public.saved_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own saved clients" ON public.saved_clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own saved clients" ON public.saved_clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own saved clients" ON public.saved_clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_saved_clients_updated BEFORE UPDATE ON public.saved_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6. QUOTATIONS (ใบเสนอราคา + เอกสารต่อเนื่อง)
-- =========================================================
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  project_name TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT,
  client_line_id TEXT,
  client_email TEXT,
  client_address TEXT,
  client_tax_id TEXT,
  start_date DATE,
  end_date DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulties JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  hidden_cost NUMERIC NOT NULL DEFAULT 0,
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_kind TEXT NOT NULL DEFAULT 'percent' CHECK (discount_kind IN ('percent','amount')),
  vat_enabled BOOLEAN NOT NULL DEFAULT false,
  vat_rate NUMERIC NOT NULL DEFAULT 7,
  wht_enabled BOOLEAN NOT NULL DEFAULT true,
  wht_rate NUMERIC NOT NULL DEFAULT 3,
  deposit_preset INTEGER NOT NULL DEFAULT 50 CHECK (deposit_preset IN (30,50,70,100)),
  payment_terms TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','pending_payment','pending_receipt','completed','rejected','expired')),
  hourly_days INTEGER NOT NULL DEFAULT 0,
  hourly_hours INTEGER NOT NULL DEFAULT 0,
  revisions_count INTEGER NOT NULL DEFAULT 2,
  pdf_exported_at TIMESTAMPTZ,
  invoice_number TEXT,
  invoice_issued_at TIMESTAMPTZ,
  receipt_number TEXT,
  receipt_issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, number)
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quotations_user ON public.quotations(user_id);
CREATE INDEX idx_quotations_status ON public.quotations(user_id, status);

CREATE POLICY "Owners view own quotations" ON public.quotations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own quotations" ON public.quotations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own quotations" ON public.quotations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 7. FINANCE TABLES
-- =========================================================

-- Subscriptions
CREATE TABLE public.finance_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly','yearly','weekly','one-time')),
  next_renewal DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  payment_method_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_subs_user ON public.finance_subscriptions(user_id);

CREATE POLICY "Owners CRUD own subs - select" ON public.finance_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own subs - insert" ON public.finance_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own subs - update" ON public.finance_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own subs - delete" ON public.finance_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_subs_updated BEFORE UPDATE ON public.finance_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment methods
CREATE TABLE public.finance_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'card',
  last4 TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_pms_user ON public.finance_payment_methods(user_id);

CREATE POLICY "Owners CRUD own pm - select" ON public.finance_payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own pm - insert" ON public.finance_payment_methods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own pm - update" ON public.finance_payment_methods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own pm - delete" ON public.finance_payment_methods FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_pms_updated BEFORE UPDATE ON public.finance_payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client invoices (the simple list shown in ClientsTab)
CREATE TABLE public.finance_clients_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'ontime' CHECK (status IN ('paid','ontime','late7','late30')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_clients_invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_clients_user ON public.finance_clients_invoices(user_id);

CREATE POLICY "Owners CRUD own client inv - select" ON public.finance_clients_invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own client inv - insert" ON public.finance_clients_invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own client inv - update" ON public.finance_clients_invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own client inv - delete" ON public.finance_clients_invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_clients_updated BEFORE UPDATE ON public.finance_clients_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Incomes (รายได้จริง)
CREATE TABLE public.finance_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'service' CHECK (category IN ('service','product','royalty','other','salary','rental','dividend','interest')),
  gross NUMERIC NOT NULL DEFAULT 0,
  wht NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  month TEXT NOT NULL,           -- YYYY-MM
  receive_date DATE,
  has_certificate BOOLEAN NOT NULL DEFAULT false,
  source_quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_incomes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_inc_user ON public.finance_incomes(user_id);
CREATE INDEX idx_finance_inc_user_month ON public.finance_incomes(user_id, month);
CREATE UNIQUE INDEX idx_finance_inc_source_q ON public.finance_incomes(user_id, source_quotation_id) WHERE source_quotation_id IS NOT NULL;

CREATE POLICY "Owners CRUD own inc - select" ON public.finance_incomes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own inc - insert" ON public.finance_incomes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own inc - update" ON public.finance_incomes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own inc - delete" ON public.finance_incomes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_inc_updated BEFORE UPDATE ON public.finance_incomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses (รายจ่าย)
CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'work' CHECK (scope IN ('work','personal')),
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  spent_date DATE,
  month TEXT NOT NULL,
  is_deductible BOOLEAN NOT NULL DEFAULT false,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_exp_user ON public.finance_expenses(user_id);
CREATE INDEX idx_finance_exp_user_month ON public.finance_expenses(user_id, month);
CREATE INDEX idx_finance_exp_scope ON public.finance_expenses(user_id, scope);

CREATE POLICY "Owners CRUD own exp - select" ON public.finance_expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own exp - insert" ON public.finance_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own exp - update" ON public.finance_expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own exp - delete" ON public.finance_expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_exp_updated BEFORE UPDATE ON public.finance_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tax deductions (ลดหย่อน)
CREATE TABLE public.finance_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deduction_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, deduction_key, tax_year)
);
ALTER TABLE public.finance_deductions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_finance_ded_user ON public.finance_deductions(user_id);

CREATE POLICY "Owners CRUD own ded - select" ON public.finance_deductions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own ded - insert" ON public.finance_deductions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own ded - update" ON public.finance_deductions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD own ded - delete" ON public.finance_deductions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_finance_ded_updated BEFORE UPDATE ON public.finance_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Finance settings (ลดหย่อน method, monthly goal, etc.)
CREATE TABLE public.finance_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_method TEXT NOT NULL DEFAULT 'lumpsum' CHECK (expense_method IN ('lumpsum','actual')),
  monthly_goal NUMERIC NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own settings" ON public.finance_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own settings" ON public.finance_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own settings" ON public.finance_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_finance_settings_updated BEFORE UPDATE ON public.finance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 8. STORAGE: portfolio-images bucket (public read, owner write)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read (since published portfolios are public discovery)
CREATE POLICY "Portfolio images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- Authenticated users can upload to a folder named after their auth.uid()
CREATE POLICY "Users upload to own portfolio folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own portfolio images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own portfolio images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );