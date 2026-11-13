-- Supabase cleanup (2026-11-13)
-- Drops retired So1o freelancer tables, the unused Omise wallet tables and
-- other empty tables no app reads. Every table dropped here had 0 rows and
-- 0 writes, and no code in AunAun, samecor-picker or Vault references it.
-- Kept on purpose (still used by live functions): dashboard_jobs,
-- user_display_currency (account purge), stripe_checkout_fulfillments,
-- stripe_webhook_events, payment_notifications, notification_preferences,
-- community_engagement_rewards, event_likes, fx_rates, fx_rate_snapshots,
-- so1o.notifications (public.notifications view reads it).

-- 1) Live functions that still mention retired tables -----------------------

-- Admin feature stats: drop the retired supplier / finance sections.
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
    UNION ALL SELECT 'รายรับ (Income)', 'finance_incomes', fi.user_id FROM public.finance_incomes fi
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

-- sync_user_tier() still calls this; In-house orgs are retired, so it does nothing now.
CREATE OR REPLACE FUNCTION public.sync_inhouse_org_seat_limit(_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- In-house orgs were retired on 2026-11-13; kept as a no-op for sync_user_tier().
  RETURN;
END;
$function$;

-- 2) Drop empty, unused tables ------------------------------------------------
-- No CASCADE: if anything still depends on one of these, the migration fails.

DROP TABLE IF EXISTS
  -- no app uses these
  public.wunwun_meta, public.wunwun_notes,
  public.client_links, public.client_notes,
  public.myport_blocks, public.payment_receipts,
  public.persona_group_members, public.persona_groups,
  public.user_ai_keys,
  -- old Omise wallet / payout design (replaced by transfer QR)
  shared.account_balances, shared.ledger_entries,
  shared.payment_attempts, shared.payment_audit_logs, shared.payment_recipients,
  shared.payout_items, shared.payout_requests,
  -- So1o freelancer app (retired): finance
  public.finance_invoice_status_history, public.finance_clients_invoices,
  public.finance_deductions, public.finance_expenses, public.finance_payment_methods,
  public.finance_subscriptions, public.finance_tax_scenarios,
  -- So1o: HQ agents
  public.hq_outputs, public.hq_tasks, public.hq_messages, public.hq_conversations,
  -- So1o: In-house workspaces
  public.inhouse_activity_events, public.inhouse_canvases, public.inhouse_messages,
  public.inhouse_channels, public.inhouse_tasks, public.inhouse_invites,
  public.inhouse_workspace_members, public.inhouse_workspaces,
  public.inhouse_org_members, public.inhouse_orgs,
  -- So1o: jobs, trackers and projects
  public.dashboard_job_tasks, public.dashboard_tasks,
  public.job_tracker_step_comments, public.job_events, public.job_milestones,
  public.job_slips, public.job_stripe_payments, public.job_trackers,
  public.feedback_jobs, public.work_projects, public.project_tasks, public.project_members,
  -- So1o: suppliers, planner, colours
  public.supplier_files, public.supplier_links,
  public.planner_share_links, public.planner_posts,
  public.color_palette_colors, public.color_palettes,
  public.user_color_palettes, public.user_saved_colors,
  -- So1o: other
  public.asset_items, public.client_files,
  public.auth_banner_slides, public.dashboard_banner_slides,
  public.legal_license_tokens, public.legal_documents,
  public.meeting_free_usage, public.portfolio_pages,
  public.quotation_collaborators, public.vision_canvas_reactions,
  public.review_pins, public.spec_checklist_state;

-- 3) Drop functions that only served the dropped tables ----------------------

DROP FUNCTION IF EXISTS public.accept_inhouse_invite(text);
DROP FUNCTION IF EXISTS public.create_inhouse_org(text, text);
DROP FUNCTION IF EXISTS public.get_my_pending_inhouse_invites();
DROP FUNCTION IF EXISTS public.log_inhouse_activity(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.inhouse_org_members_seat_guard();
DROP FUNCTION IF EXISTS public.assert_org_seat_available(uuid);
DROP FUNCTION IF EXISTS public.inhouse_active_member_count(uuid);
DROP FUNCTION IF EXISTS public.inhouse_can_access_workspace(uuid, uuid);
DROP FUNCTION IF EXISTS public.inhouse_is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.inhouse_is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.auto_update_invoice_statuses();
DROP FUNCTION IF EXISTS public.claim_meeting_free_slot(uuid);
DROP FUNCTION IF EXISTS public.check_portfolio_slug_available(text, uuid);
DROP FUNCTION IF EXISTS public.fulfill_client_job_payment_stripe(text, uuid, uuid, text, numeric, text);
DROP FUNCTION IF EXISTS public._security_defense_probe_lab();

-- 4) Tidy-ups from the Supabase advisors -------------------------------------

-- Two identical GIN indexes on discover_items.tags; keep one.
DROP INDEX IF EXISTS public.discover_items_tags_idx;

-- Pin search_path (bodies are fully qualified / built-ins only).
ALTER FUNCTION anthem.active_policy_id(text) SET search_path = '';
ALTER FUNCTION anthem.event_image_ok(text, uuid) SET search_path = '';
ALTER FUNCTION anthem.event_link_ok(text) SET search_path = '';

-- Evaluate auth.uid() once per query instead of once per row.
ALTER POLICY "Admins manage ops cycles" ON ops.cycles
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops issue comments" ON ops.issue_comments
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops playbook runs" ON ops.playbook_runs
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops projects" ON ops.projects
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops radar" ON ops.radar_items
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops roadmap" ON ops.roadmap_items
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER POLICY "Admins manage ops settings" ON ops.settings
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- Internal SECURITY DEFINER helpers: no client calls them, only other
-- definer functions / the server. Remove direct access for anon + signed-in users.
REVOKE EXECUTE ON FUNCTION public._ai_daily_eligible(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._ai_daily_period(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_launch_payments_enabled() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kuy_seed_demo_business(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ai_daily_eligible(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._ai_daily_period(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_launch_payments_enabled() TO service_role;
GRANT EXECUTE ON FUNCTION public.kuy_seed_demo_business(uuid) TO service_role;
