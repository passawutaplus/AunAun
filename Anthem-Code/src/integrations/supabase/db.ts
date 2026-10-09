/**
 * Unified Supabase project (zkflkpbmbozrchqncpzi).
 * Routes tables to the correct Postgres schema.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  ANTHEM_RPC_NAMES,
  PUBLIC_TABLE_NAMES,
  SHARED_RPC_NAMES,
  SHARED_TABLE_NAMES,
} from "./tableRouting";
import { BRAND_STORAGE_NO_PERSIST } from "@/lib/brandConfig";

/**
 * Auth persistence: PKCE SPA tokens live in localStorage when "จดจำฉัน" is on.
 * Uncheck remember → sessionStorage only (cleared when the tab closes).
 * Full httpOnly cookies need a BFF — not available on this Vite client.
 */
function authPersistenceStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> {
  const sessionOnly = () =>
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(BRAND_STORAGE_NO_PERSIST) === "1";

  return {
    getItem(key: string) {
      const store = sessionOnly() ? sessionStorage : localStorage;
      return store.getItem(key);
    },
    setItem(key: string, value: string) {
      if (sessionOnly()) {
        localStorage.removeItem(key);
        sessionStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
        localStorage.setItem(key, value);
      }
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  };
}

const authOpts = {
  storage: authPersistenceStorage(),
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: "pkce",
} as const;

function requireSupabaseEnv() {
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const url = demoMode
    ? import.meta.env.VITE_DEMO_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL
    : import.meta.env.VITE_SUPABASE_URL;
  const key = demoMode
    ? import.meta.env.VITE_DEMO_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      demoMode
        ? "Demo builds require VITE_DEMO_SUPABASE_* or VITE_SUPABASE_* at build time."
        : "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY at build time.",
    );
  }
  return { url, key };
}

function makeClient(): SupabaseClient<Database> {
  const { url, key } = requireSupabaseEnv();
  return createClient<Database>(url, key, {
    auth: authOpts,
  });
}

let rootDb: SupabaseClient<Database> | undefined;
let publicDb: SupabaseClient<Database> | undefined;
let anthemDb: SupabaseClient<Database> | undefined;
let sharedDb: SupabaseClient<Database> | undefined;
let opsDb: SupabaseClient<Database> | undefined;

function getRootDb() {
  rootDb ??= makeClient();
  return rootDb;
}

function getPublicDb() {
  // Typed as the routed client for call-site compatibility; queries use `as never` table names.
  publicDb ??= getRootDb().schema("public") as unknown as SupabaseClient<Database>;
  return publicDb;
}

function getAnthemDb() {
  anthemDb ??= getRootDb().schema("anthem" as "public") as unknown as SupabaseClient<Database>;
  return anthemDb;
}

function getSharedDb() {
  sharedDb ??= getRootDb().schema("shared" as "public") as unknown as SupabaseClient<Database>;
  return sharedDb;
}

function getOpsDb() {
  opsDb ??= getRootDb().schema("ops" as "public") as unknown as SupabaseClient<Database>;
  return opsDb;
}

function lazyClient(
  get: () => SupabaseClient<Database>,
): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get(_, prop, receiver) {
      return Reflect.get(get(), prop, receiver);
    },
  });
}
const PUBLIC_TABLES: ReadonlySet<string> = new Set(PUBLIC_TABLE_NAMES);

const SHARED_TABLES: ReadonlySet<string> = new Set(SHARED_TABLE_NAMES);

export function schemaForTable(table: string): "public" | "anthem" | "shared" {
  if (PUBLIC_TABLES.has(table)) return "public";
  if (SHARED_TABLES.has(table)) return "shared";
  return "anthem";
}

export function fromTable(table: string) {
  const schema = schemaForTable(table);
  if (schema === "public") return getPublicDb().from(table as never);
  if (schema === "shared") return getSharedDb().from(table as never);
  return getAnthemDb().from(table as never);
}

const ANTHEM_RPCS: ReadonlySet<string> = new Set(ANTHEM_RPC_NAMES);
const SHARED_RPCS: ReadonlySet<string> = new Set(SHARED_RPC_NAMES);

/** RPCs are looked up in one schema only — send each to the schema that owns it. */
export function schemaForRpc(fn: string): "public" | "anthem" | "shared" {
  if (ANTHEM_RPCS.has(fn)) return "anthem";
  if (SHARED_RPCS.has(fn)) return "shared";
  return "public";
}

function rpcClientFor(fn: string) {
  const schema = schemaForRpc(fn);
  if (schema === "anthem") return getAnthemDb();
  if (schema === "shared") return getSharedDb();
  return getRootDb();
}

/** Canonical auth user id column on unified profiles (So1o uses user_id, not id). */
export const PROFILE_USER_COLUMN = "user_id" as const;

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    if (prop === "from") {
      return (table: string) => fromTable(table);
    }
    if (prop === "rpc") {
      return (fn: string, args?: unknown, options?: unknown) =>
        rpcClientFor(fn).rpc(fn as never, args as never, options as never);
    }
    // auth, rpc, storage, realtime — root client only (schema clients omit these).
    return Reflect.get(getRootDb(), prop, receiver);
  },
}) as SupabaseClient<Database>;

const publicDbClient = lazyClient(getPublicDb);
const anthemDbClient = lazyClient(getAnthemDb);
const sharedDbClient = lazyClient(getSharedDb);
const opsDbClient = lazyClient(getOpsDb);

export {
  publicDbClient as publicDb,
  anthemDbClient as anthemDb,
  sharedDbClient as sharedDb,
  opsDbClient as opsDb,
};
