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

const PUBLIC_TABLES = new Set([
  "profiles",
  "user_roles",
  "subscriptions",
  "support_tickets",
  "beta_feedback",
  "quotations",
  "tester_applications",
]);

const SHARED_TABLES = new Set([
  "cashout_requests",
  "kyc_requests",
  "aml_flags",
  "platform_events",
  "notifications",
]);

export function schemaForTable(table: string): "public" | "anthem" | "shared" {
  if (PUBLIC_TABLES.has(table)) return "public";
  if (SHARED_TABLES.has(table)) return "shared";
  return "anthem";
}

export function fromTable(table: string) {
  const schema = schemaForTable(table);
  if (schema === "public") return publicDb.from(table);
  if (schema === "shared") return sharedDb.from(table);
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
