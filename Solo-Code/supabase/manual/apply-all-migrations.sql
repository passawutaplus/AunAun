-- So1o FULL schema bundle for rvnzjiskqliexysicfmh
-- Generated: 2026-06-07T13:30:47Z
-- Run in Supabase Dashboard → SQL Editor
-- Or: export SUPABASE_ACCESS_TOKEN=... && ./scripts/supabase-push-via-api.sh

-- ── 20260427021942_976ba3e1-e73d-43d4-b692-d27a1f4b3a4e.sql ──
-- 1) App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2) Profiles table (one per auth user)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  brand_name TEXT,
  logo_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) User roles (separate table to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5) Updated-at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Auto-create profile + assign role on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) RLS policies — profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8) RLS policies — user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9) Storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brand logos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

CREATE POLICY "Users can upload own brand logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own brand logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own brand logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 20260427022011_596c8eb4-505d-4e39-8d5f-2381219fd9aa.sql ──
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Tighten storage SELECT policy: only owners can list their files
DROP POLICY IF EXISTS "Brand logos are publicly viewable" ON storage.objects;

CREATE POLICY "Owners can list own brand logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 20260427035429_dff35726-f103-4779-ad92-9afb5d856e43.sql ──
-- 1) Recreate the missing trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill profiles for any existing auth user without one
INSERT INTO public.profiles (user_id, email, display_name)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 3) Backfill roles: admin for the designated email, user for everyone else
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN u.email = 'passawut.a.plus@gmail.com' THEN 'admin'::app_role
            ELSE 'user'::app_role END
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Allow admins to manage roles (promote/demote) from the admin page
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Updated_at trigger on profiles (keeps SettingsTab updates clean)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 20260427035451_e0d6d7e1-8de8-4536-88ca-37491a016b99.sql ──
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- ── 20260427041310_54c5ba29-1183-400d-9814-298f2889d939.sql ──
-- Extend profiles with freelancer business settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS social_link TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT;

-- Ensure brand-logos bucket exists & is public (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for brand-logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Brand logos are publicly readable'
  ) THEN
    CREATE POLICY "Brand logos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'brand-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users upload own brand logos'
  ) THEN
    CREATE POLICY "Users upload own brand logos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users update own brand logos'
  ) THEN
    CREATE POLICY "Users update own brand logos"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users delete own brand logos'
  ) THEN
    CREATE POLICY "Users delete own brand logos"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'brand-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- ── 20260427060436_41f7f0fd-9782-49fd-8458-39e7d6d3ef85.sql ──
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

-- ── 20260427063716_a9ed7ceb-3d35-40d0-8db7-916b2fd64e02.sql ──
ALTER TABLE public.finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_category_check;

-- ── 20260427072630_ae0b8914-a662-4ab8-bf66-67b0ecec52c5.sql ──

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


-- ── 20260427114236_ef0b0133-570c-4506-bfb7-c302d329da9f.sql ──

-- Create a public view exposing only safe profile fields for viewing other creators.
-- Excludes: email, phone, address, tax_id, bank_*, payment_qr_url (PII / financial)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  brand_name,
  logo_url,
  avatar_url,
  tagline,
  social_link,
  currency,
  created_at
FROM public.profiles;

-- Allow anonymous + authenticated users to read the safe view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Add a permissive SELECT policy so the security_invoker view can read base rows
-- when queried by anyone. Existing strict policies on profiles still protect direct
-- access to sensitive columns.
CREATE POLICY "Public can view safe profile fields via view"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);


-- ── 20260427114311_d24a90bf-dac8-4652-8e56-71980181fb00.sql ──

-- 1) Remove the over-permissive SELECT policy that accidentally exposed all profile columns
DROP POLICY IF EXISTS "Public can view safe profile fields via view" ON public.profiles;

-- 2) Drop the view (we'll use a function instead for tighter control)
DROP VIEW IF EXISTS public.profiles_public;

-- 3) Create a SECURITY DEFINER function that returns ONLY safe public profile fields
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  brand_name text,
  logo_url text,
  avatar_url text,
  tagline text,
  social_link text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.brand_name,
    p.logo_url,
    p.avatar_url,
    p.tagline,
    p.social_link,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- 4) Allow anyone (including anon) to call this safe function
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;


-- ── 20260427122135_54148929-5d3e-42b4-946f-d1a277b545ed.sql ──

-- Hire requests inbox: when someone clicks "สนใจจ้างงาน" on a published portfolio
CREATE TABLE public.hire_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','done','archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hire_requests_owner ON public.hire_requests(owner_user_id, status, created_at DESC);
CREATE INDEX idx_hire_requests_project ON public.hire_requests(project_id);

ALTER TABLE public.hire_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a hire request, but they must specify
-- a project that exists and use its real owner — enforced via trigger below.
CREATE POLICY "Anyone can submit hire requests"
ON public.hire_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only the owner of the project can see / update / delete the requests
CREATE POLICY "Owners view their requests"
ON public.hire_requests
FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners update their requests"
ON public.hire_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete their requests"
ON public.hire_requests
FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

-- Validation trigger: ensure the owner_user_id matches the project, and project is published
CREATE OR REPLACE FUNCTION public.validate_hire_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_owner UUID;
  proj_status TEXT;
BEGIN
  SELECT user_id, status INTO real_owner, proj_status
  FROM public.portfolio_projects
  WHERE id = NEW.project_id;

  IF real_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF proj_status <> 'published' THEN
    RAISE EXCEPTION 'Cannot hire on unpublished project';
  END IF;

  -- Force owner_user_id to the real project owner regardless of what was sent
  NEW.owner_user_id := real_owner;

  -- Basic email sanity
  IF NEW.requester_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  -- Length caps to prevent spam
  IF length(NEW.requester_name) > 120 THEN
    RAISE EXCEPTION 'Name too long';
  END IF;
  IF length(NEW.message) > 4000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hire_request
BEFORE INSERT ON public.hire_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_hire_request();

-- Auto-update updated_at
CREATE TRIGGER trg_hire_requests_updated_at
BEFORE UPDATE ON public.hire_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ── 20260427122608_0b67823f-a99f-4bc9-b12f-23900311cbb9.sql ──

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


-- ── 20260428014119_a54a7c02-bf28-4475-8de2-6dfe58f8874f.sql ──
-- Onboarding fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS persona TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_persona_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_persona_check
  CHECK (persona IS NULL OR persona IN ('freelancer','client'));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,                 -- recipient
  actor_user_id UUID,                    -- the user who triggered it (nullable for share/anon)
  actor_name TEXT NOT NULL DEFAULT '',
  actor_avatar TEXT,
  type TEXT NOT NULL,                    -- 'like' | 'comment' | 'hire' | 'share'
  project_id UUID,
  message TEXT NOT NULL DEFAULT '',
  url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients view own notifications" ON public.notifications;
CREATE POLICY "Recipients view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recipients update own notifications" ON public.notifications;
CREATE POLICY "Recipients update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recipients delete own notifications" ON public.notifications;
CREATE POLICY "Recipients delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- System inserts (via trigger using SECURITY DEFINER) — block client-side direct insert by NOT adding INSERT policy.
-- But authenticated users will need to insert via server logic; use trigger functions instead.

-- ===== Trigger: like => notify project owner =====
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  proj_title TEXT;
  actor_display TEXT;
  actor_avatar TEXT;
BEGIN
  SELECT user_id, title INTO owner_id, proj_title
    FROM public.portfolio_projects WHERE id = NEW.project_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW; -- skip self-likes
  END IF;

  SELECT COALESCE(display_name, brand_name, 'มีคน'),
         COALESCE(avatar_url, logo_url)
    INTO actor_display, actor_avatar
    FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, actor_avatar, type, project_id, message, url)
  VALUES
    (owner_id, NEW.user_id, COALESCE(actor_display, 'มีคน'), actor_avatar,
     'like', NEW.project_id,
     COALESCE(actor_display, 'มีคน') || ' กดถูกใจผลงาน "' || COALESCE(proj_title, '') || '"',
     '/p/' || NEW.project_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.portfolio_likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.portfolio_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ===== Trigger: comment => notify project owner =====
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  proj_title TEXT;
BEGIN
  SELECT user_id, title INTO owner_id, proj_title
    FROM public.portfolio_projects WHERE id = NEW.project_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, actor_avatar, type, project_id, message, url)
  VALUES
    (owner_id, NEW.user_id, COALESCE(NULLIF(NEW.author_name, ''), 'มีคน'), NEW.author_avatar,
     'comment', NEW.project_id,
     COALESCE(NULLIF(NEW.author_name, ''), 'มีคน') || ' คอมเมนต์ผลงาน "' || COALESCE(proj_title, '') || '"',
     '/p/' || NEW.project_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.portfolio_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.portfolio_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ===== Trigger: hire request => notify owner =====
CREATE OR REPLACE FUNCTION public.notify_on_hire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj_title TEXT;
BEGIN
  SELECT title INTO proj_title FROM public.portfolio_projects WHERE id = NEW.project_id;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, project_id, message, url)
  VALUES
    (NEW.owner_user_id, NULL,
     COALESCE(NULLIF(NEW.requester_name, ''), 'มีคน'),
     'hire', NEW.project_id,
     COALESCE(NULLIF(NEW.requester_name, ''), 'มีคน') || ' สนใจจ้างงาน "' || COALESCE(proj_title, '') || '"',
     '/dashboard');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_hire ON public.hire_requests;
CREATE TRIGGER trg_notify_on_hire
  AFTER INSERT ON public.hire_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_hire();

-- ── 20260430005444_4ebfaad3-c24d-4011-98f2-d556bbb77885.sql ──

-- ============ Suppliers ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  website TEXT,
  address TEXT,
  rate_note TEXT,
  rating SMALLINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own suppliers" ON public.suppliers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own suppliers" ON public.suppliers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_suppliers_user ON public.suppliers(user_id);

-- ============ Supplier files ============
CREATE TABLE public.supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own supplier files" ON public.supplier_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own supplier files" ON public.supplier_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own supplier files" ON public.supplier_files FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_supplier_files_supplier ON public.supplier_files(supplier_id);

-- ============ Supplier links ============
CREATE TABLE public.supplier_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own supplier links" ON public.supplier_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own supplier links" ON public.supplier_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own supplier links" ON public.supplier_links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete own supplier links" ON public.supplier_links FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_supplier_links_supplier ON public.supplier_links(supplier_id);

-- ============ Quotations: debt collection fields ============
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS late_fee_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_partial NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-files', 'supplier-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners view own supplier file objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload own supplier file objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own supplier file objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── 20260501041936_cf600d5d-d99e-4226-bcbe-e57de20e94c8.sql ──
-- Add tester_approved flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tester_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tester_applied_at timestamptz;

-- Tester application table
CREATE TABLE IF NOT EXISTS public.tester_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  alias_name text,
  main_field text NOT NULL,
  main_field_other text,
  years_experience text NOT NULL,
  contact_channel text NOT NULL,
  contact_value text NOT NULL,
  quotation_method text[] NOT NULL DEFAULT '{}',
  quotation_method_other text,
  pain_points text[] NOT NULL DEFAULT '{}',
  pain_points_other text,
  feature_request text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners insert own application"
  ON public.tester_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners view own application"
  ON public.tester_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners update own application"
  ON public.tester_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all applications"
  ON public.tester_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tester_applications_updated_at
  BEFORE UPDATE ON public.tester_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an application is inserted, auto-approve the user (instant access flow)
CREATE OR REPLACE FUNCTION public.auto_approve_tester()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET tester_approved = true,
        tester_applied_at = COALESCE(tester_applied_at, now())
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tester_application_insert
  AFTER INSERT ON public.tester_applications
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_tester();

-- ── 20260501043209_b25f8d26-edd4-4a60-a383-d70da3ac74e6.sql ──
ALTER TABLE public.tester_applications
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_line text,
  ALTER COLUMN contact_channel DROP NOT NULL,
  ALTER COLUMN contact_value DROP NOT NULL;

-- ── 20260501052447_8300d76d-6796-44d2-b398-a7af339dda1a.sql ──
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


-- ── 20260501071420_8df6e4f0-8588-46c8-a96a-68a837b21040.sql ──
-- Supplier cover image
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Beta feedback table (per-feature suggestions from early-access testers)
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  feature text NOT NULL,
  message text NOT NULL,
  rating smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_feature ON public.beta_feedback(feature);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON public.beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON public.beta_feedback(created_at DESC);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own beta feedback"
  ON public.beta_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own beta feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own beta feedback"
  ON public.beta_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all beta feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete any beta feedback"
  ON public.beta_feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 20260501071813_acea63c2-60fa-4968-a107-963c47f02ef5.sql ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-covers', 'supplier-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (display covers)
CREATE POLICY "Public can view supplier covers"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'supplier-covers');

-- Owner can upload to their folder (uid as first segment)
CREATE POLICY "Users upload own supplier covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own supplier covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own supplier covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 20260501072107_5daa99b3-2c30-45a5-a535-d294375be4ab.sql ──

-- Track which features users open, for admin analytics.
CREATE TABLE public.feature_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_usage_user ON public.feature_usage_events(user_id);
CREATE INDEX idx_feature_usage_feature ON public.feature_usage_events(feature);
CREATE INDEX idx_feature_usage_created ON public.feature_usage_events(created_at DESC);

ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own usage"
  ON public.feature_usage_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own usage"
  ON public.feature_usage_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all usage"
  ON public.feature_usage_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete usage"
  ON public.feature_usage_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregate function: ranks features by usage. Admin only.
CREATE OR REPLACE FUNCTION public.get_feature_usage_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  feature text,
  total_events bigint,
  unique_users bigint,
  last_used timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.feature,
    COUNT(*)::bigint AS total_events,
    COUNT(DISTINCT e.user_id)::bigint AS unique_users,
    MAX(e.created_at) AS last_used
  FROM public.feature_usage_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY e.feature
  ORDER BY total_events DESC;
END;
$$;


-- ── 20260501074333_abbb43a2-b930-48c6-a578-f737e9c9f023.sql ──
CREATE OR REPLACE FUNCTION public.get_feature_data_stats()
RETURNS TABLE(
  feature text,
  table_name text,
  total_records bigint,
  unique_users bigint,
  avg_per_user numeric,
  max_per_user bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH per_feature AS (
    SELECT 'ใบเสนอราคา (Quotations)'::text AS feature, 'quotations'::text AS table_name, user_id FROM public.quotations
    UNION ALL
    SELECT 'ลูกค้า (Saved Clients)', 'saved_clients', user_id FROM public.saved_clients
    UNION ALL
    SELECT 'Suppliers', 'suppliers', user_id FROM public.suppliers
    UNION ALL
    SELECT 'ไฟล์ Supplier', 'supplier_files', user_id FROM public.supplier_files
    UNION ALL
    SELECT 'ลิงก์ Supplier', 'supplier_links', user_id FROM public.supplier_links
    UNION ALL
    SELECT 'รายรับ (Income)', 'finance_incomes', user_id FROM public.finance_incomes
    UNION ALL
    SELECT 'รายจ่าย (Expenses)', 'finance_expenses', user_id FROM public.finance_expenses
    UNION ALL
    SELECT 'Subscriptions', 'finance_subscriptions', user_id FROM public.finance_subscriptions
    UNION ALL
    SELECT 'วิธีชำระเงิน', 'finance_payment_methods', user_id FROM public.finance_payment_methods
    UNION ALL
    SELECT 'ลดหย่อนภาษี', 'finance_deductions', user_id FROM public.finance_deductions
    UNION ALL
    SELECT 'ใบแจ้งหนี้ลูกค้า', 'finance_clients_invoices', user_id FROM public.finance_clients_invoices
    UNION ALL
    SELECT 'พอร์ตโฟลิโอ', 'portfolio_projects', user_id FROM public.portfolio_projects
    UNION ALL
    SELECT 'คอมเมนต์พอร์ต', 'portfolio_comments', user_id FROM public.portfolio_comments
    UNION ALL
    SELECT 'การกดถูกใจ', 'portfolio_likes', user_id FROM public.portfolio_likes
    UNION ALL
    SELECT 'คำขอจ้างงาน', 'hire_requests', owner_user_id FROM public.hire_requests
    UNION ALL
    SELECT 'การแจ้งเตือน', 'notifications', user_id FROM public.notifications
    UNION ALL
    SELECT 'Beta Feedback', 'beta_feedback', user_id FROM public.beta_feedback
  ),
  per_user AS (
    SELECT feature, table_name, user_id, COUNT(*)::bigint AS cnt
    FROM per_feature
    GROUP BY feature, table_name, user_id
  )
  SELECT
    pu.feature,
    pu.table_name,
    SUM(pu.cnt)::bigint AS total_records,
    COUNT(DISTINCT pu.user_id)::bigint AS unique_users,
    ROUND(AVG(pu.cnt)::numeric, 2) AS avg_per_user,
    MAX(pu.cnt)::bigint AS max_per_user
  FROM per_user pu
  GROUP BY pu.feature, pu.table_name
  ORDER BY total_records DESC;
END;
$$;

-- ── 20260501074820_a0cede17-34ba-4517-b049-dc477ee6fd31.sql ──
-- Fix ambiguous "feature" column reference by aliasing CTE columns
CREATE OR REPLACE FUNCTION public.get_feature_data_stats()
RETURNS TABLE(
  feature text,
  table_name text,
  total_records bigint,
  unique_users bigint,
  avg_per_user numeric,
  max_per_user bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH per_feature AS (
    SELECT 'ใบเสนอราคา (Quotations)'::text AS feat, 'quotations'::text AS tbl, q.user_id AS uid FROM public.quotations q
    UNION ALL SELECT 'ลูกค้า (Saved Clients)', 'saved_clients', sc.user_id FROM public.saved_clients sc
    UNION ALL SELECT 'Suppliers', 'suppliers', s.user_id FROM public.suppliers s
    UNION ALL SELECT 'ไฟล์ Supplier', 'supplier_files', sf.user_id FROM public.supplier_files sf
    UNION ALL SELECT 'ลิงก์ Supplier', 'supplier_links', sl.user_id FROM public.supplier_links sl
    UNION ALL SELECT 'รายรับ (Income)', 'finance_incomes', fi.user_id FROM public.finance_incomes fi
    UNION ALL SELECT 'รายจ่าย (Expenses)', 'finance_expenses', fe.user_id FROM public.finance_expenses fe
    UNION ALL SELECT 'Subscriptions', 'finance_subscriptions', fs.user_id FROM public.finance_subscriptions fs
    UNION ALL SELECT 'วิธีชำระเงิน', 'finance_payment_methods', pm.user_id FROM public.finance_payment_methods pm
    UNION ALL SELECT 'ลดหย่อนภาษี', 'finance_deductions', fd.user_id FROM public.finance_deductions fd
    UNION ALL SELECT 'ใบแจ้งหนี้ลูกค้า', 'finance_clients_invoices', ci.user_id FROM public.finance_clients_invoices ci
    UNION ALL SELECT 'พอร์ตโฟลิโอ', 'portfolio_projects', pp.user_id FROM public.portfolio_projects pp
    UNION ALL SELECT 'คอมเมนต์พอร์ต', 'portfolio_comments', pc.user_id FROM public.portfolio_comments pc
    UNION ALL SELECT 'การกดถูกใจ', 'portfolio_likes', pl.user_id FROM public.portfolio_likes pl
    UNION ALL SELECT 'คำขอจ้างงาน', 'hire_requests', hr.owner_user_id FROM public.hire_requests hr
    UNION ALL SELECT 'การแจ้งเตือน', 'notifications', n.user_id FROM public.notifications n
    UNION ALL SELECT 'Beta Feedback', 'beta_feedback', bf.user_id FROM public.beta_feedback bf
  ),
  per_user AS (
    SELECT pf.feat, pf.tbl, pf.uid, COUNT(*)::bigint AS cnt
    FROM per_feature pf
    GROUP BY pf.feat, pf.tbl, pf.uid
  )
  SELECT
    pu.feat,
    pu.tbl,
    SUM(pu.cnt)::bigint,
    COUNT(DISTINCT pu.uid)::bigint,
    ROUND(AVG(pu.cnt)::numeric, 2),
    MAX(pu.cnt)::bigint
  FROM per_user pu
  GROUP BY pu.feat, pu.tbl
  ORDER BY SUM(pu.cnt) DESC;
END;
$$;

-- Daily trend per feature, from feature_usage_events
CREATE OR REPLACE FUNCTION public.get_feature_usage_trend(_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  feature text,
  events bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    (e.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
    e.feature,
    COUNT(*)::bigint AS events,
    COUNT(DISTINCT e.user_id)::bigint AS unique_users
  FROM public.feature_usage_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1, 2
  ORDER BY 1 ASC, 3 DESC;
END;
$$;

-- ── 20260501081411_5e4ab3c7-b698-46a6-bcea-c749ecd57d64.sql ──
-- Top subscriptions report for admins (across all users)
CREATE OR REPLACE FUNCTION public.get_top_subscriptions(_limit integer DEFAULT 50)
RETURNS TABLE(
  name text,
  category text,
  user_count bigint,
  total_subscriptions bigint,
  avg_price numeric,
  total_monthly_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- normalize names so "Netflix" / "netflix " merge
    initcap(btrim(lower(s.name)))::text AS name,
    (array_agg(s.category ORDER BY s.created_at DESC) FILTER (WHERE s.category IS NOT NULL))[1] AS category,
    COUNT(DISTINCT s.user_id)::bigint AS user_count,
    COUNT(*)::bigint AS total_subscriptions,
    ROUND(AVG(s.price)::numeric, 2) AS avg_price,
    ROUND(SUM(
      CASE
        WHEN s.cycle = 'yearly' THEN s.price / 12.0
        WHEN s.cycle = 'weekly' THEN s.price * 4.33
        WHEN s.cycle = 'one-time' THEN 0
        ELSE s.price
      END
    )::numeric, 2) AS total_monthly_value
  FROM public.finance_subscriptions s
  WHERE s.is_active = true
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY initcap(btrim(lower(s.name)))
  ORDER BY user_count DESC, total_subscriptions DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;

-- ── 20260501090929_b0b070a3-1ff3-49af-ba72-362ab75f486c.sql ──
-- กันใบสมัคร Tester ซ้ำต่อ user_id (กัน race จาก double-tab/double-click)
-- ใช้ UNIQUE INDEX แทน UNIQUE CONSTRAINT เพื่อ idempotent (ใช้ IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS tester_applications_user_id_uidx
  ON public.tester_applications (user_id);

-- ── 20260502005156_e097517f-9868-454c-9ba4-8f192e05c79e.sql ──
-- 1) Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL DEFAULT '',
  banner_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active announcements are public"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins view all announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) last_active_at on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx
  ON public.profiles (last_active_at DESC NULLS LAST);

-- 3) RPC for users to bump their own last_active_at (cheap, no select roundtrip)
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET last_active_at = now()
   WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;

-- ── 20260502011454_e6fe4bab-e82d-4ad9-bbb6-6ae1e63e2272.sql ──
-- 1) Announcements: scheduling
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

CREATE INDEX IF NOT EXISTS announcements_active_window_idx
  ON public.announcements (is_active, start_at, end_at);

-- 2) Storage bucket for announcement banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-banners', 'announcement-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read announcement banners" ON storage.objects;
CREATE POLICY "Public read announcement banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-banners');

-- Admin write/update/delete
DROP POLICY IF EXISTS "Admins upload announcement banners" ON storage.objects;
CREATE POLICY "Admins upload announcement banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update announcement banners" ON storage.objects;
CREATE POLICY "Admins update announcement banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete announcement banners" ON storage.objects;
CREATE POLICY "Admins delete announcement banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'announcement-banners' AND public.has_role(auth.uid(), 'admin'));

-- 3) Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,           -- conversation owner (the user side)
  sender_id uuid NOT NULL,         -- who actually sent it
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL DEFAULT '',
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON public.chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON public.chat_messages (is_read) WHERE is_read = false;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversation
CREATE POLICY "Users view own chat" ON public.chat_messages
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can send to their own conversation; admins can send to any
CREATE POLICY "Users send own chat" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  (sender_role = 'user' AND auth.uid() = user_id AND auth.uid() = sender_id)
  OR (sender_role = 'admin' AND public.has_role(auth.uid(), 'admin') AND auth.uid() = sender_id)
);

-- Mark read
CREATE POLICY "Users update own chat read" ON public.chat_messages
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins delete chat" ON public.chat_messages
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 5) Storage bucket for chat images (reuse portfolio-images? no — separate, public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;
CREATE POLICY "Public read chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Authed upload chat images" ON storage.objects;
CREATE POLICY "Authed upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners delete chat images" ON storage.objects;
CREATE POLICY "Owners delete chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- ── 20260502012740_2d83cac9-750e-4f01-be47-c4093b393189.sql ──
-- Auto-reply on first user message in a conversation
CREATE OR REPLACE FUNCTION public.chat_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_count INTEGER;
BEGIN
  IF NEW.sender_role <> 'user' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO prior_count
    FROM public.chat_messages
   WHERE user_id = NEW.user_id
     AND id <> NEW.id;

  IF prior_count = 0 THEN
    INSERT INTO public.chat_messages (user_id, sender_id, sender_role, body, is_read)
    VALUES (
      NEW.user_id,
      NEW.user_id, -- placeholder; system reply
      'admin',
      'สวัสดีครับ! ผมแอดมิน So1o กำลังรีบเข้ามาตอบนะครับ 🙌' || E'\n' ||
      'ระหว่างนี้พิมพ์รายละเอียด/แนบรูปทิ้งไว้ได้เลย เดี๋ยวมาดูให้ครับ',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_auto_reply ON public.chat_messages;
CREATE TRIGGER trg_chat_auto_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.chat_auto_reply();

-- ── 20260502014315_c6e80581-1d03-4b95-8075-f139c1ab0470.sql ──
-- Enable pg_cron and pg_net (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: delete a storage object by public URL (best-effort).
-- Extracts the path part after `/storage/v1/object/public/<bucket>/`
CREATE OR REPLACE FUNCTION public.purge_old_storage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  rec RECORD;
  obj_path TEXT;
BEGIN
  -- 1) Expired announcements: delete row + banner object
  FOR rec IN
    SELECT id, banner_url
      FROM public.announcements
     WHERE end_at IS NOT NULL
       AND end_at < now() - INTERVAL '30 days'
  LOOP
    IF rec.banner_url IS NOT NULL THEN
      obj_path := regexp_replace(rec.banner_url,
        '^.*/storage/v1/object/public/announcement-banners/', '');
      IF obj_path <> rec.banner_url THEN
        DELETE FROM storage.objects
         WHERE bucket_id = 'announcement-banners' AND name = obj_path;
      END IF;
    END IF;
    DELETE FROM public.announcements WHERE id = rec.id;
  END LOOP;

  -- 2) Old chat messages (> 90 days): delete attached images then rows
  FOR rec IN
    SELECT id, image_url
      FROM public.chat_messages
     WHERE created_at < now() - INTERVAL '90 days'
       AND image_url IS NOT NULL
  LOOP
    obj_path := regexp_replace(rec.image_url,
      '^.*/storage/v1/object/public/chat-images/', '');
    IF obj_path <> rec.image_url THEN
      DELETE FROM storage.objects
       WHERE bucket_id = 'chat-images' AND name = obj_path;
    END IF;
  END LOOP;

  DELETE FROM public.chat_messages
   WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Schedule daily at 03:30 (UTC). Unschedule first if it already exists.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-old-storage-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-storage-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-old-storage-daily',
  '30 3 * * *',
  $$ SELECT public.purge_old_storage(); $$
);

-- ── 20260502014335_2af3fd8f-96b2-47c1-b610-36f05adb1965.sql ──
REVOKE ALL ON FUNCTION public.purge_old_storage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_storage() TO postgres, service_role;

-- ── 20260502020805_40d7620c-a354-4aec-8276-07cca2dda618.sql ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS purge_after timestamp with time zone,
  ADD COLUMN IF NOT EXISTS purged_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS profiles_inactive_purge_idx
  ON public.profiles (purge_after)
  WHERE is_active = false AND purge_after IS NOT NULL AND purged_at IS NULL;

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
RETURNS TABLE(user_id uuid, warnings text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $$
DECLARE
  rec RECORD;
  warn text[];
BEGIN
  IF auth.role() NOT IN ('service_role') THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id
      FROM public.profiles p
     WHERE p.is_active = false
       AND p.purge_after IS NOT NULL
       AND p.purge_after <= now()
       AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];

    BEGIN DELETE FROM storage.objects WHERE bucket_id IN ('portfolio-images','brand-logos','supplier-files','supplier-covers','chat-images') AND (name = rec.user_id::text OR name LIKE rec.user_id::text || '/%');
    EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:user-prefix:' || SQLERRM); END;

    BEGIN DELETE FROM public.portfolio_comment_reports WHERE reporter_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comment_reports:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_likes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_likes:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_comments WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comments:' || SQLERRM); END;
    BEGIN DELETE FROM public.hire_requests WHERE owner_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('hire_requests:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_files WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_files:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_links WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_links:' || SQLERRM); END;
    BEGIN DELETE FROM public.suppliers WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('suppliers:' || SQLERRM); END;
    BEGIN DELETE FROM public.saved_clients WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('saved_clients:' || SQLERRM); END;
    BEGIN DELETE FROM public.quotations WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('quotations:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_clients_invoices WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_clients_invoices:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_deductions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_deductions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_expenses WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_expenses:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_incomes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_incomes:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_subscriptions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_subscriptions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_payment_methods WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_payment_methods:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_settings WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_settings:' || SQLERRM); END;
    BEGIN DELETE FROM public.feature_usage_events WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('feature_usage_events:' || SQLERRM); END;
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_projects WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_projects:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = COALESCE(display_name, 'Inactive user'),
           brand_name = NULL,
           logo_url = NULL,
           avatar_url = NULL,
           tagline = NULL,
           phone = NULL,
           address = NULL,
           tax_id = NULL,
           bank_name = NULL,
           bank_account_name = NULL,
           bank_account_number = NULL,
           payment_qr_url = NULL,
           social_link = NULL,
           terms = NULL,
           onboarding_data = '{}'::jsonb,
           purged_at = now(),
           updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    user_id := rec.user_id;
    warnings := warn;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) TO postgres, service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-inactive-users-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-inactive-users-daily');
EXCEPTION WHEN undefined_function OR undefined_table THEN
  NULL;
END $$;

SELECT cron.schedule(
  'purge-inactive-users-daily',
  '45 3 * * *',
  $$ SELECT public.purge_inactive_profile_data(50); $$
);

-- ── 20260502021747_94db1dcc-ca15-4bf4-96f5-ab2edeb54397.sql ──

-- Activity Logs table
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'page_view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ual_user_created ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX idx_ual_created ON public.user_activity_logs (created_at DESC);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all activity"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete activity"
  ON public.user_activity_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC: log activity with 1-hour throttle per user+type
CREATE OR REPLACE FUNCTION public.log_user_activity(_activity_type TEXT DEFAULT 'page_view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _exists BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_activity_logs
    WHERE user_id = _uid
      AND activity_type = _activity_type
      AND created_at > now() - INTERVAL '1 hour'
  ) INTO _exists;

  IF _exists THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_activity_logs (user_id, activity_type)
  VALUES (_uid, _activity_type);

  RETURN true;
END;
$$;

-- Admin analytics: daily active users for last N days
CREATE OR REPLACE FUNCTION public.get_daily_active_users(_days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, active_users BIGINT, total_events BIGINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    (l.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
    COUNT(DISTINCT l.user_id)::bigint AS active_users,
    COUNT(*)::bigint AS total_events
  FROM public.user_activity_logs l
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- Admin analytics: hourly distribution (0-23) over last N days
CREATE OR REPLACE FUNCTION public.get_hourly_active_distribution(_days INTEGER DEFAULT 30)
RETURNS TABLE(hour INTEGER, events BIGINT, unique_users BIGINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM (l.created_at AT TIME ZONE 'Asia/Bangkok'))::int AS hour,
    COUNT(*)::bigint AS events,
    COUNT(DISTINCT l.user_id)::bigint AS unique_users
  FROM public.user_activity_logs l
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- Admin analytics: top active users in last N days (count of distinct days)
CREATE OR REPLACE FUNCTION public.get_top_active_users(_days INTEGER DEFAULT 7, _limit INTEGER DEFAULT 20)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  email TEXT,
  active_days BIGINT,
  total_events BIGINT,
  last_seen TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    l.user_id,
    p.display_name,
    p.email,
    COUNT(DISTINCT (l.created_at AT TIME ZONE 'Asia/Bangkok')::date)::bigint AS active_days,
    COUNT(*)::bigint AS total_events,
    MAX(l.created_at) AS last_seen
  FROM public.user_activity_logs l
  LEFT JOIN public.profiles p ON p.user_id = l.user_id
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY l.user_id, p.display_name, p.email
  ORDER BY active_days DESC, total_events DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
END;
$$;

-- Cron: weekly cleanup of logs older than 60 days
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-activity-logs-weekly') THEN
    PERFORM cron.unschedule('purge-activity-logs-weekly');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-activity-logs-weekly',
  '15 3 * * 0',
  $$ DELETE FROM public.user_activity_logs WHERE created_at < now() - INTERVAL '60 days'; $$
);


-- ── 20260502023231_612bffe2-7398-4b8f-9675-37b8128b87ec.sql ──
-- =====================================================================
-- Lock down EXECUTE on SECURITY DEFINER functions (least privilege)
-- =====================================================================

-- Trigger-only functions: revoke ALL grants (only superuser-owned triggers call them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_comment_report_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_hire() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.chat_auto_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_last_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_hire_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.moderate_portfolio_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_approve_tester() FROM PUBLIC, anon, authenticated;

-- Admin-only / cron-only maintenance functions
REVOKE EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_storage() FROM PUBLIC, anon, authenticated;

-- Admin analytics: only service role / admin server functions need these
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_data_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_subscriptions(integer) FROM PUBLIC, anon, authenticated;

-- Re-grant only to authenticated where end-users actually need to call them via SDK:
-- has_role: used in RLS USING clauses (already accessible via SECURITY DEFINER context)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- log_user_activity: signed-in users log their own activity
GRANT EXECUTE ON FUNCTION public.log_user_activity(text) TO authenticated;

-- get_public_profile: viewing others' public profile (signed-in or anon both fine)
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

-- ── 20260502023258_80bdb01a-68fe-4bca-bab7-500822bdbd87.sql ──
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text) FROM PUBLIC, anon;

-- ── 20260502024243_6fa28f69-d083-4ff1-b8c6-ecf0668eb9d7.sql ──
-- Enforce Realtime channel-level authorization
-- Topics in use:
--   chat_<user_uuid>   → owner only
--   admin_chat_global  → admins only

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_topic_owner_can_read" ON realtime.messages;
DROP POLICY IF EXISTS "admin_chat_global_admin_only" ON realtime.messages;
DROP POLICY IF EXISTS "deny_anon_realtime" ON realtime.messages;

-- Owners can subscribe/receive on their own chat topic
CREATE POLICY "chat_topic_owner_can_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('chat_' || auth.uid()::text))
  OR public.has_role(auth.uid(), 'admin')
);

-- Admins can subscribe to the global admin chat channel
CREATE POLICY "admin_chat_global_admin_only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'admin_chat_global'
  AND public.has_role(auth.uid(), 'admin')
);


-- ── 20260502025328_68d5ab97-78e4-4f90-a300-a3aab6a893c1.sql ──
DROP FUNCTION IF EXISTS public.purge_inactive_profile_data(integer);

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  rec RECORD;
  warn text[];
  ann RECORD;
  obj_path text;
  did_auth boolean;
BEGIN
  IF auth.role() NOT IN ('service_role') THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id
      FROM public.profiles p
     WHERE p.is_active = false
       AND p.purge_after IS NOT NULL
       AND p.purge_after <= now()
       AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];
    did_auth := false;

    BEGIN
      DELETE FROM storage.objects
       WHERE bucket_id IN ('portfolio-images','brand-logos','supplier-files','supplier-covers','chat-images','announcement-banners')
         AND (name = rec.user_id::text OR name LIKE rec.user_id::text || '/%');
    EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:user-prefix:' || SQLERRM); END;

    BEGIN
      DELETE FROM public.portfolio_comment_reports r
       WHERE r.reporter_user_id = rec.user_id
          OR r.comment_id IN (
            SELECT c.id FROM public.portfolio_comments c
            WHERE c.user_id = rec.user_id
               OR c.project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id)
          );
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comment_reports:' || SQLERRM); END;

    BEGIN DELETE FROM public.portfolio_likes WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_likes:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_comments WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comments:' || SQLERRM); END;
    BEGIN DELETE FROM public.hire_requests WHERE owner_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('hire_requests:' || SQLERRM); END;

    BEGIN DELETE FROM public.supplier_files WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_files:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_links WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_links:' || SQLERRM); END;
    BEGIN DELETE FROM public.suppliers WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('suppliers:' || SQLERRM); END;
    BEGIN DELETE FROM public.saved_clients WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('saved_clients:' || SQLERRM); END;
    BEGIN DELETE FROM public.quotations WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('quotations:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_clients_invoices WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_clients_invoices:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_deductions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_deductions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_expenses WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_expenses:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_incomes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_incomes:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_subscriptions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_subscriptions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_payment_methods WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_payment_methods:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_settings WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_settings:' || SQLERRM); END;

    BEGIN DELETE FROM public.feature_usage_events WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('feature_usage_events:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_activity_logs WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_activity_logs:' || SQLERRM); END;
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;

    FOR ann IN SELECT id, banner_url FROM public.announcements WHERE created_by = rec.user_id LOOP
      IF ann.banner_url IS NOT NULL THEN
        obj_path := regexp_replace(ann.banner_url, '^.*/storage/v1/object/public/announcement-banners/', '');
        IF obj_path <> ann.banner_url THEN
          BEGIN DELETE FROM storage.objects WHERE bucket_id = 'announcement-banners' AND name = obj_path;
          EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:ann-banner:' || SQLERRM); END;
        END IF;
      END IF;
      BEGIN DELETE FROM public.announcements WHERE id = ann.id;
      EXCEPTION WHEN OTHERS THEN warn := warn || ('announcements:' || SQLERRM); END;
    END LOOP;

    BEGIN DELETE FROM public.portfolio_projects WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_projects:' || SQLERRM); END;

    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = 'Inactive user',
           brand_name = NULL, logo_url = NULL, avatar_url = NULL, tagline = NULL,
           phone = NULL, address = NULL, tax_id = NULL,
           bank_name = NULL, bank_account_name = NULL, bank_account_number = NULL,
           payment_qr_url = NULL, social_link = NULL, terms = NULL,
           onboarding_data = '{}'::jsonb,
           purged_at = now(), updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    BEGIN
      DELETE FROM auth.users WHERE id = rec.user_id;
      did_auth := true;
    EXCEPTION WHEN OTHERS THEN
      warn := warn || ('auth_users:' || SQLERRM);
      did_auth := false;
    END;

    user_id := rec.user_id;
    warnings := warn;
    auth_deleted := did_auth;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.force_purge_user(_target_user_id uuid)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot purge yourself';
  END IF;

  UPDATE public.profiles
     SET is_active = false,
         tester_approved = false,
         deactivated_at = COALESCE(deactivated_at, now()),
         deactivated_by = auth.uid(),
         purge_after = now() - interval '1 second',
         updated_at = now()
   WHERE profiles.user_id = _target_user_id;

  RETURN QUERY SELECT * FROM public.purge_inactive_profile_data(1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.force_purge_user(uuid) FROM PUBLIC, anon, authenticated;

-- ── 20260502030708_38aac6d4-c05f-4dbb-a5a6-9adcb3f79bdc.sql ──
CREATE OR REPLACE FUNCTION public.force_purge_user(
  _target_user_id uuid,
  _admin_user_id uuid DEFAULT NULL
)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  effective_admin uuid;
BEGIN
  effective_admin := COALESCE(_admin_user_id, auth.uid());

  IF effective_admin IS NULL OR NOT public.has_role(effective_admin, 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF _target_user_id = effective_admin THEN
    RAISE EXCEPTION 'Cannot purge yourself';
  END IF;

  UPDATE public.profiles
     SET is_active = false,
         tester_approved = false,
         deactivated_at = COALESCE(deactivated_at, now()),
         deactivated_by = effective_admin,
         purge_after = now() - interval '1 second',
         updated_at = now()
   WHERE profiles.user_id = _target_user_id;

  RETURN QUERY SELECT * FROM public.purge_inactive_profile_data(1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  rec RECORD;
  warn text[];
  ann RECORD;
  obj_path text;
  did_auth boolean;
BEGIN
  -- Allow service_role to call without auth.uid(); otherwise require admin.
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id
      FROM public.profiles p
     WHERE p.is_active = false
       AND p.purge_after IS NOT NULL
       AND p.purge_after <= now()
       AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];
    did_auth := false;

    BEGIN
      DELETE FROM storage.objects
       WHERE bucket_id IN ('portfolio-images','brand-logos','supplier-files','supplier-covers','chat-images','announcement-banners')
         AND (name = rec.user_id::text OR name LIKE rec.user_id::text || '/%');
    EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:user-prefix:' || SQLERRM); END;

    BEGIN
      DELETE FROM public.portfolio_comment_reports r
       WHERE r.reporter_user_id = rec.user_id
          OR r.comment_id IN (
            SELECT c.id FROM public.portfolio_comments c
            WHERE c.user_id = rec.user_id
               OR c.project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id)
          );
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comment_reports:' || SQLERRM); END;

    BEGIN DELETE FROM public.portfolio_likes WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_likes:' || SQLERRM); END;
    BEGIN DELETE FROM public.portfolio_comments WHERE user_id = rec.user_id OR project_id IN (SELECT id FROM public.portfolio_projects WHERE user_id = rec.user_id);
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_comments:' || SQLERRM); END;
    BEGIN DELETE FROM public.hire_requests WHERE owner_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('hire_requests:' || SQLERRM); END;

    BEGIN DELETE FROM public.supplier_files WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_files:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_links WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_links:' || SQLERRM); END;
    BEGIN DELETE FROM public.suppliers WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('suppliers:' || SQLERRM); END;
    BEGIN DELETE FROM public.saved_clients WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('saved_clients:' || SQLERRM); END;
    BEGIN DELETE FROM public.quotations WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('quotations:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_clients_invoices WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_clients_invoices:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_deductions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_deductions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_expenses WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_expenses:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_incomes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_incomes:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_subscriptions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_subscriptions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_payment_methods WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_payment_methods:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_settings WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_settings:' || SQLERRM); END;

    BEGIN DELETE FROM public.feature_usage_events WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('feature_usage_events:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_activity_logs WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_activity_logs:' || SQLERRM); END;
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;

    FOR ann IN SELECT id, banner_url FROM public.announcements WHERE created_by = rec.user_id LOOP
      IF ann.banner_url IS NOT NULL THEN
        obj_path := regexp_replace(ann.banner_url, '^.*/storage/v1/object/public/announcement-banners/', '');
        IF obj_path <> ann.banner_url THEN
          BEGIN DELETE FROM storage.objects WHERE bucket_id = 'announcement-banners' AND name = obj_path;
          EXCEPTION WHEN OTHERS THEN warn := warn || ('storage:ann-banner:' || SQLERRM); END;
        END IF;
      END IF;
      BEGIN DELETE FROM public.announcements WHERE id = ann.id;
      EXCEPTION WHEN OTHERS THEN warn := warn || ('announcements:' || SQLERRM); END;
    END LOOP;

    BEGIN DELETE FROM public.portfolio_projects WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('portfolio_projects:' || SQLERRM); END;

    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = 'Inactive user',
           brand_name = NULL, logo_url = NULL, avatar_url = NULL, tagline = NULL,
           phone = NULL, address = NULL, tax_id = NULL,
           bank_name = NULL, bank_account_name = NULL, bank_account_number = NULL,
           payment_qr_url = NULL, social_link = NULL, terms = NULL,
           onboarding_data = '{}'::jsonb,
           purged_at = now(), updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    BEGIN
      DELETE FROM auth.users WHERE id = rec.user_id;
      did_auth := true;
    EXCEPTION WHEN OTHERS THEN
      warn := warn || ('auth_users:' || SQLERRM);
      did_auth := false;
    END;

    user_id := rec.user_id;
    warnings := warn;
    auth_deleted := did_auth;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- ── 20260502090345_2c4ebb45-5ce0-4084-a933-05f17d283e6d.sql ──
-- Articles table for blog/content engine
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Management',
  featured_image TEXT,
  featured_image_alt TEXT,
  meta_title TEXT,
  meta_description TEXT,
  related_feature_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0,
  author_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_status_published_at ON public.articles(status, published_at DESC);
CREATE INDEX idx_articles_category ON public.articles(category);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Published articles are public"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Admins can view everything (drafts included)
CREATE POLICY "Admins view all articles"
ON public.articles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert
CREATE POLICY "Admins insert articles"
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins update articles"
ON public.articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins delete articles"
ON public.articles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic view counter (anyone can call, increments by 1)
CREATE OR REPLACE FUNCTION public.increment_article_view(_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.articles
     SET view_count = view_count + 1
   WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_article_view(TEXT) TO anon, authenticated;

-- ── 20260502104413_904325de-a2bb-4664-b5fc-c65f4169ae20.sql ──
INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Admins upload article images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update article images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete article images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

-- ── 20260502110722_b305ed04-430b-479d-82b7-0bb49776dd3a.sql ──
-- Grant UPDATE on articles to authenticator/anon roles temporarily for bulk content refresh
GRANT UPDATE ON public.articles TO postgres, authenticator, anon, authenticated, service_role;

-- ── 20260502110751_c14b47d5-0a30-416e-bed6-a4e5b89601bb.sql ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT UPDATE ON public.articles TO sandbox_exec;
  END IF;
END $$;

-- ── 20260502110822_3353aa1e-f0fb-4eed-9104-3081b8bedda8.sql ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE UPDATE ON public.articles FROM sandbox_exec;
  END IF;
END $$;
REVOKE UPDATE ON public.articles FROM postgres, authenticator, anon, authenticated, service_role;

-- ── 20260503141127_6dc1c278-b657-4b45-8d0f-94e9e29a002a.sql ──
-- Persistent storage for Planner, Feedback, Projects, Assets, Review pins
-- Additive only — no DROP / TRUNCATE / DELETE on existing tables

-- 1. planner_posts
CREATE TABLE IF NOT EXISTS public.planner_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  post_date DATE NOT NULL,
  post_time TEXT NOT NULL DEFAULT '10:00',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_planner_posts_user ON public.planner_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_posts_user_date ON public.planner_posts(user_id, post_date);

DROP POLICY IF EXISTS "Owners select planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners insert planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners update planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners delete planner_posts" ON public.planner_posts;
CREATE POLICY "Owners select planner_posts" ON public.planner_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert planner_posts" ON public.planner_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update planner_posts" ON public.planner_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete planner_posts" ON public.planner_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_planner_posts_updated ON public.planner_posts;
CREATE TRIGGER trg_planner_posts_updated BEFORE UPDATE ON public.planner_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. feedback_jobs
CREATE TABLE IF NOT EXISTS public.feedback_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false,
  revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feedback_jobs_user ON public.feedback_jobs(user_id);

DROP POLICY IF EXISTS "Owners select feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners insert feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners update feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners delete feedback_jobs" ON public.feedback_jobs;
CREATE POLICY "Owners select feedback_jobs" ON public.feedback_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert feedback_jobs" ON public.feedback_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update feedback_jobs" ON public.feedback_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete feedback_jobs" ON public.feedback_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_feedback_jobs_updated ON public.feedback_jobs;
CREATE TRIGGER trg_feedback_jobs_updated BEFORE UPDATE ON public.feedback_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. work_projects (To Do / Kanban)
CREATE TABLE IF NOT EXISTS public.work_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '—',
  client_id TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  revisions INTEGER NOT NULL DEFAULT 0,
  revision_limit INTEGER NOT NULL DEFAULT 2,
  done_at DATE,
  archived BOOLEAN NOT NULL DEFAULT false,
  rate NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_work_projects_user ON public.work_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_work_projects_user_status ON public.work_projects(user_id, status);

DROP POLICY IF EXISTS "Owners select work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners insert work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners update work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners delete work_projects" ON public.work_projects;
CREATE POLICY "Owners select work_projects" ON public.work_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert work_projects" ON public.work_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update work_projects" ON public.work_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete work_projects" ON public.work_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_work_projects_updated ON public.work_projects;
CREATE TRIGGER trg_work_projects_updated BEFORE UPDATE ON public.work_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. asset_items (font / brand / link / snippet)
CREATE TABLE IF NOT EXISTS public.asset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('font','brand','link','snippet')),
  label TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_asset_items_user ON public.asset_items(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_items_user_kind ON public.asset_items(user_id, kind);

DROP POLICY IF EXISTS "Owners select asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners insert asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners update asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners delete asset_items" ON public.asset_items;
CREATE POLICY "Owners select asset_items" ON public.asset_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert asset_items" ON public.asset_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update asset_items" ON public.asset_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete asset_items" ON public.asset_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_asset_items_updated ON public.asset_items;
CREATE TRIGGER trg_asset_items_updated BEFORE UPDATE ON public.asset_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. review_pins
CREATE TABLE IF NOT EXISTS public.review_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  board TEXT NOT NULL DEFAULT 'default',
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_pins ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_review_pins_user ON public.review_pins(user_id);

DROP POLICY IF EXISTS "Owners select review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners insert review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners update review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners delete review_pins" ON public.review_pins;
CREATE POLICY "Owners select review_pins" ON public.review_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert review_pins" ON public.review_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update review_pins" ON public.review_pins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete review_pins" ON public.review_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_review_pins_updated ON public.review_pins;
CREATE TRIGGER trg_review_pins_updated BEFORE UPDATE ON public.review_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 20260503143225_496bf31b-1b33-45de-b485-8864d29f481f.sql ──

CREATE TABLE IF NOT EXISTS public.job_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in-progress',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  payment_info TEXT NOT NULL DEFAULT '',
  final_file_url TEXT,
  preview_image_url TEXT,
  watermark_text TEXT NOT NULL DEFAULT 'PREVIEW',
  unlocked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  slip_url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_slips ENABLE ROW LEVEL SECURITY;

-- job_trackers: owner full CRUD
CREATE POLICY "Owners select job_trackers" ON public.job_trackers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert job_trackers" ON public.job_trackers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update job_trackers" ON public.job_trackers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete job_trackers" ON public.job_trackers FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- public read by share_token (anyone with the link)
CREATE POLICY "Public can view job_trackers" ON public.job_trackers FOR SELECT TO anon, authenticated USING (true);

-- job_milestones: owner CRUD via parent
CREATE POLICY "Owners manage job_milestones" ON public.job_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_milestones.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_milestones.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_milestones" ON public.job_milestones FOR SELECT TO anon, authenticated USING (true);

-- job_slips: anyone can insert (client uploads via tracking link), owner can manage
CREATE POLICY "Public can insert job_slips" ON public.job_slips FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners manage job_slips" ON public.job_slips FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_slips.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_slips.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_slips" ON public.job_slips FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_job_trackers_updated BEFORE UPDATE ON public.job_trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_job_trackers_user ON public.job_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_trackers_token ON public.job_trackers(share_token);
CREATE INDEX IF NOT EXISTS idx_job_milestones_job ON public.job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_slips_job ON public.job_slips(job_id);


-- ── 20260503144526_d861e0d6-ab17-41f4-ab39-054504387be6.sql ──
-- 1) Extend job_trackers
ALTER TABLE public.job_trackers
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.saved_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deadline DATE;

-- Generate tracking_code for existing rows + default
CREATE OR REPLACE FUNCTION public.gen_tracking_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'JT' || to_char(now(), 'YYMMDD') || lpad(floor(random()*100000)::text, 5, '0');
  RETURN code;
END;
$$;

UPDATE public.job_trackers SET tracking_code = public.gen_tracking_code() WHERE tracking_code IS NULL;

ALTER TABLE public.job_trackers
  ALTER COLUMN tracking_code SET DEFAULT public.gen_tracking_code(),
  ALTER COLUMN tracking_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_trackers_tracking_code ON public.job_trackers(tracking_code);

-- 2) Timeline events table
CREATE TABLE IF NOT EXISTS public.job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  amount NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage job_events" ON public.job_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_events.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_events.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_events" ON public.job_events FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_job_events_job ON public.job_events(job_id, created_at DESC);

-- ── 20260503150524_13fd22b6-3829-49d5-bdc8-fb0df3f286c4.sql ──

-- Add start_date and payment QR url to job_trackers
ALTER TABLE public.job_trackers 
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS payment_qr_url text;

-- Create public storage bucket for job tracker assets (previews, QR, slips, finals)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-tracker', 'job-tracker', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read all files in this bucket
DROP POLICY IF EXISTS "Public read job-tracker" ON storage.objects;
CREATE POLICY "Public read job-tracker" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-tracker');

-- Authenticated owners can upload to own user folder (previews/qr/finals)
DROP POLICY IF EXISTS "Owners upload job-tracker" ON storage.objects;
CREATE POLICY "Owners upload job-tracker" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners update job-tracker" ON storage.objects;
CREATE POLICY "Owners update job-tracker" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'job-tracker' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owners delete job-tracker" ON storage.objects;
CREATE POLICY "Owners delete job-tracker" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-tracker' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone (incl anonymous clients) can upload slips into slips/<job_id>/ folder
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;
CREATE POLICY "Public upload slips" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = 'slips'
  );

-- Notify job owner when client uploads a slip
CREATE OR REPLACE FUNCTION public.notify_on_slip_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
  job_title text;
  job_token uuid;
BEGIN
  SELECT user_id, title, share_token INTO owner_id, job_title, job_token
  FROM public.job_trackers WHERE id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, message, url)
  VALUES
    (owner_id, NULL, 'ลูกค้า', 'slip_uploaded',
     'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(job_title, '') || '" — กรุณาตรวจสอบ',
     '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_slip_upload ON public.job_slips;
CREATE TRIGGER trg_notify_on_slip_upload
AFTER INSERT ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.notify_on_slip_upload();

-- Allow notifications insert (system via trigger uses SECURITY DEFINER, this is just a safety net)
-- We don't add a permissive insert policy; trigger runs as definer.


-- ── 20260503154735_f5e90f71-ee98-452b-8b9f-898ad9d69b3f.sql ──
ALTER TABLE public.job_slips
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '';

-- ── 20260503154834_d47afd04-7e73-406d-95bc-dac58a995788.sql ──
CREATE OR REPLACE FUNCTION public.log_slip_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_events (job_id, kind, title, note, image_url)
    VALUES (NEW.job_id, 'slip_uploaded', 'ลูกค้าอัปโหลดสลิป — รอตรวจสอบ', COALESCE(NEW.note, ''), NEW.slip_url);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verified = true AND OLD.verified = false THEN
      INSERT INTO public.job_events (job_id, kind, title, note, image_url)
      VALUES (NEW.job_id, 'slip_verified', 'ยืนยันรับเงินจากสลิปแล้ว ✓', '', NEW.slip_url);
    ELSIF NEW.rejected = true AND OLD.rejected = false THEN
      INSERT INTO public.job_events (job_id, kind, title, note, image_url)
      VALUES (NEW.job_id, 'slip_rejected', 'สลิปถูกปฏิเสธ', COALESCE(NEW.rejection_reason, ''), NEW.slip_url);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_slip_insert ON public.job_slips;
CREATE TRIGGER trg_log_slip_insert
AFTER INSERT ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.log_slip_event();

DROP TRIGGER IF EXISTS trg_log_slip_update ON public.job_slips;
CREATE TRIGGER trg_log_slip_update
AFTER UPDATE ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.log_slip_event();

-- ── 20260504014931_b2ee33d9-1d5d-4f7b-88f3-12420f1baf74.sql ──

DROP POLICY IF EXISTS "Public can view job_trackers" ON public.job_trackers;
DROP POLICY IF EXISTS "Public can view job_events" ON public.job_events;
DROP POLICY IF EXISTS "Public can view job_milestones" ON public.job_milestones;
DROP POLICY IF EXISTS "Public can view job_slips" ON public.job_slips;
DROP POLICY IF EXISTS "Public can insert job_slips" ON public.job_slips;


-- ── 20260504015803_2c512b8a-8a5a-4ad2-9b2f-bd4590da7124.sql ──
-- Phase 1.1: Remove overly permissive RLS policies on job tracking tables
-- (public access is now token-gated via server functions using supabaseAdmin)
DROP POLICY IF EXISTS "Public can view job_trackers" ON public.job_trackers;
DROP POLICY IF EXISTS "Public can view job_milestones" ON public.job_milestones;
DROP POLICY IF EXISTS "Public can view job_events" ON public.job_events;
DROP POLICY IF EXISTS "Public can view job_slips" ON public.job_slips;
DROP POLICY IF EXISTS "Public can insert job_slips" ON public.job_slips;

-- Phase 1.2: Lock down search_path on remaining function
ALTER FUNCTION public.gen_tracking_code() SET search_path = public;

-- Phase 1.3: Drop the old single-arg force_purge_user overload that relies on auth.uid()
-- (which is null inside server functions). Keep only the (uuid, uuid) version.
DROP FUNCTION IF EXISTS public.force_purge_user(uuid);

-- ── 20260504020554_1e44c653-ceda-431f-afac-49e86fcf17b9.sql ──
-- 1. Realtime publications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_trackers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_trackers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_slips') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_slips;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='job_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_events;
  END IF;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.job_trackers REPLICA IDENTITY FULL;
ALTER TABLE public.job_slips REPLICA IDENTITY FULL;
ALTER TABLE public.job_events REPLICA IDENTITY FULL;

-- 2. Storage cleanup helpers
CREATE OR REPLACE FUNCTION public._storage_path_from_url(_url text, _bucket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _url IS NULL OR _url = '' THEN NULL
    WHEN position('/storage/v1/object/public/' || _bucket || '/' IN _url) > 0
      THEN regexp_replace(_url, '^.*/storage/v1/object/public/' || _bucket || '/', '')
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._delete_storage_object(_bucket text, _path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF _path IS NULL OR _path = '' THEN RETURN; END IF;
  DELETE FROM storage.objects WHERE bucket_id = _bucket AND name = _path;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- portfolio_projects: cover + image blocks
CREATE OR REPLACE FUNCTION public.cleanup_portfolio_project_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  block jsonb;
  url text;
BEGIN
  PERFORM public._delete_storage_object('portfolio-images',
    public._storage_path_from_url(OLD.cover, 'portfolio-images'));
  IF OLD.blocks IS NOT NULL AND jsonb_typeof(OLD.blocks) = 'array' THEN
    FOR block IN SELECT * FROM jsonb_array_elements(OLD.blocks)
    LOOP
      url := block->>'url';
      IF url IS NOT NULL THEN
        PERFORM public._delete_storage_object('portfolio-images',
          public._storage_path_from_url(url, 'portfolio-images'));
      END IF;
    END LOOP;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_portfolio_project_storage ON public.portfolio_projects;
CREATE TRIGGER trg_cleanup_portfolio_project_storage
AFTER DELETE ON public.portfolio_projects
FOR EACH ROW EXECUTE FUNCTION public.cleanup_portfolio_project_storage();

-- job_trackers
CREATE OR REPLACE FUNCTION public.cleanup_job_tracker_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.preview_image_url, 'job-tracker'));
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.final_file_url, 'job-tracker'));
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.payment_qr_url, 'job-tracker'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_job_tracker_storage ON public.job_trackers;
CREATE TRIGGER trg_cleanup_job_tracker_storage
AFTER DELETE ON public.job_trackers
FOR EACH ROW EXECUTE FUNCTION public.cleanup_job_tracker_storage();

-- job_slips
CREATE OR REPLACE FUNCTION public.cleanup_job_slip_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('job-tracker',
    public._storage_path_from_url(OLD.slip_url, 'job-tracker'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_job_slip_storage ON public.job_slips;
CREATE TRIGGER trg_cleanup_job_slip_storage
AFTER DELETE ON public.job_slips
FOR EACH ROW EXECUTE FUNCTION public.cleanup_job_slip_storage();

-- articles
CREATE OR REPLACE FUNCTION public.cleanup_article_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('article-images',
    public._storage_path_from_url(OLD.featured_image, 'article-images'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_article_storage ON public.articles;
CREATE TRIGGER trg_cleanup_article_storage
AFTER DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_article_storage();

-- chat_messages
CREATE OR REPLACE FUNCTION public.cleanup_chat_message_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('chat-images',
    public._storage_path_from_url(OLD.image_url, 'chat-images'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_chat_message_storage ON public.chat_messages;
CREATE TRIGGER trg_cleanup_chat_message_storage
AFTER DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.cleanup_chat_message_storage();

-- announcements
CREATE OR REPLACE FUNCTION public.cleanup_announcement_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public._delete_storage_object('announcement-banners',
    public._storage_path_from_url(OLD.banner_url, 'announcement-banners'));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_announcement_storage ON public.announcements;
CREATE TRIGGER trg_cleanup_announcement_storage
AFTER DELETE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.cleanup_announcement_storage();

-- ── 20260504020624_a4f2919f-232c-4121-92f6-753a463efa27.sql ──
REVOKE EXECUTE ON FUNCTION public._storage_path_from_url(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._delete_storage_object(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_portfolio_project_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_tracker_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_slip_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_article_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_chat_message_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_announcement_storage() FROM PUBLIC, anon, authenticated;

-- ── 20260504022509_87dda77e-fc88-4661-9c88-001766ccc8e9.sql ──
-- Calculator usage tracking
CREATE TABLE IF NOT EXISTS public.calculator_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculator_usage_created_at
  ON public.calculator_usage_events (created_at DESC);

ALTER TABLE public.calculator_usage_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can record a usage event
CREATE POLICY "Anyone can log calculator usage"
  ON public.calculator_usage_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read aggregate (we only expose count via RPC, but allow select for realtime subscription payloads)
CREATE POLICY "Anyone can view calculator usage"
  ON public.calculator_usage_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.calculator_usage_events;

-- RPC for fast count
CREATE OR REPLACE FUNCTION public.get_calculator_usage_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.calculator_usage_events;
$$;

GRANT EXECUTE ON FUNCTION public.get_calculator_usage_count() TO anon, authenticated;

-- ── 20260504025353_6e3115b4-23fd-4b3f-9e3a-6d00bdafd855.sql ──

-- 1. Device events table
CREATE TABLE IF NOT EXISTS public.user_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  device_type text NOT NULL CHECK (device_type IN ('mobile','tablet','desktop')),
  os text,
  browser text,
  viewport_width integer,
  viewport_height integer,
  pixel_ratio numeric,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_events_created_at ON public.user_device_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_device_type ON public.user_device_events(device_type);
CREATE INDEX IF NOT EXISTS idx_device_events_user_id ON public.user_device_events(user_id);

ALTER TABLE public.user_device_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log device event"
  ON public.user_device_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view device events"
  ON public.user_device_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Device usage stats RPC
CREATE OR REPLACE FUNCTION public.get_device_usage_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  device_type text,
  sessions bigint,
  unique_users bigint,
  pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sessions bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT COUNT(*) INTO total_sessions
  FROM public.user_device_events
  WHERE created_at >= now() - (_days || ' days')::interval;

  RETURN QUERY
  SELECT
    e.device_type,
    COUNT(*)::bigint AS sessions,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint AS unique_users,
    CASE WHEN total_sessions > 0
      THEN ROUND((COUNT(*)::numeric / total_sessions) * 100, 1)
      ELSE 0 END AS pct
  FROM public.user_device_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY e.device_type
  ORDER BY sessions DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_breakdown(_days integer DEFAULT 30, _by text DEFAULT 'os')
RETURNS TABLE(
  label text,
  sessions bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF _by = 'browser' THEN
    RETURN QUERY
    SELECT COALESCE(e.browser, 'unknown'),
           COUNT(*)::bigint,
           COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint
    FROM public.user_device_events e
    WHERE e.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10;
  ELSE
    RETURN QUERY
    SELECT COALESCE(e.os, 'unknown'),
           COUNT(*)::bigint,
           COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint
    FROM public.user_device_events e
    WHERE e.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10;
  END IF;
END;
$$;

-- 3. Grant EXECUTE on stats RPCs to authenticated role (function bodies still enforce admin check)
GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_active_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_data_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_breakdown(integer, text) TO authenticated;

-- Also wrap get_top_subscriptions with admin guard so non-admins get a clear error rather than empty rows
CREATE OR REPLACE FUNCTION public.get_top_subscriptions(_limit integer DEFAULT 50)
RETURNS TABLE(
  name text,
  category text,
  user_count bigint,
  total_subscriptions bigint,
  avg_price numeric,
  total_monthly_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    initcap(btrim(lower(s.name)))::text AS name,
    (array_agg(s.category ORDER BY s.created_at DESC) FILTER (WHERE s.category IS NOT NULL))[1] AS category,
    COUNT(DISTINCT s.user_id)::bigint AS user_count,
    COUNT(*)::bigint AS total_subscriptions,
    ROUND(AVG(s.price)::numeric, 2) AS avg_price,
    ROUND(SUM(
      CASE
        WHEN s.cycle = 'yearly' THEN s.price / 12.0
        WHEN s.cycle = 'weekly' THEN s.price * 4.33
        WHEN s.cycle = 'one-time' THEN 0
        ELSE s.price
      END
    )::numeric, 2) AS total_monthly_value
  FROM public.finance_subscriptions s
  WHERE s.is_active = true
  GROUP BY initcap(btrim(lower(s.name)))
  ORDER BY user_count DESC, total_subscriptions DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;


-- ── 20260506013236_90cec1c1-0a47-481e-bfdd-31b0babd79d8.sql ──

-- Step comments for job tracker
CREATE TABLE public.job_tracker_step_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('owner','client')),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jtsc_job ON public.job_tracker_step_comments(job_id, step_index);
ALTER TABLE public.job_tracker_step_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their job comments"
  ON public.job_tracker_step_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid()));

CREATE POLICY "Owners insert comments on their jobs"
  ON public.job_tracker_step_comments FOR INSERT
  WITH CHECK (
    author_role = 'owner'
    AND EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid())
  );

CREATE POLICY "Owners delete their comments"
  ON public.job_tracker_step_comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_id AND j.user_id = auth.uid()));

CREATE POLICY "Admins view all step comments"
  ON public.job_tracker_step_comments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- AI chat tables
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aicm_user ON public.ai_chat_messages(user_id, created_at);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai messages"
  ON public.ai_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ai messages"
  ON public.ai_chat_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_chat_usage (
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai usage"
  ON public.ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ai usage"
  ON public.ai_chat_usage FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));


-- ── 20260508005154_5acdadca-19b7-473d-8dcb-8e9a3281c0e4.sql ──

CREATE TABLE public.price_guide_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_type text NOT NULL,
  days integer NOT NULL DEFAULT 1,
  complexity text NOT NULL DEFAULT 'normal',
  recommended_price numeric NOT NULL DEFAULT 0,
  min_price numeric NOT NULL DEFAULT 0,
  max_price numeric NOT NULL DEFAULT 0,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_guide_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own price guide events"
  ON public.price_guide_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all price guide events"
  ON public.price_guide_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own price guide events"
  ON public.price_guide_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_price_guide_events_job_type ON public.price_guide_events(job_type);
CREATE INDEX idx_price_guide_events_user ON public.price_guide_events(user_id);


-- ── 20260509000320_1c97bdb4-46ab-4875-be1f-dda31c85b479.sql ──

CREATE TABLE IF NOT EXISTS public.price_guide_overrides (
  job_type text PRIMARY KEY,
  min_price numeric NOT NULL DEFAULT 0,
  max_price numeric NOT NULL DEFAULT 0,
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_guide_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage overrides" ON public.price_guide_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read overrides" ON public.price_guide_overrides
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.price_guide_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  job_type text,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_guide_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own price feedback" ON public.price_guide_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own price feedback" ON public.price_guide_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all price feedback" ON public.price_guide_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.price_guide_events
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;


-- ── 20260510014123_16876819-27ef-4dcb-ae8e-1251ead42739.sql ──
-- Guest usage tracking for anonymous landing chat
CREATE TABLE IF NOT EXISTS public.ai_chat_guest_usage (
  guest_id text NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  count integer NOT NULL DEFAULT 0,
  ip text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, usage_date)
);

ALTER TABLE public.ai_chat_guest_usage ENABLE ROW LEVEL SECURITY;

-- Only service role writes; no client policies needed (deny all by default)
CREATE POLICY "no_client_access_guest_usage"
  ON public.ai_chat_guest_usage FOR SELECT
  USING (false);


-- ── 20260511003617_58871470-efd1-431d-94e4-1f3d29a7a9cf.sql ──

-- 1) Trim price_guide_events to last 5 per user
CREATE OR REPLACE FUNCTION public.trim_price_guide_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.price_guide_events
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id FROM public.price_guide_events
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      OFFSET 5
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_price_guide_history_trg ON public.price_guide_events;
CREATE TRIGGER trim_price_guide_history_trg
AFTER INSERT ON public.price_guide_events
FOR EACH ROW EXECUTE FUNCTION public.trim_price_guide_history();

-- 2) Survey responses (guest + user)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  guest_id TEXT,
  persona TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_guest ON public.survey_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created ON public.survey_responses(created_at DESC);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a survey"
  ON public.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can view their submissions"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
  ON public.survey_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));


-- ── 20260511101922_b66d1949-bf0f-40d9-bd1f-a65204619b1f.sql ──

-- 1. design_briefs table
CREATE TABLE public.design_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'บรีฟใหม่',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | awaiting_client | awaiting_confirm | confirmed
  client_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  project_overview JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  design_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  tech_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline_budget JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  confirmed_at TIMESTAMPTZ,
  confirmed_by_name TEXT,
  confirmed_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_briefs_user_id ON public.design_briefs(user_id);
CREATE INDEX idx_design_briefs_share_token ON public.design_briefs(share_token);

ALTER TABLE public.design_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own briefs"
  ON public.design_briefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own briefs"
  ON public.design_briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own briefs"
  ON public.design_briefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own briefs"
  ON public.design_briefs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_design_briefs_updated_at
  BEFORE UPDATE ON public.design_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Public access via share_token (security definer)
CREATE OR REPLACE FUNCTION public.get_brief_by_token(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'share_token', b.share_token,
    'title', b.title,
    'status', b.status,
    'client_info', b.client_info,
    'project_overview', b.project_overview,
    'audience', b.audience,
    'design_direction', b.design_direction,
    'tech_specs', b.tech_specs,
    'timeline_budget', b.timeline_budget,
    'notes', b.notes,
    'references', b."references",
    'confirmed_at', b.confirmed_at,
    'confirmed_by_name', b.confirmed_by_name,
    'created_at', b.created_at,
    'updated_at', b.updated_at,
    'owner', jsonb_build_object(
      'display_name', p.display_name,
      'brand_name', p.brand_name,
      'logo_url', p.logo_url,
      'avatar_url', p.avatar_url,
      'tagline', p.tagline
    )
  ) INTO result
  FROM public.design_briefs b
  LEFT JOIN public.profiles p ON p.user_id = b.user_id
  WHERE b.share_token = _token;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_brief_by_token(
  _token UUID,
  _client_info JSONB DEFAULT NULL,
  _project_overview JSONB DEFAULT NULL,
  _audience JSONB DEFAULT NULL,
  _design_direction JSONB DEFAULT NULL,
  _tech_specs JSONB DEFAULT NULL,
  _timeline_budget JSONB DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _references JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_status TEXT;
BEGIN
  SELECT status INTO cur_status FROM public.design_briefs WHERE share_token = _token;
  IF cur_status IS NULL THEN RETURN FALSE; END IF;
  IF cur_status = 'confirmed' THEN RETURN FALSE; END IF;

  UPDATE public.design_briefs
  SET
    client_info = COALESCE(_client_info, client_info),
    project_overview = COALESCE(_project_overview, project_overview),
    audience = COALESCE(_audience, audience),
    design_direction = COALESCE(_design_direction, design_direction),
    tech_specs = COALESCE(_tech_specs, tech_specs),
    timeline_budget = COALESCE(_timeline_budget, timeline_budget),
    notes = COALESCE(_notes, notes),
    "references" = COALESCE(_references, "references"),
    status = CASE WHEN status = 'awaiting_client' THEN 'awaiting_confirm' ELSE status END,
    updated_at = now()
  WHERE share_token = _token;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_brief_by_token(
  _token UUID,
  _name TEXT,
  _signature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  brief_owner UUID;
  brief_title TEXT;
  brief_id UUID;
BEGIN
  IF _name IS NULL OR length(btrim(_name)) < 1 THEN RETURN FALSE; END IF;

  UPDATE public.design_briefs
  SET status = 'confirmed',
      confirmed_at = now(),
      confirmed_by_name = btrim(_name),
      confirmed_signature = _signature,
      updated_at = now()
  WHERE share_token = _token AND status <> 'confirmed'
  RETURNING user_id, title, id INTO brief_owner, brief_title, brief_id;

  IF brief_owner IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO public.notifications
    (user_id, actor_name, type, message, url)
  VALUES
    (brief_owner, btrim(_name), 'brief_confirmed',
     btrim(_name) || ' ยืนยันบรีฟ "' || COALESCE(brief_title, '') || '" แล้ว ✓',
     '/dashboard?tab=planner&brief=' || brief_id::text);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_brief_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_brief_by_token(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_brief_by_token(UUID, TEXT, TEXT) TO anon, authenticated;

-- 3. Storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brief-references', 'brief-references', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brief refs public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brief-references');

CREATE POLICY "Brief refs anyone insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'brief-references');

CREATE POLICY "Brief refs owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brief-references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 20260511143457_65aff0c8-190f-4d60-a9bd-02a76f9684fd.sql ──
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_quotations_brief_id ON public.quotations(brief_id);

-- ── 20260511150129_dc7240a3-4389-417c-aab9-a2dcc0d1eaa3.sql ──

-- 1. Banner slides table
CREATE TABLE public.auth_banner_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_banner_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banner slides"
  ON public.auth_banner_slides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert banner slides"
  ON public.auth_banner_slides FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banner slides"
  ON public.auth_banner_slides FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banner slides"
  ON public.auth_banner_slides FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_auth_banner_slides_updated_at
  BEFORE UPDATE ON public.auth_banner_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('auth-banners', 'auth-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view auth banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'auth-banners');

CREATE POLICY "Admins can upload auth banner images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update auth banner images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete auth banner images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

-- 3. Freelance field on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freelance_field TEXT;

-- 4. Update handle_new_user to save freelance_field from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, freelance_field)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'freelance_field', '')
  );

  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;


-- ── 20260511153738_8d288992-e2e9-4206-a744-6425c0f1b9a3.sql ──

-- Vision Canvas main table
CREATE TABLE public.vision_canvases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Vision',
  brief_id UUID REFERENCES public.design_briefs(id) ON DELETE SET NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  palette TEXT[] NOT NULL DEFAULT '{}',
  font TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  designer_note TEXT NOT NULL DEFAULT '',
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_canvases_user ON public.vision_canvases(user_id, updated_at DESC);
CREATE INDEX idx_vision_canvases_token ON public.vision_canvases(share_token);

ALTER TABLE public.vision_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select vision_canvases" ON public.vision_canvases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public select shared vision_canvases" ON public.vision_canvases
  FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Owners insert vision_canvases" ON public.vision_canvases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update vision_canvases" ON public.vision_canvases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete vision_canvases" ON public.vision_canvases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_vision_canvases_updated_at
  BEFORE UPDATE ON public.vision_canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reactions (likes + comments) from public viewers
CREATE TABLE public.vision_canvas_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id UUID NOT NULL REFERENCES public.vision_canvases(id) ON DELETE CASCADE,
  block_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('like','comment')),
  guest_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_canvas_reactions_canvas ON public.vision_canvas_reactions(canvas_id, created_at DESC);

ALTER TABLE public.vision_canvas_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert reactions on shared canvases" ON public.vision_canvas_reactions
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.is_public = true
    )
  );

CREATE POLICY "Public select reactions on shared canvases" ON public.vision_canvas_reactions
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.is_public = true
    )
  );

CREATE POLICY "Owners select reactions" ON public.vision_canvas_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete reactions" ON public.vision_canvas_reactions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vision_canvases vc
      WHERE vc.id = vision_canvas_reactions.canvas_id AND vc.user_id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vision_canvases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vision_canvas_reactions;


-- ── 20260511160513_cf6964b8-fab9-45b4-aee7-dde50bdbf041.sql ──

CREATE TABLE public.archetype_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  main_archetype text NOT NULL,
  secondary_archetype text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archetype_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_can_select_own_results"
  ON public.archetype_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "public_can_select_via_share"
  ON public.archetype_results FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_insert"
  ON public.archetype_results FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "owner_can_delete_own_results"
  ON public.archetype_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_archetype_results_user ON public.archetype_results(user_id);
CREATE INDEX idx_archetype_results_token ON public.archetype_results(share_token);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS archetype_secondary text;


-- ── 20260512040613_a6af63f7-72fc-4303-8042-38c07b5ea085.sql ──

CREATE TABLE public.user_color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_color_palettes_user ON public.user_color_palettes(user_id);

ALTER TABLE public.user_color_palettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select palettes" ON public.user_color_palettes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert palettes" ON public.user_color_palettes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update palettes" ON public.user_color_palettes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete palettes" ON public.user_color_palettes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_color_palettes_updated_at
BEFORE UPDATE ON public.user_color_palettes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_saved_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  palette_id UUID NOT NULL REFERENCES public.user_color_palettes(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_saved_colors_palette ON public.user_saved_colors(palette_id);
CREATE INDEX idx_user_saved_colors_user ON public.user_saved_colors(user_id);

ALTER TABLE public.user_saved_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select saved colors" ON public.user_saved_colors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert saved colors" ON public.user_saved_colors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update saved colors" ON public.user_saved_colors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete saved colors" ON public.user_saved_colors FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 20260512045506_7acf26f5-2f5e-48dd-a962-59e04b5d477e.sql ──

-- 1. Lock down archetype_results: only owner (or service role) can read
DROP POLICY IF EXISTS "public_can_select_via_share" ON public.archetype_results;

-- 2. Tighten brief-references storage upload policy
DROP POLICY IF EXISTS "Brief refs anyone insert" ON storage.objects;

CREATE POLICY "Brief refs anon insert in public folder"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'brief-references'
    AND (storage.foldername(name))[1] = 'public'
  );

CREATE POLICY "Brief refs auth insert in own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brief-references'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR (storage.foldername(name))[1] = 'public'
    )
  );


-- ── 20260512064044_158d6559-66b1-4b04-afa2-9f0e408b7877.sql ──
CREATE TABLE public.typo_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  heading_font TEXT NOT NULL,
  body_font TEXT NOT NULL,
  heading_weight INTEGER NOT NULL DEFAULT 700,
  body_weight INTEGER NOT NULL DEFAULT 400,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.typo_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own typo pairs" ON public.typo_pairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own typo pairs" ON public.typo_pairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own typo pairs" ON public.typo_pairs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own typo pairs" ON public.typo_pairs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_typo_pairs_user ON public.typo_pairs(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.typo_pairs;

-- ── 20260512071023_855ff03d-cb00-4de3-9ab8-c97c462829dd.sql ──
CREATE TABLE public.spec_checklist_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template text NOT NULL CHECK (template IN ('web','social','print')),
  checked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, template)
);

ALTER TABLE public.spec_checklist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own checklist state"
  ON public.spec_checklist_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checklist state"
  ON public.spec_checklist_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checklist state"
  ON public.spec_checklist_state FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own checklist state"
  ON public.spec_checklist_state FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_spec_checklist_state_updated_at
  BEFORE UPDATE ON public.spec_checklist_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.spec_checklist_state;

-- ── 20260512100638_385ea6e9-a2d1-445d-bbec-7c64a0ec62c6.sql ──
ALTER TABLE public.vision_canvas_reactions
  ADD COLUMN IF NOT EXISTS pin_x numeric,
  ADD COLUMN IF NOT EXISTS pin_y numeric,
  ADD COLUMN IF NOT EXISTS target_block_id text;

ALTER TABLE public.vision_canvases
  ADD COLUMN IF NOT EXISTS voting_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_text text NOT NULL DEFAULT '';

-- Drop old kind CHECK constraint if exists, recreate with extended values
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.vision_canvas_reactions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%kind%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.vision_canvas_reactions DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.vision_canvas_reactions
  ADD CONSTRAINT vision_canvas_reactions_kind_check
  CHECK (kind IN ('like','comment','pin_comment','vote'));

-- ── 20260512131454_dc54a7fe-5714-414a-9bd2-8bd8145e3d8e.sql ──

-- 1. New columns on planner_posts
ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS caption text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_platforms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vision_canvas_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS client_feedback text DEFAULT '';

-- 2. Share links table
CREATE TABLE IF NOT EXISTS public.planner_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  month text NOT NULL,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.planner_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners CRUD share links - select"
  ON public.planner_share_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - insert"
  ON public.planner_share_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - update"
  ON public.planner_share_links FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners CRUD share links - delete"
  ON public.planner_share_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anyone with the token can view the share link metadata
CREATE POLICY "Public can view share links"
  ON public.planner_share_links FOR SELECT TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

-- 3. Public read of planner_posts via valid share link
CREATE POLICY "Public can view posts via share link"
  ON public.planner_posts FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.planner_share_links sl
      WHERE sl.user_id = planner_posts.user_id
        AND (sl.client_id IS NULL OR sl.client_id = planner_posts.client_id)
        AND to_char(planner_posts.post_date, 'YYYY-MM') = sl.month
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );

-- 4. Public can update approval fields only for posts under a valid share link
-- Use a security definer function for safe approval writes
CREATE OR REPLACE FUNCTION public.submit_post_approval(
  _share_token uuid,
  _post_id uuid,
  _status text,
  _feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link record;
  post record;
BEGIN
  IF _status NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT * INTO link FROM public.planner_share_links WHERE share_token = _share_token;
  IF link IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RAISE EXCEPTION 'token expired';
  END IF;

  SELECT * INTO post FROM public.planner_posts WHERE id = _post_id;
  IF post IS NULL THEN RAISE EXCEPTION 'post not found'; END IF;
  IF post.user_id <> link.user_id THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF link.client_id IS NOT NULL AND post.client_id <> link.client_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF to_char(post.post_date, 'YYYY-MM') <> link.month THEN
    RAISE EXCEPTION 'out of scope';
  END IF;

  UPDATE public.planner_posts
  SET approval_status = _status,
      client_feedback = COALESCE(_feedback, ''),
      status = CASE WHEN _status = 'approved' THEN 'approved' ELSE status END,
      updated_at = now()
  WHERE id = _post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_post_approval(uuid, uuid, text, text) TO anon, authenticated;

-- 5. Realtime
ALTER TABLE public.planner_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'planner_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_posts';
  END IF;
END $$;


-- ── 20260512144148_b81d7bbc-fb69-4774-bc8f-e9b0d816c907.sql ──
-- Status history table for client invoices
CREATE TABLE public.finance_invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_clients_invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_status_history_invoice ON public.finance_invoice_status_history(invoice_id, changed_at DESC);
CREATE INDEX idx_invoice_status_history_user ON public.finance_invoice_status_history(user_id);

ALTER TABLE public.finance_invoice_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own status history"
  ON public.finance_invoice_status_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own status history"
  ON public.finance_invoice_status_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own status history"
  ON public.finance_invoice_status_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Trigger: log status changes
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _note TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _note := NULLIF(NEW.meta->>'status_change_note', '');
    INSERT INTO public.finance_invoice_status_history (invoice_id, user_id, from_status, to_status, note)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status, _note);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_invoice_status_change
AFTER UPDATE OF status ON public.finance_clients_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_status_change();

-- Trigger: notify on late
CREATE OR REPLACE FUNCTION public.notify_on_invoice_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('late7', 'late30') THEN
    INSERT INTO public.notifications (user_id, type, message, url)
    VALUES (
      NEW.user_id,
      'invoice_late',
      'ใบแจ้งหนี้ "' || COALESCE(NEW.name, '') || '" ' ||
      CASE NEW.status WHEN 'late7' THEN 'เลยกำหนดมา 7 วัน' ELSE 'เลยกำหนดมา 30 วัน' END,
      '/dashboard?tab=clients'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_invoice_late
AFTER UPDATE OF status ON public.finance_clients_invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_late();

-- Auto-update late statuses based on due_date (caller-scoped via RLS)
CREATE OR REPLACE FUNCTION public.auto_update_invoice_statuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER := 0;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;

  WITH upd AS (
    UPDATE public.finance_clients_invoices
       SET status = 'late30'
     WHERE user_id = _uid
       AND status IN ('ontime', 'late7')
       AND due_date IS NOT NULL
       AND (CURRENT_DATE - due_date) > 30
    RETURNING 1
  )
  SELECT affected + COUNT(*) INTO affected FROM upd;

  WITH upd2 AS (
    UPDATE public.finance_clients_invoices
       SET status = 'late7'
     WHERE user_id = _uid
       AND status = 'ontime'
       AND due_date IS NOT NULL
       AND (CURRENT_DATE - due_date) > 7
       AND (CURRENT_DATE - due_date) <= 30
    RETURNING 1
  )
  SELECT affected + COUNT(*) INTO affected FROM upd2;

  RETURN affected;
END;
$$;

-- ── 20260514015523_6c707efd-0c39-4b19-8439-9da51e59df55.sql ──

CREATE TABLE public.dashboard_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own dashboard_jobs select" ON public.dashboard_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs insert" ON public.dashboard_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs update" ON public.dashboard_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs delete" ON public.dashboard_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own dashboard_tasks select" ON public.dashboard_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks insert" ON public.dashboard_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks update" ON public.dashboard_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks delete" ON public.dashboard_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_dashboard_jobs_updated_at BEFORE UPDATE ON public.dashboard_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dashboard_tasks_updated_at BEFORE UPDATE ON public.dashboard_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dashboard_jobs_user ON public.dashboard_jobs(user_id, sort_order);
CREATE INDEX idx_dashboard_tasks_user ON public.dashboard_tasks(user_id, sort_order);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_tasks;


-- ── 20260515001053_8d56f736-05b1-473b-8206-a79fdc16bbc8.sql ──
-- Sub-tasks table for grouped job list
CREATE TABLE IF NOT EXISTS public.dashboard_job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.dashboard_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_job_tasks_job_id ON public.dashboard_job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_job_tasks_user_id ON public.dashboard_job_tasks(user_id);

ALTER TABLE public.dashboard_job_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own job tasks" ON public.dashboard_job_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own job tasks" ON public.dashboard_job_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own job tasks" ON public.dashboard_job_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own job tasks" ON public.dashboard_job_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_job_tasks_updated_at
  BEFORE UPDATE ON public.dashboard_job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_job_tasks;

-- Scratchpad notes table (single row per user)
CREATE TABLE IF NOT EXISTS public.dashboard_notes (
  user_id UUID PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notes" ON public.dashboard_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.dashboard_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.dashboard_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.dashboard_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_notes_updated_at
  BEFORE UPDATE ON public.dashboard_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 20260516134211_89e37b0d-6487-4e5f-b320-408e7666743a.sql ──
CREATE TABLE IF NOT EXISTS public.dashboard_daily_trends (
  trend_date DATE PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_daily_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily trends"
  ON public.dashboard_daily_trends
  FOR SELECT
  USING (true);


-- ── 20260521043342_7924d4de-75a5-42f1-bfc0-92f6489aa1bc.sql ──
DROP POLICY IF EXISTS "Public can view share links" ON public.planner_share_links;

CREATE OR REPLACE FUNCTION public.get_planner_share_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_id text,
  month text,
  share_token uuid,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, client_id, month, share_token, expires_at, created_at
  FROM public.planner_share_links
  WHERE share_token = _token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_planner_share_by_token(uuid) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime DROP TABLE public.calculator_usage_events;

-- ── 20260521044228_0d3e587b-393c-4b05-bcf7-c0c474ede22f.sql ──
CREATE OR REPLACE FUNCTION public.get_planner_posts_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  client_id text,
  title text,
  post_date date,
  post_time text,
  platforms text[],
  custom_platforms text[],
  status text,
  link text,
  caption text,
  image_url text,
  approval_status text,
  client_feedback text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.client_id, p.title, p.post_date, p.post_time,
         p.platforms, p.custom_platforms, p.status, p.link, p.caption,
         p.image_url, p.approval_status, p.client_feedback
  FROM public.planner_share_links sl
  JOIN public.planner_posts p
    ON p.user_id = sl.user_id
   AND (sl.client_id IS NULL OR p.client_id = sl.client_id)
   AND to_char(p.post_date::timestamptz, 'YYYY-MM') = sl.month
  WHERE sl.share_token = _token
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
  ORDER BY p.post_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_planner_posts_by_token(uuid) TO anon, authenticated;

-- ── 20260521045622_2db0fd48-b4e0-48de-a632-13ccb8162a72.sql ──

DROP FUNCTION IF EXISTS public.notify_on_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_like() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_hire() CASCADE;
DROP FUNCTION IF EXISTS public.validate_hire_request() CASCADE;
DROP FUNCTION IF EXISTS public.moderate_portfolio_comment() CASCADE;
DROP FUNCTION IF EXISTS public.bump_comment_report_count() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_portfolio_project_storage() CASCADE;
DROP FUNCTION IF EXISTS public.reject_base64_portfolio_cover() CASCADE;

DROP TABLE IF EXISTS public.portfolio_comment_reports CASCADE;
DROP TABLE IF EXISTS public.portfolio_comments CASCADE;
DROP TABLE IF EXISTS public.portfolio_likes CASCADE;
DROP TABLE IF EXISTS public.hire_requests CASCADE;
DROP TABLE IF EXISTS public.portfolio_projects CASCADE;
DROP TABLE IF EXISTS public.archetype_results CASCADE;

CREATE OR REPLACE FUNCTION public.get_feature_data_stats()
 RETURNS TABLE(feature text, table_name text, total_records bigint, unique_users bigint, avg_per_user numeric, max_per_user bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH per_feature AS (
    SELECT 'ใบเสนอราคา (Quotations)'::text AS feat, 'quotations'::text AS tbl, q.user_id AS uid FROM public.quotations q
    UNION ALL SELECT 'ลูกค้า (Saved Clients)', 'saved_clients', sc.user_id FROM public.saved_clients sc
    UNION ALL SELECT 'Suppliers', 'suppliers', s.user_id FROM public.suppliers s
    UNION ALL SELECT 'ไฟล์ Supplier', 'supplier_files', sf.user_id FROM public.supplier_files sf
    UNION ALL SELECT 'ลิงก์ Supplier', 'supplier_links', sl.user_id FROM public.supplier_links sl
    UNION ALL SELECT 'รายรับ (Income)', 'finance_incomes', fi.user_id FROM public.finance_incomes fi
    UNION ALL SELECT 'รายจ่าย (Expenses)', 'finance_expenses', fe.user_id FROM public.finance_expenses fe
    UNION ALL SELECT 'Subscriptions', 'finance_subscriptions', fs.user_id FROM public.finance_subscriptions fs
    UNION ALL SELECT 'วิธีชำระเงิน', 'finance_payment_methods', pm.user_id FROM public.finance_payment_methods pm
    UNION ALL SELECT 'ลดหย่อนภาษี', 'finance_deductions', fd.user_id FROM public.finance_deductions fd
    UNION ALL SELECT 'ใบแจ้งหนี้ลูกค้า', 'finance_clients_invoices', ci.user_id FROM public.finance_clients_invoices ci
    UNION ALL SELECT 'การแจ้งเตือน', 'notifications', n.user_id FROM public.notifications n
    UNION ALL SELECT 'Beta Feedback', 'beta_feedback', bf.user_id FROM public.beta_feedback bf
  ),
  per_user AS (
    SELECT pf.feat, pf.tbl, pf.uid, COUNT(*)::bigint AS cnt
    FROM per_feature pf
    GROUP BY pf.feat, pf.tbl, pf.uid
  )
  SELECT pu.feat, pu.tbl, SUM(pu.cnt)::bigint, COUNT(DISTINCT pu.uid)::bigint,
         ROUND(AVG(pu.cnt)::numeric, 2), MAX(pu.cnt)::bigint
  FROM per_user pu
  GROUP BY pu.feat, pu.tbl
  ORDER BY SUM(pu.cnt) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_inactive_profile_data(_limit integer DEFAULT 25)
 RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  rec RECORD;
  warn text[];
  ann RECORD;
  obj_path text;
  did_auth boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  FOR rec IN
    SELECT p.user_id FROM public.profiles p
     WHERE p.is_active = false AND p.purge_after IS NOT NULL
       AND p.purge_after <= now() AND p.purged_at IS NULL
     ORDER BY p.purge_after ASC
     LIMIT LEAST(GREATEST(_limit, 1), 100)
  LOOP
    warn := ARRAY[]::text[];
    did_auth := false;

    BEGIN DELETE FROM public.supplier_files WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_files:' || SQLERRM); END;
    BEGIN DELETE FROM public.supplier_links WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('supplier_links:' || SQLERRM); END;
    BEGIN DELETE FROM public.suppliers WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('suppliers:' || SQLERRM); END;
    BEGIN DELETE FROM public.saved_clients WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('saved_clients:' || SQLERRM); END;
    BEGIN DELETE FROM public.quotations WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('quotations:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_clients_invoices WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_clients_invoices:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_deductions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_deductions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_expenses WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_expenses:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_incomes WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_incomes:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_subscriptions WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_subscriptions:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_payment_methods WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_payment_methods:' || SQLERRM); END;
    BEGIN DELETE FROM public.finance_settings WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('finance_settings:' || SQLERRM); END;
    BEGIN DELETE FROM public.feature_usage_events WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('feature_usage_events:' || SQLERRM); END;
    BEGIN DELETE FROM public.user_activity_logs WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_activity_logs:' || SQLERRM); END;
    BEGIN DELETE FROM public.beta_feedback WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('beta_feedback:' || SQLERRM); END;
    BEGIN DELETE FROM public.notifications WHERE user_id = rec.user_id OR actor_user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('notifications:' || SQLERRM); END;
    BEGIN DELETE FROM public.chat_messages WHERE user_id = rec.user_id OR sender_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('chat_messages:' || SQLERRM); END;
    BEGIN DELETE FROM public.tester_applications WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('tester_applications:' || SQLERRM); END;

    FOR ann IN SELECT id, banner_url FROM public.announcements WHERE created_by = rec.user_id LOOP
      BEGIN DELETE FROM public.announcements WHERE id = ann.id;
      EXCEPTION WHEN OTHERS THEN warn := warn || ('announcements:' || SQLERRM); END;
    END LOOP;

    BEGIN DELETE FROM public.user_roles WHERE user_id = rec.user_id;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('user_roles:' || SQLERRM); END;

    UPDATE public.profiles
       SET display_name = 'Inactive user', brand_name = NULL, logo_url = NULL,
           avatar_url = NULL, tagline = NULL, phone = NULL, address = NULL,
           tax_id = NULL, bank_name = NULL, bank_account_name = NULL,
           bank_account_number = NULL, payment_qr_url = NULL, social_link = NULL,
           terms = NULL, onboarding_data = '{}'::jsonb,
           purged_at = now(), updated_at = now()
     WHERE profiles.user_id = rec.user_id;

    BEGIN DELETE FROM auth.users WHERE id = rec.user_id; did_auth := true;
    EXCEPTION WHEN OTHERS THEN warn := warn || ('auth_users:' || SQLERRM); did_auth := false;
    END;

    user_id := rec.user_id; warnings := warn; auth_deleted := did_auth;
    RETURN NEXT;
  END LOOP;
END;
$function$;


-- ── 20260521053103_37dce9b6-3c40-4f6a-99f7-338d059c2678.sql ──
-- 1. Remove the bypass policy on planner_posts; clients must go via get_planner_posts_by_token RPC
DROP POLICY IF EXISTS "Public can view posts via share link" ON public.planner_posts;

-- 2. Restrict auth_banner_slides public SELECT to active rows only
DROP POLICY IF EXISTS "Anyone can view active banner slides" ON public.auth_banner_slides;
CREATE POLICY "Anyone can view active banner slides"
  ON public.auth_banner_slides
  FOR SELECT
  USING (is_active = true);

-- 3. Allow users to INSERT their own ai_chat_messages
CREATE POLICY "Users insert own ai messages"
  ON public.ai_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to INSERT/UPDATE their own ai_chat_usage
CREATE POLICY "Users insert own ai usage"
  ON public.ai_chat_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai usage"
  ON public.ai_chat_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 20260521053647_4e569216-4df7-4618-8d8d-5566c8f5948f.sql ──
-- Tighten public slip upload: require slips/<existing_job_id>/...
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;

CREATE POLICY "Public upload slips into existing jobs"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = 'slips'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.job_trackers jt
      WHERE jt.id::text = (storage.foldername(name))[2]
    )
  );

-- ── 20260523023300_052376fe-4e41-41fb-a922-9b154702ef66.sql ──

create extension if not exists vector;

-- 1. ai_training_samples
create table public.ai_training_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  feature text not null,
  model text,
  system_prompt_version text,
  user_prompt text not null,
  ai_response text not null,
  user_rating smallint,
  corrected_response text,
  status text not null default 'pending',
  tokens_used integer default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ai_training_samples_user on public.ai_training_samples(user_id);
create index idx_ai_training_samples_status on public.ai_training_samples(status);
create index idx_ai_training_samples_feature on public.ai_training_samples(feature);

alter table public.ai_training_samples enable row level security;

create policy "Users insert own samples" on public.ai_training_samples
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users view own samples" on public.ai_training_samples
  for select to authenticated using (auth.uid() = user_id);
create policy "Users update own samples rating" on public.ai_training_samples
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins view all samples" on public.ai_training_samples
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update all samples" on public.ai_training_samples
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete samples" on public.ai_training_samples
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_ai_training_samples_updated
before update on public.ai_training_samples
for each row execute function public.update_updated_at_column();

-- 2. ai_knowledge_base
create table public.ai_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  source_sample_id uuid references public.ai_training_samples(id) on delete set null,
  feature text not null,
  prompt text not null,
  ideal_response text not null,
  embedding vector(1536),
  tags text[] not null default '{}',
  approved_by uuid,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_ai_knowledge_feature on public.ai_knowledge_base(feature);
create index idx_ai_knowledge_embedding on public.ai_knowledge_base
  using hnsw (embedding vector_cosine_ops);

alter table public.ai_knowledge_base enable row level security;

create policy "Admins manage knowledge base" on public.ai_knowledge_base
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 3. ai_personality_settings (singleton — one row)
create table public.ai_personality_settings (
  id uuid primary key default gen_random_uuid(),
  creativity numeric not null default 0.7,
  formality numeric not null default 0.5,
  detail_level numeric not null default 0.5,
  forbidden_keywords text[] not null default '{}',
  system_prompt_override text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_personality_settings enable row level security;

create policy "Anyone authenticated reads personality" on public.ai_personality_settings
  for select to authenticated using (true);
create policy "Admins update personality" on public.ai_personality_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_ai_personality_updated
before update on public.ai_personality_settings
for each row execute function public.update_updated_at_column();

-- seed one row
insert into public.ai_personality_settings (creativity, formality, detail_level, forbidden_keywords)
values (0.7, 0.5, 0.5, '{}');

-- RPC for similarity search (knowledge base)
create or replace function public.match_ai_knowledge(
  query_embedding vector(1536),
  match_feature text,
  match_count int default 3
)
returns table (
  id uuid,
  feature text,
  prompt text,
  ideal_response text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    k.id,
    k.feature,
    k.prompt,
    k.ideal_response,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.ai_knowledge_base k
  where k.feature = match_feature
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;


-- ── 20260523042421_19c104fc-cabd-452d-a25f-d0f402bd60b1.sql ──

-- 1) Make chat-images private and scope SELECT to owner or admin
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;

CREATE POLICY "Chat images readable by owner or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- 2) Restrict Realtime broadcast/presence on job tracker channels
DROP POLICY IF EXISTS "realtime job tracker topics owner only" ON realtime.messages;
CREATE POLICY "realtime job tracker topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'track-%' OR realtime.topic() LIKE 'job-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = split_part(realtime.topic(), '-', 2)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    ELSE false
  END
);

-- 3) Restrict Realtime broadcast/presence on planner channels
DROP POLICY IF EXISTS "realtime planner topics owner only" ON realtime.messages;
CREATE POLICY "realtime planner topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'planner-%' OR realtime.topic() LIKE 'planner-approvals-%' THEN
      split_part(realtime.topic(), '-', 2) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    ELSE false
  END
);


-- ── 20260523043235_0daf7ad4-eeb0-4379-bd63-e67f187e897f.sql ──

-- ============================================
-- So1o HQ — Internal AI Agency tables
-- ============================================

CREATE TABLE public.hq_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  emoji text NOT NULL DEFAULT '🤖',
  accent_color text NOT NULL DEFAULT '#FF6B00',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  tools jsonb NOT NULL DEFAULT '{}',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 1200,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hq_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL REFERENCES public.hq_agents(slug) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'การสนทนาใหม่',
  pinned_context jsonb NOT NULL DEFAULT '{}',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hq_conv_user ON public.hq_conversations(user_id, updated_at DESC);
CREATE INDEX idx_hq_conv_agent ON public.hq_conversations(agent_slug);

CREATE TABLE public.hq_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.hq_conversations(id) ON DELETE CASCADE,
  agent_slug text,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL DEFAULT '',
  tokens_used integer NOT NULL DEFAULT 0,
  cost_estimate numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hq_msg_conv ON public.hq_messages(conversation_id, created_at);

CREATE TABLE public.hq_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id uuid REFERENCES public.hq_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  assigned_agent text REFERENCES public.hq_agents(slug) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','blocked')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  output jsonb NOT NULL DEFAULT '{}',
  context_refs jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_by_agent text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hq_task_status ON public.hq_tasks(status, sort_order);
CREATE INDEX idx_hq_task_agent ON public.hq_tasks(assigned_agent);

CREATE TABLE public.hq_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.hq_tasks(id) ON DELETE CASCADE,
  agent_slug text NOT NULL REFERENCES public.hq_agents(slug) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','code','image','contract','plan','analysis')),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revise','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hq_outputs_status ON public.hq_outputs(status, created_at DESC);

-- Updated_at trigger
CREATE TRIGGER trg_hq_agents_updated BEFORE UPDATE ON public.hq_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hq_conv_updated BEFORE UPDATE ON public.hq_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hq_tasks_updated BEFORE UPDATE ON public.hq_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS — admin only
ALTER TABLE public.hq_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hq_agents" ON public.hq_agents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage hq_conversations" ON public.hq_conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage hq_messages" ON public.hq_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage hq_tasks" ON public.hq_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage hq_outputs" ON public.hq_outputs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============================================
-- Seed 10 AI agents
-- ============================================
INSERT INTO public.hq_agents (slug, name, title, department, emoji, accent_color, model, temperature, sort_order, skills, tools, system_prompt) VALUES

('ceo','So1o CEO','Chief Executive & Orchestrator','Executive','👑','#FF6B00','openai/gpt-5.4',0.6,1,
 ARRAY['strategy','planning','delegation','decision-making','prioritization'],
 '{"can_call_agents":true,"can_read_briefs":true,"can_read_quotations":true,"can_create_tasks":true}'::jsonb,
'คุณคือ "So1o CEO" — ผู้บริหารสูงสุดของบริษัท So1o ที่เปรียบเสมือนพี่เลี้ยงและคู่คิดของบอส (เจ้าของระบบ)
บุคลิก: จริงใจ เด็ดขาด มองภาพรวม คิดเป็นระบบ และ "Minimalist but Powerful"

หน้าที่หลัก:
1. รับวิสัยทัศน์/โจทย์จากบอส แล้วแตกออกเป็น Action Plan ที่ทำได้จริง
2. มอบหมายงานให้พนักงาน AI แต่ละแผนก (CMO, Copywriter, Legal, CFO, CTO, Ops, Research) โดยระบุชัดว่าใครทำอะไร
3. ติดตามและสรุปความคืบหน้า เตือนเมื่อมีงานติดขัด
4. เสนอ KPI และวิธีวัดผลทุกแคมเปญ

กฎเหล็ก:
- ตอบเป็นภาษาไทยที่กระชับ มืออาชีพ มี bullet/checklist ชัดเจน
- ทุกแผนต้องมี: เป้าหมาย → ขั้นตอน → ผู้รับผิดชอบ → ตัวชี้วัด → Timeline
- ตอบไม่เกิน 800 คำ
- ห้ามตอบเรื่องการเมือง ศาสนา หรือเรื่องนอกธุรกิจ
- ถ้าไม่แน่ใจ ให้บอกตรงๆ และเสนอวิธีหาข้อมูลเพิ่ม'),

('cmo','CMO','Chief Marketing Officer','Marketing','🎯','#FF6B00','google/gemini-2.5-pro',0.75,2,
 ARRAY['brand-strategy','market-analysis','consumer-psychology','positioning','campaign-design'],
 '{"can_read_briefs":true,"can_propose_campaigns":true}'::jsonb,
'คุณคือ "So1o CMO" — นักยุทธศาสตร์การตลาดระดับโลก เชี่ยวชาญแบรนด์พรีเมียมและตลาดฟรีแลนซ์ไทย
บุคลิก: ฉลาด มีรสนิยม มองเห็น Insight ที่คนอื่นมองข้าม

ความเชี่ยวชาญ:
- สร้าง Unfair Advantage ให้แบรนด์
- Positioning + Target Persona ที่ลึกถึงพฤติกรรม
- Funnel Marketing (Awareness → Consideration → Conversion → Retention)
- จิตวิทยาผู้บริโภค (Cialdini, Behavioral Economics)
- เน้นใช้ Gradient ขาว-ส้มของ So1o เป็นเอกลักษณ์

รูปแบบการตอบ:
1. Insight (สิ่งที่คนอื่นไม่เห็น)
2. Strategy (ทำอะไร เพราะอะไร)
3. Tactics (3-5 ข้อ ทำได้จริงสัปดาห์นี้)
4. KPI ที่ต้องวัด

กฎ: ตอบภาษาไทย ≤800 คำ, ห้ามคัดลอกแบรนด์ใครโดยตรง, เสนอเป็น "แรงบันดาลใจ" เสมอ'),

('creative_strategist','Creative Strategist','ผู้กำกับศิลป์และนักเล่าเรื่อง','Creative','🎨','#FF6B00','google/gemini-2.5-pro',0.85,3,
 ARRAY['storytelling','mood-and-tone','art-direction','concept-development','visual-language'],
 '{"can_generate_moodboards":true}'::jsonb,
'คุณคือ "Creative Strategist" ของ So1o — Senior Art Director ระดับ Awwwards
บุคลิก: คิดนอกกรอบ แต่มีเหตุผลทางธุรกิจรองรับเสมอ

ความเชี่ยวชาญ:
- แปลโจทย์ธุรกิจเป็น Visual Concept ที่จับใจ
- ทฤษฎีสี (Color Theory, WCAG Contrast)
- Font Pairing + Typography Hierarchy
- ยุคสมัยศิลปะ (Bauhaus, Swiss, Cyberpunk, Y2K, Neo-Brutalism)
- Mood & Tone, Key Visual, Storyboarding

รูปแบบการตอบ:
- เสนอ Concept อย่างน้อย 2-3 ทาง แต่ละทางมี: ชื่อ Concept / Mood Keyword / Color Palette (3-5 hex) / Font แนะนำ / Reference Style
- ปิดท้ายด้วยคำแนะนำว่าทางไหนเหมาะกับโจทย์ที่สุด เพราะอะไร

กฎ: ภาษาไทย ≤800 คำ, แนะนำ "แรงบันดาลใจ" ไม่ใช่การคัดลอก, ระบุว่าสี/ฟอนต์เป็น "ตัวเลือกใกล้เคียง" — ให้บอสทดสอบจริงก่อน'),

('copywriter','AI Copywriter','นักเขียนคอนเทนต์และแคปชั่น','Marketing','✍️','#FF6B00','google/gemini-3-flash-preview',0.8,4,
 ARRAY['copywriting','aida','pas','social-media','script-writing','seo-content'],
 '{}'::jsonb,
'คุณคือ "So1o Copywriter" — นักเขียนสำหรับฟรีแลนซ์ไทย เชี่ยวชาญแคปชั่นที่ขายได้

ความเชี่ยวชาญ:
- สูตร AIDA (Attention, Interest, Desire, Action)
- สูตร PAS (Problem, Agitate, Solution)
- Hook ใน 3 วินาทีแรก (สำหรับ TikTok/Reels)
- SEO Content (Title <60 ตัว, Meta <160 ตัว)
- Hashtag ไทยที่เวิร์ค (#ฟรีแลนซ์ #รับออกแบบ ฯลฯ)

รูปแบบการตอบ:
- ถ้าผู้ใช้ขอแคปชั่น ให้ส่ง 3 เวอร์ชั่น: สั้น/กลาง/ยาว
- ใส่ Hook, Body, CTA, Hashtag แยกชัดเจน
- บอกว่าเหมาะกับแพลตฟอร์มไหน (FB/IG/TikTok/X)

กฎ: ภาษาไทยกระชับ ≤800 คำ, ห้ามใช้คำดูถูกคู่แข่ง, เลี่ยงคำที่อาจติด AI Detection ของแพลตฟอร์ม'),

('legal','The Guardian','ผู้พิทักษ์ทางกฎหมายของฟรีแลนซ์','Legal','⚖️','#FF6B00','openai/gpt-5.4',0.4,5,
 ARRAY['contract-drafting','contract-review','copyright','usage-rights','dispute-resolution'],
 '{"can_draft_contracts":true,"can_review_quotations":true}'::jsonb,
'คุณคือ "The Guardian" — นักกฎหมายที่อยู่ข้างฟรีแลนซ์เสมอ เชี่ยวชาญกฎหมายไทยและสากลด้านงานสร้างสรรค์
บุคลิก: ละมุนละม่อม แต่เฉียบขาด ปกป้องผลประโยชน์บอสและสร้างสัญญาที่เป็นธรรมทั้งสองฝ่าย

ความเชี่ยวชาญ:
- ร่าง/ตรวจสัญญารับจ้างทำของ (Service Agreement, MSA, SOW)
- ลิขสิทธิ์งานสร้างสรรค์ (Copyright Act พ.ศ. 2537)
- Usage Rights (Exclusive/Non-Exclusive, Territory, Term, Media)
- ข้อกำหนดการแก้ไขงาน (Revision Cap), Late Fee, Cancellation Fee
- ภาษีหัก ณ ที่จ่าย 3% และใบ 50 ทวิ
- การทวงเงินอย่างถูกกฎหมาย (พ.ร.บ.การทวงถามหนี้)

รูปแบบการตอบ:
1. ประเด็นความเสี่ยง (Risk Points)
2. ข้อความที่แนะนำให้ใส่ในสัญญา (Recommended Clauses)
3. คำเตือนสำคัญ

ปิดท้ายเสมอว่า: "นี่เป็นคำแนะนำเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมายอย่างเป็นทางการ กรณีพิพาทสำคัญแนะนำปรึกษาทนายความที่ขึ้นทะเบียนนะครับ"

กฎ: ภาษาไทย ≤800 คำ, ห้ามแนะนำการเลี่ยงภาษีหรือกระทำผิดกฎหมาย'),

('cfo','CFO','Chief Financial Officer','Finance','💰','#FF6B00','google/gemini-2.5-flash',0.3,6,
 ARRAY['roi-analysis','cash-flow','tax-planning','pricing','budget-control','token-economics'],
 '{"can_read_invoices":true,"can_read_quotations":true,"can_track_ai_cost":true}'::jsonb,
'คุณคือ "So1o CFO" — ผู้คุมงบประมาณและที่ปรึกษาการเงินสำหรับฟรีแลนซ์ไทย
บุคลิก: ตรงไปตรงมา ตัวเลขนำ แต่ใจดีกับบอส

ความเชี่ยวชาญ:
- คำนวณ ROI ต่อโปรเจกต์ (รายได้ vs เวลา+ต้นทุน AI)
- Cash Flow Management (Deposit 30-50%, Net 7/15/30)
- ภาษีฟรีแลนซ์ไทย: หัก ณ ที่จ่าย 3%, ภงด.90/94, VAT 7% (ถ้ารายได้ >1.8 ล้าน/ปี)
- ค่าใช้จ่ายที่หักได้ (40% หรือตามจริง)
- Token Budget — เตือนเมื่อใช้ AI credit ใกล้หมด
- คำนวณราคาแบบ Cost + Value: (วันทำงาน × 8 × Rate 250-350) + 10-50% ตามความยาก/ด่วน

รูปแบบการตอบ:
- ตัวเลขชัดเจน เป็นตารางถ้าจำเป็น
- เสนอ 3 ตัวเลือก (ประหยัด/มาตรฐาน/พรีเมียม) เมื่อเป็นเรื่องราคา
- เตือนความเสี่ยงทางการเงิน

ปิดท้ายเสมอว่า: "นี่เป็นการคำนวณเบื้องต้น โปรดพิจารณาหน้างานจริงและปรึกษานักบัญชีอีกครั้งนะครับ"
กฎ: ภาษาไทย ≤800 คำ, ใช้บาท (฿) เสมอ'),

('cto','CTO','Chief Technology Officer','Engineering','⚙️','#FF6B00','openai/gpt-5.4',0.4,7,
 ARRAY['code-audit','security','performance','architecture','frontend','supabase'],
 '{"can_audit_code":true}'::jsonb,
'คุณคือ "So1o CTO" — สถาปนิกเทคโนโลยีของระบบ So1o
บุคลิก: เนี้ยบ ตรงประเด็น ให้ความสำคัญกับความปลอดภัยและประสบการณ์ผู้ใช้

ความเชี่ยวชาญ:
- TanStack Start, React 19, TypeScript strict, Tailwind v4
- Supabase (RLS, Edge Functions, Realtime, Storage)
- Performance: PageSpeed Desktop >90, Mobile >70
- Security: RLS policies, SECURITY DEFINER, UUID tokens สำหรับ public pages
- Code Review: หา bug, code smell, type safety, dead code
- Mobile-first responsive design

รูปแบบการตอบ:
1. สิ่งที่ทำได้ดีแล้ว (Strengths)
2. สิ่งที่ควรแก้ไข (พร้อมโค้ดตัวอย่างถ้าจำเป็น)
3. คำแนะนำ Next Step

กฎ: ตอบภาษาไทย (term เทคนิคเป็นอังกฤษได้), ≤800 คำ, ตัวอย่างโค้ดสั้นเสมอ, ห้ามแนะนำให้ใช้ DROP/TRUNCATE บนตารางที่มีข้อมูลผู้ใช้'),

('ops','Operations Manager','ผู้จัดการคิวงานและกำหนดส่ง','Operations','📋','#FF6B00','google/gemini-2.5-flash-lite',0.5,8,
 ARRAY['task-management','scheduling','deadline-tracking','workflow-design','client-communication'],
 '{"can_read_jobs":true,"can_send_reminders":true}'::jsonb,
'คุณคือ "So1o Ops" — ผู้จัดการการทำงานประจำวันของบอส
บุคลิก: เป็นระเบียบ ใจเย็น เหมือนเลขาส่วนตัวมืออาชีพ

ความเชี่ยวชาญ:
- จัดลำดับความสำคัญด้วย Eisenhower Matrix (Urgent×Important)
- วาง Timeline แบบ Reverse Engineering จาก Deadline
- ออกแบบ Workflow แบบ Kanban / Scrum สำหรับฟรีแลนซ์เดี่ยว
- เตือนเมื่อมีงานหลายโปรเจกต์ทับซ้อนกัน
- ร่างข้อความสุภาพเพื่อขอเลื่อนเดดไลน์ / ส่งงานอัพเดต

รูปแบบการตอบ:
- Checklist ที่กดทำได้เลย
- ตารางเวลาแบบรายวัน/รายสัปดาห์
- เน้นจำกัด WIP (Work In Progress) ไม่เกิน 3 งานพร้อมกัน

กฎ: ภาษาไทยกระชับ ≤800 คำ, ทุกงานต้องมี "Definition of Done" ชัดเจน'),

('hr_research','Research & Trend Analyst','นักวิเคราะห์เทรนด์และคู่แข่ง','Research','🔍','#FF6B00','google/gemini-2.5-pro',0.6,9,
 ARRAY['trend-analysis','competitor-research','market-pricing','design-trends','consumer-insight'],
 '{"can_research_web":false}'::jsonb,
'คุณคือ "So1o Researcher" — นักวิเคราะห์เทรนด์ดีไซน์และตลาดฟรีแลนซ์ไทย
บุคลิก: ขี้สงสัย ละเอียด อ้างแหล่งเสมอเมื่อรู้

ความเชี่ยวชาญ:
- เทรนด์ดีไซน์ปัจจุบัน (Brutalism, Glassmorphism, 3D, AI-generated style)
- ราคาตลาดฟรีแลนซ์ไทย แยกตามประเภทงาน (Logo, Branding, UI/UX, Motion, Web)
- วิเคราะห์คู่แข่ง: จุดแข็ง/จุดอ่อน/ราคา/Positioning
- Consumer Insight ไทย (พฤติกรรม Gen Z, Millennial, SME)
- เทคโนโลยีและเครื่องมือใหม่ในวงการ

รูปแบบการตอบ:
1. Key Findings (3-5 ข้อ)
2. Implication สำหรับธุรกิจของบอส
3. Action ที่ควรทำ

กฎ: ภาษาไทย ≤800 คำ, ถ้าไม่แน่ใจในข้อมูลปัจจุบัน ให้บอกตรงๆ ว่า "ข้อมูลอาจไม่ใช่ล่าสุด ควรเช็คซ้ำ", ห้ามแต่งสถิติเอง'),

('ai_trainer','AI Trainer','ผู้เทรนพนักงาน AI ให้เก่งขึ้น','System','🧠','#FF6B00','google/gemini-2.5-flash',0.5,10,
 ARRAY['prompt-engineering','fine-tuning','conversation-analysis','knowledge-extraction'],
 '{"can_read_hq_messages":true,"can_propose_prompt_patch":true}'::jsonb,
'คุณคือ "AI Trainer" — ผู้พัฒนา DNA ของพนักงาน AI ทุกคนใน So1o HQ
บุคลิก: นักวิเคราะห์ผู้พัฒนาระบบ ใส่ใจรายละเอียดของภาษา

หน้าที่:
1. อ่านบทสนทนาที่ผ่านมาในระบบ (hq_messages + training_data)
2. หา Pattern ที่ผู้ใช้พึงพอใจ vs ไม่พึงพอใจ
3. เสนอ Patch ให้กับ system_prompt ของพนักงาน AI คนอื่น
4. สรุปองค์ความรู้เฉพาะของ So1o (Style Guide, Tone of Voice, ราคาตลาดล่าสุด) เพื่อ inject เข้า prompt

รูปแบบการตอบเมื่อเสนอ Patch:
- Agent ที่จะปรับ: [slug]
- ปัญหาที่พบ: …
- ข้อความที่จะเพิ่ม/แก้ใน system_prompt:
"""
…
"""
- เหตุผล + คาดการณ์ผลลัพธ์

กฎ: ภาษาไทย ≤800 คำ, ห้ามเสนอ patch ที่ขัดกับกฎความปลอดภัย/จริยธรรมของแต่ละ agent');


-- ── 20260523044300_1bed3ee5-0edd-42fb-8838-a24351930ee3.sql ──
-- AI interactions feedback (Like/Dislike on Mentor chat answers)
CREATE TABLE public.ai_interactions_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL DEFAULT 'mentor_chat',
  prompt TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  personality_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('liked','disliked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_feedback_user ON public.ai_interactions_feedback(user_id, created_at DESC);
CREATE INDEX idx_ai_feedback_status ON public.ai_interactions_feedback(status, created_at DESC);

ALTER TABLE public.ai_interactions_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON public.ai_interactions_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
ON public.ai_interactions_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
ON public.ai_interactions_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: mirror new feedback into ai_training_samples so it appears in the Training Queue
CREATE OR REPLACE FUNCTION public.feedback_to_training_sample()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_training_samples (
    user_id,
    feature,
    user_prompt,
    ai_response,
    user_rating,
    status,
    metadata,
    model
  ) VALUES (
    NEW.user_id,
    NEW.feature,
    NEW.prompt,
    NEW.ai_response,
    CASE WHEN NEW.status = 'liked' THEN 1 ELSE -1 END,
    'pending',
    jsonb_build_object(
      'source', 'ai_interactions_feedback',
      'feedback_id', NEW.id,
      'personality_settings', NEW.personality_settings
    ) || COALESCE(NEW.metadata, '{}'::jsonb),
    COALESCE(NEW.metadata->>'model', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feedback_to_training
AFTER INSERT ON public.ai_interactions_feedback
FOR EACH ROW
EXECUTE FUNCTION public.feedback_to_training_sample();

-- ── 20260523045457_1c9df851-0745-403d-b3a2-ea860f3d2283.sql ──
-- 1) Tighten job_tracker_step_comments INSERT: authenticated owners only
DROP POLICY IF EXISTS "Owners insert comments on their jobs" ON public.job_tracker_step_comments;
CREATE POLICY "Owners insert comments on their jobs"
  ON public.job_tracker_step_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.job_trackers j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- 2) Fix realtime job tracker topic authorization (full UUID extraction)
DROP POLICY IF EXISTS "realtime job tracker topics owner only" ON realtime.messages;
CREATE POLICY "realtime job tracker topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'track-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = substring(realtime.topic() FROM 7)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    WHEN realtime.topic() LIKE 'job-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = substring(realtime.topic() FROM 5)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    ELSE false
  END
);

-- 3) Fix realtime planner topic authorization (full UUID extraction)
DROP POLICY IF EXISTS "realtime planner topics owner only" ON realtime.messages;
CREATE POLICY "realtime planner topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'planner-approvals-%' THEN
      substring(realtime.topic() FROM 19) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    WHEN realtime.topic() LIKE 'planner-%' THEN
      substring(realtime.topic() FROM 9) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    ELSE false
  END
);

-- ── 20260524014850_86914ddc-0343-4826-9dae-8ffc69732ddf.sql ──
ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS quotation_id uuid;
ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation ON public.job_trackers(user_id, quotation_id) WHERE quotation_id IS NOT NULL;

-- ── 20260527034807_email_infra.sql ──
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase no longer grants public-schema access to service_role by default;
-- emit the grant explicitly so edge functions can reach the table via PostgREST.
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ── 20260527035214_email_infra.sql ──
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase no longer grants public-schema access to service_role by default;
-- emit the grant explicitly so edge functions can reach the table via PostgREST.
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ── 20260527041850_dc38a5c7-1f4e-4a95-aff6-bc9192b1d151.sql ──
-- 1. Drop unused tables from realtime publication (no client subscribes to these)
ALTER PUBLICATION supabase_realtime DROP TABLE public.typo_pairs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.spec_checklist_state;
ALTER PUBLICATION supabase_realtime DROP TABLE public.vision_canvases;
ALTER PUBLICATION supabase_realtime DROP TABLE public.vision_canvas_reactions;

-- 2. Add owner-scoped realtime policy for dashboard_* topics
-- Channel formats: dashboard_tasks_<uid>_*, dashboard_jobs_<uid>_*, dashboard_job_tasks_<uid>_*
CREATE POLICY "realtime dashboard topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'dashboard_job_tasks_%' THEN
      realtime.topic() LIKE ('dashboard_job_tasks_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    WHEN realtime.topic() LIKE 'dashboard_jobs_%' THEN
      realtime.topic() LIKE ('dashboard_jobs_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    WHEN realtime.topic() LIKE 'dashboard_tasks_%' THEN
      realtime.topic() LIKE ('dashboard_tasks_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    ELSE false
  END
);

-- 3. Set fixed search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public, pg_catalog;


-- ── 20260527051013_a8190e4e-dc78-4077-9158-52a92c7ca599.sql ──

-- Table for dashboard banner slides (admin-managed)
CREATE TABLE public.dashboard_banner_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dashboard_banner_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_banner_slides TO authenticated;
GRANT ALL ON public.dashboard_banner_slides TO service_role;

ALTER TABLE public.dashboard_banner_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dashboard slides"
  ON public.dashboard_banner_slides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert dashboard slides"
  ON public.dashboard_banner_slides FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dashboard slides"
  ON public.dashboard_banner_slides FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dashboard slides"
  ON public.dashboard_banner_slides FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_dashboard_banner_slides_updated_at
  BEFORE UPDATE ON public.dashboard_banner_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for dashboard banner images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-banners', 'dashboard-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Dashboard banner images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dashboard-banners');

CREATE POLICY "Admins can upload dashboard banner images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dashboard banner images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dashboard banner images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));


-- ── 20260527063254_f828180e-b6f0-4249-9230-39f18decaa17.sql ──

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_suppliers_share_token ON public.suppliers(share_token) WHERE share_token IS NOT NULL;

GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.supplier_links TO anon;

CREATE POLICY "Public can view shared suppliers"
  ON public.suppliers
  FOR SELECT
  TO anon
  USING (is_shared = true AND share_token IS NOT NULL);

CREATE POLICY "Public can view links of shared suppliers"
  ON public.supplier_links
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = supplier_links.supplier_id
      AND s.is_shared = true
      AND s.share_token IS NOT NULL
  ));


-- ── 20260527064731_b2c13032-2c34-4408-a3e5-0a55930c9e18.sql ──
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS map_url TEXT;

-- ── 20260527070302_598cf540-9ca6-4d0e-9de8-3870b6d406cc.sql ──
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS share_hidden_fields TEXT[] NOT NULL DEFAULT '{}';

-- ── 20260527072750_7b7505dd-1c20-41f3-9300-73d98831da40.sql ──
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

-- ── 20260527075110_c90cd942-2f01-42b7-b1f8-48035a9802fe.sql ──

-- Storage bucket for 50 ทวิ certificate files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wht-certificates', 'wht-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: owner-only access via folder = uid
CREATE POLICY "wht-certificates owner select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── 20260527080415_1463860f-bbc9-4867-8eca-96c6e7cd94d7.sql ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "expense-receipts owner select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "expense-receipts owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "expense-receipts owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "expense-receipts owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── 20260527083614_6031e0d0-5699-462b-a0a1-82462a00b147.sql ──

CREATE TABLE public.finance_tax_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'แผนภาษีของฉัน',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_tax_scenarios TO authenticated;
GRANT ALL ON public.finance_tax_scenarios TO service_role;

ALTER TABLE public.finance_tax_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tax scenarios"
ON public.finance_tax_scenarios FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tax scenarios"
ON public.finance_tax_scenarios FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tax scenarios"
ON public.finance_tax_scenarios FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tax scenarios"
ON public.finance_tax_scenarios FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_finance_tax_scenarios_user ON public.finance_tax_scenarios(user_id, updated_at DESC);

CREATE TRIGGER trg_finance_tax_scenarios_updated_at
BEFORE UPDATE ON public.finance_tax_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── 20260527085145_fb64a153-496d-4362-8a38-41b191a1893f.sql ──
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

-- ── 20260527090100_ea1e6539-aceb-4eb6-9cb2-042c3b7359b5.sql ──
ALTER TABLE public.feedback_jobs
  ADD COLUMN IF NOT EXISTS revision_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quotation_id UUID;

-- ── 20260527143832_a2b624c7-d34d-4448-84c1-665234fb98a3.sql ──

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(stripe_customer_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;


-- ── 20260527145930_d92c881b-ce3c-42d4-b734-b637c9764b01.sql ──
-- 1) profiles.subscription_tier + seats
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_seats integer NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_chk
    CHECK (subscription_tier IN ('free','pro','inhouse'));

-- 2) user_credits
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, environment)
);

GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credits"
  ON public.user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages credits"
  ON public.user_credits FOR ALL
  USING (auth.role() = 'service_role');

-- 3) payment_notifications (admin feed)
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  amount_cents integer,
  currency text,
  price_id text,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_created
  ON public.payment_notifications (created_at DESC);

GRANT SELECT ON public.payment_notifications TO authenticated;
GRANT ALL ON public.payment_notifications TO service_role;

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payment notifications"
  ON public.payment_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages payment notifications"
  ON public.payment_notifications FOR ALL
  USING (auth.role() = 'service_role');

-- 4) sync helper called by webhook (service-role-only context)
CREATE OR REPLACE FUNCTION public.sync_user_tier(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier text := 'free';
  new_seats integer := 1;
  sub record;
BEGIN
  SELECT price_id, status, current_period_end, environment
    INTO sub
    FROM public.subscriptions
   WHERE user_id = _user_id
     AND environment = 'live'
     AND (
       (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
       OR (status = 'canceled' AND current_period_end > now())
     )
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    -- try sandbox as fallback (preview testing)
    SELECT price_id, status, current_period_end, environment
      INTO sub
      FROM public.subscriptions
     WHERE user_id = _user_id
       AND environment = 'sandbox'
       AND (
         (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF FOUND THEN
    IF sub.price_id IN ('inhouse_monthly','inhouse_yearly') THEN
      new_tier := 'inhouse';
    ELSE
      new_tier := 'pro';
    END IF;
  END IF;

  UPDATE public.profiles
     SET subscription_tier = new_tier,
         subscription_seats = new_seats
   WHERE id = _user_id;
END;
$$;

-- 5) Backfill existing active subscribers
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.subscriptions WHERE status IN ('active','trialing','past_due')
  LOOP
    PERFORM public.sync_user_tier(r.user_id);
  END LOOP;
END $$;

-- ── 20260527152449_e3af7eee-72cb-4924-bd12-c769475f7949.sql ──
-- Tighten public slip-upload storage policy: require share_token in path
DROP POLICY IF EXISTS "Public upload slips into existing jobs" ON storage.objects;

CREATE POLICY "Public upload slips with valid share token"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'job-tracker'
  AND (storage.foldername(name))[1] = 'slips'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND (storage.foldername(name))[3] IS NOT NULL
  AND (
    -- Pattern A: slips/<job_id>/<share_token>/...
    EXISTS (
      SELECT 1 FROM public.job_trackers jt
      WHERE jt.id::text = (storage.foldername(name))[2]
        AND jt.share_token::text = (storage.foldername(name))[3]
    )
    -- Pattern B: slips/replace/<share_token>/... (used when replacing an existing slip)
    OR (
      (storage.foldername(name))[2] = 'replace'
      AND EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.share_token::text = (storage.foldername(name))[3]
      )
    )
  )
);

-- Restrict calculator usage events read to admins only (counts still flow via SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Anyone can view calculator usage" ON public.calculator_usage_events;

CREATE POLICY "Admins can view calculator usage"
ON public.calculator_usage_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ── 20260528053730_ece7c34f-b407-439c-82a9-6c4e2db2b167.sql ──
-- Remove admin's unrestricted SELECT on profiles (which exposed bank/tax/phone/address to any admin).
-- Admins keep access to non-sensitive identity columns via a dedicated safe view.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Safe admin view: excludes bank_account_number, bank_account_name, bank_name,
-- tax_id, phone, address, payment_qr_url, terms, social_link, logo_url.
CREATE OR REPLACE VIEW public.admin_profiles_safe
WITH (security_invoker = false) AS
SELECT
  id, user_id, email, display_name, brand_name, avatar_url, tagline,
  created_at, updated_at, last_active_at,
  is_active, deactivated_at, deactivated_by, purge_after, purged_at,
  tester_approved, tester_applied_at,
  onboarding_completed, onboarding_data, persona,
  freelance_field, archetype, archetype_secondary,
  subscription_tier, subscription_seats, currency
FROM public.profiles
WHERE public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.admin_profiles_safe TO authenticated;

COMMENT ON VIEW public.admin_profiles_safe IS
  'Admin-only view exposing non-sensitive profile columns. Sensitive fields (bank, tax_id, phone, address, payment QR) are intentionally omitted; admins must never bulk-read those across users. For per-user destructive ops, use server functions with supabaseAdmin.';

-- ── 20260528053804_ed258ae3-6ea2-4e63-8a9d-dbd816a90465.sql ──
-- Replace the SECURITY DEFINER-style view (flagged by the linter) with a
-- SECURITY DEFINER function that pins search_path and explicitly gates on admin role.

DROP VIEW IF EXISTS public.admin_profiles_safe;

CREATE OR REPLACE FUNCTION public.admin_list_profiles_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  brand_name text,
  avatar_url text,
  tagline text,
  created_at timestamptz,
  updated_at timestamptz,
  last_active_at timestamptz,
  is_active boolean,
  deactivated_at timestamptz,
  deactivated_by uuid,
  purge_after timestamptz,
  purged_at timestamptz,
  tester_approved boolean,
  tester_applied_at timestamptz,
  onboarding_completed boolean,
  onboarding_data jsonb,
  persona text,
  freelance_field text,
  archetype text,
  archetype_secondary text,
  subscription_tier text,
  subscription_seats integer,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.email, p.display_name, p.brand_name, p.avatar_url, p.tagline,
    p.created_at, p.updated_at, p.last_active_at,
    p.is_active, p.deactivated_at, p.deactivated_by, p.purge_after, p.purged_at,
    p.tester_approved, p.tester_applied_at,
    p.onboarding_completed, p.onboarding_data, p.persona,
    p.freelance_field, p.archetype, p.archetype_secondary,
    p.subscription_tier, p.subscription_seats, p.currency
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles_safe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_safe() TO authenticated;

COMMENT ON FUNCTION public.admin_list_profiles_safe() IS
  'Admin-only listing of profiles excluding sensitive fields (bank, tax_id, phone, address, payment QR, terms). Returns empty for non-admins.';

-- ── 20260528055121_db3c0db3-9f02-4f1b-9375-c4d115e12430.sql ──

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  usage_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Bangkok')::date),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, usage_date)
);

GRANT SELECT ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai usage daily"
  ON public.ai_usage_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON public.ai_usage_daily (user_id, usage_date);

-- Atomic check-and-increment. Returns jsonb {allowed, count, limit}.
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  _user_id uuid,
  _feature text,
  _limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  current_count integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', _limit, 'reason', 'unauthenticated');
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, feature, usage_date, count)
  VALUES (_user_id, _feature, today, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count INTO current_count
    FROM public.ai_usage_daily
   WHERE user_id = _user_id AND feature = _feature AND usage_date = today
   FOR UPDATE;

  IF current_count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', current_count, 'limit', _limit, 'reason', 'quota_exceeded');
  END IF;

  UPDATE public.ai_usage_daily
     SET count = count + 1, updated_at = now()
   WHERE user_id = _user_id AND feature = _feature AND usage_date = today;

  RETURN jsonb_build_object('allowed', true, 'count', current_count + 1, 'limit', _limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) TO authenticated, service_role;


-- ── 20260528090419_765707f7-0b86-41ea-8c9a-2ff37210a974.sql ──
-- Replace overly-permissive ALL policy with role-scoped one.
-- service_role bypasses RLS anyway, so this is mainly to silence the linter
-- and document intent clearly. We scope the policy TO service_role.
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

CREATE POLICY "Service role manages subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ── 20260528155240_61d3cca6-0414-4321-95d4-21232795ab8d.sql ──
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS timeline_enabled boolean NOT NULL DEFAULT true;

-- ── 20260604120001_fix_sync_user_tier_profile_key.sql ──
-- profiles use user_id (auth uid), not profiles.id, for tier sync
CREATE OR REPLACE FUNCTION public.sync_user_tier(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier text := 'free';
  new_seats integer := 1;
  sub record;
BEGIN
  SELECT price_id, status, current_period_end, environment
    INTO sub
    FROM public.subscriptions
   WHERE user_id = _user_id
     AND environment = 'live'
     AND (
       (status IN ('active', 'trialing', 'past_due')
         AND (current_period_end IS NULL OR current_period_end > now()))
       OR (status = 'canceled' AND current_period_end > now())
     )
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT price_id, status, current_period_end, environment
      INTO sub
      FROM public.subscriptions
     WHERE user_id = _user_id
       AND environment = 'sandbox'
       AND (
         (status IN ('active', 'trialing', 'past_due')
           AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF FOUND THEN
    IF sub.price_id IN ('inhouse_monthly', 'inhouse_yearly') THEN
      new_tier := 'inhouse';
    ELSE
      new_tier := 'pro';
    END IF;
  END IF;

  UPDATE public.profiles
     SET subscription_tier = new_tier,
         subscription_seats = new_seats
   WHERE user_id = _user_id;
END;
$$;


-- ── 20260604130000_quotations_deposit_due_date.sql ──
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS deposit_due_date DATE;


-- ── 20260604150000_support_tickets.sql ──
-- Support Tickets (Issue Tracking MVP)

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.format_ticket_number(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'TKT-' || lpad(n::text, 4, '0');
$$;

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  category TEXT NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug', 'improvement', 'question', 'other')),
  source TEXT NOT NULL DEFAULT 'support_hub'
    CHECK (source IN ('feedback_button', 'support_hub', 'admin_manual')),
  source_feature TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'qa', 'resolved', 'closed', 'wont_fix')),
  admin_note TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_support_tickets_number ON public.support_tickets(ticket_number);

CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);

CREATE TABLE public.ticket_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id UUID,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'status_change', 'priority_change', 'comment', 'note')),
  old_value TEXT,
  new_value TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_events_ticket ON public.ticket_events(ticket_id, created_at ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ticket_attachments TO authenticated;
GRANT SELECT, INSERT ON public.ticket_events TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.ticket_attachments TO service_role;
GRANT ALL ON public.ticket_events TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

-- Assign ticket number on insert
CREATE OR REPLACE FUNCTION public.assign_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR btrim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.format_ticket_number(nextval('public.support_ticket_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_support_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.assign_support_ticket_number();

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log ticket lifecycle events
CREATE OR REPLACE FUNCTION public.log_support_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, new_value, body)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.status, NEW.title);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_change', OLD.status, NEW.status);
    END IF;

    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'priority_change', OLD.priority, NEW.priority);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_support_ticket_changes
  AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_changes();

CREATE OR REPLACE FUNCTION public.set_support_ticket_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('closed', 'wont_fix') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    ELSIF NEW.status NOT IN ('closed', 'wont_fix') THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_support_ticket_closed_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_closed_at();

-- Notify ticket owner on status changes
CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'in_progress' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' กำลังได้รับการแก้ไข';
  ELSIF NEW.status = 'resolved' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' แก้ไขแล้ว — กำลังปล่อยอัปเดต';
  ELSIF NEW.status = 'closed' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' ปิดงานเรียบร้อยแล้ว';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (NEW.user_id, 'ticket', _msg, '/dashboard');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_ticket_status_change
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_status_change();

-- RLS: support_tickets
CREATE POLICY "Users view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own new tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'new')
  WITH CHECK (auth.uid() = user_id AND status = 'new');

CREATE POLICY "Admins manage all tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete tickets"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: ticket_attachments
CREATE POLICY "Users view own ticket attachments"
  ON public.ticket_attachments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own ticket attachments"
  ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins delete ticket attachments"
  ON public.ticket_attachments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: ticket_events
CREATE POLICY "Users view events on own tickets"
  ON public.ticket_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users comment on own open tickets"
  ON public.ticket_events FOR INSERT TO authenticated
  WITH CHECK (
    event_type = 'comment'
    AND actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.user_id = auth.uid()
        AND t.status NOT IN ('closed', 'wont_fix')
    )
  );

CREATE POLICY "Admins insert ticket events"
  ON public.ticket_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for ticket screenshots (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ticket-attachments owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "ticket-attachments owner or admin select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "ticket-attachments owner or admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );


-- ── 20260605100000_quotations_contract.sql ──
-- Contract fields on quotations (Phase 1.5)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false;


-- ── 20260605110000_shared_projects_phase2.sql ──
-- Phase 2: Shared Squad schema (feature-gated in app until enabled)
CREATE TABLE IF NOT EXISTS public.shared_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  pricing_model text NOT NULL DEFAULT 'pay_per_project'
    CHECK (pricing_model IN ('pay_per_project', 'monthly_squad')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  tax_split_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  guest_token text UNIQUE,
  guest_visible_columns text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  role text NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('host', 'collaborator', 'guest')),
  revenue_percent numeric(5,2) NOT NULL DEFAULT 0,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.project_members(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'review', 'done')),
  sort_order int NOT NULL DEFAULT 0,
  handover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_projects_host ON public.shared_projects(host_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);

ALTER TABLE public.shared_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_projects_host_select" ON public.shared_projects
  FOR SELECT USING (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_insert" ON public.shared_projects
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_update" ON public.shared_projects
  FOR UPDATE USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_delete" ON public.shared_projects
  FOR DELETE USING (auth.uid() = host_user_id);

CREATE POLICY "project_members_host_all" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_self_select" ON public.project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "project_tasks_member_access" ON public.project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  );


-- ── 20260605120000_pipeline_supabase_organization.sql ──
-- Pipeline / Contract / Shared Squad — schema organization (idempotent)
-- Domain: Business Pipeline (quotations ↔ job_trackers ↔ finance_incomes)

-- ── Quotations: contract e-sign metadata ─────────────────────────────────────
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_signer_ip text;

COMMENT ON COLUMN public.quotations.contract_signed_at IS 'Timestamp when contract was accepted (Phase 1.5)';
COMMENT ON COLUMN public.quotations.contract_accepted IS 'Freelancer confirmed client agreement on contract template';
COMMENT ON COLUMN public.quotations.contract_signer_ip IS 'Best-effort client IP at sign time (optional)';

CREATE INDEX IF NOT EXISTS idx_quotations_contract_accepted
  ON public.quotations (user_id, contract_accepted)
  WHERE contract_accepted = true;

CREATE INDEX IF NOT EXISTS idx_quotations_pipeline_status
  ON public.quotations (user_id, status, updated_at DESC)
  WHERE status NOT IN ('rejected', 'expired');

-- ── Job trackers: pipeline link index ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation_id
  ON public.job_trackers (quotation_id)
  WHERE quotation_id IS NOT NULL;

COMMENT ON COLUMN public.job_trackers.quotation_id IS 'Links to quotations.id — Pipeline deal card';

-- ── Finance incomes: pipeline link index ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_finance_incomes_source_quotation
  ON public.finance_incomes (source_quotation_id)
  WHERE source_quotation_id IS NOT NULL;

-- ── Shared Squad (Phase 2) — grants + updated_at triggers ────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_projects') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_projects TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
    GRANT ALL ON public.shared_projects TO service_role;
    GRANT ALL ON public.project_members TO service_role;
    GRANT ALL ON public.project_tasks TO service_role;

    DROP TRIGGER IF EXISTS trg_shared_projects_updated_at ON public.shared_projects;
    CREATE TRIGGER trg_shared_projects_updated_at
      BEFORE UPDATE ON public.shared_projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
    CREATE TRIGGER trg_project_tasks_updated_at
      BEFORE UPDATE ON public.project_tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    COMMENT ON TABLE public.shared_projects IS 'Phase 2: Ad-hoc freelance squad projects (feature-gated)';
    COMMENT ON TABLE public.project_members IS 'Collaborators + revenue split % for shared_projects';
    COMMENT ON TABLE public.project_tasks IS 'Team kanban tasks within shared_projects';
  END IF;
END $$;


-- ── 20260606120000_ecosystem_schemas.sql ──
-- Unified So1o + an1hem: schema namespaces on rvnzjiskqliexysicfmh
-- shared = identity/billing/wallet/chat | anthem = showcase/social | so1o = back-office

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS anthem;
CREATE SCHEMA IF NOT EXISTS so1o;

GRANT USAGE ON SCHEMA shared TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA anthem TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA so1o   TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON FUNCTIONS TO service_role;

COMMENT ON SCHEMA shared IS 'Cross-app: profiles (public), wallet, contracts, ecosystem notifications';
COMMENT ON SCHEMA anthem IS 'an1hem showcase: projects, studios, jobs, feed';
COMMENT ON SCHEMA so1o   IS 'So1o My Desk: finance, quotations, dashboard (tables migrate here over time)';


-- ── 20260606120100_profiles_unified_anthem_columns.sql ──
-- Extend So1o public.profiles with an1hem showcase fields (single identity row per user).
-- So1o keys profiles by user_id; an1hem app queries .eq('user_id', auth.uid()).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_hire boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_match boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_employment_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_studio_id uuid,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_seats integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_chk
      CHECK (account_status IN ('active', 'frozen', 'under_review'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_tier_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_tier_chk
      CHECK (subscription_tier IN ('free', 'pro', 'inhouse'));
  END IF;
END $$;

-- Public read for showcase (an1hem designers directory)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile by user_id" ON public.profiles;
CREATE POLICY "Users can update own profile by user_id"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN public.profiles.user_id IS 'Auth user id — canonical key for both So1o and an1hem';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'So1o Pro unlocks both My Desk and an1hem (ecosystem)';


-- ── 20260606120200_ecosystem_notifications.sql ──
-- Unified notification center (an1hem) alongside So1o legacy notifications.

-- So1o portfolio notifications → so1o schema (keep API path via view)
ALTER TABLE IF EXISTS public.notifications SET SCHEMA so1o;

CREATE OR REPLACE VIEW public.so1o_notifications
WITH (security_invoker = on) AS
  SELECT * FROM so1o.notifications;

GRANT SELECT, UPDATE, INSERT, DELETE ON public.so1o_notifications TO authenticated;
GRANT ALL ON public.so1o_notifications TO service_role;

-- Compatibility: Solo app still uses .from('notifications')
CREATE OR REPLACE VIEW public.notifications
WITH (security_invoker = on) AS
  SELECT * FROM so1o.notifications;

GRANT SELECT, UPDATE, INSERT, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Ecosystem notifications (both apps)
CREATE TABLE IF NOT EXISTS shared.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  app          text NOT NULL CHECK (app IN ('anthem', 'so1o', 'shared')),
  kind         text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL DEFAULT '',
  link         text NOT NULL DEFAULT '',
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read      boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON shared.notifications (user_id, is_read, created_at DESC)
  WHERE is_dismissed = false;

GRANT SELECT, UPDATE ON shared.notifications TO authenticated;
GRANT ALL ON shared.notifications TO service_role;

ALTER TABLE shared.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own notifications" ON shared.notifications;
CREATE POLICY "owner reads own notifications"
  ON shared.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner updates own notifications" ON shared.notifications;
CREATE POLICY "owner updates own notifications"
  ON shared.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE VIEW public.ecosystem_notifications
WITH (security_invoker = on) AS
  SELECT id, user_id, app, kind, title, body, link, metadata,
         is_read, is_dismissed, created_at
  FROM shared.notifications;

GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;

CREATE OR REPLACE FUNCTION shared.push_notification(
  _user_id uuid,
  _app text,
  _kind text,
  _title text,
  _body text DEFAULT '',
  _link text DEFAULT '',
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO shared.notifications(user_id, app, kind, title, body, link, metadata)
  VALUES (_user_id, _app, _kind, _title, COALESCE(_body, ''), COALESCE(_link, ''), COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION shared.push_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shared.push_notification(uuid, text, text, text, text, text, jsonb) TO service_role;


-- ── 20260606120300_anthem_bundle_readme.sql ──
-- an1hem domain tables (projects, studios, jobs, wallet, …) are NOT inlined here.
-- Apply the generated bundle once:
--
--   node scripts/bundle-anthem-for-unified.mjs
--   → supabase/manual/apply-anthem-ecosystem.sql
--
-- Run that file in Supabase SQL Editor after migrations 20260606120000–20260606120200,
-- or concatenate into your next db push batch.
--
SELECT 1;


-- ── 20260606140000_seed_anthem_catalog.sql ──
-- Seed real community catalog in Postgres (replaces client-side mock arrays).
-- Idempotent: fixed UUIDs + ON CONFLICT.

CREATE OR REPLACE FUNCTION public._catalog_demo_uid(i integer)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ('00000000-0000-0000-0000-00000000a0' || lpad(to_hex(i), 2, '0'))::uuid;
$$;

DO $seed$
DECLARE
  i int;
  uid uuid;
  sid uuid;
  cover text;
  names text[] := ARRAY[
    'ภัสวุฒิ ศรีวงค์','นภัสรา ทองดี','พิมพ์ชนก ใจดี','วรรณกร พันธ์ทอง','ธัญญา รัตนพร',
    'ฉัตรชัย วรกุล','อาทิตยา จันทร์เพ็ญ','พลอยไพลิน ขจร','ธนกร แสงทอง','อนุชา ภูมิดี',
    'ปาริชาต สวยงาม','เจษฎา ท่องเที่ยว','สุพัตรา โมชั่น','วทัญญู เสียงดี','กฤษณา เมโลดี้',
    'ศิริพร เงินงาม','กิตติพงษ์ ดิจิทัล','มนัสนันท์ อาร์ต','ณัฐวุฒิ ภาพถ่าย','ภัทรานิษฐ์ คอนเทนต์'
  ];
  usernames text[] := ARRAY[
    'phatsawut','napatsara','pimchanok','wannakorn','thanya','chatchai','atittaya','ploypailin',
    'thanakorn','anucha','parichat','jessada','supatra','wathanyu','kritsana','siriporn',
    'kittipong','manatsanan','nattawut','phattranit'
  ];
  roles text[] := ARRAY[
    'Brand & Logo Designer','Brand Identity Designer','Illustrator','Pattern & Textile Designer',
    'Ceramic Artist','Web & Poster Designer','UX/UI Designer','Content Creator','IG Content & Photo',
    'Product Photographer','Wedding Photographer','Video Editor','Motion Designer','Sound Designer',
    'Music Producer','Jewelry Designer','Web Developer & UI','Digital Illustrator',
    'Street Photographer','Content Strategist'
  ];
  bios text[] := ARRAY[
    'ออกแบบโลโก้ & แบรนด์ดิ้งสไตล์มินิมอล','สร้างแบรนด์ขนมไทยและร้านคาเฟ่','ภาพประกอบเด็ก & Pop Art',
    'ลายผ้าไทยสไตล์โมเดิร์น','เซรามิกแฮนด์เมด Earth Tone','เว็บไซต์ร้านอาหาร & โปสเตอร์หนัง',
    'ออกแบบแอป & เว็บโรงแรม Boutique','TikTok สายอาหารเหนือ','รีวิวคาเฟ่สไตล์มินิมอล',
    'ถ่ายสินค้า OTOP & ผ้าทอ','พรีเวดดิ้งสไตล์มินิมอล','ตัดต่อ Vlog ท่องเที่ยว',
    'Motion Graphic อธิบายสินค้า','Sound Design พอดแคสต์','เพลงประกอบโฆษณา',
    'เครื่องประดับเงินแฮนด์เมด','Landing page & E-commerce','ภาพประกอบดิจิทัล & สติกเกอร์',
    'ภาพสตรีท กรุงเทพ & ต่างจังหวัด','วางแผนคอนเทนต์แบรนด์'
  ];
  proj_titles text[] := ARRAY[
    'โลโก้ร้านกาแฟเชียงใหม่ Doi Brew','แบรนด์ดิ้งร้านขนมไทย แม่ละมุน','ภาพประกอบหนังสือเด็ก ช้างน้อยกับดวงดาว',
    'Pattern ผ้าขาวม้าโมเดิร์น','เซรามิกสไตล์มินิมอล Earth Tone','เว็บไซต์ร้านอาหารอีสาน ส้มตำลำซิ่ง',
    'UI App จองคิวสปา Thai Wellness','Landing Page คอร์สเรียนทำขนม','คอนเทนต์ TikTok สายอาหารเหนือ',
    'รีวิวคาเฟ่สไตล์ minimal บน IG','ถ่ายภาพสินค้า OTOP ผ้าทอภาคเหนือ','พรีเวดดิ้งสไตล์มินิมอลเชียงราย',
    'ตัดต่อ Vlog ท่องเที่ยวภาคใต้','Motion Graphic อธิบายสินค้า','Sound Design พอดแคสต์ไทย คุยเรื่องผี',
    'เพลงประกอบโฆษณาแบรนด์ไทย','Mascot น้องหมูเด้ง Pop Art','เครื่องประดับเงินแฮนด์เมด',
    'โปสเตอร์เทศกาลภาพยนตร์อิสระ','เว็บไซต์โรงแรม Boutique หัวหิน'
  ];
  proj_cats text[] := ARRAY[
    'Graphic','Graphic','Illustration','Craft','Craft','Web/UI','Web/UI','Web/UI','Content','Content',
    'Photography','Photography','Video','Video','Music/Audio','Music/Audio','Illustration','Craft','Graphic','Web/UI'
  ];
  proj_prices int[] := ARRAY[3500,8000,12000,6500,4800,18000,22000,9500,3200,2500,7500,15000,8000,12500,4000,18000,9000,2800,5500,35000];
  studio_names text[] := ARRAY[
    'Doi Studio','Lotus Lab','Mango Pixel','Inkwell Co.','Frame & Field',
    'Sundaze Crafts','Soundwave Bangkok','Pixel Garden','Yim Studio','Talay Creative'
  ];
  studio_slugs text[] := ARRAY[
    'doi-studio','lotus-lab','mango-pixel','inkwell-co','frame-field',
    'sundaze-crafts','soundwave-bkk','pixel-garden','yim-studio','talay-creative'
  ];
  demo_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'projects'
  ) THEN
    RAISE NOTICE 'seed-catalog: skip — apply supabase/manual/apply-anthem-ecosystem.sql first';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- public.profiles.user_id → auth.users(id); create demo auth rows first (SQL Editor / postgres only).
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    demo_email := usernames[i + 1] || '@demo.an1hem.app';

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      demo_email,
      crypt('an1hem-demo-seed', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', names[i + 1], 'username', usernames[i + 1]),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      uid,
      uid,
      jsonb_build_object('sub', uid::text, 'email', demo_email),
      'email',
      uid::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO public.profiles (user_id, display_name, username, email, role, bio, skills, location, avatar_url)
    VALUES (
      uid,
      names[i + 1],
      usernames[i + 1],
      usernames[i + 1] || '@demo.an1hem.app',
      roles[i + 1],
      bios[i + 1],
      CASE i
        WHEN 0 THEN ARRAY['Logo','Branding','Illustrator']
        WHEN 1 THEN ARRAY['Branding','Packaging','Figma']
        WHEN 2 THEN ARRAY['Procreate','Illustration','Character']
        ELSE ARRAY['Design','Creative']
      END,
      CASE WHEN i % 3 = 0 THEN 'Bangkok' WHEN i % 3 = 1 THEN 'Chiang Mai' ELSE 'Phuket' END,
      'https://api.dicebear.com/7.x/shapes/svg?seed=' || usernames[i + 1] || '&backgroundColor=fff4e6,ffe8cc'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      bio = EXCLUDED.bio,
      skills = EXCLUDED.skills,
      location = EXCLUDED.location,
      avatar_url = EXCLUDED.avatar_url;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    cover := 'https://picsum.photos/seed/an1hem-proj-' || i::text || '/800/600';
    INSERT INTO anthem.projects (
      id, owner_id, title, category, cover_url, gallery_urls, tools, status, views, likes, price_thb, description
    ) VALUES (
      ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      proj_titles[i + 1],
      proj_cats[i + 1],
      cover,
      ARRAY[cover],
      CASE i
        WHEN 0 THEN ARRAY['Illustrator','Photoshop']
        WHEN 1 THEN ARRAY['Illustrator','Figma']
        WHEN 2 THEN ARRAY['Procreate','Photoshop']
        WHEN 3 THEN ARRAY['Illustrator','Procreate']
        WHEN 4 THEN ARRAY['Lightroom','Photoshop']
        WHEN 5 THEN ARRAY['Figma','Webflow']
        WHEN 6 THEN ARRAY['Figma','Notion']
        WHEN 7 THEN ARRAY['Figma','Webflow']
        WHEN 8 THEN ARRAY['Premiere','CapCut']
        WHEN 9 THEN ARRAY['Lightroom','Canva']
        WHEN 10 THEN ARRAY['Lightroom','Photoshop']
        WHEN 11 THEN ARRAY['Lightroom']
        WHEN 12 THEN ARRAY['Premiere','After Effects']
        WHEN 13 THEN ARRAY['After Effects','Illustrator']
        WHEN 14 THEN ARRAY['Audition','Logic Pro']
        WHEN 15 THEN ARRAY['Logic Pro','Ableton']
        WHEN 16 THEN ARRAY['Procreate','Illustrator']
        WHEN 17 THEN ARRAY['Lightroom']
        WHEN 18 THEN ARRAY['Photoshop','Illustrator']
        ELSE ARRAY['Figma','Webflow']
      END,
      'Published',
      120 + (i * 37) % 900,
      8 + (i * 11) % 120,
      proj_prices[i + 1],
      'ผลงานจากชุมชนครีเอทีฟไทย — โพสต์เพื่อแสดงใน an1hem'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 0..9 LOOP
    uid := public._catalog_demo_uid(i);
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO anthem.studios (
      id, slug, name, tagline, bio, avatar_url, cover_url, location, verified, created_by, member_count
    ) VALUES (
      sid,
      studio_slugs[i + 1],
      studio_names[i + 1],
      'สตูดิโอครีเอทีฟไทย',
      'ทีมดีไซน์และคราฟต์จากชุมชน an1hem',
      'https://api.dicebear.com/7.x/shapes/svg?seed=studio-' || studio_slugs[i + 1],
      'https://picsum.photos/seed/an1hem-studio-' || i::text || '/1200/400',
      CASE WHEN i % 2 = 0 THEN 'Bangkok' ELSE 'Chiang Mai' END,
      i % 3 = 0,
      uid,
      1
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO anthem.studio_members (studio_id, user_id, role)
    VALUES (sid, uid, 'owner'::public.studio_member_role)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR i IN 0..11 LOOP
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i % 10), 2, '0'))::uuid;
    uid := public._catalog_demo_uid(i % 10);
    INSERT INTO anthem.job_posts (
      id, studio_id, posted_by, title, role_category, description, skills,
      budget_min, budget_max, budget_type, location_type, location, status, post_type, poster_role, employment_type
    ) VALUES (
      ('00000000-0000-0000-0003-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      sid,
      uid,
      CASE i
        WHEN 0 THEN 'หา UI Designer ทำแอป Wellness'
        WHEN 1 THEN 'Graphic Designer ทำ Packaging ขนมไทย'
        WHEN 2 THEN 'Brand Designer สำหรับสตาร์ทอัป Fintech'
        WHEN 3 THEN 'Illustrator วาดภาพประกอบหนังสือเด็ก'
        WHEN 4 THEN 'Motion Designer ทำคลิปสินค้า 30 วินาที'
        WHEN 5 THEN 'Photographer ถ่าย Lookbook คอลเลกชันใหม่'
        WHEN 6 THEN 'Webflow Developer สร้าง Landing Page'
        WHEN 7 THEN 'Content Creator สาย TikTok อาหาร'
        WHEN 8 THEN 'Logo Designer สำหรับคลินิกใหม่'
        WHEN 9 THEN 'Wedding Photographer พรีเวดดิ้ง'
        WHEN 10 THEN 'Music Producer เพลง Jingle 10s'
        ELSE 'Senior Designer เข้าทำงานประจำ Studio'
      END,
      'Design',
      'ประกาศงานจากสตูดิโอในชุมชน an1hem',
      ARRAY['Figma','Branding'],
      15000 + i * 2000,
      28000 + i * 3500,
      'fixed',
      CASE WHEN i % 3 = 0 THEN 'remote'::public.job_location_type ELSE 'hybrid'::public.job_location_type END,
      'Bangkok',
      'open',
      'hiring',
      'studio',
      'project'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$seed$;

COMMENT ON FUNCTION public._catalog_demo_uid(integer) IS 'Internal: demo catalog user ids (seed migration only).';


-- ── 20260606150000_security_advisor_hardening.sql ──
-- Security Advisor hardening (rvnzjiskqliexysicfmh)
-- Fixes: function_search_path_mutable, anon EXECUTE on triggers/internal RPCs

-- ── 1. Pin search_path on support-ticket helpers ──
ALTER FUNCTION public.format_ticket_number(bigint) SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR btrim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.format_ticket_number(nextval('public.support_ticket_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_support_ticket_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('closed', 'wont_fix') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    ELSIF NEW.status NOT IN ('closed', 'wont_fix') THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Trigger / notify functions: not callable via PostgREST ──
REVOKE EXECUTE ON FUNCTION public.assign_support_ticket_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.format_ticket_number(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_support_ticket_closed_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_invoice_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_slip_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_support_ticket_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_invoice_late() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_slip_upload() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.feedback_to_training_sample() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_price_guide_history() FROM PUBLIC, anon, authenticated;

-- ── 3. Email queue: service_role / edge functions only ──
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- ── 4. Authenticated-only RPCs (revoke anon; keep authenticated for app) ──
REVOKE EXECUTE ON FUNCTION public.auto_update_invoice_statuses() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_tier(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.force_purge_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_article_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_article_view(text) TO service_role;

-- vector(1536) = pgvector type used by match_ai_knowledge
REVOKE EXECUTE ON FUNCTION public.match_ai_knowledge(vector, text, integer) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_data_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_device_breakdown(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_device_usage_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_subscriptions(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_calculator_usage_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;

-- Admin RPCs already gate on has_role(); revoke anon only
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles_safe() FROM PUBLIC, anon;

-- ── 5. Intentional public share-link RPCs (anon kept) ──
-- get_brief_by_token, confirm_brief_by_token, update_brief_by_token
-- get_planner_share_by_token, get_planner_posts_by_token, submit_post_approval
-- get_shared_supplier_by_token, get_public_profile
-- Security Advisor may still WARN — token validates access inside each function.


-- ── 20260606160000_oauth_profile_metadata.sql ──
-- Map Google/Apple user metadata into unified public.profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_name text;
  _avatar_url text;
  _username text;
BEGIN
  _display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  _avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  _username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  IF _username IS NULL AND NEW.email IS NOT NULL THEN
    _username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, avatar_url, username)
  VALUES (NEW.id, NEW.email, _display_name, COALESCE(_avatar_url, ''), _username)
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    avatar_url = CASE
      WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = ''
        THEN EXCLUDED.avatar_url
      ELSE public.profiles.avatar_url
    END,
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


-- ── 20260607120000_feedback_ticket_fields.sql ──
-- Link Give Feedback to support tickets + rating on ticket row

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS beta_feedback_id uuid REFERENCES public.beta_feedback(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_rating ON public.support_tickets(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_beta_fb ON public.support_tickets(beta_feedback_id) WHERE beta_feedback_id IS NOT NULL;


-- ── 20260607120100_ticket_feedback_notify.sql ──
-- Feedback-aware ticket status notifications

CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
  _url TEXT := '/dashboard';
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.source = 'feedback_button' THEN
    IF NEW.status = 'in_progress' THEN
      _msg := 'เราได้รับฟีดแบ็กของคุณแล้ว กำลังดำเนินการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'เราได้แก้ไขตามฟีดแบ็กของคุณแล้ว ขอบคุณที่ช่วยพัฒนา So1o';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋วฟีดแบ็กปิดงานแล้ว ขอบคุณที่ส่งความคิดเห็นมา';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.status = 'in_progress' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' กำลังได้รับการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' แก้ไขแล้ว — กำลังปล่อยอัปเดต';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' ปิดงานเรียบร้อยแล้ว';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (NEW.user_id, 'ticket', _msg, _url);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;


-- ── 20260607130000_admin_activity_feed.sql ──
-- Unified admin activity feed RPC

CREATE OR REPLACE FUNCTION public.get_admin_activity_feed(
  _days integer DEFAULT 7,
  _category text DEFAULT 'all',
  _limit integer DEFAULT 80
)
RETURNS TABLE (
  occurred_at timestamptz,
  category text,
  event_type text,
  title text,
  detail text,
  user_id uuid,
  ref_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(days => GREATEST(1, LEAST(_days, 90)));
  _lim integer := GREATEST(10, LEAST(_limit, 200));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      ual.created_at AS occurred_at,
      'user'::text AS category,
      ual.activity_type AS event_type,
      'เข้าใช้งาน'::text AS title,
      ual.activity_type AS detail,
      ual.user_id,
      ual.id::text AS ref_id
    FROM public.user_activity_logs ual
    WHERE ual.created_at >= _since

    UNION ALL

    SELECT
      fue.created_at,
      'user'::text,
      'feature_use',
      fue.feature,
      'ใช้ฟีเจอร์',
      fue.user_id,
      fue.id::text
    FROM public.feature_usage_events fue
    WHERE fue.created_at >= _since

    UNION ALL

    SELECT
      bf.created_at,
      'feedback'::text,
      'beta_feedback',
      bf.feature,
      LEFT(bf.message, 120),
      bf.user_id,
      bf.id::text
    FROM public.beta_feedback bf
    WHERE bf.created_at >= _since

    UNION ALL

    SELECT
      st.created_at,
      'feedback'::text,
      'ticket_created',
      st.ticket_number || ' — ' || st.title,
      COALESCE(st.source_feature, st.source),
      st.user_id,
      st.id::text
    FROM public.support_tickets st
    WHERE st.created_at >= _since

    UNION ALL

    SELECT
      te.created_at,
      'feedback'::text,
      te.event_type,
      'ตั๋ว ' || st.ticket_number,
      COALESCE(te.body, te.new_value, te.old_value),
      te.actor_id,
      te.id::text
    FROM public.ticket_events te
    JOIN public.support_tickets st ON st.id = te.ticket_id
    WHERE te.created_at >= _since
      AND te.event_type IN ('status_change', 'comment')

    UNION ALL

    SELECT
      cm.created_at,
      'user'::text,
      'chat_message',
      'แชท Support',
      LEFT(cm.body, 120),
      cm.user_id,
      cm.id::text
    FROM public.chat_messages cm
    WHERE cm.created_at >= _since

    UNION ALL

    SELECT
      q.created_at,
      'business'::text,
      'quotation',
      COALESCE(q.number, 'ใบเสนอราคา'),
      COALESCE(q.client_name, q.status),
      q.user_id,
      q.id::text
    FROM public.quotations q
    WHERE q.created_at >= _since

    UNION ALL

    SELECT
      pn.created_at,
      'system'::text,
      pn.event_type,
      'การชำระเงิน',
      pn.message,
      pn.user_id,
      pn.id::text
    FROM public.payment_notifications pn
    WHERE pn.created_at >= _since
  ) feed
  WHERE _category = 'all' OR feed.category = _category
  ORDER BY feed.occurred_at DESC
  LIMIT _lim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_activity_feed(integer, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ── 20260608120000_legal_desk.sql ──
-- So1o Legal Desk: usage rights, checklists, documents, license verify

CREATE TABLE IF NOT EXISTS public.legal_usage_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  label text,
  work_type text NOT NULL DEFAULT 'other'
    CHECK (work_type IN ('logo', 'photo', 'video', 'social', 'web', 'source', 'other')),
  license_type text NOT NULL DEFAULT 'non_exclusive'
    CHECK (license_type IN ('exclusive', 'non_exclusive')),
  channels text[] NOT NULL DEFAULT '{}',
  territory text NOT NULL DEFAULT 'thailand'
    CHECK (territory IN ('thailand', 'worldwide', 'custom')),
  territory_custom text,
  term text NOT NULL DEFAULT 'project'
    CHECK (term IN ('1y', 'perpetual', 'project')),
  transfer_on text NOT NULL DEFAULT 'full_payment'
    CHECK (transfer_on IN ('full_payment', 'deposit', 'never')),
  deliverables text[] NOT NULL DEFAULT '{}',
  revision_rounds int NOT NULL DEFAULT 2 CHECK (revision_rounds >= 0 AND revision_rounds <= 20),
  extra_revision_fee numeric(12,2),
  custom_clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_usage_rights_user ON public.legal_usage_rights(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_usage_rights_quote ON public.legal_usage_rights(quotation_id) WHERE quotation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_id text NOT NULL,
  checked_items text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checklist_id)
);

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  doc_type text NOT NULL DEFAULT 'contract_draft'
    CHECK (doc_type IN ('contract_draft', 'guardian_note', 'debt_reminder')),
  title text NOT NULL,
  body text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_user ON public.legal_documents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_license_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_license_tokens_quote ON public.legal_license_tokens(quotation_id);

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS usage_rights_id uuid REFERENCES public.legal_usage_rights(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS license_certificate_path text;

CREATE INDEX IF NOT EXISTS idx_quotations_usage_rights ON public.quotations(usage_rights_id) WHERE usage_rights_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_usage_rights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_checklist_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_license_tokens TO authenticated;
GRANT ALL ON public.legal_usage_rights TO service_role;
GRANT ALL ON public.legal_checklist_progress TO service_role;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.legal_license_tokens TO service_role;

ALTER TABLE public.legal_usage_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_license_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_usage_rights_owner" ON public.legal_usage_rights
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_checklist_owner" ON public.legal_checklist_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_documents_owner" ON public.legal_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_license_tokens_owner" ON public.legal_license_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "legal_license_tokens_public_read" ON public.legal_license_tokens
  FOR SELECT TO anon USING (expires_at IS NULL OR expires_at > now());

DROP TRIGGER IF EXISTS trg_legal_usage_rights_updated_at ON public.legal_usage_rights;
CREATE TRIGGER trg_legal_usage_rights_updated_at
  BEFORE UPDATE ON public.legal_usage_rights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_legal_documents_updated_at ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-certificates', 'legal-certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "legal-certificates owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "legal-certificates owner select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "legal-certificates owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'legal-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

NOTIFY pgrst, 'reload schema';


