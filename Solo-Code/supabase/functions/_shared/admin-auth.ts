import { createClient } from "npm:@supabase/supabase-js@2";

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function assertAdmin(userId: string, logTag = "admin"): Promise<boolean> {
  const { data, error } = await adminClient().rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) {
    console.error(`[${logTag}] has_role`, error.message);
    return false;
  }
  return !!data;
}

export async function requireAdminUser(
  req: Request,
  logTag: string,
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const userId = claims.claims.sub as string;
  if (!(await assertAdmin(userId, logTag))) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, userId };
}
