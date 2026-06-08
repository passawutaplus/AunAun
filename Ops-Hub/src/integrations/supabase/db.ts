/**
 * Multi-schema Supabase client (same routing as an1hem).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const authOpts = {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: "pkce",
} as const;

function makeClient(schema: string): SupabaseClient {
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
const OPS_TABLES = new Set(["cycles", "issues", "issue_comments", "roadmap_items"]);

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
