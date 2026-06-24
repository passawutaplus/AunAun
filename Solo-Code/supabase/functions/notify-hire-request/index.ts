import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { enqueueLineNotification } from "../_shared/line-enqueue.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import {
  enqueueAnthemNotificationEmail,
  shouldSendAnthemEmail,
} from "../_shared/enqueue-anthem-email.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

function formatBudget(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `฿${Number(amount).toLocaleString("th-TH")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const callerId = claims.claims.sub as string;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { db: { schema: "anthem" } });
  const adminPublic = createClient(supabaseUrl, serviceKey);

  const { data: hire, error: hireErr } = await admin
    .from("hiring_requests")
    .select(
      "id, freelancer_id, client_id, studio_id, target_type, project_title, client_name, message, deadline, budget_amount",
    )
    .eq("id", body.request_id)
    .maybeSingle();

  if (hireErr || !hire) return json(req, { error: "not_found" }, 404);
  if (hire.client_id !== callerId) return json(req, { error: "forbidden" }, 403);

  const siteUrl = anthemSiteUrl();
  const detailRaw = [
    hire.message,
    hire.budget_amount ? `งบประมาณ: ${formatBudget(hire.budget_amount)}` : "",
    hire.deadline ? `กำหนดส่ง: ${hire.deadline}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const notifyUserIds: string[] = [];

  if (hire.target_type === "studio" && hire.studio_id) {
    const { data: admins } = await admin
      .from("studio_members")
      .select("user_id")
      .eq("studio_id", hire.studio_id)
      .in("role", ["owner", "admin"]);
    notifyUserIds.push(...(admins ?? []).map((a: { user_id: string }) => a.user_id));
  } else if (hire.freelancer_id) {
    notifyUserIds.push(hire.freelancer_id);
  }

  const uniqueIds = [...new Set(notifyUserIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return json(req, { skipped: true, reason: "no_recipients" });
  }

  const results: unknown[] = [];

  for (const userId of uniqueIds) {
    const notify = await shouldSendAnthemEmail(adminPublic, userId, { kind: "hire" });
    if (!notify.send || !notify.email) continue;

    const idempotencyKey = `hire-request-${hire.id}-${userId}`;
    const actionUrl =
      hire.target_type === "studio" && hire.studio_id
        ? `${siteUrl}/studio/manage?tab=hires`
        : `${siteUrl}/chat`;

    const emailResult = await enqueueAnthemNotificationEmail(adminPublic, {
      template: "hire-request",
      templateName: "anthem-hire-request",
      recipientEmail: notify.email,
      idempotencyKey,
      label: "anthem-hire-request",
      templateData: {
        recipientName: notify.displayName ?? "คุณ",
        clientName: hire.client_name ?? "ลูกค้า",
        projectTitle: hire.project_title ?? "งานจ้างใหม่",
        message: hire.message ?? "",
        budgetAmount: formatBudget(hire.budget_amount),
        deadline: hire.deadline ?? "",
        actionUrl,
      },
    });

    const lineResult = await enqueueLineNotification({
      userId,
      kind: "anthem_hire",
      body: `${hire.client_name} ส่งคำขอจ้าง — ${hire.project_title || "งานจ้างใหม่"}\n${detailRaw.slice(0, 200)}`,
      idempotencyKey: `line-hire-${hire.id}-${userId}`,
    });

    results.push({ userId, email: emailResult, line: lineResult });
  }

  if (results.length === 0) {
    return json(req, { skipped: true, reason: "notifications_disabled" });
  }

  return json(req, { ok: true, notified: results.length, results });
});
