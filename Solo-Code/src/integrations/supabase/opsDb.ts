import { createClient } from "@supabase/supabase-js";

function createOpsClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase env for ops client");
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    db: { schema: "ops" },
  });
}

let _opsDb: ReturnType<typeof createOpsClient> | undefined;

export const opsDb = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (!_opsDb) _opsDb = createOpsClient();
    return Reflect.get(_opsDb, prop, receiver);
  },
}) as ReturnType<typeof createOpsClient>;
