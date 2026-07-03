import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";

const BodySchema = z.object({
  event: z.enum(["in_app", "email", "line"]),
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  link: z.string().max(500).optional(),
  business_id: z.string().uuid(),
  template: z.string().max(80).optional(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function assertAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const actorId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  if (!(await assertAdmin(admin, actorId))) return json(req, { error: "forbidden" }, 403);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const site = anthemSiteUrl();
  const link = body.link?.startsWith("http") ? body.link : `${site}${body.link ?? "/"}`;
  const results: Array<{ user_id: string; ok: boolean; channel: string; error?: string }> = [];

  for (const userId of body.user_ids) {
    if (body.event === "in_app") {
      const { error } = await admin.from("notifications").insert({
        user_id: userId,
        app: "anthem",
        kind: "marketing_nudge",
        title: body.title,
        body: body.body,
        link,
        metadata: {
          business_id: body.business_id,
          template: body.template ?? null,
          actor_id: actorId,
        },
      });
      results.push({ user_id: userId, ok: !error, channel: "in_app", error: error?.message });
      continue;
    }

    if (body.event === "email") {
      results.push({
        user_id: userId,
        ok: false,
        channel: "email",
        error: "email_dispatch_requires_anthem_notify_template",
      });
      continue;
    }

    results.push({
      user_id: userId,
      ok: false,
      channel: "line",
      error: "line_requires_linked_account_queue",
    });
  }

  const sent = results.filter((r) => r.ok).length;
  await admin.from("kuy_outreach_messages").insert({
    business_id: body.business_id,
    lead_id: null,
    channel: body.event,
    message_body: body.body,
    status: sent > 0 ? "sent" : "draft",
  });

  await admin.rpc("kuy_log_export", {
    _business_id: body.business_id,
    _export_format: body.event,
    _report_type: "outreach",
    _row_count: sent,
    _compliance_confirmed: true,
    _metadata: { template: body.template, channel: body.event },
  });

  return json(req, { sent, total: body.user_ids.length, results });
});
