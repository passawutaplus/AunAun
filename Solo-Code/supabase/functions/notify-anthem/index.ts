import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import { dispatchAnthemNotification } from "../_shared/anthem-notify-dispatch.ts";

const BodySchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("gift"),
    transaction_id: z.string().uuid(),
  }),
  z.object({
    event: z.literal("follow"),
    following_id: z.string().uuid(),
  }),
  z.object({
    event: z.literal("job_application"),
    application_id: z.string().uuid(),
  }),
  z.object({
    event: z.literal("topup"),
    topup_id: z.string().uuid().optional(),
  }),
  z.object({
    event: z.literal("cashout"),
    request_id: z.string().uuid(),
    status: z.enum(["submitted", "paid", "rejected"]),
  }),
]);

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function callerIdFrom(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return null;
  return claims.claims.sub as string;
}

async function isAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerId = await callerIdFrom(req, supabaseUrl, anonKey);
  if (!callerId) return json(req, { error: "unauthorized" }, 401);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const siteUrl = anthemSiteUrl();

  switch (body.event) {
    case "gift": {
      const { data: tx } = await admin
        .from("gift_transactions")
        .select("id, sender_id, recipient_id, gift_id, price_px, message, project_id")
        .eq("id", body.transaction_id)
        .maybeSingle();
      if (!tx) return json(req, { error: "not_found" }, 404);
      if (tx.sender_id !== callerId) return json(req, { error: "forbidden" }, 403);

      const [{ data: sender }, { data: gift }] = await Promise.all([
        admin.from("profiles").select("display_name").eq("user_id", tx.sender_id).maybeSingle(),
        admin.from("gifts").select("name_th").eq("id", tx.gift_id).maybeSingle(),
      ]);

      let projectTitle = "";
      if (tx.project_id) {
        const { data: project } = await admin
          .from("projects")
          .select("title")
          .eq("id", tx.project_id)
          .maybeSingle();
        projectTitle = project?.title ?? "";
      }

      const senderName = sender?.display_name ?? "ครีเอเตอร์";
      const giftName = gift?.name_th ?? "ของขวัญ";
      const actionUrl = tx.project_id
        ? `${siteUrl}/project/${tx.project_id}`
        : `${siteUrl}/earnings`;

      const result = await dispatchAnthemNotification(admin, {
        recipientId: tx.recipient_id,
        emailKind: "gift",
        template: "gift-received",
        templateName: "anthem-gift-received",
        label: "anthem-gift-received",
        emailIdempotencyKey: `gift-${tx.id}`,
        templateData: {
          senderName,
          giftName,
          pricePx: tx.price_px,
          message: tx.message ?? "",
          projectTitle,
          actionUrl,
        },
        line: {
          kind: "anthem_gift",
          body: `${senderName} ส่ง ${giftName} (${tx.price_px} px)`,
          idempotencyKey: `line-gift-${tx.id}`,
          link: tx.project_id ? `/project/${tx.project_id}` : "/earnings",
        },
      });
      return json(req, result);
    }

    case "follow": {
      const { data: row } = await admin
        .from("follows")
        .select("follower_id, following_id")
        .eq("follower_id", callerId)
        .eq("following_id", body.following_id)
        .maybeSingle();
      if (!row) return json(req, { error: "not_found" }, 404);

      const { data: follower } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", callerId)
        .maybeSingle();
      const followerName = follower?.display_name ?? "ครีเอเตอร์";

      const result = await dispatchAnthemNotification(admin, {
        recipientId: body.following_id,
        emailKind: "follow",
        template: "follow",
        templateName: "anthem-follow",
        label: "anthem-follow",
        emailIdempotencyKey: `follow-${callerId}-${body.following_id}`,
        templateData: {
          followerName,
          actionUrl: `${siteUrl}/portfolio/manage`,
        },
        line: {
          kind: "anthem_follow",
          body: `${followerName} เริ่มติดตามคุณ`,
          idempotencyKey: `line-follow-${callerId}-${body.following_id}`,
          link: "/portfolio/manage",
        },
      });
      return json(req, result);
    }

    case "job_application": {
      const { data: app } = await admin
        .from("job_applications")
        .select("id, job_id, applicant_id, cover_letter")
        .eq("id", body.application_id)
        .maybeSingle();
      if (!app) return json(req, { error: "not_found" }, 404);
      if (app.applicant_id !== callerId) return json(req, { error: "forbidden" }, 403);

      const { data: job } = await admin
        .from("job_posts")
        .select("id, title, posted_by")
        .eq("id", app.job_id)
        .maybeSingle();
      if (!job) return json(req, { error: "not_found" }, 404);

      const { data: applicant } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", app.applicant_id)
        .maybeSingle();
      const applicantName = applicant?.display_name ?? "ผู้สมัคร";
      const coverPreview = (app.cover_letter ?? "").slice(0, 120);

      const result = await dispatchAnthemNotification(admin, {
        recipientId: job.posted_by,
        emailKind: "job_application",
        template: "job-application",
        templateName: "anthem-job-application",
        label: "anthem-job-application",
        emailIdempotencyKey: `job-app-${app.id}`,
        templateData: {
          applicantName,
          jobTitle: job.title,
          coverPreview,
          actionUrl: `${siteUrl}/jobs/${job.id}`,
        },
        line: {
          kind: "anthem_job_application",
          body: `${applicantName} สมัครงาน ${job.title}`,
          idempotencyKey: `line-job-app-${app.id}`,
          link: `/jobs/${job.id}`,
        },
      });
      return json(req, result);
    }

    case "topup": {
      const { data: topup } = body.topup_id
        ? await admin
            .from("wallet_topups")
            .select("id, user_id, amount_px, created_at")
            .eq("id", body.topup_id)
            .maybeSingle()
        : await admin
            .from("wallet_topups")
            .select("id, user_id, amount_px, created_at")
            .eq("user_id", callerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      if (!topup || topup.user_id !== callerId) return json(req, { error: "not_found" }, 404);

      const result = await dispatchAnthemNotification(admin, {
        recipientId: callerId,
        emailKind: "topup",
        template: "topup-success",
        templateName: "anthem-topup-success",
        label: "anthem-topup-success",
        emailIdempotencyKey: `topup-${topup.id}`,
        templateData: {
          amountPx: topup.amount_px,
          actionUrl: `${siteUrl}/earnings`,
        },
        line: {
          kind: "anthem_topup",
          body: `เติม Pixel สำเร็จ +${topup.amount_px.toLocaleString("th-TH")} px`,
          idempotencyKey: `line-topup-${topup.id}`,
          link: "/earnings",
        },
      });
      return json(req, result);
    }

    case "cashout": {
      const { data: cashout } = await admin
        .from("cashout_requests")
        .select("id, user_id, gross_px, net_px, status")
        .eq("id", body.request_id)
        .maybeSingle();
      if (!cashout) return json(req, { error: "not_found" }, 404);

      if (body.status === "submitted") {
        if (cashout.user_id !== callerId) return json(req, { error: "forbidden" }, 403);
      } else if (!(await isAdmin(admin, callerId))) {
        return json(req, { error: "forbidden" }, 403);
      }

      const lineBody =
        body.status === "submitted"
          ? `ส่งคำขอถอน ${cashout.gross_px.toLocaleString("th-TH")} px แล้ว`
          : body.status === "paid"
            ? `ถอนเงินสำเร็จ ฿${(cashout.net_px ?? 0).toLocaleString("th-TH")}`
            : `คำขอถอน ${cashout.gross_px.toLocaleString("th-TH")} px ถูกปฏิเสธ`;

      const result = await dispatchAnthemNotification(admin, {
        recipientId: cashout.user_id,
        emailKind: "cashout",
        template: "cashout-status",
        templateName: "anthem-cashout-status",
        label: "anthem-cashout-status",
        emailIdempotencyKey: `cashout-${body.status}-${cashout.id}`,
        templateData: {
          status: body.status,
          grossPx: cashout.gross_px,
          netPx: cashout.net_px ?? undefined,
          actionUrl: `${siteUrl}/earnings`,
        },
        line: {
          kind: "anthem_cashout",
          body: lineBody,
          idempotencyKey: `line-cashout-${body.status}-${cashout.id}`,
          link: "/earnings",
        },
      });
      return json(req, result);
    }
  }
});
