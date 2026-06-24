import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type EcosystemTier = "free" | "pro" | "inhouse";

let _anthemAdmin: SupabaseClient | null = null;

function getAnthemAdmin(): SupabaseClient | null {
  const url = process.env.ANTHEM_SUPABASE_URL;
  const key = process.env.ANTHEM_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_anthemAdmin) {
    _anthemAdmin = createClient(url, key, { auth: { persistSession: false } });
  }
  return _anthemAdmin;
}

/**
 * Mirror So1o subscription tier to an1hem when both apps still use separate Supabase projects.
 * Matches profiles by email (case-insensitive). No-op if env or profile missing.
 */
export async function syncAnthemEcosystemTier(opts: {
  email: string | null | undefined;
  tier: EcosystemTier;
  seats?: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.ECOSYSTEM_SYNC_SECRET;
  const anthemUrl = process.env.ANTHEM_SUPABASE_URL;
  const soloUrl = process.env.SUPABASE_URL;
  // Unified project: tier already on the same profiles row — no cross-project sync.
  if (anthemUrl && soloUrl && anthemUrl.replace(/\/$/, "") === soloUrl.replace(/\/$/, "")) {
    return { ok: true, reason: "unified_project" };
  }
  if (!secret || !anthemUrl) {
    return { ok: false, reason: "ecosystem_env_missing" };
  }

  const email = opts.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "no_email" };

  try {
    const res = await fetch(`${anthemUrl.replace(/\/$/, "")}/functions/v1/sync-so1o-tier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ecosystem-secret": secret,
      },
      body: JSON.stringify({
        email,
        tier: opts.tier,
        seats: opts.seats ?? 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[ecosystem-sync] anthem function failed", res.status, text);
      return { ok: false, reason: `http_${res.status}` };
    }

    const body = (await res.json()) as { ok?: boolean; reason?: string };
    return { ok: !!body.ok, reason: body.reason };
  } catch (err) {
    console.error("[ecosystem-sync] request failed:", err);
    return { ok: false, reason: "network_error" };
  }
}

/** Read tier from So1o profiles after sync_user_tier, then push to an1hem. */
export async function syncAnthemFromSo1oUser(
  soloAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const [{ data: profile }, email] = await Promise.all([
    soloAdmin
      .from("profiles")
      .select("subscription_tier, subscription_seats, email")
      .eq("user_id", userId)
      .maybeSingle(),
    soloAdmin.auth.admin.getUserById(userId).then((r) => r.data.user?.email ?? null),
  ]);

  const tier = (profile?.subscription_tier ?? "free") as EcosystemTier;
  const resolvedEmail = profile?.email ?? email;
  const result = await syncAnthemEcosystemTier({
    email: resolvedEmail,
    tier,
    seats: profile?.subscription_seats ?? 1,
  });
  if (!result.ok && result.reason !== "ecosystem_env_missing") {
    console.warn("[ecosystem-sync] skipped or failed:", result.reason, resolvedEmail);
  }
}

/** Direct DB sync when ANTHEM_SUPABASE_SERVICE_ROLE_KEY is set (no edge function). */
export async function syncAnthemEcosystemTierDirect(opts: {
  email: string | null | undefined;
  tier: EcosystemTier;
  seats?: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const admin = getAnthemAdmin();
  if (!admin) return { ok: false, reason: "ecosystem_env_missing" };

  const email = opts.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "no_email" };

  const { data, error } = await admin
    .from("profiles")
    .update({
      subscription_tier: opts.tier,
      subscription_seats: opts.seats ?? 1,
    })
    .eq("email", email)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[ecosystem-sync] direct update failed:", error.message);
    return { ok: false, reason: "db_error" };
  }
  if (!data) return { ok: false, reason: "no_anthem_profile" };
  return { ok: true };
}

export async function syncAnthemFromSo1oUserFull(
  soloAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const [{ data: profile }, email] = await Promise.all([
    soloAdmin
      .from("profiles")
      .select("subscription_tier, subscription_seats, email")
      .eq("user_id", userId)
      .maybeSingle(),
    soloAdmin.auth.admin.getUserById(userId).then((r) => r.data.user?.email ?? null),
  ]);

  const tier = (profile?.subscription_tier ?? "free") as EcosystemTier;
  const resolvedEmail = profile?.email ?? email;

  if (process.env.ANTHEM_SUPABASE_SERVICE_ROLE_KEY) {
    await syncAnthemEcosystemTierDirect({
      email: resolvedEmail,
      tier,
      seats: profile?.subscription_seats ?? 1,
    });
    return;
  }

  await syncAnthemEcosystemTier({
    email: resolvedEmail,
    tier,
    seats: profile?.subscription_seats ?? 1,
  });
}
