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
