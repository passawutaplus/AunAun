-- bundle

-- 20250617000000_stripe_client_payments.sql
-- Client job payments via Stripe Checkout (destination charge → freelancer Connect account).
-- Run after stripe-payments.sql on unified project rvnzjiskqliexysicfmh.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_client_payments_enabled boolean NOT NULL DEFAULT true;

-- Extend fulfillment kinds
ALTER TABLE public.stripe_checkout_fulfillments
  DROP CONSTRAINT IF EXISTS stripe_checkout_fulfillments_kind_check;

ALTER TABLE public.stripe_checkout_fulfillments
  ADD CONSTRAINT stripe_checkout_fulfillments_kind_check
  CHECK (kind IN ('credits', 'px', 'client_job'));

CREATE TABLE IF NOT EXISTS public.job_stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  freelancer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('deposit', 'final')),
  amount_thb numeric NOT NULL CHECK (amount_thb > 0),
  stripe_session_id text NOT NULL UNIQUE,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_stripe_payments_job_id_idx
  ON public.job_stripe_payments (job_id);

ALTER TABLE public.job_stripe_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_stripe_payments_owner_select ON public.job_stripe_payments;
CREATE POLICY job_stripe_payments_owner_select ON public.job_stripe_payments
  FOR SELECT TO authenticated
  USING (freelancer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.job_stripe_payments FROM anon;
GRANT SELECT ON TABLE public.job_stripe_payments TO authenticated;

CREATE OR REPLACE FUNCTION public.fulfill_client_job_payment_stripe(
  _stripe_session_id text,
  _job_id uuid,
  _freelancer_user_id uuid,
  _payment_type text,
  _amount_thb numeric,
  _environment text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.job_trackers%ROWTYPE;
  _deposit_amt numeric;
  _event_kind text;
  _event_title text;
BEGIN
  IF _payment_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TYPE';
  END IF;
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;
  IF _amount_thb IS NULL OR _amount_thb <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments
    WHERE stripe_session_id = _stripe_session_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  SELECT * INTO _job
  FROM public.job_trackers
  WHERE id = _job_id AND user_id = _freelancer_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND';
  END IF;

  _deposit_amt := round(_job.total_amount * (_job.deposit_percent::numeric / 100), 2);

  IF _payment_type = 'deposit' THEN
    IF _job.deposit_paid THEN
      RAISE EXCEPTION 'DEPOSIT_ALREADY_PAID';
    END IF;
    IF abs(_amount_thb - _deposit_amt) > 0.01 THEN
      RAISE EXCEPTION 'DEPOSIT_AMOUNT_MISMATCH';
    END IF;

    UPDATE public.job_trackers
    SET
      deposit_paid = true,
      status = CASE WHEN status = 'pending' THEN 'in-progress' ELSE status END,
      current_step = CASE WHEN current_step = 0 THEN 1 ELSE current_step END,
      progress_percent = CASE
        WHEN current_step = 0 THEN round((1::numeric / 5) * 100)
        ELSE progress_percent
      END,
      updated_at = now()
    WHERE id = _job_id;

    _event_kind := 'deposit_paid';
    _event_title := 'รับมัดจำผ่าน Stripe';
  ELSE
    IF NOT _job.deposit_paid THEN
      RAISE EXCEPTION 'DEPOSIT_REQUIRED_FIRST';
    END IF;
    IF _job.final_paid THEN
      RAISE EXCEPTION 'FINAL_ALREADY_PAID';
    END IF;
    IF _job.amount_due IS NULL OR _job.amount_due <= 0 THEN
      RAISE EXCEPTION 'NO_AMOUNT_DUE';
    END IF;
    IF abs(_amount_thb - _job.amount_due) > 0.01 THEN
      RAISE EXCEPTION 'FINAL_AMOUNT_MISMATCH';
    END IF;

    UPDATE public.job_trackers
    SET
      final_paid = true,
      amount_due = 0,
      status = CASE WHEN status IN ('pending', 'review', 'in-progress') THEN 'in-progress' ELSE status END,
      current_step = CASE WHEN current_step <= 3 THEN 4 ELSE current_step END,
      progress_percent = CASE
        WHEN current_step <= 3 THEN round((4::numeric / 5) * 100)
        ELSE progress_percent
      END,
      updated_at = now()
    WHERE id = _job_id;

    _event_kind := 'final_paid';
    _event_title := 'รับชำระยอดสุดท้ายผ่าน Stripe';
  END IF;

  INSERT INTO public.job_events (job_id, kind, title, note, amount)
  VALUES (
    _job_id,
    _event_kind,
    _event_title,
    'Stripe Checkout ' || _stripe_session_id,
    _amount_thb
  );

  INSERT INTO public.job_stripe_payments (
    job_id, freelancer_user_id, payment_type, amount_thb, stripe_session_id, environment
  ) VALUES (
    _job_id, _freelancer_user_id, _payment_type, _amount_thb, _stripe_session_id, _environment
  );

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id,
    _freelancer_user_id,
    'client_job',
    'client_job_' || _payment_type,
    1,
    _environment
  );

  RETURN jsonb_build_object(
    'ok', true,
    'payment_type', _payment_type,
    'job_id', _job_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_client_job_payment_stripe(text, uuid, uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_client_job_payment_stripe(text, uuid, uuid, text, numeric, text) TO service_role;


-- 20260427021942_976ba3e1-e73d-43d4-b692-d27a1f4b3a4e.sql
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

-- 20260427022011_596c8eb4-505d-4e39-8d5f-2381219fd9aa.sql
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

-- 20260427035429_dff35726-f103-4779-ad92-9afb5d856e43.sql
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

-- 20260427035451_e0d6d7e1-8de8-4536-88ca-37491a016b99.sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 20260427041310_54c5ba29-1183-400d-9814-298f2889d939.sql
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

-- 20260427060436_41f7f0fd-9782-49fd-8458-39e7d6d3ef85.sql
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

-- 20260427063716_a9ed7ceb-3d35-40d0-8db7-916b2fd64e02.sql
ALTER TABLE public.finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_category_check;

-- 20260427072630_ae0b8914-a662-4ab8-bf66-67b0ecec52c5.sql

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


-- 20260427114236_ef0b0133-570c-4506-bfb7-c302d329da9f.sql

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


-- 20260427114311_d24a90bf-dac8-4652-8e56-71980181fb00.sql

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


-- 20260427122135_54148929-5d3e-42b4-946f-d1a277b545ed.sql

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


-- 20260427122608_0b67823f-a99f-4bc9-b12f-23900311cbb9.sql

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


-- 20260428014119_a54a7c02-bf28-4475-8de2-6dfe58f8874f.sql
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

-- 20260430005444_4ebfaad3-c24d-4011-98f2-d556bbb77885.sql

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


-- 20260501041936_cf600d5d-d99e-4226-bcbe-e57de20e94c8.sql
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

-- 20260501043209_b25f8d26-edd4-4a60-a383-d70da3ac74e6.sql
ALTER TABLE public.tester_applications
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_line text,
  ALTER COLUMN contact_channel DROP NOT NULL,
  ALTER COLUMN contact_value DROP NOT NULL;

-- 20260501052447_8300d76d-6796-44d2-b398-a7af339dda1a.sql
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


-- 20260501071420_8df6e4f0-8588-46c8-a96a-68a837b21040.sql
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

-- 20260501071813_acea63c2-60fa-4968-a107-963c47f02ef5.sql
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

-- 20260501072107_5daa99b3-2c30-45a5-a535-d294375be4ab.sql

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


-- 20260501074333_abbb43a2-b930-48c6-a578-f737e9c9f023.sql
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

-- 20260501074820_a0cede17-34ba-4517-b049-dc477ee6fd31.sql
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

-- 20260501081411_5e4ab3c7-b698-46a6-bcea-c749ecd57d64.sql
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

-- 20260501090929_b0b070a3-1ff3-49af-ba72-362ab75f486c.sql
-- กันใบสมัคร Tester ซ้ำต่อ user_id (กัน race จาก double-tab/double-click)
-- ใช้ UNIQUE INDEX แทน UNIQUE CONSTRAINT เพื่อ idempotent (ใช้ IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS tester_applications_user_id_uidx
  ON public.tester_applications (user_id);

-- 20260502005156_e097517f-9868-454c-9ba4-8f192e05c79e.sql
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

-- 20260502011454_e6fe4bab-e82d-4ad9-bbb6-6ae1e63e2272.sql
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

-- 20260502012740_2d83cac9-750e-4f01-be47-c4093b393189.sql
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

-- 20260502014315_c6e80581-1d03-4b95-8075-f139c1ab0470.sql
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

-- 20260502014335_2af3fd8f-96b2-47c1-b610-36f05adb1965.sql
REVOKE ALL ON FUNCTION public.purge_old_storage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_storage() TO postgres, service_role;

-- 20260502020805_40d7620c-a354-4aec-8276-07cca2dda618.sql
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

-- 20260502021747_94db1dcc-ca15-4bf4-96f5-ab2edeb54397.sql

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


-- 20260502023231_612bffe2-7398-4b8f-9675-37b8128b87ec.sql
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

-- 20260502023258_80bdb01a-68fe-4bca-bab7-500822bdbd87.sql
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text) FROM PUBLIC, anon;

-- 20260502024243_6fa28f69-d083-4ff1-b8c6-ecf0668eb9d7.sql
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


-- 20260502025328_68d5ab97-78e4-4f90-a300-a3aab6a893c1.sql
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

-- 20260502030708_38aac6d4-c05f-4dbb-a5a6-9adcb3f79bdc.sql
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

-- 20260502090345_2c4ebb45-5ce0-4084-a933-05f17d283e6d.sql
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

-- 20260502104413_904325de-a2bb-4664-b5fc-c65f4169ae20.sql
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

-- 20260502110722_b305ed04-430b-479d-82b7-0bb49776dd3a.sql
-- Grant UPDATE on articles to authenticator/anon roles temporarily for bulk content refresh
GRANT UPDATE ON public.articles TO postgres, authenticator, anon, authenticated, service_role;

-- 20260502110751_c14b47d5-0a30-416e-bed6-a4e5b89601bb.sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT UPDATE ON public.articles TO sandbox_exec;
  END IF;
END $$;

-- 20260502110822_3353aa1e-f0fb-4eed-9104-3081b8bedda8.sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE UPDATE ON public.articles FROM sandbox_exec;
  END IF;
END $$;
REVOKE UPDATE ON public.articles FROM postgres, authenticator, anon, authenticated, service_role;

-- 20260503141127_6dc1c278-b657-4b45-8d0f-94e9e29a002a.sql
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

-- 20260503143225_496bf31b-1b33-45de-b485-8864d29f481f.sql

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


-- 20260503144526_d861e0d6-ab17-41f4-ab39-054504387be6.sql
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

-- 20260503150524_13fd22b6-3829-49d5-bdc8-fb0df3f286c4.sql

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


-- 20260503154735_f5e90f71-ee98-452b-8b9f-898ad9d69b3f.sql
ALTER TABLE public.job_slips
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '';

-- 20260503154834_d47afd04-7e73-406d-95bc-dac58a995788.sql
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

-- 20260504014931_b2ee33d9-1d5d-4f7b-88f3-12420f1baf74.sql

DROP POLICY IF EXISTS "Public can view job_trackers" ON public.job_trackers;
DROP POLICY IF EXISTS "Public can view job_events" ON public.job_events;
DROP POLICY IF EXISTS "Public can view job_milestones" ON public.job_milestones;
DROP POLICY IF EXISTS "Public can view job_slips" ON public.job_slips;
DROP POLICY IF EXISTS "Public can insert job_slips" ON public.job_slips;


-- 20260504015803_2c512b8a-8a5a-4ad2-9b2f-bd4590da7124.sql
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

-- 20260504020554_1e44c653-ceda-431f-afac-49e86fcf17b9.sql
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

-- 20260504020624_a4f2919f-232c-4121-92f6-753a463efa27.sql
REVOKE EXECUTE ON FUNCTION public._storage_path_from_url(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._delete_storage_object(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_portfolio_project_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_tracker_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_job_slip_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_article_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_chat_message_storage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_announcement_storage() FROM PUBLIC, anon, authenticated;

-- 20260504022509_87dda77e-fc88-4661-9c88-001766ccc8e9.sql
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

-- 20260504025353_6e3115b4-23fd-4b3f-9e3a-6d00bdafd855.sql

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


-- 20260506013236_90cec1c1-0a47-481e-bfdd-31b0babd79d8.sql

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


-- 20260508005154_5acdadca-19b7-473d-8dcb-8e9a3281c0e4.sql

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


-- 20260509000320_1c97bdb4-46ab-4875-be1f-dda31c85b479.sql

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


-- 20260510014123_16876819-27ef-4dcb-ae8e-1251ead42739.sql
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


-- 20260511003617_58871470-efd1-431d-94e4-1f3d29a7a9cf.sql

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


-- 20260511101922_b66d1949-bf0f-40d9-bd1f-a65204619b1f.sql

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


-- 20260511143457_65aff0c8-190f-4d60-a9bd-02a76f9684fd.sql
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_quotations_brief_id ON public.quotations(brief_id);

-- 20260511150129_dc7240a3-4389-417c-aab9-a2dcc0d1eaa3.sql

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


-- 20260511153738_8d288992-e2e9-4206-a744-6425c0f1b9a3.sql

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


-- 20260511160513_cf6964b8-fab9-45b4-aee7-dde50bdbf041.sql

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


-- 20260512040613_a6af63f7-72fc-4303-8042-38c07b5ea085.sql

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


-- 20260512045506_7acf26f5-2f5e-48dd-a962-59e04b5d477e.sql

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


-- 20260512064044_158d6559-66b1-4b04-afa2-9f0e408b7877.sql
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

-- 20260512071023_855ff03d-cb00-4de3-9ab8-c97c462829dd.sql
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

-- 20260512100638_385ea6e9-a2d1-445d-bbec-7c64a0ec62c6.sql
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

-- 20260512131454_dc54a7fe-5714-414a-9bd2-8bd8145e3d8e.sql

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


-- 20260512144148_b81d7bbc-fb69-4774-bc8f-e9b0d816c907.sql
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

-- 20260514015523_6c707efd-0c39-4b19-8439-9da51e59df55.sql

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


-- 20260515001053_8d56f736-05b1-473b-8206-a79fdc16bbc8.sql
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

-- 20260516134211_89e37b0d-6487-4e5f-b320-408e7666743a.sql
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


-- 20260521043342_7924d4de-75a5-42f1-bfc0-92f6489aa1bc.sql
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

-- 20260521044228_0d3e587b-393c-4b05-bcf7-c0c474ede22f.sql
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

-- 20260521045622_2db0fd48-b4e0-48de-a632-13ccb8162a72.sql

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


-- 20260521053103_37dce9b6-3c40-4f6a-99f7-338d059c2678.sql
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

-- 20260521053647_4e569216-4df7-4618-8d8d-5566c8f5948f.sql
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

-- 20260523023300_052376fe-4e41-41fb-a922-9b154702ef66.sql

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


-- 20260523042421_19c104fc-cabd-452d-a25f-d0f402bd60b1.sql

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


-- 20260523043235_0daf7ad4-eeb0-4379-bd63-e67f187e897f.sql

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


-- 20260523044300_1bed3ee5-0edd-42fb-8838-a24351930ee3.sql
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

-- 20260523045457_1c9df851-0745-403d-b3a2-ea860f3d2283.sql
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

-- 20260524014850_86914ddc-0343-4826-9dae-8ffc69732ddf.sql
ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS quotation_id uuid;
ALTER TABLE public.job_trackers ADD COLUMN IF NOT EXISTS brief_id uuid;
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation ON public.job_trackers(user_id, quotation_id) WHERE quotation_id IS NOT NULL;

-- 20260527034807_email_infra.sql
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


-- 20260527035214_email_infra.sql
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


-- 20260527041850_dc38a5c7-1f4e-4a95-aff6-bc9192b1d151.sql
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


-- 20260527051013_a8190e4e-dc78-4077-9158-52a92c7ca599.sql

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


-- 20260527063254_f828180e-b6f0-4249-9230-39f18decaa17.sql

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


-- 20260527064731_b2c13032-2c34-4408-a3e5-0a55930c9e18.sql
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS map_url TEXT;

-- 20260527070302_598cf540-9ca6-4d0e-9de8-3870b6d406cc.sql
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS share_hidden_fields TEXT[] NOT NULL DEFAULT '{}';

-- 20260527072750_7b7505dd-1c20-41f3-9300-73d98831da40.sql
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

-- 20260527075110_c90cd942-2f01-42b7-b1f8-48035a9802fe.sql

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


-- 20260527080415_1463860f-bbc9-4867-8eca-96c6e7cd94d7.sql
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

-- 20260527083614_6031e0d0-5699-462b-a0a1-82462a00b147.sql

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


-- 20260527085145_fb64a153-496d-4362-8a38-41b191a1893f.sql
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

-- 20260527090100_ea1e6539-aceb-4eb6-9cb2-042c3b7359b5.sql
ALTER TABLE public.feedback_jobs
  ADD COLUMN IF NOT EXISTS revision_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quotation_id UUID;

-- 20260527143832_a2b624c7-d34d-4448-84c1-665234fb98a3.sql

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


-- 20260527145930_d92c881b-ce3c-42d4-b734-b637c9764b01.sql
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

-- 20260527152449_e3af7eee-72cb-4924-bd12-c769475f7949.sql
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

-- 20260528053730_ece7c34f-b407-439c-82a9-6c4e2db2b167.sql
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

-- 20260528053804_ed258ae3-6ea2-4e63-8a9d-dbd816a90465.sql
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

-- 20260528055121_db3c0db3-9f02-4f1b-9375-c4d115e12430.sql

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


-- 20260528090419_765707f7-0b86-41ea-8c9a-2ff37210a974.sql
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

-- 20260528155240_61d3cca6-0414-4321-95d4-21232795ab8d.sql
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS timeline_enabled boolean NOT NULL DEFAULT true;

-- 20260604120001_fix_sync_user_tier_profile_key.sql
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


-- 20260604130000_quotations_deposit_due_date.sql
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS deposit_due_date DATE;


-- 20260604150000_support_tickets.sql
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


-- 20260605100000_quotations_contract.sql
-- Contract fields on quotations (Phase 1.5)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false;


-- 20260605110000_shared_projects_phase2.sql
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


-- 20260605120000_pipeline_supabase_organization.sql
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


-- 20260606120000_ecosystem_schemas.sql
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


-- 20260606120100_profiles_unified_anthem_columns.sql
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


-- 20260606120200_ecosystem_notifications.sql
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


-- 20260606120300_anthem_bundle_readme.sql
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


-- 20260606140000_seed_anthem_catalog.sql
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


-- 20260606150000_security_advisor_hardening.sql
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


-- 20260606160000_oauth_profile_metadata.sql
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


-- 20260607120000_feedback_ticket_fields.sql
-- Link Give Feedback to support tickets + rating on ticket row

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS beta_feedback_id uuid REFERENCES public.beta_feedback(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_rating ON public.support_tickets(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_beta_fb ON public.support_tickets(beta_feedback_id) WHERE beta_feedback_id IS NOT NULL;


-- 20260607120100_ticket_feedback_notify.sql
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


-- 20260607130000_admin_activity_feed.sql
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


-- 20260608120000_legal_desk.sql
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


-- 20260609120000_admin_business_rls.sql
-- Admin Mission Control: allow admins to SELECT cross-user business tables for KPI dashboards.

CREATE POLICY "Admins view all quotations"
  ON public.quotations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance incomes"
  ON public.finance_incomes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance expenses"
  ON public.finance_expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all finance subscriptions"
  ON public.finance_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all saved clients"
  ON public.saved_clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';


-- 20260609120000_ai_credits_system.sql
-- Unified AI credits: monthly included allowance per tier + purchased top-up balance.

-- Global tier monthly allowances
CREATE TABLE IF NOT EXISTS public.ai_tier_config (
  tier text PRIMARY KEY CHECK (tier IN ('free', 'pro', 'inhouse')),
  monthly_included integer NOT NULL CHECK (monthly_included > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_tier_config (tier, monthly_included) VALUES
  ('free', 80),
  ('pro', 800),
  ('inhouse', 2000)
ON CONFLICT (tier) DO NOTHING;

GRANT SELECT ON public.ai_tier_config TO authenticated, service_role;

-- Per-feature credit cost
CREATE TABLE IF NOT EXISTS public.ai_feature_costs (
  feature text PRIMARY KEY,
  cost integer NOT NULL CHECK (cost > 0),
  label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_assistant_mentor', 1, 'So1o Assistant'),
  ('ai_assistant_business', 3, 'So1o Assistant (ธุรกิจ)'),
  ('planner_ai_assist', 2, 'Content Planner AI'),
  ('color_mentor', 2, 'Color Mentor'),
  ('ai_price_suggest', 2, 'AI แนะนำราคา'),
  ('ai_design_chat', 1, 'AI Design Chat'),
  ('generate_contract', 5, 'สร้างสัญญา AI')
ON CONFLICT (feature) DO NOTHING;

GRANT SELECT ON public.ai_feature_costs TO authenticated, service_role;

-- Monthly included usage per user per billing/calendar period
CREATE TABLE IF NOT EXISTS public.user_ai_period (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  included_limit integer NOT NULL CHECK (included_limit > 0),
  included_used integer NOT NULL DEFAULT 0 CHECK (included_used >= 0),
  period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_period_user ON public.user_ai_period (user_id);

GRANT SELECT ON public.user_ai_period TO authenticated;
GRANT ALL ON public.user_ai_period TO service_role;

ALTER TABLE public.user_ai_period ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai period" ON public.user_ai_period;
CREATE POLICY "Users view own ai period"
  ON public.user_ai_period FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Audit ledger
CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  source text NOT NULL CHECK (source IN ('included', 'purchased', 'mixed')),
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
  ON public.ai_credit_ledger (user_id, created_at DESC);

GRANT SELECT ON public.ai_credit_ledger TO authenticated;
GRANT ALL ON public.ai_credit_ledger TO service_role;

ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai ledger" ON public.ai_credit_ledger;
CREATE POLICY "Users view own ai ledger"
  ON public.ai_credit_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Resolve user tier from profiles
CREATE OR REPLACE FUNCTION public._ai_user_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id),
    'free'
  );
$$;

-- Period key: calendar month (Bangkok) for free; subscription period end for paid tiers
CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_sub record;
  v_month text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 80; END IF;

  IF v_tier IN ('pro', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start
      INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC
     LIMIT 1;

    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := (
    (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
    AT TIME ZONE 'Asia/Bangkok'
  );
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

-- Read-only usage summary for UI
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  _user_id uuid,
  _environment text DEFAULT 'sandbox'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_included_used integer := 0;
  v_included_limit integer;
  v_purchased integer := 0;
  v_tier text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  SELECT included_used, included_limit
    INTO v_included_used, v_included_limit
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key;

  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment;

  v_purchased := COALESCE(v_purchased, 0);

  RETURN jsonb_build_object(
    'tier', v_tier,
    'period_key', v_period.period_key,
    'period_end', v_period.period_end,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_usage_summary(uuid, text) TO authenticated, service_role;

-- Atomic debit: included first, then purchased top-up
CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature text,
  _environment text DEFAULT 'sandbox',
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_cost integer;
  v_included_used integer := 0;
  v_included_limit integer;
  v_included_remaining integer;
  v_purchased integer := 0;
  v_from_included integer := 0;
  v_from_purchased integer := 0;
  v_prev jsonb;
  v_source text;
  v_has_credits_row boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true,
      'duplicate', true,
      'cost', cost,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev
    FROM public.ai_credit_ledger
   WHERE idempotency_key = _idempotency_key;

    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  SELECT included_used INTO v_included_used
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key
   FOR UPDATE;

  v_included_used := COALESCE(v_included_used, 0);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment
   FOR UPDATE;

  IF FOUND THEN
    v_has_credits_row := true;
    v_purchased := COALESCE(v_purchased, 0);
  ELSE
    v_purchased := 0;
  END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);

  IF v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'cost', v_cost,
      'included_used', v_included_used,
      'included_limit', v_included_limit,
      'included_remaining', v_included_remaining,
      'purchased_balance', v_purchased,
      'total_remaining', v_included_remaining + v_purchased
    );
  END IF;

  v_from_included := LEAST(v_cost, v_included_remaining);
  v_from_purchased := v_cost - v_from_included;

  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period
       SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
  END IF;

  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits
         SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
    END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF v_from_included > 0 AND v_from_purchased > 0 THEN
    v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN
    v_source := 'purchased';
  ELSE
    v_source := 'included';
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    _feature,
    v_cost,
    v_source,
    _idempotency_key,
    jsonb_build_object(
      'included_used_after', v_included_used,
      'included_limit', v_included_limit,
      'purchased_after', v_purchased,
      'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased,
      'environment', _environment
    )
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'cost', v_cost,
    'source', v_source,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_ai_credits(uuid, text, text, text) TO service_role;

-- Reset included usage on subscription renewal (called from Stripe webhook)
CREATE OR REPLACE FUNCTION public.reset_ai_period_on_renewal(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_period.included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO UPDATE
    SET included_used = 0,
        included_limit = EXCLUDED.included_limit,
        period_end = EXCLUDED.period_end,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_ai_period_on_renewal(uuid) TO service_role;


-- 20260609120100_ai_credits_null_fix.sql
-- Fix: SELECT INTO with no user_credits row nulls purchased balance in usage/debit RPCs.

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  _user_id uuid,
  _environment text DEFAULT 'sandbox'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_included_used integer := 0;
  v_included_limit integer;
  v_purchased integer := 0;
  v_tier text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  SELECT included_used, included_limit
    INTO v_included_used, v_included_limit
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key;

  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment;

  v_purchased := COALESCE(v_purchased, 0);

  RETURN jsonb_build_object(
    'tier', v_tier,
    'period_key', v_period.period_key,
    'period_end', v_period.period_end,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature text,
  _environment text DEFAULT 'sandbox',
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_cost integer;
  v_included_used integer := 0;
  v_included_limit integer;
  v_included_remaining integer;
  v_purchased integer := 0;
  v_from_included integer := 0;
  v_from_purchased integer := 0;
  v_prev jsonb;
  v_source text;
  v_has_credits_row boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true,
      'duplicate', true,
      'cost', cost,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev
    FROM public.ai_credit_ledger
   WHERE idempotency_key = _idempotency_key;

    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  SELECT included_used INTO v_included_used
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key
   FOR UPDATE;

  v_included_used := COALESCE(v_included_used, 0);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment
   FOR UPDATE;

  IF FOUND THEN
    v_has_credits_row := true;
    v_purchased := COALESCE(v_purchased, 0);
  ELSE
    v_purchased := 0;
  END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);

  IF v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'cost', v_cost,
      'included_used', v_included_used,
      'included_limit', v_included_limit,
      'included_remaining', v_included_remaining,
      'purchased_balance', v_purchased,
      'total_remaining', v_included_remaining + v_purchased
    );
  END IF;

  v_from_included := LEAST(v_cost, v_included_remaining);
  v_from_purchased := v_cost - v_from_included;

  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period
       SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
  END IF;

  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits
         SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
    END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF v_from_included > 0 AND v_from_purchased > 0 THEN
    v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN
    v_source := 'purchased';
  ELSE
    v_source := 'included';
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    _feature,
    v_cost,
    v_source,
    _idempotency_key,
    jsonb_build_object(
      'included_used_after', v_included_used,
      'included_limit', v_included_limit,
      'purchased_after', v_purchased,
      'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased,
      'environment', _environment
    )
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'cost', v_cost,
    'source', v_source,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;


-- 20260609140000_ai_chat_preset.sql
-- Per-preset chat history for So1o Assistant sidebar
ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS preset text NOT NULL DEFAULT 'mentor';

CREATE INDEX IF NOT EXISTS idx_aicm_user_preset
  ON public.ai_chat_messages(user_id, preset, created_at);

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_assistant_copy', 1, 'So1o Assistant (Copy)'),
  ('ai_assistant_legal', 2, 'So1o Assistant (Legal)')
ON CONFLICT (feature) DO NOTHING;


-- 20260609150000_free_daily_ai_trial.sql
-- Free tier: 5 AI credits per day for the first 15 days after signup (Bangkok calendar).

ALTER TABLE public.ai_tier_config DROP CONSTRAINT IF EXISTS ai_tier_config_monthly_included_check;
ALTER TABLE public.ai_tier_config ADD CONSTRAINT ai_tier_config_monthly_included_check CHECK (monthly_included >= 0);

ALTER TABLE public.user_ai_period DROP CONSTRAINT IF EXISTS user_ai_period_included_limit_check;
ALTER TABLE public.user_ai_period ADD CONSTRAINT user_ai_period_included_limit_check CHECK (included_limit >= 0);

UPDATE public.ai_tier_config SET monthly_included = 0, updated_at = now() WHERE tier = 'free';

CREATE OR REPLACE FUNCTION public._ai_free_trial_days_left(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup timestamptz;
  v_days integer;
BEGIN
  SELECT created_at INTO v_signup FROM public.profiles WHERE user_id = _user_id;
  IF v_signup IS NULL THEN
    SELECT created_at INTO v_signup FROM auth.users WHERE id = _user_id;
  END IF;
  IF v_signup IS NULL THEN RETURN 0; END IF;

  v_days := ((now() AT TIME ZONE 'Asia/Bangkok')::date - (v_signup AT TIME ZONE 'Asia/Bangkok')::date);
  RETURN GREATEST(0, 15 - v_days);
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_sub record;
  v_month text;
  v_today date;
  v_trial_days_left integer;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  IF v_tier IN ('pro', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start
      INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC
     LIMIT 1;

    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_trial_days_left(_user_id);
    v_today := (now() AT TIME ZONE 'Asia/Bangkok')::date;

    IF v_trial_days_left > 0 THEN
      period_key := 'free-day:' || to_char(v_today, 'YYYY-MM-DD');
      period_end := (v_today + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';
      included_limit := 5;
      RETURN NEXT;
      RETURN;
    END IF;

    period_key := 'free-expired:' || to_char(v_today, 'YYYY-MM');
    period_end := (
      (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
      AT TIME ZONE 'Asia/Bangkok'
    );
    included_limit := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := (
    (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
    AT TIME ZONE 'Asia/Bangkok'
  );
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  _user_id uuid,
  _environment text DEFAULT 'sandbox'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_included_used integer := 0;
  v_included_limit integer;
  v_purchased integer := 0;
  v_tier text;
  v_trial_days_left integer := 0;
  v_period_type text := 'monthly';
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_trial_days_left(_user_id);
    IF v_trial_days_left > 0 THEN
      v_period_type := 'free_daily_trial';
    ELSIF v_period.period_key LIKE 'free-expired:%' THEN
      v_period_type := 'free_trial_ended';
    END IF;
  ELSIF v_period.period_key LIKE 'sub:%' THEN
    v_period_type := 'subscription';
  END IF;

  SELECT included_used, included_limit
    INTO v_included_used, v_included_limit
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key;

  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment;

  v_purchased := COALESCE(v_purchased, 0);

  RETURN jsonb_build_object(
    'tier', v_tier,
    'period_key', v_period.period_key,
    'period_end', v_period.period_end,
    'period_type', v_period_type,
    'free_trial_days_left', v_trial_days_left,
    'daily_limit', CASE WHEN v_period_type = 'free_daily_trial' THEN 5 ELSE NULL END,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;


-- 20260609160000_ai_credit_weights_v2.sql
-- Rebalance AI credit weights (v2) — heavier business/vision/contract paths.
-- Gemini 2.0 retired 2026-06-01; app defaults now gemini-2.5-flash-lite / gemini-2.5-flash.

UPDATE public.ai_feature_costs
SET cost = 5, label = 'So1o Assistant (ธุรกิจ)', updated_at = now()
WHERE feature = 'ai_assistant_business';

UPDATE public.ai_feature_costs
SET cost = 8, label = 'สร้างสัญญา AI', updated_at = now()
WHERE feature = 'generate_contract';

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_brief_extract', 10, 'Smart Brief — Quick Capture'),
  ('ai_brief_from_images', 8, 'Smart Brief — วิเคราะห์รูป')
ON CONFLICT (feature) DO UPDATE
  SET cost = EXCLUDED.cost, label = EXCLUDED.label, updated_at = now();

-- Production mix analysis (run in SQL editor):
-- SELECT feature, COUNT(*) AS uses, SUM(cost) AS credits_spent
-- FROM public.ai_credit_ledger
-- WHERE created_at > now() - interval '90 days'
-- GROUP BY feature ORDER BY credits_spent DESC;


-- 20260609160000_fetch_daily_trends_cron.sql
-- Daily trends cron: fetches RSS + AI summary at 05:00 ICT (22:00 UTC)
--
-- POST-MIGRATION STEPS (project-specific — apply after deploy):
-- 1. Store service_role key in vault:
--    SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'cron_service_role_key');
-- 2. Store app URL in vault:
--    SELECT vault.create_secret('https://your-app.example.com', 'cron_app_url');
-- 3. Schedule the job (replace URL from vault):
--
-- DO $$
-- BEGIN
--   PERFORM cron.unschedule('fetch-daily-trends')
--     WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-daily-trends');
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;
--
-- SELECT cron.schedule(
--   'fetch-daily-trends',
--   '0 22 * * *',
--   $$
--   SELECT net.http_post(
--     url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_app_url')
--            || '/api/public/cron/fetch-daily-trends',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To revert: SELECT cron.unschedule('fetch-daily-trends');


-- 20260609160000_line_notifications.sql
-- LINE push notifications for Pro / Inhouse users (Messaging API queue + Hero portal events)

-- ---------------------------------------------------------------------------
-- 1) Profile columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'th',
  ADD COLUMN IF NOT EXISTS line_messaging_user_id text,
  ADD COLUMN IF NOT EXISTS line_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS line_notify_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS line_notify_prefs jsonb NOT NULL DEFAULT '{
    "portal_slip": true,
    "portal_tracker_comment": true,
    "portal_brief": true,
    "portal_planner": true,
    "portal_quotation": true,
    "support_ticket": false,
    "billing": false
  }'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_locale_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_locale_chk CHECK (locale IN ('th', 'en'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_line_messaging_user_id_uidx
  ON public.profiles (line_messaging_user_id)
  WHERE line_messaging_user_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.line_messaging_user_id IS 'LINE Messaging API userId (U…) after OA link; distinct from line_id display handle';
COMMENT ON COLUMN public.profiles.line_notify_prefs IS 'Per-kind LINE notification toggles; keys portal_* = customer Hero portals';

-- ---------------------------------------------------------------------------
-- 2) Link tokens (LIFF / manual link — Phase 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_link_tokens_user_idx ON public.line_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS line_link_tokens_expires_idx ON public.line_link_tokens(expires_at);

ALTER TABLE public.line_link_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.line_link_tokens TO authenticated;
GRANT ALL ON public.line_link_tokens TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Send log + state + pgmq queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  user_id uuid NOT NULL,
  line_user_id text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'dlq')),
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_send_log_created_idx ON public.line_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS line_send_log_user_idx ON public.line_send_log(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS line_send_log_message_id_uidx
  ON public.line_send_log(message_id);

GRANT ALL ON public.line_send_log TO service_role;

ALTER TABLE public.line_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages line send log"
    ON public.line_send_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.line_send_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until timestamptz,
  batch_size int NOT NULL DEFAULT 10,
  send_delay_ms int NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.line_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT ALL ON public.line_send_state TO service_role;

ALTER TABLE public.line_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role manages line send state"
    ON public.line_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN PERFORM pgmq.create('line_messages'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('line_messages_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4) Tier + message rendering + enqueue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_pro_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier IN ('pro', 'inhouse') FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_pro_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_tier(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.render_line_message(
  _kind text,
  _locale text,
  _params jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  loc text := CASE WHEN _locale = 'en' THEN 'en' ELSE 'th' END;
  t text;
BEGIN
  CASE _kind
    WHEN 'portal_slip' THEN
      IF loc = 'en' THEN
        t := 'Customer uploaded a payment slip for "' || COALESCE(_params->>'job_title', 'job') || '". Please review.';
      ELSE
        t := 'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(_params->>'job_title', '') || '" — กรุณาตรวจสอบ';
      END IF;
    WHEN 'portal_tracker_comment' THEN
      IF loc = 'en' THEN
        t := 'New comment on "' || COALESCE(_params->>'job_title', 'job') || '" (step ' || COALESCE(_params->>'step_index', '?') || ').';
      ELSE
        t := 'ลูกค้าคอมเมนต์ในงาน "' || COALESCE(_params->>'job_title', '') || '" (ขั้นตอน ' || COALESCE(_params->>'step_index', '?') || ')';
      END IF;
    WHEN 'portal_brief' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'client_name', 'Client') || ' confirmed brief "' || COALESCE(_params->>'brief_title', '') || '".';
      ELSE
        t := COALESCE(_params->>'client_name', 'ลูกค้า') || ' ยืนยันบรีฟ "' || COALESCE(_params->>'brief_title', '') || '" แล้ว ✓';
      END IF;
    WHEN 'portal_planner' THEN
      IF COALESCE(_params->>'status', '') = 'approved' THEN
        IF loc = 'en' THEN
          t := 'Client approved content: "' || COALESCE(_params->>'post_title', '') || '".';
        ELSE
          t := 'ลูกค้าอนุมัติคอนเทนต์ "' || COALESCE(_params->>'post_title', '') || '" แล้ว ✓';
        END IF;
      ELSE
        IF loc = 'en' THEN
          t := 'Client requested changes on "' || COALESCE(_params->>'post_title', '') || '".';
        ELSE
          t := 'ลูกค้าขอแก้ไขคอนเทนต์ "' || COALESCE(_params->>'post_title', '') || '"';
        END IF;
      END IF;
    WHEN 'portal_quotation' THEN
      IF loc = 'en' THEN
        t := 'Client updated quotation "' || COALESCE(_params->>'quotation_title', '') || '".';
      ELSE
        t := 'ลูกค้าอัปเดตใบเสนอราคา "' || COALESCE(_params->>'quotation_title', '') || '"';
      END IF;
    WHEN 'support_ticket' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'Support ticket updated.');
      ELSE
        t := COALESCE(_params->>'message', 'ตั๋วซัพพอร์ตมีอัปเดต');
      END IF;
    WHEN 'billing' THEN
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'Billing update on your So1o account.');
      ELSE
        t := COALESCE(_params->>'message', 'อัปเดตการชำระเงินบัญชี So1o ของคุณ');
      END IF;
    ELSE
      IF loc = 'en' THEN
        t := COALESCE(_params->>'message', 'New notification from So1o.');
      ELSE
        t := COALESCE(_params->>'message', 'แจ้งเตือนใหม่จาก So1o');
      END IF;
  END CASE;

  RETURN left(t, 4800);
END;
$$;

REVOKE ALL ON FUNCTION public.render_line_message(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.render_line_message(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_line_notification(
  _user_id uuid,
  _kind text,
  _params jsonb DEFAULT '{}'::jsonb,
  _link text DEFAULT '',
  _idempotency_key text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof record;
  msg_id text;
  body text;
  full_text text;
  payload jsonb;
  q_id bigint;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  IF NOT public.is_pro_tier(_user_id) THEN RETURN NULL; END IF;

  SELECT
    line_messaging_user_id,
    line_notify_enabled,
    line_notify_prefs,
    locale
  INTO prof
  FROM public.profiles
  WHERE user_id = _user_id;

  IF prof.line_messaging_user_id IS NULL OR prof.line_notify_enabled IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  IF COALESCE((prof.line_notify_prefs->>_kind)::boolean, false) IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  msg_id := COALESCE(
    NULLIF(btrim(_idempotency_key), ''),
    'line-' || gen_random_uuid()::text
  );

  IF EXISTS (
    SELECT 1 FROM public.line_send_log WHERE message_id = msg_id
  ) THEN
    RETURN NULL;
  END IF;

  body := public.render_line_message(_kind, COALESCE(prof.locale, 'th'), COALESCE(_params, '{}'::jsonb));
  full_text := body;
  IF _link IS NOT NULL AND btrim(_link) <> '' THEN
    full_text := body || E'\n\n' || 'https://solofreelancer.com' || _link;
  END IF;

  payload := jsonb_build_object(
    'message_id', msg_id,
    'user_id', _user_id,
    'line_user_id', prof.line_messaging_user_id,
    'kind', _kind,
    'text', full_text,
    'idempotency_key', msg_id
  );

  INSERT INTO public.line_send_log (
    message_id, user_id, line_user_id, kind, status, metadata
  ) VALUES (
    msg_id, _user_id, prof.line_messaging_user_id, _kind, 'pending',
    jsonb_build_object('link', _link, 'params', COALESCE(_params, '{}'::jsonb))
  )
  ON CONFLICT (message_id) DO NOTHING;

  SELECT public.enqueue_email('line_messages', payload) INTO q_id;
  RETURN q_id;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create('line_messages');
  SELECT public.enqueue_email('line_messages', payload) INTO q_id;
  RETURN q_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text) TO service_role;

-- Disable LINE master switch when subscription drops to free
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
         subscription_seats = new_seats,
         line_notify_enabled = CASE
           WHEN new_tier IN ('pro', 'inhouse') THEN line_notify_enabled
           ELSE false
         END
   WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_user_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_tier(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Hero portal event hooks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_slip_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  job_title text;
BEGIN
  SELECT user_id, title INTO owner_id, job_title
  FROM public.job_trackers WHERE id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_user_id, actor_name, type, message, url)
  VALUES
    (owner_id, NULL, 'ลูกค้า', 'slip_uploaded',
     'ลูกค้าอัปโหลดสลิปงาน "' || COALESCE(job_title, '') || '" — กรุณาตรวจสอบ',
     '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text);

  PERFORM public.enqueue_line_notification(
    owner_id,
    'portal_slip',
    jsonb_build_object('job_title', COALESCE(job_title, '')),
    '/dashboard?tab=finance&jobtracker=' || NEW.job_id::text,
    'line-slip-' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_slip_upload() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_client_step_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  job_title text;
  job_id uuid;
BEGIN
  IF NEW.author_role IS DISTINCT FROM 'client' THEN
    RETURN NEW;
  END IF;

  SELECT j.user_id, j.title, j.id
    INTO owner_id, job_title, job_id
    FROM public.job_trackers j
   WHERE j.id = NEW.job_id;

  IF owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (user_id, actor_name, type, message, url)
  VALUES
    (owner_id, 'ลูกค้า', 'tracker_comment',
     'ลูกค้าคอมเมนต์ในงาน "' || COALESCE(job_title, '') || '"',
     '/dashboard?tab=finance&jobtracker=' || job_id::text);

  PERFORM public.enqueue_line_notification(
    owner_id,
    'portal_tracker_comment',
    jsonb_build_object(
      'job_title', COALESCE(job_title, ''),
      'step_index', (NEW.step_index + 1)::text
    ),
    '/dashboard?tab=finance&jobtracker=' || job_id::text,
    'line-tracker-comment-' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_client_step_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_client_step_comment ON public.job_tracker_step_comments;
CREATE TRIGGER trg_notify_on_client_step_comment
  AFTER INSERT ON public.job_tracker_step_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_client_step_comment();

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

  PERFORM public.enqueue_line_notification(
    brief_owner,
    'portal_brief',
    jsonb_build_object(
      'client_name', btrim(_name),
      'brief_title', COALESCE(brief_title, '')
    ),
    '/dashboard?tab=planner&brief=' || brief_id::text,
    'line-brief-' || brief_id::text
  );

  RETURN TRUE;
END;
$$;

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
  msg text;
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

  IF _status = 'approved' THEN
    msg := 'ลูกค้าอนุมัติคอนเทนต์ "' || COALESCE(post.title, '') || '" แล้ว ✓';
  ELSE
    msg := 'ลูกค้าขอแก้ไขคอนเทนต์ "' || COALESCE(post.title, '') || '"';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (
    link.user_id,
    'planner_approval',
    msg,
    '/dashboard?tab=planner'
  );

  PERFORM public.enqueue_line_notification(
    link.user_id,
    'portal_planner',
    jsonb_build_object(
      'post_title', COALESCE(post.title, ''),
      'status', _status
    ),
    '/dashboard?tab=planner',
    'line-planner-' || _post_id::text || '-' || _status
  );
END;
$$;

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

  PERFORM public.enqueue_line_notification(
    NEW.user_id,
    'support_ticket',
    jsonb_build_object('message', _msg),
    _url,
    'line-ticket-' || NEW.id::text || '-' || NEW.status
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- POST-MIGRATION: store LINE_CHANNEL_ACCESS_TOKEN in Supabase
-- secrets; schedule pg_cron job 'process-line-queue' (every 60s)
-- calling edge function line-queue-process with service_role key
-- (mirror email queue setup).
-- ============================================================


-- 20260609161000_free_starter_credits.sql
-- Free tier: one-time 25 AI credits on signup (no daily reset).

UPDATE public.ai_tier_config SET monthly_included = 25, updated_at = now() WHERE tier = 'free';

DROP FUNCTION IF EXISTS public._ai_free_trial_days_left(uuid);

CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_sub record;
  v_month text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  IF v_tier IN ('pro', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start
      INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC
     LIMIT 1;

    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF v_tier = 'free' THEN
    period_key := 'free-starter';
    period_end := NULL;
    included_limit := GREATEST(v_limit, 25);
    RETURN NEXT;
    RETURN;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := (
    (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
    AT TIME ZONE 'Asia/Bangkok'
  );
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  _user_id uuid,
  _environment text DEFAULT 'sandbox'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_included_used integer := 0;
  v_included_limit integer;
  v_purchased integer := 0;
  v_tier text;
  v_period_type text := 'monthly';
  v_total_remaining integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  SELECT included_used, included_limit
    INTO v_included_used, v_included_limit
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key;

  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment;

  v_purchased := COALESCE(v_purchased, 0);
  v_total_remaining := GREATEST(0, v_included_limit - v_included_used) + v_purchased;

  IF v_tier = 'free' THEN
    IF v_total_remaining <= 0 THEN
      v_period_type := 'free_starter_ended';
    ELSE
      v_period_type := 'free_starter';
    END IF;
  ELSIF v_period.period_key LIKE 'sub:%' THEN
    v_period_type := 'subscription';
  END IF;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'period_key', v_period.period_key,
    'period_end', v_period.period_end,
    'period_type', v_period_type,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', v_total_remaining
  );
END;
$$;


-- 20260609170000_user_storage_quota.sql
-- Per-user storage quota (DB rows + file storage) with tier limits.

CREATE TABLE IF NOT EXISTS public.storage_tier_config (
  tier text PRIMARY KEY CHECK (tier IN ('free', 'pro', 'inhouse')),
  limit_bytes bigint NOT NULL CHECK (limit_bytes > 0),
  per_seat boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.storage_tier_config (tier, limit_bytes, per_seat) VALUES
  ('free', 100::bigint * 1024 * 1024, false),
  ('pro', 5::bigint * 1024 * 1024 * 1024, false),
  ('inhouse', 10::bigint * 1024 * 1024 * 1024, true)
ON CONFLICT (tier) DO NOTHING;

GRANT SELECT ON public.storage_tier_config TO authenticated, service_role;

-- Row-size helper for a user-scoped table
CREATE OR REPLACE FUNCTION public._user_rows_bytes(_user_id uuid, _sql text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_bytes bigint;
BEGIN
  EXECUTE _sql INTO v_bytes USING _user_id;
  RETURN COALESCE(v_bytes, 0);
END;
$$;

REVOKE ALL ON FUNCTION public._user_rows_bytes(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._storage_user_limit(_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tier text;
  v_cfg record;
  v_seats integer;
BEGIN
  SELECT COALESCE(p.subscription_tier, 'free'), COALESCE(p.subscription_seats, 1)
    INTO v_tier, v_seats
    FROM public.profiles p
   WHERE p.user_id = _user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_seats := 1;
  END IF;

  SELECT * INTO v_cfg FROM public.storage_tier_config WHERE tier = v_tier;
  IF NOT FOUND THEN
    RETURN 100::bigint * 1024 * 1024;
  END IF;

  IF v_cfg.per_seat THEN
    RETURN v_cfg.limit_bytes * GREATEST(v_seats, 1);
  END IF;

  RETURN v_cfg.limit_bytes;
END;
$$;

REVOKE ALL ON FUNCTION public._storage_user_limit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_storage_summary(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  v_tier text;
  v_limit bigint;
  v_db_documents bigint := 0;
  v_db_suppliers bigint := 0;
  v_db_jobs bigint := 0;
  v_db_finance bigint := 0;
  v_db_brand bigint := 0;
  v_db_planner bigint := 0;
  v_db_other bigint := 0;
  v_file_documents bigint := 0;
  v_file_suppliers bigint := 0;
  v_file_jobs bigint := 0;
  v_file_finance bigint := 0;
  v_file_brand bigint := 0;
  v_file_planner bigint := 0;
  v_file_other bigint := 0;
  v_db_total bigint;
  v_file_total bigint;
  v_total bigint;
  v_uid text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_uid := _user_id::text;
  v_tier := public._ai_user_tier(_user_id);
  v_limit := public._storage_user_limit(_user_id);

  -- ── Database footprint by category ──
  v_db_documents := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.quotations t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_documents t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_usage_rights t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_checklist_progress t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.legal_license_tokens t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_clients_invoices t WHERE t.user_id = $1');

  v_db_suppliers := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.suppliers t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.supplier_files t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.supplier_links t WHERE t.user_id = $1');

  v_db_jobs := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.job_trackers t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(m)), 0) FROM public.job_milestones m JOIN public.job_trackers j ON j.id = m.job_id WHERE j.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(s)), 0) FROM public.job_slips s JOIN public.job_trackers j ON j.id = s.job_id WHERE j.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_jobs t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_job_tasks t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.feedback_jobs t WHERE t.user_id = $1');

  v_db_finance := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_expenses t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_incomes t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_subscriptions t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_payment_methods t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_deductions t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.finance_settings t WHERE t.user_id = $1');

  v_db_brand := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.asset_items t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.profiles t WHERE t.user_id = $1');

  v_db_planner := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.planner_posts t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.work_projects t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.review_pins t WHERE t.user_id = $1');

  v_db_other := public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.saved_clients t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_notes t WHERE t.user_id = $1')
    + public._user_rows_bytes(_user_id,
    'SELECT COALESCE(SUM(pg_column_size(t)), 0) FROM public.dashboard_tasks t WHERE t.user_id = $1');

  -- ── File storage by bucket → category ──
  SELECT
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('legal-certificates') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('supplier-files', 'supplier-covers') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('job-tracker', 'brief-references') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('expense-receipts', 'wht-certificates') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('brand-logos') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.bucket_id IN ('chat-images', 'ticket-attachments') THEN COALESCE((o.metadata->>'size')::bigint, 0) ELSE 0 END), 0)
  INTO v_file_documents, v_file_suppliers, v_file_jobs, v_file_finance, v_file_brand, v_file_other
  FROM storage.objects o
  WHERE split_part(o.name, '/', 1) = v_uid;

  v_db_total := v_db_documents + v_db_suppliers + v_db_jobs + v_db_finance + v_db_brand + v_db_planner + v_db_other;
  v_file_total := v_file_documents + v_file_suppliers + v_file_jobs + v_file_finance + v_file_brand + v_file_planner + v_file_other;
  v_total := v_db_total + v_file_total;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'total_bytes', v_total,
    'limit_bytes', v_limit,
    'db_bytes', v_db_total,
    'file_bytes', v_file_total,
    'remaining_bytes', GREATEST(0, v_limit - v_total),
    'categories', jsonb_build_array(
      jsonb_build_object('key', 'documents', 'bytes', v_db_documents + v_file_documents),
      jsonb_build_object('key', 'suppliers', 'bytes', v_db_suppliers + v_file_suppliers),
      jsonb_build_object('key', 'jobs', 'bytes', v_db_jobs + v_file_jobs),
      jsonb_build_object('key', 'finance', 'bytes', v_db_finance + v_file_finance),
      jsonb_build_object('key', 'brand_assets', 'bytes', v_db_brand + v_file_brand),
      jsonb_build_object('key', 'planner', 'bytes', v_db_planner + v_file_planner),
      jsonb_build_object('key', 'other', 'bytes', v_db_other + v_file_other)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_storage_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_storage_summary(uuid) TO authenticated, service_role;


-- 20260610120000_ops_hub_pm_schema.sql
-- Ops Hub PM workspace: native issues, cycles, roadmap

CREATE SCHEMA IF NOT EXISTS ops;

GRANT USAGE ON SCHEMA ops TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON FUNCTIONS TO service_role;

CREATE TABLE ops.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  app_scope text NOT NULL DEFAULT 'ecosystem'
    CHECK (app_scope IN ('ecosystem', 'so1o', 'an1hem')),
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS ops.issue_number_seq START 1;

CREATE OR REPLACE FUNCTION ops.format_issue_number(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'OPS-' || lpad(n::text, 4, '0');
$$;

CREATE TABLE ops.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number text NOT NULL UNIQUE,
  project_id uuid REFERENCES ops.projects(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES ops.cycles(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  status text NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee_id uuid,
  labels text[] NOT NULL DEFAULT '{}',
  source_type text,
  source_id uuid,
  due_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES ops.issues(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES ops.projects(id) ON DELETE SET NULL,
  quarter text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('idea', 'planned', 'in_progress', 'shipped')),
  issue_id uuid REFERENCES ops.issues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_issues_status ON ops.issues(status, updated_at DESC);
CREATE INDEX idx_ops_issues_cycle ON ops.issues(cycle_id) WHERE cycle_id IS NOT NULL;
CREATE INDEX idx_ops_issues_source ON ops.issues(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_ops_roadmap_quarter ON ops.roadmap_items(quarter);

CREATE OR REPLACE FUNCTION ops.assign_issue_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.issue_number IS NULL OR NEW.issue_number = '' THEN
    NEW.issue_number := ops.format_issue_number(nextval('ops.issue_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ops_issues_number
  BEFORE INSERT ON ops.issues
  FOR EACH ROW EXECUTE FUNCTION ops.assign_issue_number();

CREATE OR REPLACE FUNCTION ops.touch_issues_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ops_issues_updated
  BEFORE UPDATE ON ops.issues
  FOR EACH ROW EXECUTE FUNCTION ops.touch_issues_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ops TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO authenticated;

ALTER TABLE ops.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ops projects"
  ON ops.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops cycles"
  ON ops.cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops issues"
  ON ops.issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops issue comments"
  ON ops.issue_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops roadmap"
  ON ops.roadmap_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed
INSERT INTO ops.projects (name, slug, app_scope, color) VALUES
  ('Ecosystem', 'ecosystem', 'ecosystem', '#1a1a1a'),
  ('So1o Platform', 'so1o', 'so1o', '#e8740c'),
  ('an1hem', 'an1hem', 'an1hem', '#e85d24')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ops.cycles (name, start_date, end_date, status)
SELECT 'Cycle 1 — Jun 2026', '2026-06-01'::date, '2026-06-30'::date, 'active'
WHERE NOT EXISTS (SELECT 1 FROM ops.cycles WHERE name = 'Cycle 1 — Jun 2026');

INSERT INTO ops.roadmap_items (title, description, project_id, quarter, status)
SELECT
  'Ops Hub PM Workspace',
  'Inbox, Board, Cycles, Roadmap สำหรับ PM',
  p.id,
  '2026-Q2',
  'in_progress'
FROM ops.projects p
WHERE p.slug = 'ecosystem'
  AND NOT EXISTS (
    SELECT 1 FROM ops.roadmap_items r WHERE r.title = 'Ops Hub PM Workspace'
  );

-- Promote external work item → ops issue (callable from Hub client)
CREATE OR REPLACE FUNCTION public.ops_promote_work_item(
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_description text DEFAULT NULL
)
RETURNS ops.issues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
DECLARE
  uid uuid := auth.uid();
  proj_id uuid;
  existing ops.issues;
  created ops.issues;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO existing FROM ops.issues
  WHERE source_type = p_source_type AND source_id = p_source_id
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    RETURN existing;
  END IF;

  SELECT id INTO proj_id FROM ops.projects
  WHERE slug = CASE
    WHEN p_source_type IN ('app_feedback', 'user_report') THEN 'an1hem'
    WHEN p_source_type IN ('support_ticket', 'feature_suggestion') THEN 'so1o'
    ELSE 'ecosystem'
  END
  LIMIT 1;

  INSERT INTO ops.issues (
    title, description, project_id, status, priority,
    source_type, source_id, created_by
  ) VALUES (
    p_title,
    p_description,
    proj_id,
    'backlog',
    'medium',
    p_source_type,
    p_source_id,
    uid
  )
  RETURNING * INTO created;

  RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ops_promote_work_item(text, uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_promote_work_item(text, uuid, text, text) FROM PUBLIC, anon;


-- 20260611120000_refund_ai_credits.sql
-- Refund AI credits when a debited request fails after charge (e.g. empty LLM response).

CREATE OR REPLACE FUNCTION public.refund_ai_credits(
  _user_id uuid,
  _original_idempotency_key text,
  _refund_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry record;
  v_period record;
  v_env text;
  v_refunded_included integer := 0;
  v_refunded_purchased integer := 0;
BEGIN
  IF _user_id IS NULL OR _original_idempotency_key IS NULL OR _refund_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'invalid_args');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ai_credit_ledger
    WHERE idempotency_key = _refund_idempotency_key
  ) THEN
    RETURN jsonb_build_object('refunded', true, 'duplicate', true);
  END IF;

  SELECT * INTO v_entry
    FROM public.ai_credit_ledger
   WHERE user_id = _user_id
     AND idempotency_key = _original_idempotency_key
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'original_not_found');
  END IF;

  v_env := COALESCE(v_entry.metadata->>'environment', 'sandbox');

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  IF v_entry.source = 'purchased' THEN
    v_refunded_purchased := v_entry.cost;
    UPDATE public.user_credits
       SET balance = balance + v_refunded_purchased, updated_at = now()
     WHERE user_id = _user_id AND environment = v_env;
  ELSIF v_entry.source = 'mixed' THEN
    v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, v_entry.cost);
    v_refunded_purchased := GREATEST(0, v_entry.cost - v_refunded_included);
    IF v_refunded_included > 0 THEN
      UPDATE public.user_ai_period
         SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
       WHERE user_id = _user_id AND period_key = v_period.period_key;
    END IF;
    IF v_refunded_purchased > 0 THEN
      UPDATE public.user_credits
         SET balance = balance + v_refunded_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = v_env;
    END IF;
  ELSE
    v_refunded_included := v_entry.cost;
    UPDATE public.user_ai_period
       SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    'refund:' || v_entry.feature,
    -v_entry.cost,
    'refund',
    _refund_idempotency_key,
    jsonb_build_object(
      'refund_of', _original_idempotency_key,
      'refunded_included', v_refunded_included,
      'refunded_purchased', v_refunded_purchased,
      'environment', v_env
    )
  );

  RETURN jsonb_build_object(
    'refunded', true,
    'cost', v_entry.cost,
    'refunded_included', v_refunded_included,
    'refunded_purchased', v_refunded_purchased
  );
END;
$$;

-- Store debit split in metadata for accurate mixed refunds.
CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature text,
  _environment text DEFAULT 'sandbox',
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_cost integer;
  v_included_used integer := 0;
  v_included_limit integer;
  v_included_remaining integer;
  v_purchased integer := 0;
  v_from_included integer := 0;
  v_from_purchased integer := 0;
  v_prev jsonb;
  v_source text;
  v_has_credits_row boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true,
      'duplicate', true,
      'cost', cost,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev
    FROM public.ai_credit_ledger
   WHERE idempotency_key = _idempotency_key;

    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  SELECT included_used INTO v_included_used
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key
   FOR UPDATE;

  v_included_used := COALESCE(v_included_used, 0);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment
   FOR UPDATE;

  IF FOUND THEN
    v_has_credits_row := true;
    v_purchased := COALESCE(v_purchased, 0);
  ELSE
    v_purchased := 0;
  END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);

  IF v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'cost', v_cost,
      'included_used', v_included_used,
      'included_limit', v_included_limit,
      'included_remaining', v_included_remaining,
      'purchased_balance', v_purchased,
      'total_remaining', v_included_remaining + v_purchased
    );
  END IF;

  v_from_included := LEAST(v_cost, v_included_remaining);
  v_from_purchased := v_cost - v_from_included;

  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period
       SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
  END IF;

  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits
         SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
    END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF v_from_included > 0 AND v_from_purchased > 0 THEN
    v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN
    v_source := 'purchased';
  ELSE
    v_source := 'included';
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    _feature,
    v_cost,
    v_source,
    _idempotency_key,
    jsonb_build_object(
      'from_included', v_from_included,
      'from_purchased', v_from_purchased,
      'included_used_after', v_included_used,
      'included_limit', v_included_limit,
      'purchased_after', v_purchased,
      'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased,
      'environment', _environment
    )
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'cost', v_cost,
    'source', v_source,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_ai_credits(uuid, text, text) TO service_role;


-- 20260612120000_inhouse_workspace.sql
-- In-House Co-working Workspace (MVP)

DO $$ BEGIN
  CREATE TYPE public.inhouse_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inhouse_member_status AS ENUM ('invited', 'active', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.inhouse_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  avatar_url text,
  seat_limit integer NOT NULL DEFAULT 3,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inhouse_orgs_slug_unique UNIQUE (slug),
  CONSTRAINT inhouse_orgs_owner_unique UNIQUE (owner_id)
);

CREATE INDEX IF NOT EXISTS inhouse_orgs_owner_idx ON public.inhouse_orgs (owner_id);

CREATE TABLE IF NOT EXISTS public.inhouse_org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.inhouse_orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role public.inhouse_member_role NOT NULL DEFAULT 'member',
  status public.inhouse_member_status NOT NULL DEFAULT 'invited',
  invited_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  invited_at timestamptz,
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inhouse_org_members_unique UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS inhouse_org_members_user_idx ON public.inhouse_org_members (user_id, status);
CREATE INDEX IF NOT EXISTS inhouse_org_members_org_idx ON public.inhouse_org_members (org_id, status);

CREATE TABLE IF NOT EXISTS public.inhouse_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.inhouse_orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  linked_quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  settings jsonb NOT NULL DEFAULT '{"columns":["backlog","todo","doing","review","done"]}'::jsonb,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inhouse_workspaces_slug_unique UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS inhouse_workspaces_org_idx ON public.inhouse_workspaces (org_id);

CREATE TABLE IF NOT EXISTS public.inhouse_workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.inhouse_workspaces(id) ON DELETE CASCADE,
  org_member_id uuid NOT NULL REFERENCES public.inhouse_org_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, org_member_id)
);

CREATE TABLE IF NOT EXISTS public.inhouse_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.inhouse_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  column_key text NOT NULL DEFAULT 'todo',
  assignee_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inhouse_tasks_workspace_idx ON public.inhouse_tasks (workspace_id, column_key, position);

CREATE TABLE IF NOT EXISTS public.inhouse_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.inhouse_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inhouse_channels_name_unique UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.inhouse_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.inhouse_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inhouse_messages_channel_idx ON public.inhouse_messages (channel_id, created_at);

CREATE TABLE IF NOT EXISTS public.inhouse_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.inhouse_orgs(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.inhouse_workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inhouse_activity_org_idx ON public.inhouse_activity_events (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.inhouse_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.inhouse_orgs(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  role public.inhouse_member_role NOT NULL DEFAULT 'member',
  workspace_ids uuid[] NOT NULL DEFAULT '{}',
  invited_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inhouse_invites_org_idx ON public.inhouse_invites (org_id);

CREATE TABLE IF NOT EXISTS public.inhouse_canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.inhouse_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled',
  scene_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inhouse_canvases_workspace_idx ON public.inhouse_canvases (workspace_id);

CREATE OR REPLACE FUNCTION public.inhouse_is_org_member(_org_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inhouse_org_members m
    WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.inhouse_is_org_admin(_org_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inhouse_org_members m
    WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.status = 'active' AND m.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.inhouse_can_access_workspace(_workspace_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inhouse_workspaces w
    JOIN public.inhouse_org_members om ON om.org_id = w.org_id
    LEFT JOIN public.inhouse_workspace_members wm ON wm.workspace_id = w.id AND wm.org_member_id = om.id
    WHERE w.id = _workspace_id AND om.user_id = _user_id AND om.status = 'active' AND w.archived_at IS NULL
      AND (NOT EXISTS (SELECT 1 FROM public.inhouse_workspace_members x WHERE x.workspace_id = w.id)
           OR wm.org_member_id IS NOT NULL OR om.role IN ('owner', 'admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.inhouse_active_member_count(_org_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.inhouse_org_members WHERE org_id = _org_id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.assert_org_seat_available(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit integer; _active integer;
BEGIN
  SELECT seat_limit INTO _limit FROM public.inhouse_orgs WHERE id = _org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'org_not_found'; END IF;
  _active := public.inhouse_active_member_count(_org_id);
  IF _active >= _limit THEN RAISE EXCEPTION 'seat_limit_reached'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inhouse_org_seat_limit(_owner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seats integer;
BEGIN
  SELECT COALESCE(subscription_seats, 3) INTO _seats FROM public.profiles WHERE user_id = _owner_id;
  UPDATE public.inhouse_orgs SET seat_limit = GREATEST(1, _seats), updated_at = now() WHERE owner_id = _owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_tier(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_tier text := 'free'; new_seats integer := 1; sub record;
BEGIN
  SELECT price_id, status, current_period_end, environment, seat_quantity INTO sub
  FROM public.subscriptions WHERE user_id = _user_id AND environment = 'live'
    AND ((status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now()))
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    SELECT price_id, status, current_period_end, environment, seat_quantity INTO sub
    FROM public.subscriptions WHERE user_id = _user_id AND environment = 'sandbox'
      AND ((status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now()))
    ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF FOUND THEN
    new_seats := GREATEST(1, COALESCE(sub.seat_quantity, 1));
    IF sub.price_id IN ('inhouse_monthly','inhouse_yearly') THEN new_tier := 'inhouse';
    ELSIF sub.price_id IN ('pro_plus_monthly','pro_plus_yearly') THEN new_tier := 'pro_plus';
    ELSE new_tier := 'pro'; END IF;
  END IF;
  UPDATE public.profiles SET subscription_tier = new_tier, subscription_seats = new_seats WHERE user_id = _user_id;
  PERFORM public.sync_inhouse_org_seat_limit(_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_inhouse_activity(_org_id uuid, _workspace_id uuid, _event_type text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.inhouse_is_org_member(_org_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.inhouse_activity_events (org_id, workspace_id, user_id, event_type, metadata)
  VALUES (_org_id, _workspace_id, auth.uid(), _event_type, _metadata) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_inhouse_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; mem_id uuid; ws_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO inv FROM public.inhouse_invites WHERE token = _token AND accepted_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_invalid'; END IF;
  PERFORM public.assert_org_seat_available(inv.org_id);
  INSERT INTO public.inhouse_org_members (org_id, user_id, role, status, invited_by, invited_at, joined_at)
  VALUES (inv.org_id, auth.uid(), inv.role, 'active', inv.invited_by, inv.created_at, now())
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', joined_at = now(), removed_at = NULL
  RETURNING id INTO mem_id;
  IF array_length(inv.workspace_ids, 1) IS NOT NULL THEN
    FOREACH ws_id IN ARRAY inv.workspace_ids LOOP
      INSERT INTO public.inhouse_workspace_members (workspace_id, org_member_id) VALUES (ws_id, mem_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  UPDATE public.inhouse_invites SET accepted_at = now(), accepted_by = auth.uid() WHERE id = inv.id;
  PERFORM public.log_inhouse_activity(inv.org_id, NULL, 'member_joined', jsonb_build_object('user_id', auth.uid()));
  RETURN inv.org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_inhouse_org(_name text, _workspace_name text DEFAULT 'General')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org_id uuid; _ws_id uuid; _slug text; _ws_slug text; _seats integer; _member_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.inhouse_orgs WHERE owner_id = auth.uid()) THEN RAISE EXCEPTION 'org_already_exists'; END IF;
  SELECT COALESCE(subscription_seats, 3) INTO _seats FROM public.profiles WHERE user_id = auth.uid() AND subscription_tier = 'inhouse';
  IF NOT FOUND THEN RAISE EXCEPTION 'inhouse_tier_required'; END IF;
  _slug := lower(regexp_replace(trim(_name), '[^a-zA-Z0-9]+', '-', 'g'));
  _slug := trim(both '-' from _slug); IF _slug = '' THEN _slug := 'team'; END IF;
  _slug := _slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  INSERT INTO public.inhouse_orgs (owner_id, name, slug, seat_limit) VALUES (auth.uid(), trim(_name), _slug, GREATEST(1, _seats)) RETURNING id INTO _org_id;
  INSERT INTO public.inhouse_org_members (org_id, user_id, role, status, joined_at) VALUES (_org_id, auth.uid(), 'owner', 'active', now()) RETURNING id INTO _member_id;
  _ws_slug := lower(regexp_replace(trim(_workspace_name), '[^a-zA-Z0-9]+', '-', 'g'));
  _ws_slug := trim(both '-' from _ws_slug); IF _ws_slug = '' THEN _ws_slug := 'general'; END IF;
  INSERT INTO public.inhouse_workspaces (org_id, name, slug, created_by) VALUES (_org_id, trim(_workspace_name), _ws_slug, auth.uid()) RETURNING id INTO _ws_id;
  INSERT INTO public.inhouse_channels (workspace_id, name, is_default) VALUES (_ws_id, 'general', true);
  INSERT INTO public.inhouse_workspace_members (workspace_id, org_member_id) VALUES (_ws_id, _member_id);
  PERFORM public.log_inhouse_activity(_org_id, _ws_id, 'org_created', jsonb_build_object('name', _name));
  RETURN _org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.inhouse_org_members_seat_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.assert_org_seat_available(NEW.org_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inhouse_org_members_seat_guard_trg ON public.inhouse_org_members;
CREATE TRIGGER inhouse_org_members_seat_guard_trg BEFORE INSERT OR UPDATE ON public.inhouse_org_members
  FOR EACH ROW EXECUTE FUNCTION public.inhouse_org_members_seat_guard();

ALTER TABLE public.inhouse_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhouse_canvases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inhouse_orgs_select" ON public.inhouse_orgs;
CREATE POLICY "inhouse_orgs_select" ON public.inhouse_orgs FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.inhouse_is_org_member(id));
DROP POLICY IF EXISTS "inhouse_orgs_insert" ON public.inhouse_orgs;
CREATE POLICY "inhouse_orgs_insert" ON public.inhouse_orgs FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "inhouse_orgs_update" ON public.inhouse_orgs;
CREATE POLICY "inhouse_orgs_update" ON public.inhouse_orgs FOR UPDATE TO authenticated USING (public.inhouse_is_org_admin(id));

DROP POLICY IF EXISTS "inhouse_members_select" ON public.inhouse_org_members;
CREATE POLICY "inhouse_members_select" ON public.inhouse_org_members FOR SELECT TO authenticated USING (public.inhouse_is_org_member(org_id));
DROP POLICY IF EXISTS "inhouse_members_insert" ON public.inhouse_org_members;
CREATE POLICY "inhouse_members_insert" ON public.inhouse_org_members FOR INSERT TO authenticated WITH CHECK (public.inhouse_is_org_admin(org_id) OR user_id = auth.uid());
DROP POLICY IF EXISTS "inhouse_members_update" ON public.inhouse_org_members;
CREATE POLICY "inhouse_members_update" ON public.inhouse_org_members FOR UPDATE TO authenticated USING (public.inhouse_is_org_admin(org_id));

DROP POLICY IF EXISTS "inhouse_workspaces_select" ON public.inhouse_workspaces;
CREATE POLICY "inhouse_workspaces_select" ON public.inhouse_workspaces FOR SELECT TO authenticated USING (public.inhouse_is_org_member(org_id));
DROP POLICY IF EXISTS "inhouse_workspaces_insert" ON public.inhouse_workspaces;
CREATE POLICY "inhouse_workspaces_insert" ON public.inhouse_workspaces FOR INSERT TO authenticated WITH CHECK (public.inhouse_is_org_admin(org_id));
DROP POLICY IF EXISTS "inhouse_workspaces_update" ON public.inhouse_workspaces;
CREATE POLICY "inhouse_workspaces_update" ON public.inhouse_workspaces FOR UPDATE TO authenticated USING (public.inhouse_is_org_admin(org_id));

DROP POLICY IF EXISTS "inhouse_ws_members_select" ON public.inhouse_workspace_members;
CREATE POLICY "inhouse_ws_members_select" ON public.inhouse_workspace_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inhouse_workspaces w WHERE w.id = workspace_id AND public.inhouse_is_org_member(w.org_id)));
DROP POLICY IF EXISTS "inhouse_ws_members_mutate" ON public.inhouse_workspace_members;
CREATE POLICY "inhouse_ws_members_mutate" ON public.inhouse_workspace_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inhouse_workspaces w WHERE w.id = workspace_id AND public.inhouse_is_org_admin(w.org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inhouse_workspaces w WHERE w.id = workspace_id AND public.inhouse_is_org_admin(w.org_id)));

DROP POLICY IF EXISTS "inhouse_tasks_select" ON public.inhouse_tasks;
CREATE POLICY "inhouse_tasks_select" ON public.inhouse_tasks FOR SELECT TO authenticated USING (public.inhouse_can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "inhouse_tasks_mutate" ON public.inhouse_tasks;
CREATE POLICY "inhouse_tasks_mutate" ON public.inhouse_tasks FOR ALL TO authenticated
  USING (public.inhouse_can_access_workspace(workspace_id)) WITH CHECK (public.inhouse_can_access_workspace(workspace_id));

DROP POLICY IF EXISTS "inhouse_channels_select" ON public.inhouse_channels;
CREATE POLICY "inhouse_channels_select" ON public.inhouse_channels FOR SELECT TO authenticated USING (public.inhouse_can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "inhouse_channels_insert" ON public.inhouse_channels;
CREATE POLICY "inhouse_channels_insert" ON public.inhouse_channels FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inhouse_workspaces w WHERE w.id = workspace_id AND public.inhouse_is_org_admin(w.org_id)));

DROP POLICY IF EXISTS "inhouse_messages_select" ON public.inhouse_messages;
CREATE POLICY "inhouse_messages_select" ON public.inhouse_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inhouse_channels c WHERE c.id = channel_id AND public.inhouse_can_access_workspace(c.workspace_id)));
DROP POLICY IF EXISTS "inhouse_messages_insert" ON public.inhouse_messages;
CREATE POLICY "inhouse_messages_insert" ON public.inhouse_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.inhouse_channels c WHERE c.id = channel_id AND public.inhouse_can_access_workspace(c.workspace_id)));

DROP POLICY IF EXISTS "inhouse_activity_select" ON public.inhouse_activity_events;
CREATE POLICY "inhouse_activity_select" ON public.inhouse_activity_events FOR SELECT TO authenticated USING (public.inhouse_is_org_member(org_id));

DROP POLICY IF EXISTS "inhouse_invites_select" ON public.inhouse_invites;
CREATE POLICY "inhouse_invites_select" ON public.inhouse_invites FOR SELECT TO authenticated USING (public.inhouse_is_org_admin(org_id));
DROP POLICY IF EXISTS "inhouse_invites_insert" ON public.inhouse_invites;
CREATE POLICY "inhouse_invites_insert" ON public.inhouse_invites FOR INSERT TO authenticated WITH CHECK (public.inhouse_is_org_admin(org_id) AND invited_by = auth.uid());
DROP POLICY IF EXISTS "inhouse_invites_update" ON public.inhouse_invites;
CREATE POLICY "inhouse_invites_update" ON public.inhouse_invites FOR UPDATE TO authenticated USING (public.inhouse_is_org_admin(org_id));

DROP POLICY IF EXISTS "inhouse_canvases_select" ON public.inhouse_canvases;
CREATE POLICY "inhouse_canvases_select" ON public.inhouse_canvases FOR SELECT TO authenticated USING (public.inhouse_can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "inhouse_canvases_mutate" ON public.inhouse_canvases;
CREATE POLICY "inhouse_canvases_mutate" ON public.inhouse_canvases FOR ALL TO authenticated
  USING (public.inhouse_can_access_workspace(workspace_id)) WITH CHECK (public.inhouse_can_access_workspace(workspace_id));

REVOKE ALL ON FUNCTION public.inhouse_is_org_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inhouse_is_org_member(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.inhouse_is_org_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inhouse_is_org_admin(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.inhouse_can_access_workspace(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inhouse_can_access_workspace(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.log_inhouse_activity(uuid, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_inhouse_activity(uuid, uuid, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_inhouse_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_inhouse_invite(text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_inhouse_org(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inhouse_org(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_inhouse_org_seat_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inhouse_org_seat_limit(uuid) TO service_role;


-- 20260613100000_inhouse_invite_pending.sql
-- In-House follow-up: pending invites for home page + invitee read policy

CREATE OR REPLACE FUNCTION public.get_my_pending_inhouse_invites()
RETURNS TABLE (
  id uuid,
  org_id uuid,
  token text,
  email text,
  role public.inhouse_member_role,
  expires_at timestamptz,
  org_name text,
  org_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.org_id,
    i.token,
    i.email,
    i.role,
    i.expires_at,
    o.name AS org_name,
    o.slug AS org_slug
  FROM public.inhouse_invites i
  JOIN public.inhouse_orgs o ON o.id = i.org_id
  JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE i.accepted_at IS NULL
    AND i.expires_at > now()
    AND (
      i.email IS NULL
      OR lower(trim(i.email)) = lower(trim(COALESCE(p.email, '')))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_pending_inhouse_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pending_inhouse_invites() TO authenticated;

DROP POLICY IF EXISTS "inhouse_invites_select_invitee" ON public.inhouse_invites;
CREATE POLICY "inhouse_invites_select_invitee" ON public.inhouse_invites FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND email IS NOT NULL
    AND lower(trim(email)) = lower(trim(COALESCE(
      (SELECT pr.email FROM public.profiles pr WHERE pr.user_id = auth.uid()),
      ''
    )))
  );


-- 20260613120000_anthem_portfolio_from_images.sql
-- Anthem portfolio AI assist from images (vision)
INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('anthem_portfolio_from_images', 8, 'Anthem — AI ช่วยลงผลงาน')
ON CONFLICT (feature) DO UPDATE SET cost = 8, label = EXCLUDED.label;


-- 20260613120000_chat_phase2.sql
-- Chat UX Phase 2: reply, unsend, project messages, pins, group chat
-- Run on unified Supabase project (shared schema)

-- ── conversations ──
ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS conversation_type text NOT NULL DEFAULT 'direct'
    CHECK (conversation_type IN ('direct', 'group')),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE shared.conversations
  ALTER COLUMN request_id DROP NOT NULL;

ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE shared.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('hire', 'collab', 'group'));

-- ── messages ──
ALTER TABLE shared.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES shared.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'project')),
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON shared.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON shared.messages(project_id) WHERE project_id IS NOT NULL;

-- ── conversation_members (group chat) ──
CREATE TABLE IF NOT EXISTS shared.conversation_members (
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON shared.conversation_members(user_id);

-- ── conversation_pins (per-user) ──
CREATE TABLE IF NOT EXISTS shared.conversation_pins (
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_pins_user ON shared.conversation_pins(user_id, pinned_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_members TO authenticated;
GRANT ALL ON shared.conversation_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_pins TO authenticated;
GRANT ALL ON shared.conversation_pins TO service_role;

ALTER TABLE shared.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.conversation_pins ENABLE ROW LEVEL SECURITY;

-- Helper: is user a participant (direct or group member)
CREATE OR REPLACE FUNCTION shared.user_in_conversation(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared.conversations c
    WHERE c.id = conv_id
      AND (
        (COALESCE(c.conversation_type, 'direct') = 'direct'
          AND (c.client_id = uid OR c.freelancer_id = uid))
        OR EXISTS (
          SELECT 1 FROM shared.conversation_members m
          WHERE m.conversation_id = conv_id AND m.user_id = uid
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION shared.user_in_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shared.user_in_conversation(uuid, uuid) TO authenticated, service_role;

-- Update message policies to use helper (drop old participant checks)
DROP POLICY IF EXISTS "Participants can view messages" ON shared.messages;
CREATE POLICY "Participants can view messages"
  ON shared.messages FOR SELECT TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON shared.messages;
CREATE POLICY "Participants can send messages"
  ON shared.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND shared.user_in_conversation(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Recipient can mark as read" ON shared.messages;
CREATE POLICY "Participants can update messages"
  ON shared.messages FOR UPDATE TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()))
  WITH CHECK (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Sender can unsend own messages" ON shared.messages;
CREATE POLICY "Sender can unsend own messages"
  ON shared.messages FOR UPDATE TO authenticated
  USING (
    auth.uid() = sender_id
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (auth.uid() = sender_id);

-- Conversation policies for groups
DROP POLICY IF EXISTS "Participants can view conversations" ON shared.conversations;
CREATE POLICY "Participants can view conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (shared.user_in_conversation(id, auth.uid()));

DROP POLICY IF EXISTS "Participants can create conversations" ON shared.conversations;
CREATE POLICY "Participants can create conversations"
  ON shared.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() = client_id
    OR auth.uid() = freelancer_id
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON shared.conversations;
CREATE POLICY "Participants can update conversations"
  ON shared.conversations FOR UPDATE TO authenticated
  USING (shared.user_in_conversation(id, auth.uid()));

-- conversation_members RLS
DROP POLICY IF EXISTS "Members can view conversation members" ON shared.conversation_members;
CREATE POLICY "Members can view conversation members"
  ON shared.conversation_members FOR SELECT TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Owner can add members" ON shared.conversation_members;
CREATE POLICY "Owner can add members"
  ON shared.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = conversation_members.conversation_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- conversation_pins RLS
DROP POLICY IF EXISTS "Users manage own pins" ON shared.conversation_pins;
CREATE POLICY "Users manage own pins"
  ON shared.conversation_pins FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime for new tables
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.conversation_pins; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
ALTER TABLE shared.conversation_pins REPLICA IDENTITY FULL;


-- 20260613130000_project_media_anthem_storage_rls.sql
-- Fix project-media storage RLS for Anthem namespace paths (anthem/{userId}/...)

CREATE OR REPLACE FUNCTION public.project_media_user_owns_path(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, shared
AS $$
DECLARE
  folders text[];
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  folders := storage.foldername(object_name);

  -- Legacy So1o: {userId}/...
  IF folders[1] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem portfolio / cv: anthem/{userId}/...
  IF folders[1] = 'anthem' AND folders[2] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem studios: anthem/studios/{userId}/...
  IF folders[1] = 'anthem' AND folders[2] = 'studios' AND folders[3] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem chat: anthem/chat/{conversationId}/...
  IF folders[1] = 'anthem' AND folders[2] = 'chat' AND folders[3] IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM shared.conversations c
      WHERE c.id = folders[3]::uuid
        AND (c.client_id = uid OR c.freelancer_id = uid)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.project_media_user_owns_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_media_user_owns_path(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

-- Ensure public read (bucket is public)
DROP POLICY IF EXISTS "Project media public read" ON storage.objects;
CREATE POLICY "Project media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');


-- 20260614100000_ecosystem_links_base.sql
-- Ecosystem Phase 1 base: cross-app link tracking (prerequisite for Ops Hub control plane)
-- Source: scripts/ecosystem/ecosystem-phase1.sql

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS seat_quantity integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.ecosystem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  source_app text NOT NULL DEFAULT 'anthem',
  source_page text,
  ref_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecosystem_links_user_created_idx
  ON public.ecosystem_links (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ecosystem_links_created_idx
  ON public.ecosystem_links (created_at DESC);

ALTER TABLE public.ecosystem_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users insert own ecosystem links"
  ON public.ecosystem_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users read own ecosystem links"
  ON public.ecosystem_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Service role manages ecosystem links"
  ON public.ecosystem_links FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 20260614120000_community_moderation.sql
-- Placeholder migration (file was empty; split from future community moderation work)
SELECT 1;


-- 20260614120000_ops_hub_ecosystem_control_plane.sql
-- Ops Hub Ecosystem Control Plane — connections, user 360, events, radar, settings

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_created_idx
  ON public.platform_events (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_type_idx
  ON public.platform_events (event_type, created_at DESC);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read platform events" ON public.platform_events;
CREATE POLICY "Admins read platform events"
  ON public.platform_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages platform events" ON public.platform_events;
CREATE POLICY "Service role manages platform events"
  ON public.platform_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_platform_event(
  p_event_type text,
  p_actor_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
  VALUES (p_event_type, p_actor_id, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_platform_event(text, uuid, text, text, jsonb) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins read all ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Admins read all ecosystem links"
  ON public.ecosystem_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS ops.radar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  source text NOT NULL DEFAULT 'manual',
  category text NOT NULL DEFAULT 'product'
    CHECK (category IN ('product', 'tech', 'infra', 'market', 'compliance')),
  impact text NOT NULL DEFAULT 'medium'
    CHECK (impact IN ('low', 'medium', 'high')),
  effort text NOT NULL DEFAULT 'medium'
    CHECK (effort IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'accepted', 'rejected', 'shipped')),
  url text,
  issue_id uuid REFERENCES ops.issues(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS ops.playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'skipped')),
  notes text,
  assignee_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_radar_status ON ops.radar_items(status, updated_at DESC);

ALTER TABLE ops.radar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.playbook_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ops radar" ON ops.radar_items;
CREATE POLICY "Admins manage ops radar"
  ON ops.radar_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage ops settings" ON ops.settings;
CREATE POLICY "Admins manage ops settings"
  ON ops.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage ops playbook runs" ON ops.playbook_runs;
CREATE POLICY "Admins manage ops playbook runs"
  ON ops.playbook_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON ops.radar_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops.settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops.playbook_runs TO authenticated;

INSERT INTO ops.settings (key, value) VALUES
  ('ecosystem_flags', '{"flywheel_cta_enabled": true, "sso_monitoring": true}'::jsonb),
  ('sso_baseline', '{"note": "Separate cookies per domain until SSO ships"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ops.radar_items (title, summary, source, category, impact, effort, status)
SELECT v.title, v.summary, v.source, v.category, v.impact, v.effort, 'new'
FROM (VALUES
  ('SSO ข้ามโดเมน So1o ↔ an1hem', 'ลด drop-off เมื่อสลับแอป — ดู metrics ที่ Connections', 'ECOSYSTEM_ROADMAP', 'tech', 'high', 'high'),
  ('ปิดลูป Job → Portfolio', 'PostToAnthemBanner มีแล้ว — วัด conversion ใน Flywheel', 'tracking', 'product', 'high', 'medium'),
  ('Escrow marketplace', 'ชำระเงินลูกค้าผ่านแพลตฟอร์ม', 'ECOSYSTEM_ROADMAP', 'product', 'high', 'high'),
  ('Boost/โฆษณาผลงาน', 'tier-gated promotion บน an1hem', 'ECOSYSTEM_ROADMAP', 'market', 'medium', 'medium'),
  ('Supabase Pro monitoring', 'อัปเกรดเมื่อ usage ใกล้ limit — ดู /monitor', 'ops-infra-monitor', 'infra', 'medium', 'low')
) AS v(title, summary, source, category, impact, effort)
WHERE NOT EXISTS (SELECT 1 FROM ops.radar_items r WHERE r.title = v.title);

CREATE OR REPLACE FUNCTION public.trg_ecosystem_link_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'ecosystem.cross_link',
    NEW.user_id,
    'ecosystem_link',
    NEW.id::text,
    jsonb_build_object(
      'source_app', NEW.source_app,
      'source_page', NEW.source_page,
      'event_type', NEW.event_type
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecosystem_links_event ON public.ecosystem_links;
CREATE TRIGGER trg_ecosystem_links_event
  AFTER INSERT ON public.ecosystem_links
  FOR EACH ROW EXECUTE FUNCTION public.trg_ecosystem_link_event();

CREATE OR REPLACE FUNCTION public.trg_ecosystem_link_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meta ? 'converted_at' AND (OLD.meta IS NULL OR NOT (OLD.meta ? 'converted_at')) THEN
    PERFORM public.log_platform_event(
      'ecosystem.handoff_completed',
      NEW.user_id,
      'ecosystem_link',
      NEW.id::text,
      COALESCE(NEW.meta, '{}'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecosystem_links_converted ON public.ecosystem_links;
CREATE TRIGGER trg_ecosystem_links_converted
  AFTER UPDATE OF meta ON public.ecosystem_links
  FOR EACH ROW EXECUTE FUNCTION public.trg_ecosystem_link_converted();

CREATE OR REPLACE FUNCTION public.trg_support_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_platform_event(
      'ticket.created',
      NEW.user_id,
      'support_ticket',
      NEW.id::text,
      jsonb_build_object('title', NEW.title, 'ticket_number', NEW.ticket_number)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_platform_event ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_platform_event
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_support_ticket_event();

CREATE OR REPLACE FUNCTION public.admin_ecosystem_funnel(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_ts timestamptz := now() - make_interval(days => GREATEST(1, LEAST(_days, 90)));
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'days', _days,
    'since', since_ts,
    'flows', COALESCE((
      SELECT jsonb_agg(row ORDER BY row->>'id')
      FROM (
        SELECT jsonb_build_object(
          'id', f.flow_id,
          'label', f.flow_label,
          'direction', f.direction,
          'clicks', COUNT(*) FILTER (WHERE el.created_at >= since_ts),
          'converted', COUNT(*) FILTER (
            WHERE el.created_at >= since_ts AND el.meta ? 'converted_at'
          ),
          'stuck', COUNT(*) FILTER (
            WHERE el.created_at >= since_ts
              AND NOT (el.meta ? 'converted_at')
              AND el.created_at < now() - interval '48 hours'
          )
        ) AS row
        FROM public.ecosystem_links el
        CROSS JOIN LATERAL (
          SELECT
            CASE
              WHEN el.source_app = 'anthem' AND el.source_page ILIKE '%hire%' THEN 'anthem_hire_quotation'
              WHEN el.source_app = 'anthem' THEN 'anthem_to_so1o'
              WHEN el.source_app = 'so1o' AND el.source_page ILIKE '%post_anthem%' THEN 'so1o_job_portfolio'
              WHEN el.source_app = 'so1o' THEN 'so1o_to_anthem'
              ELSE 'other'
            END AS flow_id,
            CASE
              WHEN el.source_app = 'anthem' AND el.source_page ILIKE '%hire%' THEN 'an1hem จ้าง → So1o ใบเสนอราคา'
              WHEN el.source_app = 'anthem' THEN 'an1hem → So1o'
              WHEN el.source_app = 'so1o' AND el.source_page ILIKE '%post_anthem%' THEN 'So1o งานเสร็จ → an1hem โพสต์'
              WHEN el.source_app = 'so1o' THEN 'So1o → an1hem'
              ELSE 'อื่นๆ'
            END AS flow_label,
            CASE
              WHEN el.source_app = 'anthem' THEN 'anthem_to_so1o'
              WHEN el.source_app = 'so1o' THEN 'so1o_to_anthem'
              ELSE 'other'
            END AS direction
        ) f
        WHERE el.event_type = 'cross_link_click'
        GROUP BY f.flow_id, f.flow_label, f.direction
      ) sub
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'clicks_24h', (SELECT COUNT(*) FROM public.ecosystem_links WHERE created_at >= now() - interval '24 hours'),
      'clicks_7d', (SELECT COUNT(*) FROM public.ecosystem_links WHERE created_at >= now() - interval '7 days'),
      'converted_7d', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE created_at >= now() - interval '7 days' AND meta ? 'converted_at'
      ),
      'stuck_48h', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE created_at < now() - interval '48 hours'
          AND created_at >= now() - interval '30 days'
          AND NOT (meta ? 'converted_at')
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_sso_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  dual_users bigint;
  pro_dual bigint;
  anthem_only bigint;
  so1o_only bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COUNT(DISTINCT p.user_id) INTO dual_users
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  SELECT COUNT(DISTINCT p.user_id) INTO pro_dual
  FROM public.profiles p
  WHERE p.subscription_tier IN ('pro', 'pro_plus')
    AND EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  SELECT COUNT(*) INTO anthem_only
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id);

  SELECT COUNT(*) INTO so1o_only
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  RETURN jsonb_build_object(
    'dual_app_users', dual_users,
    'pro_dual_app_users', pro_dual,
    'anthem_only_users', anthem_only,
    'so1o_only_users', so1o_only,
    'sso_status', 'deferred',
    'note', 'คนละโดเมน = คนละ cookie จนกว่า SSO จะ ship'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_360(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  prof record;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT user_id, display_name, username, subscription_tier, created_at
    INTO prof
    FROM public.profiles
   WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', prof.user_id,
      'display_name', prof.display_name,
      'username', prof.username,
      'subscription_tier', prof.subscription_tier,
      'created_at', prof.created_at
    ),
    'so1o', jsonb_build_object(
      'quotations', (SELECT COUNT(*) FROM public.quotations WHERE user_id = _user_id),
      'open_tickets', (
        SELECT COUNT(*) FROM public.support_tickets
        WHERE user_id = _user_id AND status IN ('new', 'in_progress', 'qa')
      )
    ),
    'an1hem', jsonb_build_object(
      'projects', (SELECT COUNT(*) FROM anthem.projects WHERE user_id = _user_id),
      'published', (
        SELECT COUNT(*) FROM anthem.projects WHERE user_id = _user_id AND status = 'Published'
      ),
      'feedback', (SELECT COUNT(*) FROM anthem.app_feedback WHERE user_id = _user_id)
    ),
    'ecosystem', jsonb_build_object(
      'cross_links', (SELECT COUNT(*) FROM public.ecosystem_links WHERE user_id = _user_id),
      'converted_links', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE user_id = _user_id AND meta ? 'converted_at'
      )
    ),
    'recent_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', el.id,
        'source_app', el.source_app,
        'source_page', el.source_page,
        'created_at', el.created_at,
        'converted', el.meta ? 'converted_at'
      ) ORDER BY el.created_at DESC)
      FROM (
        SELECT * FROM public.ecosystem_links
        WHERE user_id = _user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) el
    ), '[]'::jsonb),
    'recent_events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_type', pe.event_type,
        'created_at', pe.created_at,
        'target_type', pe.target_type
      ) ORDER BY pe.created_at DESC)
      FROM (
        SELECT * FROM public.platform_events
        WHERE actor_id = _user_id
        ORDER BY created_at DESC
        LIMIT 15
      ) pe
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_users(_query text, _limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  subscription_tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer := GREATEST(5, LEAST(COALESCE(_limit, 20), 50));
  q text := trim(COALESCE(_query, ''));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.display_name, p.username, p.subscription_tier, p.created_at
  FROM public.profiles p
  WHERE q = ''
     OR p.display_name ILIKE '%' || q || '%'
     OR p.username ILIKE '%' || q || '%'
     OR p.user_id::text ILIKE q || '%'
  ORDER BY p.created_at DESC
  LIMIT lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_platform_events(_limit integer DEFAULT 50)
RETURNS SETOF public.platform_events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
  SELECT * FROM public.platform_events
  ORDER BY created_at DESC
  LIMIT GREATEST(10, LEAST(COALESCE(_limit, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ecosystem_funnel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sso_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_360(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_platform_events(integer) TO authenticated;


-- 20260615120000_platform_events_triggers.sql
-- Platform events triggers for Ops Hub Activity feed
-- Apply via: cd Solo-Code && npx supabase db push

CREATE OR REPLACE FUNCTION public.trg_log_profile_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'user.signup',
    NEW.user_id,
    'profile',
    NEW.user_id::text,
    jsonb_build_object('username', NEW.username)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_profile_signup ON public.profiles;
CREATE TRIGGER platform_event_profile_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_profile_signup();

CREATE OR REPLACE FUNCTION public.trg_log_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'ticket.created',
    NEW.user_id,
    'support_ticket',
    NEW.id::text,
    jsonb_build_object('subject', NEW.subject)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_support_ticket ON public.support_tickets;
CREATE TRIGGER platform_event_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_support_ticket();

CREATE OR REPLACE FUNCTION public.trg_log_ecosystem_convert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
BEGIN
  meta := COALESCE(NEW.meta, '{}'::jsonb);
  IF (OLD.meta IS DISTINCT FROM NEW.meta)
     AND meta ? 'converted_at'
     AND NOT (COALESCE(OLD.meta, '{}'::jsonb) ? 'converted_at') THEN
    PERFORM public.log_platform_event(
      'ecosystem.handoff_completed',
      NULL,
      'ecosystem_link',
      NEW.id::text,
      jsonb_build_object('source_app', NEW.source_app, 'source_page', NEW.source_page)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_ecosystem_convert ON public.ecosystem_links;
CREATE TRIGGER platform_event_ecosystem_convert
  AFTER UPDATE ON public.ecosystem_links
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_ecosystem_convert();

CREATE OR REPLACE FUNCTION public.trg_log_cashout_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'cashout.request',
    NEW.user_id,
    'cashout_request',
    NEW.id::text,
    jsonb_build_object('amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_event_cashout ON shared.cashout_requests;
CREATE TRIGGER platform_event_cashout
  AFTER INSERT ON shared.cashout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_cashout_request();


-- 20260616120000_profiles_document_theme.sql
-- Custom document branding (Pro+): colors + portal options stored on profile
alter table public.profiles
  add column if not exists document_theme jsonb not null default '{}'::jsonb;

comment on column public.profiles.document_theme is
  'User document theme: primary, invoiceColor, receiptColor, briefAccent, unifiedColors, portalShowLogo, portalWelcomeMessage';


-- 20260616130000_quotation_collab_inhouse_branding.sql
-- Team/studio quotations + org document branding (Programs B & C)

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS quotation_kind text NOT NULL DEFAULT 'solo'
    CHECK (quotation_kind IN ('solo', 'inhouse', 'studio')),
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.inhouse_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS studio_id uuid,
  ADD COLUMN IF NOT EXISTS studio_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS inhouse_workspace_id uuid REFERENCES public.inhouse_workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotations_org_id_idx ON public.quotations (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quotations_kind_idx ON public.quotations (quotation_kind);

ALTER TABLE public.inhouse_orgs
  ADD COLUMN IF NOT EXISTS document_theme jsonb,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_tagline text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS public.quotation_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  revenue_percent numeric(5, 2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, user_id)
);

CREATE INDEX IF NOT EXISTS quotation_collaborators_quote_idx
  ON public.quotation_collaborators (quotation_id);

ALTER TABLE public.quotation_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_collaborators_select" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_select" ON public.quotation_collaborators
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_member(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_insert" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_insert" ON public.quotation_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_update" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_update" ON public.quotation_collaborators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

DROP POLICY IF EXISTS "quotation_collaborators_delete" ON public.quotation_collaborators;
CREATE POLICY "quotation_collaborators_delete" ON public.quotation_collaborators
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (q.user_id = auth.uid() OR public.inhouse_is_org_admin(q.org_id))
    )
  );

-- Org members can read team quotations
DROP POLICY IF EXISTS "Org members view org quotations" ON public.quotations;
CREATE POLICY "Org members view org quotations" ON public.quotations
  FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL AND public.inhouse_is_org_member(org_id)
  );

DROP POLICY IF EXISTS "Org admins update org quotations" ON public.quotations;
CREATE POLICY "Org admins update org quotations" ON public.quotations
  FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL AND public.inhouse_is_org_admin(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL AND public.inhouse_is_org_admin(org_id)
  );


-- 20260616140000_conversations_studio_id.sql
-- Link studio team chats to anthem.studios for So1o handoff resolution

ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS studio_id uuid;

CREATE INDEX IF NOT EXISTS conversations_studio_id_idx
  ON shared.conversations (studio_id)
  WHERE studio_id IS NOT NULL;

ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE shared.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('hire', 'collab', 'group', 'studio'));

COMMENT ON COLUMN shared.conversations.studio_id IS
  'Anthem studio nest id when kind=studio (find_or_create_studio_chat)';

-- RPC: open studio team chat (Anthem useStudioConversation)
CREATE OR REPLACE FUNCTION public.find_or_create_studio_chat(p_studio_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv_id uuid;
  v_title text;
  v_member record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members sm
    WHERE sm.studio_id = p_studio_id AND sm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'not a studio member';
  END IF;

  SELECT c.id INTO v_conv_id
  FROM shared.conversations c
  WHERE c.kind = 'studio' AND c.studio_id = p_studio_id
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    SELECT s.name INTO v_title FROM public.studios s WHERE s.id = p_studio_id;
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'studio not found';
    END IF;

    INSERT INTO shared.conversations (
      kind,
      conversation_type,
      studio_id,
      title,
      created_by,
      client_id,
      freelancer_id,
      request_id,
      project_title
    ) VALUES (
      'studio',
      'group',
      p_studio_id,
      v_title,
      v_uid,
      v_uid,
      v_uid,
      NULL,
      v_title
    )
    RETURNING id INTO v_conv_id;
  END IF;

  FOR v_member IN
    SELECT sm.user_id, sm.role
    FROM public.studio_members sm
    WHERE sm.studio_id = p_studio_id
  LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, role)
    VALUES (
      v_conv_id,
      v_member.user_id,
      CASE
        WHEN v_member.role = 'owner' THEN 'owner'
        WHEN v_member.role = 'admin' THEN 'admin'
        ELSE 'member'
      END
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_create_studio_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_studio_chat(uuid) TO authenticated, service_role;


-- 20260617120000_quotation_coedit_rls.sql
-- Co-edit RLS: collaborators can view/edit team & studio quotations

CREATE OR REPLACE FUNCTION public.is_quotation_collaborator(p_quotation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_collaborators c
    WHERE c.quotation_id = p_quotation_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quotation_lead_collaborator(p_quotation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_collaborators c
    WHERE c.quotation_id = p_quotation_id
      AND c.user_id = auth.uid()
      AND c.role = 'lead'
  );
$$;

REVOKE ALL ON FUNCTION public.is_quotation_collaborator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_quotation_lead_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quotation_collaborator(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_quotation_lead_collaborator(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Collaborators view quotations" ON public.quotations;
CREATE POLICY "Collaborators view quotations"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (public.is_quotation_collaborator(id));

DROP POLICY IF EXISTS "Lead collaborators update quotations" ON public.quotations;
CREATE POLICY "Lead collaborators update quotations"
  ON public.quotations FOR UPDATE
  TO authenticated
  USING (public.is_quotation_lead_collaborator(id))
  WITH CHECK (public.is_quotation_lead_collaborator(id));

DROP POLICY IF EXISTS "Lead collaborators manage collaborators" ON public.quotation_collaborators;
CREATE POLICY "Lead collaborators manage collaborators"
  ON public.quotation_collaborators FOR ALL
  TO authenticated
  USING (public.is_quotation_lead_collaborator(quotation_id))
  WITH CHECK (public.is_quotation_lead_collaborator(quotation_id));


-- 20260617130000_studio_hire_requests.sql
-- Studio hire: client -> studio (anthem.hiring_requests) + admin inbox

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES anthem.studios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'freelancer'
    CHECK (target_type IN ('freelancer', 'studio'));

ALTER TABLE anthem.hiring_requests
  ALTER COLUMN freelancer_id DROP NOT NULL;

ALTER TABLE anthem.hiring_requests DROP CONSTRAINT IF EXISTS hiring_requests_target_chk;
ALTER TABLE anthem.hiring_requests ADD CONSTRAINT hiring_requests_target_chk
  CHECK (
    (target_type = 'freelancer' AND freelancer_id IS NOT NULL AND studio_id IS NULL)
    OR (target_type = 'studio' AND studio_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS hiring_requests_studio_id_idx
  ON anthem.hiring_requests (studio_id)
  WHERE studio_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_studio_admin(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM anthem.studio_members sm
    WHERE sm.studio_id = p_studio_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_studio_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view requests" ON anthem.hiring_requests;
CREATE POLICY "Anyone can view requests"
  ON anthem.hiring_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Freelancer can update their requests" ON anthem.hiring_requests;
CREATE POLICY "Freelancer can update their requests"
  ON anthem.hiring_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
  );

DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
CREATE POLICY "Authenticated users can create requests"
  ON anthem.hiring_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND (
      (target_type = 'freelancer' AND freelancer_id IS NOT NULL)
      OR (target_type = 'studio' AND studio_id IS NOT NULL)
    )
  );

CREATE OR REPLACE FUNCTION public.accept_studio_hire_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hire anthem.hiring_requests%ROWTYPE;
  v_conv_id uuid;
  v_owner_id uuid;
  v_member record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_hire
  FROM anthem.hiring_requests
  WHERE id = p_request_id
    AND target_type = 'studio'
    AND studio_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'studio hire not found';
  END IF;

  IF NOT public.is_studio_admin(v_hire.studio_id) THEN
    RAISE EXCEPTION 'not studio admin';
  END IF;

  UPDATE anthem.hiring_requests
  SET status = 'ตอบรับ', updated_at = now()
  WHERE id = p_request_id;

  SELECT id INTO v_conv_id
  FROM shared.conversations
  WHERE kind = 'hire' AND request_id = p_request_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  SELECT sm.user_id INTO v_owner_id
  FROM anthem.studio_members sm
  WHERE sm.studio_id = v_hire.studio_id AND sm.role = 'owner'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    SELECT sm.user_id INTO v_owner_id
    FROM anthem.studio_members sm
    WHERE sm.studio_id = v_hire.studio_id AND sm.role = 'admin'
    ORDER BY sm.joined_at ASC
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'studio has no owner';
  END IF;

  INSERT INTO shared.conversations (
    kind,
    conversation_type,
    request_id,
    client_id,
    freelancer_id,
    studio_id,
    project_id,
    project_title,
    created_by
  ) VALUES (
    'hire',
    'direct',
    p_request_id,
    v_hire.client_id,
    v_owner_id,
    v_hire.studio_id,
    v_hire.project_id,
    COALESCE(v_hire.project_title, 'งานจ้าง Studio'),
    v_uid
  )
  RETURNING id INTO v_conv_id;

  FOR v_member IN
    SELECT sm.user_id, sm.role
    FROM anthem.studio_members sm
    WHERE sm.studio_id = v_hire.studio_id
      AND sm.role IN ('owner', 'admin')
  LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, role)
    VALUES (
      v_conv_id,
      v_member.user_id,
      CASE WHEN v_member.role = 'owner' THEN 'owner' ELSE 'admin' END
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_studio_hire_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_studio_hire_request(uuid) TO authenticated, service_role;


-- 20260617140000_quotation_header_banner.sql
-- Optional header banner image on quotations (preview / PDF presentation)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS header_image_url TEXT;

COMMENT ON COLUMN public.quotations.header_image_url IS 'Optional full-width banner image shown at top of quotation preview';

INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-banners', 'quotation-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view quotation banners"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'quotation-banners');

CREATE POLICY "Users upload own quotation banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own quotation banners"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own quotation banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- 20260618120000_design_drill_reroll.sql
-- Design Drill: daily free reroll quota + paid reroll feature cost

CREATE TABLE IF NOT EXISTS public.design_drill_reroll_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key    text NOT NULL,
  used_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_key)
);

ALTER TABLE public.design_drill_reroll_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.design_drill_reroll_usage TO authenticated;
GRANT ALL ON public.design_drill_reroll_usage TO service_role;

CREATE OR REPLACE FUNCTION public._design_drill_day_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD');
$$;

CREATE OR REPLACE FUNCTION public.get_design_drill_reroll_status(_user_id uuid, _daily_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _count integer := 0;
BEGIN
  SELECT used_count INTO _count
  FROM public.design_drill_reroll_usage
  WHERE user_id = _user_id AND day_key = _day;
  _count := COALESCE(_count, 0);
  RETURN jsonb_build_object(
    'used', _count,
    'limit', _daily_limit,
    'remaining', GREATEST(_daily_limit - _count, 0),
    'day_key', _day
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_design_drill_reroll(_user_id uuid, _daily_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _count integer;
BEGIN
  INSERT INTO public.design_drill_reroll_usage (user_id, day_key, used_count)
  VALUES (_user_id, _day, 0)
  ON CONFLICT (user_id, day_key) DO NOTHING;

  SELECT used_count INTO _count
  FROM public.design_drill_reroll_usage
  WHERE user_id = _user_id AND day_key = _day
  FOR UPDATE;

  IF _count >= _daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'used', _count,
      'limit', _daily_limit,
      'day_key', _day
    );
  END IF;

  UPDATE public.design_drill_reroll_usage
  SET used_count = used_count + 1, updated_at = now()
  WHERE user_id = _user_id AND day_key = _day;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', _count + 1,
    'limit', _daily_limit,
    'remaining', GREATEST(_daily_limit - (_count + 1), 0),
    'day_key', _day
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_design_drill_reroll_status(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_design_drill_reroll(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_design_drill_reroll_status(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_design_drill_reroll(uuid, integer) TO service_role;

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('design_drill_reroll', 1, 'Design Drill — สุ่มโจทย์ใหม่')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;

DROP POLICY IF EXISTS design_drill_reroll_admin_select ON public.design_drill_reroll_usage;
CREATE POLICY design_drill_reroll_admin_select ON public.design_drill_reroll_usage
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- 20260618120000_document_signatures.sql
﻿-- Document signatures: freelancer PNG + client online/wet sign via /sign/:token
-- Storage: reuse bucket brand-logos — {userId}/signature-*, {quotationId}/client-sign-*

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS esign_acknowledged_at timestamptz;

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS signature_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS include_freelancer_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sign_share_token uuid,
  ADD COLUMN IF NOT EXISTS client_signer_name text,
  ADD COLUMN IF NOT EXISTS client_signature_url text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_sign_method text,
  ADD COLUMN IF NOT EXISTS client_signer_ip text,
  ADD COLUMN IF NOT EXISTS client_signer_user_agent text,
  ADD COLUMN IF NOT EXISTS signed_document_url text,
  ADD COLUMN IF NOT EXISTS signature_consent_version text;

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_signature_mode_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_signature_mode_check
  CHECK (signature_mode = ANY (ARRAY['none'::text, 'embedded'::text, 'online'::text, 'wet'::text]));

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_client_sign_method_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_client_sign_method_check
  CHECK (client_sign_method IS NULL OR client_sign_method = ANY (ARRAY['draw'::text, 'full_document'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS quotations_sign_share_token_key ON public.quotations (sign_share_token)
  WHERE sign_share_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_quotation_id_by_sign_token(_token uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT id FROM public.quotations WHERE sign_share_token = _token LIMIT 1),
    (SELECT quotation_id FROM public.job_trackers WHERE share_token = _token AND quotation_id IS NOT NULL LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_quotation_sign_payload_by_token(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  qid uuid;
  q public.quotations%ROWTYPE;
  prof public.profiles%ROWTYPE;
BEGIN
  qid := public.resolve_quotation_id_by_sign_token(_token);
  IF qid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = qid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = q.user_id;
  RETURN jsonb_build_object(
    'quotation_id', q.id,
    'number', q.number,
    'project_name', q.project_name,
    'client_name', q.client_name,
    'status', q.status,
    'signature_mode', q.signature_mode,
    'include_freelancer_signature', q.include_freelancer_signature,
    'client_signed_at', q.client_signed_at,
    'client_signer_name', q.client_signer_name,
    'client_signature_url', q.client_signature_url,
    'signed_document_url', q.signed_document_url,
    'client_sign_method', q.client_sign_method,
    'items', q.items,
    'addons', q.addons,
    'difficulties', q.difficulties,
    'milestones', q.milestones,
    'hidden_cost', q.hidden_cost,
    'discount_value', q.discount_value,
    'discount_kind', q.discount_kind,
    'vat_enabled', q.vat_enabled,
    'vat_rate', q.vat_rate,
    'wht_enabled', q.wht_enabled,
    'wht_rate', q.wht_rate,
    'deposit_preset', q.deposit_preset,
    'payment_terms', q.payment_terms,
    'notes', q.notes,
    'revisions_count', q.revisions_count,
    'brand_name', COALESCE(prof.brand_name, prof.display_name, 'So1o Freelancer'),
    'logo_url', prof.logo_url,
    'freelancer_signature_url', CASE WHEN q.include_freelancer_signature THEN prof.signature_url ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sign_quotation_by_token(
  _token uuid, _name text, _method text,
  _signature_url text DEFAULT NULL, _signed_document_url text DEFAULT NULL,
  _consent_version text DEFAULT NULL, _signer_ip text DEFAULT NULL, _signer_ua text DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE qid uuid; q public.quotations%ROWTYPE;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;
  IF _method NOT IN ('draw', 'full_document') THEN RAISE EXCEPTION 'invalid sign method'; END IF;
  IF _method = 'draw' AND (_signature_url IS NULL OR length(trim(_signature_url)) = 0) THEN RAISE EXCEPTION 'signature image required'; END IF;
  IF _method = 'full_document' AND (_signed_document_url IS NULL OR length(trim(_signed_document_url)) = 0) THEN RAISE EXCEPTION 'signed document required'; END IF;
  qid := public.resolve_quotation_id_by_sign_token(_token);
  IF qid IS NULL THEN RETURN false; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = qid FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF q.client_signed_at IS NOT NULL THEN RETURN false; END IF;
  IF q.signature_mode NOT IN ('online', 'wet') THEN RAISE EXCEPTION 'document does not accept online signing'; END IF;
  UPDATE public.quotations SET
    client_signer_name = left(trim(_name), 120),
    client_signature_url = CASE WHEN _method = 'draw' THEN left(trim(_signature_url), 2048) ELSE client_signature_url END,
    signed_document_url = CASE WHEN _method = 'full_document' THEN left(trim(_signed_document_url), 2048) ELSE signed_document_url END,
    client_signed_at = now(), client_sign_method = _method,
    client_signer_ip = left(coalesce(_signer_ip, ''), 64),
    client_signer_user_agent = left(coalesce(_signer_ua, ''), 512),
    signature_consent_version = left(coalesce(_consent_version, ''), 32),
    updated_at = now()
  WHERE id = qid;
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_quotation_sign_payload_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_quotation_by_token(uuid, text, text, text, text, text, text, text) TO anon, authenticated;


-- 20260618120000_meeting_captures.sql
-- Meeting Capture MVP: table, storage bucket, free monthly quota, AI feature costs

CREATE TABLE IF NOT EXISTS public.meeting_captures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.saved_clients(id) ON DELETE SET NULL,
  title           text,
  source_type     text NOT NULL CHECK (source_type IN (
    'audio_upload', 'audio_record', 'video_upload', 'video_record'
  )),
  media_path      text,
  media_mime      text,
  duration_sec    integer,
  file_size_bytes bigint,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'extracting', 'ready', 'failed'
  )),
  transcript      text,
  summary_bullets text[],
  extract_result  jsonb,
  quality_score   numeric(3,2),
  brief_id        uuid REFERENCES public.design_briefs(id) ON DELETE SET NULL,
  error_message   text,
  credits_transcribe integer NOT NULL DEFAULT 0,
  credits_extract    integer NOT NULL DEFAULT 0,
  used_free_slot     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_captures_user_created_idx
  ON public.meeting_captures (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_captures TO authenticated;
GRANT ALL ON public.meeting_captures TO service_role;

ALTER TABLE public.meeting_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_captures_user_select ON public.meeting_captures;
CREATE POLICY meeting_captures_user_select ON public.meeting_captures
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_insert ON public.meeting_captures;
CREATE POLICY meeting_captures_user_insert ON public.meeting_captures
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_update ON public.meeting_captures;
CREATE POLICY meeting_captures_user_update ON public.meeting_captures
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_user_delete ON public.meeting_captures;
CREATE POLICY meeting_captures_user_delete ON public.meeting_captures
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_captures_service_role ON public.meeting_captures;
CREATE POLICY meeting_captures_service_role ON public.meeting_captures
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_meeting_captures_updated_at ON public.meeting_captures;
CREATE TRIGGER trg_meeting_captures_updated_at
  BEFORE UPDATE ON public.meeting_captures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meeting_free_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year_month)
);

GRANT SELECT ON public.meeting_free_usage TO authenticated;
GRANT ALL ON public.meeting_free_usage TO service_role;
ALTER TABLE public.meeting_free_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_free_usage_user_select ON public.meeting_free_usage;
CREATE POLICY meeting_free_usage_user_select ON public.meeting_free_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meeting_free_usage_service_role ON public.meeting_free_usage;
CREATE POLICY meeting_free_usage_service_role ON public.meeting_free_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_meeting_free_slot(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tier text;
  _ym text := to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM');
  _count integer;
BEGIN
  SELECT COALESCE(subscription_tier, 'free') INTO _tier FROM public.profiles WHERE user_id = _user_id;
  IF _tier IS DISTINCT FROM 'free' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_free_tier');
  END IF;
  INSERT INTO public.meeting_free_usage (user_id, year_month, used_count) VALUES (_user_id, _ym, 0)
  ON CONFLICT (user_id, year_month) DO NOTHING;
  SELECT used_count INTO _count FROM public.meeting_free_usage
   WHERE user_id = _user_id AND year_month = _ym FOR UPDATE;
  IF _count >= 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached');
  END IF;
  UPDATE public.meeting_free_usage SET used_count = used_count + 1, updated_at = now()
   WHERE user_id = _user_id AND year_month = _ym;
  RETURN jsonb_build_object('allowed', true, 'year_month', _ym);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_meeting_free_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meeting_free_slot(uuid) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meeting-captures', 'meeting-captures', false, 524288000,
  ARRAY['audio/mpeg','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/webm','audio/ogg','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS meeting_captures_storage_select ON storage.objects;
CREATE POLICY meeting_captures_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_insert ON storage.objects;
CREATE POLICY meeting_captures_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_update ON storage.objects;
CREATE POLICY meeting_captures_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_delete ON storage.objects;
CREATE POLICY meeting_captures_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS meeting_captures_storage_service ON storage.objects;
CREATE POLICY meeting_captures_storage_service ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'meeting-captures') WITH CHECK (bucket_id = 'meeting-captures');

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_meeting_transcribe_15', 3, 'จดประชุม AI — ถอดเสียง ≤15 นาที'),
  ('ai_meeting_transcribe_30', 4, 'จดประชุม AI — ถอดเสียง ≤30 นาที'),
  ('ai_meeting_transcribe_45', 5, 'จดประชุม AI — ถอดเสียง ≤45 นาที'),
  ('ai_meeting_transcribe_60', 6, 'จดประชุม AI — ถอดเสียง ≤60 นาที'),
  ('ai_meeting_brief_extract_15', 9, 'จดประชุม AI — สรุปบรีฟ ≤15 นาที'),
  ('ai_meeting_brief_extract_30', 14, 'จดประชุม AI — สรุปบรีฟ ≤30 นาที'),
  ('ai_meeting_brief_extract_45', 19, 'จดประชุม AI — สรุปบรีฟ ≤45 นาที'),
  ('ai_meeting_brief_extract_60', 24, 'Meeting — สรุปบรีฟ ≤60 นาที')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;


-- 20260618120000_member_code_search.sql
﻿-- Member code search
CREATE OR REPLACE FUNCTION public.admin_search_users(_query text, _limit int DEFAULT 25)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  subscription_tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(_query, ''));
  member_suffix text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF q ~ '^S?[0-9A-Fa-f]{7}$' THEN
    member_suffix := upper(regexp_replace(q, '^S', ''));
  ELSE
    member_suffix := NULL;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.username,
    p.subscription_tier,
    p.created_at
  FROM public.profiles p
  WHERE
    member_suffix IS NOT NULL
    AND upper(right(replace(p.user_id::text, '-', ''), 7)) = member_suffix
  OR (
    member_suffix IS NULL
    AND (
      q = ''
      OR p.display_name ILIKE '%' || q || '%'
      OR p.email ILIKE '%' || q || '%'
      OR p.username ILIKE '%' || q || '%'
      OR p.user_id::text ILIKE q || '%'
    )
  )
  ORDER BY p.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 25), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_users(text, int) TO authenticated;


-- 20260618130000_color_palettes.sql
-- Creative Labs: saved color palettes per user

CREATE TABLE IF NOT EXISTS public.color_palettes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.color_palette_colors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid NOT NULL REFERENCES public.color_palettes(id) ON DELETE CASCADE,
  hex        text NOT NULL,
  label      text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS color_palettes_user_idx ON public.color_palettes(user_id);
CREATE INDEX IF NOT EXISTS color_palette_colors_palette_idx ON public.color_palette_colors(palette_id);

ALTER TABLE public.color_palettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_palette_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY color_palettes_select ON public.color_palettes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY color_palettes_insert ON public.color_palettes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY color_palettes_update ON public.color_palettes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY color_palettes_delete ON public.color_palettes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY color_palette_colors_select ON public.color_palette_colors
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_insert ON public.color_palette_colors
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_update ON public.color_palette_colors
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

CREATE POLICY color_palette_colors_delete ON public.color_palette_colors
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.color_palettes p
    WHERE p.id = palette_id AND p.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_palettes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_palette_colors TO authenticated;
GRANT ALL ON public.color_palettes TO service_role;
GRANT ALL ON public.color_palette_colors TO service_role;


-- 20260618130200_admin_user_360_and_ecosystem_ops.sql
-- Admin User 360 + Ecosystem Ops dashboard stats (Ops Hub + So1o Mission Control)

CREATE OR REPLACE FUNCTION public.admin_user_360(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _profile jsonb;
  _quotations integer := 0;
  _open_tickets integer := 0;
  _meeting_captures integer := 0;
  _meeting_recent jsonb := '[]'::jsonb;
  _drill_rerolls_today integer := 0;
  _projects integer := 0;
  _published integer := 0;
  _feedback integer := 0;
  _drill_posts integer := 0;
  _cross_links integer := 0;
  _converted_links integer := 0;
  _drill_links integer := 0;
  _recent_links jsonb := '[]'::jsonb;
  _recent_events jsonb := '[]'::jsonb;
  _day text := public._design_drill_day_key();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'username', p.username,
    'subscription_tier', p.subscription_tier,
    'created_at', p.created_at
  )
  INTO _profile
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF _profile IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer INTO _quotations
  FROM public.quotations q WHERE q.user_id = _user_id;

  SELECT count(*)::integer INTO _open_tickets
  FROM public.support_tickets t
  WHERE t.user_id = _user_id
    AND t.status NOT IN ('closed', 'wont_fix');

  SELECT count(*)::integer INTO _meeting_captures
  FROM public.meeting_captures mc WHERE mc.user_id = _user_id;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _meeting_recent
  FROM (
    SELECT mc.id, mc.title, mc.status, mc.duration_sec, mc.created_at
    FROM public.meeting_captures mc
    WHERE mc.user_id = _user_id
    ORDER BY mc.created_at DESC
    LIMIT 3
  ) x;

  SELECT coalesce(u.used_count, 0)::integer INTO _drill_rerolls_today
  FROM public.design_drill_reroll_usage u
  WHERE u.user_id = _user_id AND u.day_key = _day;

  SELECT count(*)::integer INTO _projects
  FROM anthem.projects pr WHERE pr.owner_id = _user_id;

  SELECT count(*)::integer INTO _published
  FROM anthem.projects pr
  WHERE pr.owner_id = _user_id AND pr.status = 'Published';

  SELECT count(*)::integer INTO _drill_posts
  FROM anthem.projects pr
  WHERE pr.owner_id = _user_id
    AND pr.tags @> ARRAY['So1oDrill']::text[];

  BEGIN
    SELECT count(*)::integer INTO _feedback
    FROM anthem.app_feedback af WHERE af.user_id = _user_id;
  EXCEPTION WHEN undefined_table THEN
    _feedback := 0;
  END;

  SELECT count(*)::integer INTO _cross_links
  FROM public.ecosystem_links el WHERE el.user_id = _user_id;

  SELECT count(*)::integer INTO _converted_links
  FROM public.ecosystem_links el
  WHERE el.user_id = _user_id
    AND el.meta ? 'converted_at'
    AND el.meta->>'converted_at' IS NOT NULL
    AND el.meta->>'converted_at' <> '';

  SELECT count(*)::integer INTO _drill_links
  FROM public.ecosystem_links el
  WHERE el.user_id = _user_id AND el.source_page = 'design_drill';

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _recent_links
  FROM (
    SELECT el.id, el.source_app, el.source_page, el.created_at,
      (el.meta ? 'converted_at' AND el.meta->>'converted_at' IS NOT NULL AND el.meta->>'converted_at' <> '') AS converted
    FROM public.ecosystem_links el
    WHERE el.user_id = _user_id
    ORDER BY el.created_at DESC
    LIMIT 8
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _recent_events
  FROM (
    SELECT pe.event_type, pe.created_at, pe.target_type
    FROM public.platform_events pe
    WHERE pe.actor_id = _user_id
    ORDER BY pe.created_at DESC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'profile', _profile,
    'so1o', jsonb_build_object(
      'quotations', _quotations,
      'open_tickets', _open_tickets,
      'meeting_captures', _meeting_captures,
      'meeting_captures_recent', _meeting_recent,
      'drill_rerolls_today', _drill_rerolls_today
    ),
    'an1hem', jsonb_build_object(
      'projects', _projects,
      'published', _published,
      'feedback', _feedback,
      'drill_posts', _drill_posts
    ),
    'ecosystem', jsonb_build_object(
      'cross_links', _cross_links,
      'converted_links', _converted_links,
      'drill_links', _drill_links
    ),
    'recent_links', _recent_links,
    'recent_events', _recent_events
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_ecosystem_ops_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _since_7d timestamptz := now() - interval '7 days';
  _rerolls_today integer := 0;
  _rerolls_7d integer := 0;
  _drill_links_7d integer := 0;
  _drill_converted_7d integer := 0;
  _drill_posts_total integer := 0;
  _top_users jsonb := '[]'::jsonb;
  _captures_total integer := 0;
  _by_status jsonb := '{}'::jsonb;
  _meeting_credits_7d integer := 0;
  _meeting_recent jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT coalesce(sum(used_count), 0)::integer INTO _rerolls_today
  FROM public.design_drill_reroll_usage
  WHERE day_key = _day;

  SELECT coalesce(sum(used_count), 0)::integer INTO _rerolls_7d
  FROM public.design_drill_reroll_usage
  WHERE updated_at >= _since_7d;

  SELECT count(*)::integer INTO _drill_links_7d
  FROM public.ecosystem_links el
  WHERE el.source_page = 'design_drill'
    AND el.created_at >= _since_7d;

  SELECT count(*)::integer INTO _drill_converted_7d
  FROM public.ecosystem_links el
  WHERE el.source_page = 'design_drill'
    AND el.created_at >= _since_7d
    AND el.meta ? 'converted_at'
    AND el.meta->>'converted_at' IS NOT NULL
    AND el.meta->>'converted_at' <> '';

  SELECT count(*)::integer INTO _drill_posts_total
  FROM anthem.projects pr
  WHERE pr.tags @> ARRAY['So1oDrill']::text[];

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.score DESC), '[]'::jsonb)
  INTO _top_users
  FROM (
    SELECT
      coalesce(r.user_id, l.user_id) AS user_id,
      coalesce(r.used_count, 0) AS rerolls_today,
      coalesce(l.link_count, 0) AS drill_links_7d,
      (coalesce(r.used_count, 0) + coalesce(l.link_count, 0)) AS score
    FROM (
      SELECT user_id, used_count
      FROM public.design_drill_reroll_usage
      WHERE day_key = _day AND used_count > 0
    ) r
    FULL OUTER JOIN (
      SELECT user_id, count(*)::integer AS link_count
      FROM public.ecosystem_links
      WHERE source_page = 'design_drill' AND created_at >= _since_7d
      GROUP BY user_id
    ) l ON l.user_id = r.user_id
    ORDER BY (coalesce(r.used_count, 0) + coalesce(l.link_count, 0)) DESC
    LIMIT 15
  ) x;

  SELECT count(*)::integer INTO _captures_total
  FROM public.meeting_captures;

  SELECT coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO _by_status
  FROM (
    SELECT status, count(*)::integer AS cnt
    FROM public.meeting_captures
    GROUP BY status
  ) s;

  SELECT coalesce(sum(cost), 0)::integer INTO _meeting_credits_7d
  FROM public.ai_credit_ledger
  WHERE created_at >= _since_7d
    AND feature LIKE 'ai_meeting_%';

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _meeting_recent
  FROM (
    SELECT mc.id, mc.user_id, mc.title, mc.status, mc.duration_sec, mc.created_at
    FROM public.meeting_captures mc
    ORDER BY mc.created_at DESC
    LIMIT 20
  ) x;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'day_key', _day,
    'drill', jsonb_build_object(
      'rerolls_today', _rerolls_today,
      'rerolls_7d', _rerolls_7d,
      'cross_links_7d', _drill_links_7d,
      'cross_links_converted_7d', _drill_converted_7d,
      'conversion_pct', CASE
        WHEN _drill_links_7d > 0 THEN round((_drill_converted_7d::numeric / _drill_links_7d) * 100)
        ELSE 0
      END,
      'drill_posts_total', _drill_posts_total,
      'top_users', _top_users
    ),
    'meeting', jsonb_build_object(
      'captures_total', _captures_total,
      'by_status', _by_status,
      'credits_7d', _meeting_credits_7d,
      'recent', _meeting_recent
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ecosystem_ops_stats() TO authenticated;


-- 20260619120000_feed_interests.sql
-- Feed interest survey: cold-start personalization for Explore feed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feed_interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feed_interests_at timestamptz;

COMMENT ON COLUMN public.profiles.feed_interests IS 'Canonical project categories selected in onboarding survey (Graphic, Web/UI, …)';
COMMENT ON COLUMN public.profiles.feed_interests_at IS 'When user completed or skipped the feed interest survey';


-- 20260619120000_meeting_report.sql
-- Meeting report: report_markdown, credits_report, reporting status, ai_meeting_report credits

ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS report_markdown text,
  ADD COLUMN IF NOT EXISTS credits_report integer NOT NULL DEFAULT 0;

ALTER TABLE public.meeting_captures DROP CONSTRAINT IF EXISTS meeting_captures_status_check;
ALTER TABLE public.meeting_captures ADD CONSTRAINT meeting_captures_status_check
  CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'reporting', 'extracting', 'ready', 'failed'
  ));

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_meeting_report_15', 5, 'Meeting — สรุปรายงาน ≤15 นาที'),
  ('ai_meeting_report_30', 7, 'Meeting — สรุปรายงาน ≤30 นาที'),
  ('ai_meeting_report_45', 9, 'Meeting — สรุปรายงาน ≤45 นาที'),
  ('ai_meeting_report_60', 10, 'Meeting — สรุปรายงาน ≤60 นาที')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;


-- 20260619180000_community_feed_enhancements.sql
-- Community feed: tables, media, Q&A topics, report target types
-- Schema: anthem (Pixel100 / an1hem)

CREATE TABLE IF NOT EXISTS anthem.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_kind text NOT NULL CHECK (post_kind IN ('tip', 'question')),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'Graphic',
  tags text[] NOT NULL DEFAULT '{}',
  gallery_urls text[] NOT NULL DEFAULT '{}',
  video_urls text[] NOT NULL DEFAULT '{}',
  question_topic text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'draft')),
  reply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS question_topic text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_question_topic_chk'
  ) THEN
    ALTER TABLE anthem.community_posts
      ADD CONSTRAINT community_posts_question_topic_chk
      CHECK (
        question_topic IS NULL
        OR question_topic IN (
          'feedback', 'technique', 'tools', 'career', 'client', 'inspiration', 'other'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON anthem.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_kind
  ON anthem.community_posts (post_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status
  ON anthem.community_posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES anthem.community_post_comments(id) ON DELETE CASCADE,
  depth integer NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post
  ON anthem.community_post_comments (post_id, created_at ASC);

CREATE OR REPLACE FUNCTION anthem.community_post_reply_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.community_posts
       SET reply_count = reply_count + 1,
           updated_at = now()
     WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.community_posts
       SET reply_count = GREATEST(0, reply_count - 1),
           updated_at = now()
     WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_reply_count_ins ON anthem.community_post_comments;
CREATE TRIGGER trg_community_post_reply_count_ins
  AFTER INSERT ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_reply_count_sync();

DROP TRIGGER IF EXISTS trg_community_post_reply_count_del ON anthem.community_post_comments;
CREATE TRIGGER trg_community_post_reply_count_del
  AFTER DELETE ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_reply_count_sync();

ALTER TABLE anthem.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_public_read" ON anthem.community_posts;
CREATE POLICY "community_posts_public_read"
  ON anthem.community_posts FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_author_write" ON anthem.community_posts;
CREATE POLICY "community_posts_author_write"
  ON anthem.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_author_update" ON anthem.community_posts;
CREATE POLICY "community_posts_author_update"
  ON anthem.community_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_public_read" ON anthem.community_post_comments;
CREATE POLICY "community_comments_public_read"
  ON anthem.community_post_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "community_comments_author_write" ON anthem.community_post_comments;
CREATE POLICY "community_comments_author_write"
  ON anthem.community_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON anthem.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE ON anthem.community_posts TO authenticated;
GRANT SELECT, INSERT ON anthem.community_post_comments TO authenticated;
GRANT ALL ON anthem.community_posts TO service_role;
GRANT ALL ON anthem.community_post_comments TO service_role;

-- Extend report target types (create_report RPC)
CREATE OR REPLACE FUNCTION public.create_report(
  _target_type text,
  _target_id uuid,
  _target_owner_id uuid,
  _reason text,
  _details text DEFAULT '',
  _evidence_urls text[] DEFAULT '{}',
  _evidence_files jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  _reporter_id uuid := auth.uid();
  _report_id uuid;
  _allowed_types text[] := ARRAY[
    'user', 'project', 'comment', 'studio', 'message', 'job',
    'community_post', 'community_comment'
  ];
  _allowed_reasons text[] := ARRAY[
    'spam', 'harassment', 'nsfw', 'copyright', 'scam', 'impersonation', 'other'
  ];
  _recent int;
BEGIN
  IF _reporter_id IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF NOT (_target_type = ANY(_allowed_types)) THEN
    RAISE EXCEPTION 'INVALID: target_type ไม่ถูกต้อง';
  END IF;

  IF NOT (_reason = ANY(_allowed_reasons)) THEN
    RAISE EXCEPTION 'INVALID: reason ไม่ถูกต้อง';
  END IF;

  IF _target_owner_id IS NOT NULL AND _target_owner_id = _reporter_id THEN
    RAISE EXCEPTION 'INVALID: ไม่สามารถรายงานเนื้อหาของตัวเอง';
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.user_reports
  WHERE reporter_id = _reporter_id
    AND created_at > now() - interval '1 hour';

  IF _recent >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: รายงานได้ไม่เกิน 10 ครั้งต่อชั่วโมง';
  END IF;

  IF EXISTS (
    SELECT 1 FROM anthem.user_reports
    WHERE reporter_id = _reporter_id
      AND target_type = _target_type
      AND target_id = _target_id
      AND status IN ('open', 'reviewing')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE: คุณรายงานเนื้อหานี้ไปแล้ว';
  END IF;

  INSERT INTO anthem.user_reports (
    reporter_id, target_type, target_id, target_owner_id,
    reason, details, evidence_urls, evidence_files, status
  ) VALUES (
    _reporter_id, _target_type, _target_id, _target_owner_id,
    _reason, coalesce(_details, ''), coalesce(_evidence_urls, '{}'),
    coalesce(_evidence_files, '[]'::jsonb), 'open'
  )
  RETURNING id INTO _report_id;

  INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
  VALUES (
    'report.created', _reporter_id, _target_type, _target_id::text,
    jsonb_build_object('reason', _reason, 'report_id', _report_id)
  );

  RETURN _report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) TO authenticated;


-- 20260619190000_community_social_platform.sql
-- Community social platform: likes, saves, views, blocks, notifications helpers

ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS anthem.community_post_likes (
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_user
  ON anthem.community_post_likes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_bookmarks (
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_bookmarks_user
  ON anthem.community_post_bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_views_post
  ON anthem.community_post_views (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE OR REPLACE FUNCTION anthem.community_post_like_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.community_posts SET like_count = like_count + 1, updated_at = now() WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.community_posts SET like_count = GREATEST(0, like_count - 1), updated_at = now() WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_like_ins ON anthem.community_post_likes;
CREATE TRIGGER trg_community_post_like_ins
  AFTER INSERT ON anthem.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_like_count_sync();

DROP TRIGGER IF EXISTS trg_community_post_like_del ON anthem.community_post_likes;
CREATE TRIGGER trg_community_post_like_del
  AFTER DELETE ON anthem.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_like_count_sync();

CREATE OR REPLACE FUNCTION public.increment_community_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.community_posts
     SET view_count = view_count + 1,
         updated_at = now()
   WHERE id = _post_id
     AND status = 'published';

  INSERT INTO anthem.community_post_views (post_id, user_id)
  VALUES (_post_id, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.increment_community_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_community_event(
  _recipient_id uuid,
  _kind text,
  _title text,
  _body text,
  _link text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem
AS $$
BEGIN
  IF _recipient_id IS NULL OR _recipient_id = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata, is_read, is_dismissed)
  VALUES (_recipient_id, 'anthem', _kind, _title, _body, _link, _metadata, false, false);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb) TO authenticated;

ALTER TABLE anthem.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_likes_public_read" ON anthem.community_post_likes;
CREATE POLICY "community_likes_public_read"
  ON anthem.community_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_likes_own_write" ON anthem.community_post_likes;
CREATE POLICY "community_likes_own_write"
  ON anthem.community_post_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_bookmarks_own" ON anthem.community_post_bookmarks;
CREATE POLICY "community_bookmarks_own"
  ON anthem.community_post_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_views_insert" ON anthem.community_post_views;
CREATE POLICY "community_views_insert"
  ON anthem.community_post_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "community_views_read" ON anthem.community_post_views;
CREATE POLICY "community_views_read"
  ON anthem.community_post_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_blocks_own" ON anthem.user_blocks;
CREATE POLICY "user_blocks_own"
  ON anthem.user_blocks FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

GRANT SELECT ON anthem.community_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.community_post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.community_post_bookmarks TO authenticated;
GRANT SELECT, INSERT ON anthem.community_post_views TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.user_blocks TO authenticated;

-- Authors may soft-delete (hide) own posts
DROP POLICY IF EXISTS "community_posts_author_delete" ON anthem.community_posts;
CREATE POLICY "community_posts_author_delete"
  ON anthem.community_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

GRANT DELETE ON anthem.community_posts TO authenticated;


-- 20260619210000_boost_escrow_payments.sql
-- Boost (self-serve post promotion) + Escrow marketplace
-- Apply after stripe-payments.sql on unified Supabase project rvnzjiskqliexysicfmh

-- ---------------------------------------------------------------------------
-- Extend stripe_checkout_fulfillments kinds
-- ---------------------------------------------------------------------------

ALTER TABLE public.stripe_checkout_fulfillments
  DROP CONSTRAINT IF EXISTS stripe_checkout_fulfillments_kind_check;

ALTER TABLE public.stripe_checkout_fulfillments
  ADD CONSTRAINT stripe_checkout_fulfillments_kind_check
  CHECK (kind IN ('credits', 'px', 'boost', 'ad', 'escrow'));

-- ---------------------------------------------------------------------------
-- anthem.post_boosts — creator self-serve promotion
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anthem.post_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('project', 'community_post')),
  target_id uuid NOT NULL,
  package text NOT NULL CHECK (package IN ('micro_3', 'micro_7', 'micro_14')),
  amount_thb integer NOT NULL CHECK (amount_thb > 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'expired', 'cancelled')),
  stripe_session_id text,
  start_at timestamptz,
  end_at timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_boosts_active
  ON anthem.post_boosts (status, end_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_post_boosts_target
  ON anthem.post_boosts (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_post_boosts_user
  ON anthem.post_boosts (user_id, created_at DESC);

ALTER TABLE anthem.post_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_boosts_owner_select ON anthem.post_boosts;
CREATE POLICY post_boosts_owner_select ON anthem.post_boosts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_boosts_public_active ON anthem.post_boosts;
CREATE POLICY post_boosts_public_active ON anthem.post_boosts
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (end_at IS NULL OR end_at > now()));

GRANT SELECT ON anthem.post_boosts TO anon, authenticated;
GRANT ALL ON anthem.post_boosts TO service_role;

-- ---------------------------------------------------------------------------
-- shared.marketplace_escrows — client payment held until approve
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.marketplace_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hiring_request_id uuid,
  quotation_id uuid,
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  amount_thb integer NOT NULL CHECK (amount_thb > 0),
  platform_fee_pct numeric(5,4) NOT NULL CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 1),
  platform_fee_thb integer NOT NULL DEFAULT 0 CHECK (platform_fee_thb >= 0),
  net_payout_thb integer NOT NULL CHECK (net_payout_thb >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  portal_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_payment', 'funded', 'in_progress',
      'pending_release', 'released', 'disputed', 'refunded', 'cancelled'
    )),
  funded_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  disputed_at timestamptz,
  dispute_reason text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_freelancer
  ON shared.marketplace_escrows (freelancer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_portal
  ON shared.marketplace_escrows (portal_token);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_status
  ON shared.marketplace_escrows (status);

ALTER TABLE shared.marketplace_escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_escrows_freelancer_select ON shared.marketplace_escrows;
CREATE POLICY marketplace_escrows_freelancer_select ON shared.marketplace_escrows
  FOR SELECT TO authenticated
  USING (auth.uid() = freelancer_user_id);

GRANT SELECT ON shared.marketplace_escrows TO authenticated;
GRANT ALL ON shared.marketplace_escrows TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.escrow_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id),
      'free'
    ) IN ('pro', 'pro_plus', 'inhouse') THEN 0.05
    ELSE 0.10
  END;
$$;

REVOKE ALL ON FUNCTION public.escrow_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escrow_platform_fee_pct(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assert_connect_payouts_ready(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND connect_payouts_enabled = true
      AND connect_onboarding_complete = true
  ) THEN
    RAISE EXCEPTION 'CONNECT_REQUIRED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_connect_payouts_ready(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_connect_payouts_ready(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Boost RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_post_boost(
  _target_type text,
  _target_id uuid,
  _package text
)
RETURNS anthem.post_boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row anthem.post_boosts%ROWTYPE;
  _amount integer;
  _days integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _target_type NOT IN ('project', 'community_post') THEN RAISE EXCEPTION 'INVALID_TARGET_TYPE'; END IF;
  IF _package NOT IN ('micro_3', 'micro_7', 'micro_14') THEN RAISE EXCEPTION 'INVALID_PACKAGE'; END IF;

  _amount := CASE _package WHEN 'micro_3' THEN 99 WHEN 'micro_7' THEN 249 WHEN 'micro_14' THEN 499 END;
  _days := CASE _package WHEN 'micro_3' THEN 3 WHEN 'micro_7' THEN 7 WHEN 'micro_14' THEN 14 END;

  IF _target_type = 'project' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = _target_id AND owner_id = _uid AND status = 'Published'
    ) THEN
      RAISE EXCEPTION 'NOT_OWNER_OR_NOT_PUBLISHED';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM anthem.community_posts
      WHERE id = _target_id AND author_id = _uid AND status = 'published'
    ) THEN
      RAISE EXCEPTION 'NOT_OWNER_OR_NOT_PUBLISHED';
    END IF;
  END IF;

  INSERT INTO anthem.post_boosts (
    user_id, target_type, target_id, package, amount_thb, duration_days, status
  ) VALUES (
    _uid, _target_type, _target_id, _package, _amount, _days, 'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_boost(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post_boost(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_boost(text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_post_boost_stripe(
  _stripe_session_id text,
  _boost_id uuid,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
)
RETURNS anthem.post_boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _row anthem.post_boosts%ROWTYPE;
  _days integer;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM anthem.post_boosts WHERE id = _boost_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM anthem.post_boosts WHERE id = _boost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('pending_payment', 'active') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  _days := _row.duration_days;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.user_id, 'boost', _price_id, 1, _environment
  );

  UPDATE anthem.post_boosts SET
    status = 'active',
    stripe_session_id = _stripe_session_id,
    start_at = now(),
    end_at = now() + (_days || ' days')::interval,
    updated_at = now()
  WHERE id = _boost_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_ad_payment_stripe(
  _stripe_session_id text,
  _application_id uuid,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
)
RETURNS anthem.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _row anthem.ad_applications%ROWTYPE;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM anthem.ad_applications WHERE id = _application_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM anthem.ad_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status IS DISTINCT FROM 'pending_payment' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.user_id, 'ad', _price_id, 1, _environment
  );

  UPDATE anthem.ad_applications SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = _application_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_ad_payment_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ad_payment_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_active_boosts(_limit integer DEFAULT 50)
RETURNS TABLE (
  boost_id uuid,
  target_type text,
  target_id uuid,
  end_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem
AS $$
  SELECT id, target_type, target_id, end_at
  FROM anthem.post_boosts
  WHERE status = 'active'
    AND end_at > now()
  ORDER BY end_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_active_boosts(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_boost_event(
  _boost_id uuid,
  _event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF _event_type NOT IN ('impression', 'click') THEN RAISE EXCEPTION 'INVALID_EVENT'; END IF;
  IF _event_type = 'impression' THEN
    UPDATE anthem.post_boosts SET impressions = impressions + 1, updated_at = now()
    WHERE id = _boost_id AND status = 'active';
  ELSE
    UPDATE anthem.post_boosts SET clicks = clicks + 1, updated_at = now()
    WHERE id = _boost_id AND status = 'active';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_boost_event(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_post_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
DECLARE
  _n integer;
BEGIN
  UPDATE anthem.post_boosts SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND end_at <= now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_post_boosts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_post_boosts() TO service_role;

-- ---------------------------------------------------------------------------
-- Escrow RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_escrow_from_quotation(
  _quotation_id uuid,
  _amount_thb integer DEFAULT NULL
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _q record;
  _fee_pct numeric;
  _fee integer;
  _net integer;
  _amt integer;
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  PERFORM public.assert_connect_payouts_ready(_uid);

  SELECT id, user_id, project_name, client_name, client_email
    INTO _q
    FROM public.quotations
   WHERE id = _quotation_id AND user_id = _uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'QUOTATION_NOT_FOUND'; END IF;

  _amt := COALESCE(_amount_thb, 0);
  IF _amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  _fee_pct := public.escrow_platform_fee_pct(_uid);
  _fee := ROUND(_amt * _fee_pct);
  _net := _amt - _fee;

  INSERT INTO shared.marketplace_escrows (
    freelancer_user_id, quotation_id, client_name, client_email, title,
    amount_thb, platform_fee_pct, platform_fee_thb, net_payout_thb, status
  ) VALUES (
    _uid, _quotation_id,
    COALESCE(_q.client_name, ''),
    COALESCE(_q.client_email, ''),
    COALESCE(_q.project_name, 'งานฟรีแลนซ์'),
    _amt, _fee_pct, _fee, _net,
    'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_escrow_from_quotation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_quotation(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_quotation(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.create_escrow_from_hire(_hiring_request_id uuid)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _h record;
  _fee_pct numeric;
  _fee integer;
  _amt integer;
  _net integer;
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  PERFORM public.assert_connect_payouts_ready(_uid);

  SELECT id, freelancer_id, client_name, email, project_title, budget_amount
    INTO _h
    FROM anthem.hiring_requests
   WHERE id = _hiring_request_id AND freelancer_id = _uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'HIRE_NOT_FOUND'; END IF;
  _amt := COALESCE(ROUND(_h.budget_amount)::integer, 0);
  IF _amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  _fee_pct := public.escrow_platform_fee_pct(_uid);
  _fee := ROUND(_amt * _fee_pct);
  _net := _amt - _fee;

  INSERT INTO shared.marketplace_escrows (
    freelancer_user_id, hiring_request_id, client_name, client_email, title,
    amount_thb, platform_fee_pct, platform_fee_thb, net_payout_thb, status
  ) VALUES (
    _uid, _hiring_request_id,
    COALESCE(_h.client_name, ''),
    COALESCE(_h.email, ''),
    COALESCE(_h.project_title, 'งานจ้าง'),
    _amt, _fee_pct, _fee, _net,
    'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_escrow_from_hire(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_hire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_hire(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_escrow_by_portal_token(_portal_token uuid)
RETURNS shared.marketplace_escrows
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared
AS $$
  SELECT * FROM shared.marketplace_escrows WHERE portal_token = _portal_token LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_escrow_by_portal_token(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fulfill_escrow_payment_stripe(
  _stripe_session_id text,
  _escrow_id uuid,
  _payment_intent_id text DEFAULT NULL,
  _environment text DEFAULT 'sandbox'
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('pending_payment', 'draft') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.freelancer_user_id, 'escrow', 'escrow_deposit', 1, _environment
  );

  UPDATE shared.marketplace_escrows SET
    status = 'funded',
    stripe_checkout_session_id = _stripe_session_id,
    stripe_payment_intent_id = COALESCE(_payment_intent_id, stripe_payment_intent_id),
    funded_at = now(),
    updated_at = now()
  WHERE id = _escrow_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_escrow_payment_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_escrow_payment_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.client_approve_escrow(_portal_token uuid)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.marketplace_escrows
  WHERE portal_token = _portal_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('funded', 'in_progress') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE shared.marketplace_escrows SET
    status = 'pending_release',
    approved_at = now(),
    updated_at = now()
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_approve_escrow(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.client_dispute_escrow(_portal_token uuid, _reason text DEFAULT '')
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.marketplace_escrows
  WHERE portal_token = _portal_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('funded', 'in_progress', 'pending_release') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE shared.marketplace_escrows SET
    status = 'disputed',
    disputed_at = now(),
    dispute_reason = LEFT(COALESCE(_reason, ''), 2000),
    updated_at = now()
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_dispute_escrow(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_dispute_escrow(
  _escrow_id uuid,
  _action text,
  _note text DEFAULT ''
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _action NOT IN ('release', 'refund', 'reopen') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;

  SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF _action = 'release' THEN
    UPDATE shared.marketplace_escrows SET
      status = 'pending_release',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  ELSIF _action = 'refund' THEN
    UPDATE shared.marketplace_escrows SET
      status = 'refunded',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  ELSE
    UPDATE shared.marketplace_escrows SET
      status = 'in_progress',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      disputed_at = NULL,
      dispute_reason = NULL,
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dispute_escrow(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dispute_escrow(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dispute_escrow(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_escrow_released_stripe(
  _escrow_id uuid,
  _transfer_id text
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  UPDATE shared.marketplace_escrows SET
    status = 'released',
    stripe_transfer_id = _transfer_id,
    released_at = now(),
    updated_at = now()
  WHERE id = _escrow_id AND status = 'pending_release'
  RETURNING * INTO _row;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND_OR_INVALID_STATUS'; END IF;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_escrow_released_stripe(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_escrow_released_stripe(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.list_my_escrows()
RETURNS SETOF shared.marketplace_escrows
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared
AS $$
  SELECT * FROM shared.marketplace_escrows
  WHERE freelancer_user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_escrows() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_escrows(_limit integer DEFAULT 50)
RETURNS SETOF shared.marketplace_escrows
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT * FROM shared.marketplace_escrows
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_escrows(integer) TO authenticated;


-- 20260620100000_payment_policy_2026.sql
-- Payment policy 2026: PX instant use, tiered cashout/escrow fees, welcome cap 100, ads project landing
-- Apply after stripe-payments.sql + boost-escrow-payments.sql

-- ---------------------------------------------------------------------------
-- Central config (ops can UPDATE without redeploy)
-- ---------------------------------------------------------------------------

ALTER TABLE shared.gift_limits_config
  ADD COLUMN IF NOT EXISTS welcome_px_cap integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cashout_fee_free numeric(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS cashout_fee_pro numeric(5,4) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS escrow_fee_free numeric(5,4) NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS escrow_fee_pro numeric(5,4) NOT NULL DEFAULT 0.025;

UPDATE shared.gift_limits_config SET
  hold_hours = 0,
  welcome_px_cap = 100,
  cashout_fee_free = 0.15,
  cashout_fee_pro = 0.10,
  escrow_fee_free = 0.05,
  escrow_fee_pro = 0.025,
  updated_at = now()
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- Fee helpers (tier from profiles.subscription_tier)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pro_tier(_tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(_tier, 'free') IN ('pro', 'pro_plus', 'inhouse');
$$;

CREATE OR REPLACE FUNCTION public.cashout_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT CASE
    WHEN public.is_pro_tier(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id)
    ) THEN COALESCE(
      (SELECT cashout_fee_pro FROM shared.gift_limits_config WHERE id = 1),
      0.10
    )
    ELSE COALESCE(
      (SELECT cashout_fee_free FROM shared.gift_limits_config WHERE id = 1),
      0.15
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.cashout_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashout_platform_fee_pct(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.escrow_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT CASE
    WHEN public.is_pro_tier(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id)
    ) THEN COALESCE(
      (SELECT escrow_fee_pro FROM shared.gift_limits_config WHERE id = 1),
      0.025
    )
    ELSE COALESCE(
      (SELECT escrow_fee_free FROM shared.gift_limits_config WHERE id = 1),
      0.05
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.escrow_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escrow_platform_fee_pct(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- PX top-up: instant use (hold_hours default 0)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.topup_wallet_stripe(
  _user_id uuid,
  _amount_px integer,
  _stripe_session_id text,
  _amount_cents integer DEFAULT NULL,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _topup_id uuid;
  _hold_hours integer;
BEGIN
  IF _amount_px <= 0 OR _amount_px > 100000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;

  IF NOT (SELECT stripe_px_enabled FROM public.payment_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'STRIPE_PX_DISABLED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments
    WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT id INTO _topup_id
    FROM shared.wallet_topups
    WHERE stripe_session_id = _stripe_session_id;
    RETURN _topup_id;
  END IF;

  SELECT hold_hours INTO _hold_hours FROM shared.gift_limits_config WHERE id = 1;
  _hold_hours := COALESCE(_hold_hours, 0);

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _user_id, 'px', _price_id, _amount_px, _environment
  );

  INSERT INTO shared.wallet_topups (
    user_id, amount_px, method, status, payment_provider,
    stripe_session_id, amount_cents, available_at
  ) VALUES (
    _user_id, _amount_px, 'stripe', 'completed', 'stripe',
    _stripe_session_id, _amount_cents,
    now() + (_hold_hours || ' hours')::interval
  )
  RETURNING id INTO _topup_id;

  INSERT INTO shared.wallets (user_id, purchased_px)
  VALUES (_user_id, _amount_px)
  ON CONFLICT (user_id) DO UPDATE SET
    purchased_px = shared.wallets.purchased_px + EXCLUDED.purchased_px,
    updated_at = now();

  RETURN _topup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.topup_wallet_mock(_amount_px integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _topup_id uuid;
  _hold_hours integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  IF NOT COALESCE((SELECT mock_topup_enabled FROM public.payment_settings WHERE id = 1), false) THEN
    RAISE EXCEPTION 'MOCK_TOPUP_DISABLED';
  END IF;

  IF _amount_px <= 0 OR _amount_px > 100000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT hold_hours INTO _hold_hours FROM shared.gift_limits_config WHERE id = 1;
  _hold_hours := COALESCE(_hold_hours, 0);

  INSERT INTO shared.wallet_topups (
    user_id, amount_px, method, status, available_at
  ) VALUES (
    _uid, _amount_px, 'mock', 'completed',
    now() + (_hold_hours || ' hours')::interval
  )
  RETURNING id INTO _topup_id;

  INSERT INTO shared.wallets (user_id, purchased_px)
  VALUES (_uid, _amount_px)
  ON CONFLICT (user_id) DO UPDATE SET
    purchased_px = shared.wallets.purchased_px + EXCLUDED.purchased_px,
    updated_at = now();

  RETURN _topup_id;
END;
$$;

-- Purchased px available immediately (no hold filter)
CREATE OR REPLACE FUNCTION public.available_purchased_px(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT COALESCE((SELECT purchased_px FROM shared.wallets WHERE user_id = _uid), 0);
$$;

GRANT EXECUTE ON FUNCTION public.available_purchased_px(uuid) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Welcome missions — cap 100 px total
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.welcome_mission_reward_px(_mission_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _mission_id
    WHEN 'explore_feed' THEN 8
    WHEN 'like' THEN 8
    WHEN 'follow' THEN 10
    WHEN 'jobs' THEN 10
    WHEN 'skills' THEN 12
    WHEN 'share_profile' THEN 14
    WHEN 'profile' THEN 16
    WHEN 'publish_project' THEN 22
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.claim_welcome_mission(_mission_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reward integer;
  _cap integer;
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  _reward := public.welcome_mission_reward_px(_mission_id);
  IF _reward <= 0 THEN RAISE EXCEPTION 'INVALID_MISSION'; END IF;

  IF EXISTS (
    SELECT 1 FROM shared.welcome_mission_claims
    WHERE user_id = _uid AND mission_id = _mission_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED';
  END IF;

  SELECT COALESCE(welcome_px_cap, 100) INTO _cap
  FROM shared.gift_limits_config WHERE id = 1;

  INSERT INTO shared.wallets (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_wallet.lifetime_welcome_px, 0) >= _cap THEN
    RAISE EXCEPTION 'WELCOME_CAP_REACHED';
  END IF;

  IF COALESCE(_wallet.lifetime_welcome_px, 0) + _reward > _cap THEN
    _reward := _cap - COALESCE(_wallet.lifetime_welcome_px, 0);
  END IF;

  IF _reward <= 0 THEN RAISE EXCEPTION 'WELCOME_CAP_REACHED'; END IF;

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    lifetime_welcome_px = lifetime_welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO shared.welcome_mission_claims (user_id, mission_id, reward_px)
  VALUES (_uid, _mission_id, _reward);

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'mission_id', _mission_id,
    'reward_px', _reward,
    'welcome_px', _wallet.welcome_px,
    'lifetime_welcome_px', _wallet.lifetime_welcome_px,
    'cap', _cap
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_welcome_mission(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cashout — tiered platform fee
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_cashout(
  _amount_px integer,
  _bank_info jsonb DEFAULT '{}'::jsonb
)
RETURNS shared.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet shared.wallets%ROWTYPE;
  _fee_rate numeric;
  _fee_px integer;
  _net_px integer;
  _row shared.cashout_requests%ROWTYPE;
  _min_px integer := 1000;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _amount_px IS NULL OR _amount_px < _min_px THEN
    RAISE EXCEPTION 'MIN_CASHOUT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _uid AND is_verified = true
  ) THEN
    RAISE EXCEPTION 'KYC_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _uid
      AND connect_payouts_enabled = true
      AND connect_onboarding_complete = true
  ) THEN
    RAISE EXCEPTION 'CONNECT_REQUIRED';
  END IF;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR COALESCE(_wallet.earned_px, 0) < _amount_px THEN
    RAISE EXCEPTION 'INSUFFICIENT_EARNED';
  END IF;

  _fee_rate := public.cashout_platform_fee_pct(_uid);
  _fee_px := FLOOR(_amount_px * _fee_rate);
  _net_px := _amount_px - _fee_px;

  UPDATE shared.wallets SET
    earned_px = earned_px - _amount_px,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO shared.cashout_requests (
    user_id, gross_px, fee_px, net_px, bank_info, status
  ) VALUES (
    _uid, _amount_px, _fee_px, _net_px, COALESCE(_bank_info, '{}'::jsonb), 'pending'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_cashout(integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ads — optional in-app project landing
-- ---------------------------------------------------------------------------

ALTER TABLE anthem.ad_applications
  ADD COLUMN IF NOT EXISTS linked_project_id uuid;

ALTER TABLE anthem.ad_campaigns
  ADD COLUMN IF NOT EXISTS linked_project_id uuid;

-- Patch admin approve to copy linked_project_id (replace if exists)
CREATE OR REPLACE FUNCTION public.admin_approve_ad_application(
  _id uuid,
  _duration_days integer DEFAULT NULL
)
RETURNS anthem.ad_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app anthem.ad_applications%ROWTYPE;
  _days integer;
  _camp anthem.ad_campaigns%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO _app FROM anthem.ad_applications WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _app.status NOT IN ('paid', 'pending') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  _days := COALESCE(_duration_days, _app.duration_days, 7);

  INSERT INTO anthem.ad_campaigns (
    advertiser_user_id, title, tagline, image_url, target_url, cta_label,
    package, price_px, status, start_at, end_at, application_id,
    promotion_text, linked_project_id
  ) VALUES (
    _app.user_id, _app.ad_title, _app.ad_tagline, _app.image_url, _app.target_url,
    COALESCE(_app.cta_label, 'เรียนรู้เพิ่มเติม'),
    _app.package, _app.budget_px, 'active', now(), now() + (_days || ' days')::interval,
    _app.id, COALESCE(_app.ad_description, ''), _app.linked_project_id
  )
  RETURNING * INTO _camp;

  UPDATE anthem.ad_applications SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = _id;

  RETURN _camp;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_ad_application(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_ad_application(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_ads(_limit integer DEFAULT 12)
RETURNS SETOF anthem.ad_campaigns
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM anthem.ad_campaigns
  WHERE status = 'active'
    AND (end_at IS NULL OR end_at > now())
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_active_ads(integer) TO anon, authenticated, service_role;


-- 20260620120000_client_files.sql
﻿-- ============ Saved clients: juristic person + contact fields ============
ALTER TABLE public.saved_clients
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- ============ Client files ============
CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.saved_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  doc_category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own client files"
  ON public.client_files FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own client files"
  ON public.client_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own client files"
  ON public.client_files FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_files_client ON public.client_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_files_user ON public.client_files(user_id);

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners view own client file objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload own client file objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete own client file objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-files' AND auth.uid()::text = (storage.foldername(name))[1]);


-- 20260620130000_supplier_type.sql
﻿ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS contact_position text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_type_check'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_type_check
      CHECK (type IS NULL OR type IN ('individual', 'company'));
  END IF;
END $$;


-- 20260621120000_portfolio_pages.sql
-- Portfolio pages: shareable freelancer pitch under Data -> Portfolio

CREATE TABLE IF NOT EXISTS public.portfolio_pages (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  hero            jsonb NOT NULL DEFAULT '{}'::jsonb,
  about           jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills          jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience      jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured_work   jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume          jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility      jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_pages_slug_idx
  ON public.portfolio_pages (lower(slug));

CREATE INDEX IF NOT EXISTS portfolio_pages_status_idx
  ON public.portfolio_pages (status) WHERE status = 'published';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_pages TO authenticated;
GRANT ALL ON public.portfolio_pages TO service_role;

ALTER TABLE public.portfolio_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_pages_user_select ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_select ON public.portfolio_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_insert ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_insert ON public.portfolio_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_update ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_update ON public.portfolio_pages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_delete ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_delete ON public.portfolio_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_service_role ON public.portfolio_pages;
CREATE POLICY portfolio_pages_service_role ON public.portfolio_pages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_portfolio_pages_updated_at ON public.portfolio_pages;
CREATE TRIGGER trg_portfolio_pages_updated_at
  BEFORE UPDATE ON public.portfolio_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_portfolio_by_slug(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.portfolio_pages%ROWTYPE;
BEGIN
  SELECT * INTO _row
    FROM public.portfolio_pages
   WHERE lower(slug) = lower(trim(_slug))
     AND status = 'published'
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'slug', _row.slug,
    'hero', _row.hero,
    'about', _row.about,
    'skills', _row.skills,
    'experience', _row.experience,
    'featured_work', _row.featured_work,
    'external_links', _row.external_links,
    'resume', _row.resume,
    'visibility', _row.visibility,
    'published_at', _row.published_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_portfolio_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portfolio_by_slug(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_portfolio_slug_available(_slug text, _user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text := lower(trim(_slug));
BEGIN
  IF _normalized IS NULL OR length(_normalized) < 3 THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.portfolio_pages
     WHERE lower(slug) = _normalized
       AND (_user_id IS NULL OR user_id IS DISTINCT FROM _user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_portfolio_slug_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_portfolio_slug_available(text, uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-media',
  'portfolio-media',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS portfolio_media_storage_select ON storage.objects;
CREATE POLICY portfolio_media_storage_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'portfolio-media');

DROP POLICY IF EXISTS portfolio_media_storage_insert ON storage.objects;
CREATE POLICY portfolio_media_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_update ON storage.objects;
CREATE POLICY portfolio_media_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_delete ON storage.objects;
CREATE POLICY portfolio_media_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_service ON storage.objects;
CREATE POLICY portfolio_media_storage_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'portfolio-media')
  WITH CHECK (bucket_id = 'portfolio-media');


-- 20260621140000_ai_daily_credits_layer.sql
-- Credit AI daily layer: 5 credits/day (non-stacking) on top of pack/purchased pool.
-- Free: 5/day for first 14 days after signup. Pro+: 5/day always.
-- Grandfather: existing free-starter rows (25 one-time) remain as pack pool.

ALTER TABLE public.ai_credit_ledger DROP CONSTRAINT IF EXISTS ai_credit_ledger_source_check;
ALTER TABLE public.ai_credit_ledger ADD CONSTRAINT ai_credit_ledger_source_check
  CHECK (source IN ('daily', 'included', 'purchased', 'mixed', 'refund'));

CREATE OR REPLACE FUNCTION public._ai_signup_at(_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz;
BEGIN
  SELECT created_at INTO v_signup FROM public.profiles WHERE user_id = _user_id;
  IF v_signup IS NULL THEN SELECT created_at INTO v_signup FROM auth.users WHERE id = _user_id; END IF;
  RETURN v_signup;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_free_daily_trial_days_left(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz; v_days integer;
BEGIN
  v_signup := public._ai_signup_at(_user_id);
  IF v_signup IS NULL THEN RETURN 0; END IF;
  v_days := ((now() AT TIME ZONE 'Asia/Bangkok')::date - (v_signup AT TIME ZONE 'Asia/Bangkok')::date);
  RETURN GREATEST(0, 14 - v_days);
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_free_trial_ends_at(_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz;
BEGIN
  v_signup := public._ai_signup_at(_user_id);
  IF v_signup IS NULL THEN RETURN NULL; END IF;
  RETURN ((v_signup AT TIME ZONE 'Asia/Bangkok')::date + 14)::timestamp AT TIME ZONE 'Asia/Bangkok';
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_limit(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tier text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  IF v_tier IN ('pro', 'pro_plus', 'inhouse') THEN RETURN 5; END IF;
  IF v_tier = 'free' AND public._ai_free_daily_trial_days_left(_user_id) > 0 THEN RETURN 5; END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_period_key()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'daily:' || to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM-DD');
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_period_end()
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((now() AT TIME ZONE 'Asia/Bangkok')::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';
$$;

CREATE OR REPLACE FUNCTION public._ai_sync_daily_period(_user_id uuid)
RETURNS TABLE(daily_limit integer, daily_used integer, daily_remaining integer, daily_period_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_key text; v_limit integer; v_used integer;
BEGIN
  v_limit := public._ai_daily_limit(_user_id);
  v_key := public._ai_daily_period_key();
  IF v_limit <= 0 THEN
    daily_limit := 0; daily_used := 0; daily_remaining := 0; daily_period_key := v_key;
    RETURN NEXT; RETURN;
  END IF;
  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_key, v_limit, 0, public._ai_daily_period_end())
  ON CONFLICT (user_id, period_key) DO NOTHING;
  SELECT included_limit, included_used INTO v_limit, v_used
    FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_key;
  daily_limit := COALESCE(v_limit, 0);
  daily_used := COALESCE(v_used, 0);
  daily_remaining := GREATEST(0, daily_limit - daily_used);
  daily_period_key := v_key;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tier text; v_limit integer; v_sub record; v_month text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  IF v_tier IN ('pro', 'pro_plus', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC LIMIT 1;
    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT; RETURN;
    END IF;
  END IF;

  IF v_tier = 'free' THEN
    IF EXISTS (SELECT 1 FROM public.user_ai_period WHERE user_id = _user_id AND period_key = 'free-starter') THEN
      period_key := 'free-starter'; period_end := NULL; included_limit := GREATEST(v_limit, 25);
      RETURN NEXT; RETURN;
    END IF;
    IF public._ai_free_daily_trial_days_left(_user_id) > 0 THEN
      period_key := 'free-trial'; period_end := public._ai_free_trial_ends_at(_user_id); included_limit := 0;
      RETURN NEXT; RETURN;
    END IF;
    period_key := 'free-ended'; period_end := NULL; included_limit := 0;
    RETURN NEXT; RETURN;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := ((date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month') AT TIME ZONE 'Asia/Bangkok');
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(_user_id uuid, _environment text DEFAULT 'sandbox')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period record; v_daily record;
  v_included_used integer := 0; v_included_limit integer; v_purchased integer := 0;
  v_tier text; v_period_type text := 'monthly';
  v_pool_remaining integer; v_total_remaining integer;
  v_trial_days_left integer := 0; v_free_trial_ends timestamptz;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('error', 'unauthenticated'); END IF;
  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  SELECT * INTO v_daily FROM public._ai_sync_daily_period(_user_id);
  SELECT included_used, included_limit INTO v_included_used, v_included_limit
    FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_period.period_key;
  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);
  SELECT balance INTO v_purchased FROM public.user_credits WHERE user_id = _user_id AND environment = _environment;
  v_purchased := COALESCE(v_purchased, 0);
  v_pool_remaining := GREATEST(0, v_included_limit - v_included_used);
  v_total_remaining := v_daily.daily_remaining + v_pool_remaining + v_purchased;

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_daily_trial_days_left(_user_id);
    v_free_trial_ends := public._ai_free_trial_ends_at(_user_id);
    IF EXISTS (SELECT 1 FROM public.user_ai_period WHERE user_id = _user_id AND period_key = 'free-starter') THEN
      IF v_total_remaining <= 0 AND v_daily.daily_limit <= 0 THEN v_period_type := 'free_starter_ended';
      ELSE v_period_type := 'free_starter'; END IF;
    ELSIF v_trial_days_left > 0 THEN v_period_type := 'free_daily_trial';
    ELSE v_period_type := 'free_daily_ended'; END IF;
  ELSIF v_period.period_key LIKE 'sub:%' THEN v_period_type := 'subscription'; END IF;

  RETURN jsonb_build_object(
    'tier', v_tier, 'period_key', v_period.period_key, 'period_end', v_period.period_end,
    'period_type', v_period_type, 'included_used', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_pool_remaining, 'purchased_balance', v_purchased,
    'daily_remaining', v_daily.daily_remaining, 'daily_limit', v_daily.daily_limit,
    'daily_eligible', v_daily.daily_limit > 0, 'daily_period_key', v_daily.daily_period_key,
    'daily_resets_at', public._ai_daily_period_end(),
    'free_trial_days_left', v_trial_days_left, 'free_trial_ends_at', v_free_trial_ends,
    'total_remaining', v_total_remaining
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid, _feature text, _environment text DEFAULT 'sandbox', _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period record; v_daily_key text; v_daily_limit integer := 0; v_daily_used integer := 0; v_daily_remaining integer := 0;
  v_cost integer; v_included_used integer := 0; v_included_limit integer; v_included_remaining integer;
  v_purchased integer := 0; v_from_daily integer := 0; v_from_included integer := 0; v_from_purchased integer := 0;
  v_prev jsonb; v_source text; v_has_credits_row boolean := false; v_total_remaining integer;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated'); END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true, 'duplicate', true, 'cost', cost,
      'daily_remaining', (metadata->>'daily_remaining')::integer,
      'daily_limit', (metadata->>'daily_limit')::integer,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'included_remaining', (metadata->>'included_remaining')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev FROM public.ai_credit_ledger WHERE idempotency_key = _idempotency_key;
    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;
  v_daily_key := public._ai_daily_period_key();
  v_daily_limit := public._ai_daily_limit(_user_id);

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  IF v_daily_limit > 0 THEN
    INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
    VALUES (_user_id, v_daily_key, v_daily_limit, 0, public._ai_daily_period_end())
    ON CONFLICT (user_id, period_key) DO NOTHING;
  END IF;

  SELECT included_used INTO v_included_used FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key FOR UPDATE;
  IF v_daily_limit > 0 THEN
    SELECT included_used, included_limit INTO v_daily_used, v_daily_limit
      FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_daily_key FOR UPDATE;
  END IF;

  v_included_used := COALESCE(v_included_used, 0);
  v_daily_used := COALESCE(v_daily_used, 0);
  v_daily_limit := COALESCE(v_daily_limit, 0);
  v_daily_remaining := GREATEST(0, v_daily_limit - v_daily_used);

  SELECT balance INTO v_purchased FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment FOR UPDATE;
  IF FOUND THEN v_has_credits_row := true; v_purchased := COALESCE(v_purchased, 0); ELSE v_purchased := 0; END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);
  IF v_daily_remaining + v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'cost', v_cost,
      'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit,
      'included_used', v_included_used, 'included_limit', v_included_limit,
      'included_remaining', v_included_remaining, 'purchased_balance', v_purchased,
      'total_remaining', v_daily_remaining + v_included_remaining + v_purchased);
  END IF;

  v_from_daily := LEAST(v_cost, v_daily_remaining);
  v_from_included := LEAST(v_cost - v_from_daily, v_included_remaining);
  v_from_purchased := v_cost - v_from_daily - v_from_included;

  IF v_from_daily > 0 THEN
    UPDATE public.user_ai_period SET included_used = included_used + v_from_daily, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_daily_key;
    v_daily_used := v_daily_used + v_from_daily;
    v_daily_remaining := v_daily_remaining - v_from_daily;
  END IF;
  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
    v_included_remaining := v_included_remaining - v_from_included;
  END IF;
  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded'); END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF (v_from_daily > 0)::int + (v_from_included > 0)::int + (v_from_purchased > 0)::int > 1 THEN v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN v_source := 'purchased';
  ELSIF v_from_included > 0 THEN v_source := 'included';
  ELSE v_source := 'daily'; END IF;

  v_total_remaining := v_daily_remaining + v_included_remaining + v_purchased;
  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (_user_id, _feature, v_cost, v_source, _idempotency_key, jsonb_build_object(
    'from_daily', v_from_daily, 'from_included', v_from_included, 'from_purchased', v_from_purchased,
    'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit, 'daily_period_key', v_daily_key,
    'included_used_after', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_included_remaining, 'purchased_after', v_purchased,
    'total_remaining', v_total_remaining, 'environment', _environment));

  RETURN jsonb_build_object('allowed', true, 'cost', v_cost, 'source', v_source,
    'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit,
    'included_used', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_included_remaining, 'purchased_balance', v_purchased,
    'total_remaining', v_total_remaining);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_credits(
  _user_id uuid, _original_idempotency_key text, _refund_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry record; v_period record; v_env text;
  v_refunded_daily integer := 0; v_refunded_included integer := 0; v_refunded_purchased integer := 0;
  v_daily_key text;
BEGIN
  IF _user_id IS NULL OR _original_idempotency_key IS NULL OR _refund_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'invalid_args');
  END IF;
  IF EXISTS (SELECT 1 FROM public.ai_credit_ledger WHERE idempotency_key = _refund_idempotency_key) THEN
    RETURN jsonb_build_object('refunded', true, 'duplicate', true);
  END IF;
  SELECT * INTO v_entry FROM public.ai_credit_ledger
   WHERE user_id = _user_id AND idempotency_key = _original_idempotency_key LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('refunded', false, 'reason', 'original_not_found'); END IF;

  v_env := COALESCE(v_entry.metadata->>'environment', 'sandbox');
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_daily_key := COALESCE(v_entry.metadata->>'daily_period_key', public._ai_daily_period_key());

  v_refunded_daily := COALESCE((v_entry.metadata->>'from_daily')::integer, 0);
  v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, 0);
  v_refunded_purchased := COALESCE((v_entry.metadata->>'from_purchased')::integer, 0);

  IF v_refunded_daily = 0 AND v_refunded_included = 0 AND v_refunded_purchased = 0 THEN
    IF v_entry.source = 'purchased' THEN v_refunded_purchased := v_entry.cost;
    ELSIF v_entry.source = 'daily' THEN v_refunded_daily := v_entry.cost;
    ELSIF v_entry.source = 'mixed' THEN
      v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, v_entry.cost);
      v_refunded_purchased := GREATEST(0, v_entry.cost - v_refunded_included);
    ELSE v_refunded_included := v_entry.cost; END IF;
  END IF;

  IF v_refunded_daily > 0 THEN
    UPDATE public.user_ai_period SET included_used = GREATEST(0, included_used - v_refunded_daily), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_daily_key;
  END IF;
  IF v_refunded_included > 0 THEN
    UPDATE public.user_ai_period SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
  END IF;
  IF v_refunded_purchased > 0 THEN
    UPDATE public.user_credits SET balance = balance + v_refunded_purchased, updated_at = now()
     WHERE user_id = _user_id AND environment = v_env;
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (_user_id, 'refund:' || v_entry.feature, -v_entry.cost, 'refund', _refund_idempotency_key,
    jsonb_build_object('refund_of', _original_idempotency_key,
      'refunded_daily', v_refunded_daily, 'refunded_included', v_refunded_included,
      'refunded_purchased', v_refunded_purchased, 'environment', v_env));

  RETURN jsonb_build_object('refunded', true, 'cost', v_entry.cost,
    'refunded_daily', v_refunded_daily, 'refunded_included', v_refunded_included,
    'refunded_purchased', v_refunded_purchased);
END;
$$;

ALTER TABLE public.ai_tier_config DROP CONSTRAINT IF EXISTS ai_tier_config_tier_check;
ALTER TABLE public.ai_tier_config ADD CONSTRAINT ai_tier_config_tier_check
  CHECK (tier IN ('free', 'pro', 'pro_plus', 'inhouse'));

INSERT INTO public.ai_tier_config (tier, monthly_included)
VALUES ('pro_plus', 1400)
ON CONFLICT (tier) DO UPDATE SET monthly_included = EXCLUDED.monthly_included, updated_at = now();


-- 20260621150000_avatar_pool.sql
-- AI avatar pool: pre-generated illustrations assigned on signup when no OAuth photo.

CREATE TABLE IF NOT EXISTS public.avatar_pool (
  id serial PRIMARY KEY,
  url text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avatar_pool_active_idx ON public.avatar_pool (active) WHERE active = true;

ALTER TABLE public.avatar_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active avatar pool" ON public.avatar_pool;
CREATE POLICY "Anyone can read active avatar pool"
  ON public.avatar_pool FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role manages avatar pool" ON public.avatar_pool;
CREATE POLICY "Service role manages avatar pool"
  ON public.avatar_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.pick_random_avatar_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT url
    FROM public.avatar_pool
   WHERE active = true
   ORDER BY random()
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.pick_random_avatar_url() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_random_avatar_url() TO service_role;

CREATE OR REPLACE FUNCTION public.assign_my_default_avatar()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT avatar_url INTO picked
    FROM public.profiles
   WHERE user_id = auth.uid();

  IF picked IS NOT NULL AND picked <> '' THEN
    RETURN picked;
  END IF;

  picked := public.pick_random_avatar_url();
  IF picked IS NULL OR picked = '' THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET avatar_url = picked
   WHERE user_id = auth.uid()
     AND (avatar_url IS NULL OR avatar_url = '');

  RETURN picked;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_my_default_avatar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_my_default_avatar() TO authenticated;

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

  IF _avatar_url IS NULL OR _avatar_url = '' THEN
    _avatar_url := COALESCE(public.pick_random_avatar_url(), '');
  END IF;

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

CREATE OR REPLACE FUNCTION public.pick_avatar_pool_url_by_seed(_seed text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n int;
  _off int;
  _url text;
BEGIN
  SELECT GREATEST(count(*)::int, 1) INTO _n FROM public.avatar_pool WHERE active = true;
  _off := abs(hashtext(COALESCE(_seed, ''))) % _n;
  SELECT url INTO _url
    FROM public.avatar_pool
   WHERE active = true
   ORDER BY id
   OFFSET _off
   LIMIT 1;
  RETURN _url;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_avatar_pool_url_by_seed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_avatar_pool_url_by_seed(text) TO service_role;

-- Backfill empty or DiceBear avatars when pool is populated
UPDATE public.profiles
   SET avatar_url = public.pick_avatar_pool_url_by_seed(COALESCE(username, user_id::text))
 WHERE (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%dicebear.com%')
   AND EXISTS (SELECT 1 FROM public.avatar_pool WHERE active = true LIMIT 1);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'studios'
  ) THEN
    UPDATE public.studios
       SET avatar_url = public.pick_avatar_pool_url_by_seed('studio-' || slug)
     WHERE (avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%dicebear.com%')
       AND EXISTS (SELECT 1 FROM public.avatar_pool WHERE active = true LIMIT 1);
  END IF;
END $$;


-- 20260622090000_disable_client_mock_topups.sql
-- Prevent browser clients from minting purchased credits through the mock RPC.
-- Demo environments may grant authenticated access in a separate, explicit setup step.
REVOKE ALL ON FUNCTION public.topup_wallet_mock(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topup_wallet_mock(integer)
  TO service_role;


-- 20260622120000_anthem_community_production_hardening.sql
-- Anthem community production hardening.
-- Canonical backend migration lives in Solo-Code because both apps share one Supabase project.

CREATE TABLE IF NOT EXISTS shared.user_moderation_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  strikes integer NOT NULL DEFAULT 0 CHECK (strikes >= 0),
  muted_until timestamptz,
  banned_until timestamptz,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('strike', 'mute', 'ban', 'unban', 'report_upheld')),
  source text NOT NULL DEFAULT 'community',
  reason text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_created
  ON shared.moderation_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_active
  ON shared.moderation_actions (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE shared.user_moderation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderation_state_own_read ON shared.user_moderation_state;
CREATE POLICY moderation_state_own_read
  ON shared.user_moderation_state FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS moderation_actions_admin_read ON shared.moderation_actions;
CREATE POLICY moderation_actions_admin_read
  ON shared.moderation_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON shared.user_moderation_state TO authenticated;
GRANT SELECT ON shared.moderation_actions TO authenticated;
GRANT ALL ON shared.user_moderation_state, shared.moderation_actions TO service_role;

CREATE OR REPLACE FUNCTION public.check_user_can_post()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  reason_code text;
  blocked_until timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'UNAUTHENTICATED',
      'banned_until', null, 'strikes', 0
    );
  END IF;

  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO state
  FROM shared.user_moderation_state
  WHERE user_id = uid;

  IF state.banned_until IS NOT NULL AND state.banned_until > now() THEN
    reason_code := 'BANNED';
    blocked_until := state.banned_until;
  ELSIF state.muted_until IS NOT NULL AND state.muted_until > now() THEN
    reason_code := 'MUTED';
    blocked_until := state.muted_until;
  END IF;

  RETURN jsonb_build_object(
    'allowed', reason_code IS NULL,
    'reason', reason_code,
    'banned_until', blocked_until,
    'strikes', state.strikes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_profanity_strike(p_context text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  action_name text := 'strike';
  expiry timestamptz;
  ban_days integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF char_length(coalesce(p_context, '')) > 80 THEN RAISE EXCEPTION 'INVALID_CONTEXT'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE shared.user_moderation_state
  SET strikes = strikes + 1, updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO state;

  IF state.strikes >= 5 THEN
    action_name := 'ban';
    ban_days := 7;
    expiry := now() + interval '7 days';
    UPDATE shared.user_moderation_state
    SET banned_until = GREATEST(coalesce(banned_until, now()), expiry),
        reason = 'repeated_profanity',
        updated_at = now()
    WHERE user_id = uid;
  ELSIF state.strikes >= 3 THEN
    action_name := 'mute';
    ban_days := 1;
    expiry := now() + interval '1 day';
    UPDATE shared.user_moderation_state
    SET muted_until = GREATEST(coalesce(muted_until, now()), expiry),
        reason = 'repeated_profanity',
        updated_at = now()
    WHERE user_id = uid;
  END IF;

  INSERT INTO shared.moderation_actions (
    user_id, actor_id, action_type, source, reason, expires_at
  ) VALUES (
    uid, uid, action_name, left(coalesce(p_context, 'community'), 80),
    'profanity', expiry
  );

  RETURN jsonb_build_object(
    'strikes', state.strikes,
    'action', action_name,
    'banned_until', expiry,
    'days', ban_days
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_moderation(
  p_user_id uuid,
  p_action text,
  p_days integer DEFAULT 0,
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  admin_uid uuid := auth.uid();
  expiry timestamptz;
BEGIN
  IF admin_uid IS NULL OR NOT public.has_role(admin_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_action NOT IN ('strike', 'mute', 'ban', 'unban', 'report_upheld') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF p_days < 0 OR p_days > 365 THEN RAISE EXCEPTION 'INVALID_DAYS'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_action = 'unban' THEN
    UPDATE shared.user_moderation_state
    SET muted_until = null, banned_until = null, reason = null, updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'strike' OR p_action = 'report_upheld' THEN
    UPDATE shared.user_moderation_state
    SET strikes = strikes + 1, reason = left(coalesce(p_note, p_action), 500), updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'mute' THEN
    expiry := now() + make_interval(days => GREATEST(p_days, 1));
    UPDATE shared.user_moderation_state
    SET muted_until = expiry, reason = left(coalesce(p_note, 'admin_mute'), 500), updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    expiry := now() + make_interval(days => GREATEST(p_days, 1));
    UPDATE shared.user_moderation_state
    SET banned_until = expiry, reason = left(coalesce(p_note, 'admin_ban'), 500), updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO shared.moderation_actions (
    user_id, actor_id, action_type, source, reason, expires_at
  ) VALUES (
    p_user_id, admin_uid, p_action, 'admin',
    left(coalesce(p_note, ''), 500), expiry
  );

  RETURN jsonb_build_object('ok', true, 'action', p_action, 'expires_at', expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_can_post() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_profanity_strike(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_apply_moderation(uuid, text, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_can_post() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profanity_strike(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_moderation(uuid, text, integer, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION anthem.enforce_community_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  recent_count integer;
  parent_row anthem.community_post_comments%ROWTYPE;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT * INTO state
  FROM shared.user_moderation_state
  WHERE user_id = uid;

  IF state.banned_until IS NOT NULL AND state.banned_until > now() THEN
    RAISE EXCEPTION 'BANNED_UNTIL:%', state.banned_until;
  END IF;
  IF state.muted_until IS NOT NULL AND state.muted_until > now() THEN
    RAISE EXCEPTION 'MUTED_UNTIL:%', state.muted_until;
  END IF;

  IF TG_TABLE_NAME = 'community_posts' THEN
    NEW.title := btrim(NEW.title);
    NEW.body := btrim(NEW.body);
    IF char_length(NEW.title) < 3 OR char_length(NEW.title) > 120 THEN
      RAISE EXCEPTION 'INVALID_TITLE_LENGTH';
    END IF;
    IF char_length(NEW.body) < 10 OR char_length(NEW.body) > 3000 THEN
      RAISE EXCEPTION 'INVALID_BODY_LENGTH';
    END IF;
    IF coalesce(cardinality(NEW.tags), 0) > 8
      OR coalesce(cardinality(NEW.gallery_urls), 0) > 20
      OR coalesce(cardinality(NEW.video_urls), 0) > 3 THEN
      RAISE EXCEPTION 'COMMUNITY_MEDIA_LIMIT';
    END IF;
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 1));
      SELECT count(*) INTO recent_count
      FROM anthem.community_posts
      WHERE author_id = uid AND created_at > now() - interval '10 minutes';
      IF recent_count >= 5 THEN RAISE EXCEPTION 'RATE_LIMIT_POSTS'; END IF;
    END IF;
  ELSE
    NEW.content := btrim(NEW.content);
    IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 800 THEN
      RAISE EXCEPTION 'INVALID_COMMENT_LENGTH';
    END IF;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT * INTO parent_row
      FROM anthem.community_post_comments
      WHERE id = NEW.parent_id;
      IF NOT FOUND OR parent_row.post_id <> NEW.post_id THEN
        RAISE EXCEPTION 'INVALID_PARENT_COMMENT';
      END IF;
      NEW.depth := parent_row.depth + 1;
      IF NEW.depth > 2 THEN RAISE EXCEPTION 'MAX_REPLY_DEPTH'; END IF;
    ELSE
      NEW.depth := 0;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 2));
    SELECT count(*) INTO recent_count
    FROM anthem.community_post_comments
    WHERE user_id = uid AND created_at > now() - interval '10 minutes';
    IF recent_count >= 30 THEN RAISE EXCEPTION 'RATE_LIMIT_COMMENTS'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_enforce_write ON anthem.community_posts;
CREATE TRIGGER trg_community_posts_enforce_write
  BEFORE INSERT OR UPDATE ON anthem.community_posts
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_community_write();

DROP TRIGGER IF EXISTS trg_community_comments_enforce_write ON anthem.community_post_comments;
CREATE TRIGGER trg_community_comments_enforce_write
  BEFORE INSERT OR UPDATE ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_community_write();

DROP POLICY IF EXISTS "community_comments_public_read" ON anthem.community_post_comments;
CREATE POLICY "community_comments_public_read"
  ON anthem.community_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anthem.community_posts p
      WHERE p.id = post_id
        AND (p.status = 'published' OR p.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS community_comments_author_delete ON anthem.community_post_comments;
CREATE POLICY community_comments_author_delete
  ON anthem.community_post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT DELETE ON anthem.community_post_comments TO authenticated;
REVOKE UPDATE ON anthem.community_posts FROM authenticated;
GRANT UPDATE (
  post_kind, title, body, category, tags, gallery_urls, video_urls,
  question_topic, status, updated_at
) ON anthem.community_posts TO authenticated;

CREATE INDEX IF NOT EXISTS idx_community_posts_feed
  ON anthem.community_posts (status, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_feed
  ON anthem.community_posts (author_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_created
  ON anthem.community_post_comments (user_id, created_at DESC);

ALTER TABLE anthem.community_posts REPLICA IDENTITY FULL;
ALTER TABLE anthem.community_post_comments REPLICA IDENTITY FULL;
ALTER TABLE anthem.community_post_likes REPLICA IDENTITY FULL;
DO $publication$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_posts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_post_comments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_post_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_post_likes;
  END IF;
END
$publication$;

ALTER TABLE anthem.community_post_views
  ADD COLUMN IF NOT EXISTS view_day date NOT NULL DEFAULT current_date;

WITH ranked_views AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY post_id, user_id, view_day
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM anthem.community_post_views
  WHERE user_id IS NOT NULL
)
DELETE FROM anthem.community_post_views views
USING ranked_views ranked
WHERE views.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_community_post_user_daily_view
  ON anthem.community_post_views (post_id, user_id, view_day)
  WHERE user_id IS NOT NULL;

REVOKE SELECT, INSERT ON anthem.community_post_views FROM anon, authenticated;
DROP POLICY IF EXISTS "community_views_insert" ON anthem.community_post_views;
DROP POLICY IF EXISTS "community_views_read" ON anthem.community_post_views;

CREATE OR REPLACE FUNCTION public.increment_community_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  inserted_count integer := 0;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  INSERT INTO anthem.community_post_views (post_id, user_id, view_day)
  SELECT _post_id, uid, current_date
  WHERE EXISTS (
    SELECT 1 FROM anthem.community_posts
    WHERE id = _post_id AND status = 'published'
  )
  ON CONFLICT (post_id, user_id, view_day) WHERE user_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 1 THEN
    UPDATE anthem.community_posts
    SET view_count = view_count + 1
    WHERE id = _post_id AND status = 'published';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_community_post_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS anthem.community_notification_receipts (
  kind text NOT NULL,
  source_id uuid NOT NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, source_id, recipient_id)
);
ALTER TABLE anthem.community_notification_receipts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON anthem.community_notification_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.notify_community_event(
  _recipient_id uuid,
  _kind text,
  _title text,
  _body text,
  _link text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem
AS $$
DECLARE
  uid uuid := auth.uid();
  target_post_id uuid;
  source_id uuid;
  expected_recipient uuid;
  post_author_id uuid;
  parent_author_id uuid;
  actor_name text;
  post_title text;
BEGIN
  IF uid IS NULL OR _recipient_id IS NULL OR _recipient_id = uid THEN RETURN; END IF;
  IF _kind NOT IN ('community_like', 'community_comment', 'community_reply') THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_KIND';
  END IF;

  target_post_id := nullif(_metadata->>'post_id', '')::uuid;
  IF target_post_id IS NULL THEN RAISE EXCEPTION 'MISSING_POST_ID'; END IF;

  SELECT author_id, title INTO post_author_id, post_title
  FROM anthem.community_posts
  WHERE id = target_post_id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'POST_NOT_FOUND'; END IF;

  IF _kind = 'community_like' THEN
    IF NOT EXISTS (
      SELECT 1 FROM anthem.community_post_likes l
      WHERE l.post_id = target_post_id AND l.user_id = uid
    ) THEN RAISE EXCEPTION 'LIKE_NOT_FOUND'; END IF;
    source_id := target_post_id;
    IF _recipient_id <> post_author_id THEN RAISE EXCEPTION 'INVALID_RECIPIENT'; END IF;
  ELSE
    SELECT c.id, parent.user_id
    INTO source_id, parent_author_id
    FROM anthem.community_post_comments c
    LEFT JOIN anthem.community_post_comments parent ON parent.id = c.parent_id
    WHERE c.post_id = target_post_id
      AND c.user_id = uid
      AND c.created_at > now() - interval '5 minutes'
    ORDER BY c.created_at DESC
    LIMIT 1;
    IF source_id IS NULL OR (
      _kind = 'community_reply'
      AND _recipient_id NOT IN (post_author_id, parent_author_id)
    ) OR (
      _kind = 'community_comment'
      AND _recipient_id <> post_author_id
    ) THEN
      RAISE EXCEPTION 'INVALID_RECIPIENT';
    END IF;
  END IF;

  INSERT INTO anthem.community_notification_receipts (
    kind, source_id, recipient_id, actor_id
  ) VALUES (_kind, source_id, _recipient_id, uid)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(display_name, username, 'สมาชิก Pixel100')
  INTO actor_name
  FROM public.profiles
  WHERE user_id = uid OR id = uid
  LIMIT 1;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    _recipient_id,
    'anthem',
    _kind,
    CASE
      WHEN _kind = 'community_like' THEN 'มีคนถูกใจโพสต์ของคุณ'
      WHEN _kind = 'community_reply' THEN 'มีการตอบกลับความคิดเห็นของคุณ'
      ELSE 'มีความคิดเห็นใหม่'
    END,
    format('%s มีปฏิสัมพันธ์กับ "%s"', coalesce(actor_name, 'สมาชิก Pixel100'), left(post_title, 100)),
    format('/community/%s', target_post_id),
    jsonb_build_object('post_id', target_post_id, 'source_id', source_id),
    false,
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb)
  TO authenticated;

ALTER TABLE shared.messages
  DROP CONSTRAINT IF EXISTS messages_content_length_check;
ALTER TABLE shared.messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (char_length(coalesce(content, '')) <= 4000);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON shared.messages (conversation_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_kind_request
  ON shared.conversations (kind, request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shared.enforce_message_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  recent_count integer;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF uid IS NULL OR NEW.sender_id <> uid THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF char_length(btrim(coalesce(NEW.content, ''))) = 0 AND NEW.attachment_url IS NULL THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 3));
  SELECT count(*) INTO recent_count
  FROM shared.messages
  WHERE sender_id = uid AND created_at > now() - interval '1 minute';
  IF recent_count >= 60 THEN RAISE EXCEPTION 'RATE_LIMIT_MESSAGES'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION shared.sync_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
BEGIN
  UPDATE shared.conversations
  SET last_message_at = GREATEST(coalesce(last_message_at, NEW.created_at), NEW.created_at)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_enforce_write ON shared.messages;
CREATE TRIGGER trg_messages_enforce_write
  BEFORE INSERT ON shared.messages
  FOR EACH ROW EXECUTE FUNCTION shared.enforce_message_write();

DROP TRIGGER IF EXISTS trg_messages_sync_conversation ON shared.messages;
CREATE TRIGGER trg_messages_sync_conversation
  AFTER INSERT ON shared.messages
  FOR EACH ROW EXECUTE FUNCTION shared.sync_conversation_last_message();

DROP POLICY IF EXISTS "Participants can update messages" ON shared.messages;
DROP POLICY IF EXISTS "Sender can unsend own messages" ON shared.messages;
REVOKE UPDATE ON shared.messages FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  updated_count integer;
BEGIN
  IF uid IS NULL
    OR NOT shared.user_in_conversation(p_conversation_id, uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE shared.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> uid
    AND read_at IS NULL
    AND deleted_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  UPDATE shared.messages
  SET deleted_at = now()
  WHERE id = p_message_id
    AND sender_id = uid
    AND deleted_at IS NULL
    AND created_at > now() - interval '24 hours';

  IF NOT FOUND THEN RAISE EXCEPTION 'MESSAGE_NOT_UNSENDABLE'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unsend_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsend_message(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id uuid;
  clean_members uuid[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  p_title := btrim(coalesce(p_title, ''));
  IF char_length(p_title) < 1 OR char_length(p_title) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;

  SELECT array_agg(DISTINCT member_id)
  INTO clean_members
  FROM unnest(array_append(coalesce(p_member_ids, '{}'), uid)) member_id
  WHERE member_id IS NOT NULL;

  IF cardinality(clean_members) > 50 THEN RAISE EXCEPTION 'TOO_MANY_MEMBERS'; END IF;

  INSERT INTO shared.conversations (
    kind, conversation_type, title, created_by,
    client_id, freelancer_id, request_id, project_title
  ) VALUES (
    'group', 'group', p_title, uid,
    uid, uid, null, p_title
  )
  RETURNING id INTO conv_id;

  INSERT INTO shared.conversation_members (conversation_id, user_id, role)
  SELECT conv_id, member_id, CASE WHEN member_id = uid THEN 'owner' ELSE 'member' END
  FROM unnest(clean_members) member_id;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;


-- 20260622160000_anthem_referral_affiliate.sql
-- Anthem referral and affiliate rewards.
-- Referrer: 50 earned PX after the referred user publishes first content.
-- Referred user: 20 welcome PX after registration and 100 welcome PX after activation.

ALTER TABLE shared.wallets
  ADD COLUMN IF NOT EXISTS welcome_px integer NOT NULL DEFAULT 0 CHECK (welcome_px >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_welcome_px integer NOT NULL DEFAULT 0 CHECK (lifetime_welcome_px >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_earned_px integer NOT NULL DEFAULT 0 CHECK (lifetime_earned_px >= 0);

UPDATE shared.gift_limits_config
SET welcome_px_cap = GREATEST(COALESCE(welcome_px_cap, 100), 220),
    updated_at = now()
WHERE id = 1;

CREATE TABLE IF NOT EXISTS shared.referral_program_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  signup_reward_px integer NOT NULL DEFAULT 20 CHECK (signup_reward_px >= 0),
  activation_reward_px integer NOT NULL DEFAULT 100 CHECK (activation_reward_px >= 0),
  referrer_reward_px integer NOT NULL DEFAULT 50 CHECK (referrer_reward_px >= 0),
  registration_window_days integer NOT NULL DEFAULT 7 CHECK (registration_window_days BETWEEN 1 AND 30),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shared.referral_program_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS shared.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{8,16}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'qualified', 'rejected')),
  signup_reward_px integer NOT NULL DEFAULT 0,
  activation_reward_px integer NOT NULL DEFAULT 0,
  referrer_reward_px integer NOT NULL DEFAULT 0,
  registered_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  qualification_kind text CHECK (qualification_kind IN ('project', 'community_post')),
  qualification_id uuid,
  rejected_reason text,
  CHECK (referrer_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON shared.referrals (referrer_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_status_created
  ON shared.referrals (status, registered_at DESC);

CREATE TABLE IF NOT EXISTS shared.referral_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES shared.referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_kind text NOT NULL
    CHECK (reward_kind IN ('referred_signup', 'referred_activation', 'referrer_activation')),
  wallet_bucket text NOT NULL CHECK (wallet_bucket IN ('welcome', 'earned')),
  amount_px integer NOT NULL CHECK (amount_px > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, reward_kind)
);

ALTER TABLE shared.referral_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referral_reward_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_config_public_read ON shared.referral_program_config;
CREATE POLICY referral_config_public_read
  ON shared.referral_program_config FOR SELECT
  USING (true);
DROP POLICY IF EXISTS referral_config_admin_update ON shared.referral_program_config;
CREATE POLICY referral_config_admin_update
  ON shared.referral_program_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS referral_codes_owner_read ON shared.referral_codes;
CREATE POLICY referral_codes_owner_read
  ON shared.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS referrals_participant_read ON shared.referrals;
CREATE POLICY referrals_participant_read
  ON shared.referrals FOR SELECT TO authenticated
  USING (
    referrer_id = auth.uid()
    OR referred_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS referral_ledger_owner_read ON shared.referral_reward_ledger;
CREATE POLICY referral_ledger_owner_read
  ON shared.referral_reward_ledger FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

GRANT SELECT ON shared.referral_program_config TO anon, authenticated;
GRANT UPDATE ON shared.referral_program_config TO authenticated;
GRANT SELECT ON shared.referral_codes, shared.referrals, shared.referral_reward_ledger TO authenticated;
GRANT ALL ON shared.referral_program_config, shared.referral_codes, shared.referrals,
  shared.referral_reward_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  result_code text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT code INTO result_code
  FROM shared.referral_codes
  WHERE user_id = uid AND active = true;
  IF result_code IS NOT NULL THEN RETURN result_code; END IF;

  LOOP
    result_code := upper(encode(gen_random_bytes(6), 'hex'));
    BEGIN
      INSERT INTO shared.referral_codes (user_id, code)
      VALUES (uid, result_code);
      RETURN result_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO result_code
      FROM shared.referral_codes
      WHERE user_id = uid AND active = true;
      IF result_code IS NOT NULL THEN RETURN result_code; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(p_code, '')));
  referrer uuid;
  account_created_at timestamptz;
  email_confirmed_at timestamptz;
  cfg shared.referral_program_config%ROWTYPE;
  referral_row shared.referrals%ROWTYPE;
  existing_content_id uuid;
  existing_content_kind text;
  qualification_result boolean;
  registered_referral_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF normalized_code !~ '^[A-Z0-9]{8,16}$' THEN RAISE EXCEPTION 'INVALID_REFERRAL_CODE'; END IF;

  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  IF NOT COALESCE(cfg.enabled, false) THEN RAISE EXCEPTION 'REFERRAL_DISABLED'; END IF;

  SELECT u.created_at, u.email_confirmed_at
  INTO account_created_at, email_confirmed_at
  FROM auth.users u WHERE u.id = uid;
  IF email_confirmed_at IS NULL THEN RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED'; END IF;
  IF account_created_at < now() - make_interval(days => cfg.registration_window_days) THEN
    RAISE EXCEPTION 'REFERRAL_WINDOW_EXPIRED';
  END IF;

  SELECT user_id INTO referrer
  FROM shared.referral_codes
  WHERE code = normalized_code AND active = true;
  IF referrer IS NULL THEN RAISE EXCEPTION 'REFERRAL_CODE_NOT_FOUND'; END IF;
  IF referrer = uid THEN RAISE EXCEPTION 'SELF_REFERRAL'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 11));
  SELECT * INTO referral_row
  FROM shared.referrals
  WHERE referred_user_id = uid;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', referral_row.status,
      'signup_reward_px', referral_row.signup_reward_px,
      'already_registered', true
    );
  END IF;

  INSERT INTO shared.referrals (
    referrer_id, referred_user_id, referral_code, signup_reward_px
  ) VALUES (
    referrer, uid, normalized_code, cfg.signup_reward_px
  )
  RETURNING * INTO referral_row;
  registered_referral_id := referral_row.id;

  INSERT INTO shared.wallets (user_id, welcome_px, lifetime_welcome_px)
  VALUES (uid, cfg.signup_reward_px, cfg.signup_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    welcome_px = shared.wallets.welcome_px + EXCLUDED.welcome_px,
    lifetime_welcome_px = shared.wallets.lifetime_welcome_px + EXCLUDED.lifetime_welcome_px,
    updated_at = now();

  IF cfg.signup_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, uid, 'referred_signup', 'welcome', cfg.signup_reward_px
    );
  END IF;

  SELECT content_id, content_kind
  INTO existing_content_id, existing_content_kind
  FROM (
    SELECT p.id AS content_id, 'project'::text AS content_kind, p.created_at
    FROM anthem.projects p
    WHERE p.owner_id = uid AND lower(p.status) = 'published'
    UNION ALL
    SELECT c.id, 'community_post'::text, c.created_at
    FROM anthem.community_posts c
    WHERE c.author_id = uid AND lower(c.status) = 'published'
  ) content
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_content_id IS NOT NULL THEN
    EXECUTE 'SELECT shared.qualify_referral_for_content($1, $2, $3)'
      INTO qualification_result
      USING uid, existing_content_kind, existing_content_id;
    SELECT * INTO referral_row
    FROM shared.referrals r
    WHERE r.id = registered_referral_id;
  END IF;

  RETURN jsonb_build_object(
    'status', referral_row.status,
    'signup_reward_px', cfg.signup_reward_px,
    'already_registered', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION shared.qualify_referral_for_content(
  p_user_id uuid,
  p_kind text,
  p_content_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  referral_row shared.referrals%ROWTYPE;
  cfg shared.referral_program_config%ROWTYPE;
  email_confirmed_at timestamptz;
BEGIN
  IF p_kind NOT IN ('project', 'community_post') THEN RETURN false; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 12));
  SELECT * INTO referral_row
  FROM shared.referrals
  WHERE referred_user_id = p_user_id AND status = 'registered'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  IF NOT COALESCE(cfg.enabled, false) THEN RETURN false; END IF;
  SELECT u.email_confirmed_at
  INTO email_confirmed_at
  FROM auth.users u WHERE u.id = p_user_id;

  IF email_confirmed_at IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO shared.wallets (user_id, welcome_px, lifetime_welcome_px)
  VALUES (p_user_id, cfg.activation_reward_px, cfg.activation_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    welcome_px = shared.wallets.welcome_px + EXCLUDED.welcome_px,
    lifetime_welcome_px = shared.wallets.lifetime_welcome_px + EXCLUDED.lifetime_welcome_px,
    updated_at = now();

  INSERT INTO shared.wallets (user_id, earned_px, lifetime_earned_px)
  VALUES (referral_row.referrer_id, cfg.referrer_reward_px, cfg.referrer_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    earned_px = shared.wallets.earned_px + EXCLUDED.earned_px,
    lifetime_earned_px = shared.wallets.lifetime_earned_px + EXCLUDED.lifetime_earned_px,
    updated_at = now();

  UPDATE shared.referrals
  SET status = 'qualified',
      activation_reward_px = cfg.activation_reward_px,
      referrer_reward_px = cfg.referrer_reward_px,
      qualified_at = now(),
      qualification_kind = p_kind,
      qualification_id = p_content_id
  WHERE id = referral_row.id;

  IF cfg.activation_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, p_user_id, 'referred_activation', 'welcome', cfg.activation_reward_px
    );
  END IF;
  IF cfg.referrer_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, referral_row.referrer_id, 'referrer_activation', 'earned',
      cfg.referrer_reward_px
    );
  END IF;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata
  ) VALUES
    (
      p_user_id, 'anthem', 'referral_qualified',
      'รับรางวัลภารกิจแรกแล้ว',
      format('คุณได้รับ %s px จากการเผยแพร่ครั้งแรก', cfg.activation_reward_px),
      '/referrals',
      jsonb_build_object('referral_id', referral_row.id, 'amount_px', cfg.activation_reward_px)
    ),
    (
      referral_row.referrer_id, 'anthem', 'referral_reward',
      'เพื่อนทำภารกิจแรกสำเร็จ',
      format('คุณได้รับ %s px จากการชวนเพื่อน', cfg.referrer_reward_px),
      '/referrals',
      jsonb_build_object('referral_id', referral_row.id, 'amount_px', cfg.referrer_reward_px)
    );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION shared.trigger_referral_content_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row_data jsonb := to_jsonb(NEW);
  content_owner uuid;
  content_status text;
  content_kind text;
BEGIN
  content_status := coalesce(row_data->>'status', '');
  IF TG_TABLE_NAME = 'projects' THEN
    content_owner := nullif(row_data->>'owner_id', '')::uuid;
    content_kind := 'project';
    IF lower(content_status) <> 'published' THEN RETURN NEW; END IF;
  ELSE
    content_owner := nullif(row_data->>'author_id', '')::uuid;
    content_kind := 'community_post';
    IF lower(content_status) <> 'published' THEN RETURN NEW; END IF;
  END IF;

  IF content_owner IS NOT NULL THEN
    PERFORM shared.qualify_referral_for_content(content_owner, content_kind, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_project_qualification ON anthem.projects;
CREATE TRIGGER trg_referral_project_qualification
  AFTER INSERT OR UPDATE OF status ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION shared.trigger_referral_content_qualification();

DROP TRIGGER IF EXISTS trg_referral_community_qualification ON anthem.community_posts;
CREATE TRIGGER trg_referral_community_qualification
  AFTER INSERT OR UPDATE OF status ON anthem.community_posts
  FOR EACH ROW EXECUTE FUNCTION shared.trigger_referral_content_qualification();

CREATE OR REPLACE FUNCTION public.get_referral_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  code_value text;
  cfg shared.referral_program_config%ROWTYPE;
  referred_record shared.referrals%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  code_value := public.get_or_create_referral_code();
  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  SELECT * INTO referred_record FROM shared.referrals WHERE referred_user_id = uid;

  RETURN jsonb_build_object(
    'code', code_value,
    'signup_reward_px', cfg.signup_reward_px,
    'activation_reward_px', cfg.activation_reward_px,
    'referrer_reward_px', cfg.referrer_reward_px,
    'invited_count', (
      SELECT count(*) FROM shared.referrals WHERE referrer_id = uid
    ),
    'qualified_count', (
      SELECT count(*) FROM shared.referrals WHERE referrer_id = uid AND status = 'qualified'
    ),
    'earned_px', (
      SELECT coalesce(sum(amount_px), 0)
      FROM shared.referral_reward_ledger
      WHERE user_id = uid AND reward_kind = 'referrer_activation'
    ),
    'my_referral_status', CASE WHEN referred_record.id IS NULL THEN null ELSE referred_record.status END,
    'my_signup_reward_px', coalesce(referred_record.signup_reward_px, 0),
    'my_activation_reward_px', coalesce(referred_record.activation_reward_px, 0),
    'recent', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'registered_at', r.registered_at,
        'qualified_at', r.qualified_at,
        'display_name', coalesce(p.display_name, 'สมาชิกใหม่')
      ) ORDER BY r.registered_at DESC)
      FROM (
        SELECT * FROM shared.referrals
        WHERE referrer_id = uid
        ORDER BY registered_at DESC
        LIMIT 20
      ) r
      LEFT JOIN public.profiles p ON p.user_id = r.referred_user_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_referral(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_referral_dashboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION shared.qualify_referral_for_content(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION shared.qualify_referral_for_content(uuid, text, uuid) TO service_role;


-- 20260623110000_security_advisor_critical_fixes.sql
-- Resolve current Supabase Security Advisor errors without exposing write access.

DO $$
BEGIN
  IF to_regclass('public.payment_settings') IS NOT NULL THEN
    ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS payment_settings_authenticated_read ON public.payment_settings;
    CREATE POLICY payment_settings_authenticated_read
      ON public.payment_settings
      FOR SELECT
      TO authenticated
      USING (true);
    REVOKE ALL ON TABLE public.payment_settings FROM anon;
    GRANT SELECT ON TABLE public.payment_settings TO authenticated;
  END IF;

  IF to_regclass('public.storage_tier_config') IS NOT NULL THEN
    ALTER TABLE public.storage_tier_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS storage_tier_config_authenticated_read ON public.storage_tier_config;
    CREATE POLICY storage_tier_config_authenticated_read
      ON public.storage_tier_config
      FOR SELECT
      TO authenticated
      USING (true);
    REVOKE ALL ON TABLE public.storage_tier_config FROM anon;
    GRANT SELECT ON TABLE public.storage_tier_config TO authenticated;
  END IF;
END;
$$;

-- Pin SECURITY DEFINER functions that still inherit a mutable caller search_path.
-- Keep all application schemas available because this is a unified database.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      p.oid::regprocedure AS identity,
      n.nspname AS schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname IN ('public', 'shared', 'anthem', 'ops', 'so1o')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = %I, public, shared, anthem, ops, so1o, pg_catalog',
      fn.identity,
      fn.schema_name
    );
  END LOOP;
END;
$$;

