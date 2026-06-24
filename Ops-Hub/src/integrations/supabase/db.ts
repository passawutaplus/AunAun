/**
 * Multi-schema Supabase client (same routing as an1hem).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
const SUPABASE_KEY = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

const authOpts = {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: "pkce",
} as const;

function makeClient(schema: string): SupabaseClient<any, any, any> {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: authOpts,
    db: { schema },
  });
}

export const publicDb = makeClient("public");
export const anthemDb = makeClient("anthem");
export const sharedDb = makeClient("shared");
export const opsDb = makeClient("ops");

/** Tables in public schema (So1o + cross-app events). */
const PUBLIC_TABLES = new Set([
  "profiles",
  "user_roles",
  "subscriptions",
  "support_tickets",
  "beta_feedback",
  "quotations",
  "tester_applications",
  "feature_suggestions",
  "platform_events",
  "ecosystem_links",
]);

/** an1hem marketplace tables (unified project stores these in anthem, not public). */
const ANTHEM_TABLES = new Set([
  "app_feedback",
  "user_reports",
  "projects",
  "job_posts",
  "hiring_requests",
  "collab_requests",
  "studios",
]);

const SHARED_TABLES = new Set([
  "cashout_requests",
  "kyc_requests",
  "aml_flags",
  "notifications",
]);

/** ops.* PM tables — use opsDb directly for projects/cycles to avoid clashing with anthem.projects */
const OPS_TABLES = new Set([
  "cycles",
  "issues",
  "issue_comments",
  "roadmap_items",
  "radar_items",
  "settings",
  "playbook_runs",
]);

export function schemaForTable(table: string): "public" | "anthem" | "shared" | "ops" {
  if (PUBLIC_TABLES.has(table)) return "public";
  if (SHARED_TABLES.has(table)) return "shared";
  if (OPS_TABLES.has(table)) return "ops";
  if (ANTHEM_TABLES.has(table)) return "anthem";
  return "anthem";
}

export function fromTable(table: string) {
  const schema = schemaForTable(table);
  if (schema === "public") return publicDb.from(table);
  if (schema === "shared") return sharedDb.from(table);
  if (schema === "ops") return opsDb.from(table);
  return anthemDb.from(table);
}

/** Auth + default public queries */
export const supabase = new Proxy(publicDb, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return (table: string) => fromTable(table);
    }
    return Reflect.get(target, prop, receiver);
  },
}) as SupabaseClient;
