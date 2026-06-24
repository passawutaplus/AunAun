import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ecosystem-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  email: z.string().email(),
  tier: z.enum(["free", "pro", "inhouse"]),
  seats: z.number().int().min(1).max(50).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const expected = Deno.env.get("ECOSYSTEM_SYNC_SECRET");
  if (!expected) {
    console.error("[sync-so1o-tier] ECOSYSTEM_SYNC_SECRET not configured");
    return json({ ok: false, reason: "server_misconfigured" }, 503);
  }

  const secret = req.headers.get("x-ecosystem-secret")?.trim() ?? "";
  if (!secret || !timingSafeEqual(secret, expected)) {
    return json({ ok: false, reason: "unauthorized" }, 401);
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json({ ok: false, reason: "invalid_body" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const email = body.email.trim().toLowerCase();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({
      subscription_tier: body.tier,
      subscription_seats: body.seats ?? 1,
    })
    .eq("email", email)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[sync-so1o-tier] update failed", error.message);
    return json({ ok: false, reason: "db_error" }, 500);
  }

  if (!profile) {
    return json({ ok: false, reason: "sync_failed" }, 404);
  }

  return json({ ok: true, profile_id: profile.id });
});
