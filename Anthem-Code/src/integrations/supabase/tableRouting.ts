/**
 * Which Postgres schema each table lives in. Shared by the runtime router (db.ts)
 * and the routed `Database` type (types.ts) so the two can never drift apart.
 * Any table not listed here is in the `anthem` schema.
 */
export const PUBLIC_TABLE_NAMES = [
  "profiles",
  "profiles_public",
  "user_roles",
  "subscriptions",
  "user_credits",
  "ecosystem_notifications",
  "so1o_notifications",
  "platform_events",
  "product_events",
  "welcome_mission_claims",
  "welcome_mission_catalog",
  "avatar_pool",
  "ecosystem_links",
] as const;

/** Cross-app wallet / chat / compliance. */
export const SHARED_TABLE_NAMES = [
  "wallets",
  "wallet_topups",
  "cashout_requests",
  "gifts",
  "gift_transactions",
  "gift_limits_config",
  "contracts",
  "admin_audit_log",
  "conversations",
  "conversation_members",
  "conversation_pins",
  "conversation_hides",
  "messages",
  "collab_plans",
  "collab_plan_change_requests",
  "collab_plan_activity_log",
  "collab_plan_versions",
  "collab_end_requests",
  "collab_end_request_events",
  "collab_group_expand_requests",
  "aml_flags",
  "kyc_requests",
  "kyc_documents",
  "payout_profiles",
  "notifications",
  "user_moderation_state",
  "moderation_actions",
  "marketplace_escrows",
  "referral_program_config",
  "referral_codes",
  "referrals",
  "referral_reward_ledger",
  "daily_px_claims",
  "kuy_businesses",
  "kuy_keywords",
  "kuy_leads",
  "kuy_competitors",
  "kuy_content_items",
  "kuy_insights",
  "kuy_campaigns",
  "kuy_outreach_messages",
  "kuy_reports",
  "kuy_settings",
  "kuy_export_audit_log",
  "hire_orders",
  "hire_quotes",
  "hire_documents",
  "hire_deliveries",
  "hire_wht_docs",
  "hire_quote_policy_acceptances",
  "payment_disputes",
] as const;

export type PublicTableName = (typeof PUBLIC_TABLE_NAMES)[number];
export type SharedTableName = (typeof SHARED_TABLE_NAMES)[number];

/**
 * RPCs that live outside `public`. `supabase.rpc(name)` is routed by this list
 * (the root client only sees `public`). Keep in sync with the database.
 */
export const ANTHEM_RPC_NAMES = [
  "admin_ad_overview",
  "admin_dismiss_notification",
  "admin_gift_overview",
  "admin_list_cashouts",
  "admin_list_topups",
  "admin_mark_cashout_paid",
  "admin_recent_gifts",
  "admin_reject_cashout",
  "admin_set_user_role",
  "admin_top_gift_projects",
  "admin_top_gift_recipients",
  "admin_top_gift_senders",
  "admin_update_gift",
  "admin_update_gift_limits",
  "daily_gift_total",
  "image_like_count",
  "image_share_count",
  "log_ad_event_v2",
  "request_cashout",
  "submit_feedback",
  "submit_ux_research",
] as const;

export const SHARED_RPC_NAMES = ["next_doc_number"] as const;

export type AnthemRpcName = (typeof ANTHEM_RPC_NAMES)[number];
export type SharedRpcName = (typeof SHARED_RPC_NAMES)[number];
