import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import { dispatchAnthemNotification } from "../_shared/anthem-notify-dispatch.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

const COLLAB_LABELS: Record<string, string> = {
  "joint-project": "ร่วมโปรเจกต์ใหม่",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "เปิด studio / ทีม",
  experiment: "งานทดลอง / สะสมพอร์ต",
  content: "คอนเทนต์ / โปรโมตร่วม",
  other: "อื่นๆ",
};

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

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: collab } = await admin
    .from("collab_requests")
    .select("id, sender_id, recipient_id, project_id, collab_types, message, other_type_note")
    .eq("id", body.request_id)
    .maybeSingle();

  if (!collab) return json(req, { error: "not_found" }, 404);
  if (collab.sender_id !== callerId) return json(req, { error: "forbidden" }, 403);

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("user_id", collab.sender_id)
    .maybeSingle();

  let projectTitle = "";
  if (collab.project_id) {
    const { data: project } = await admin
      .from("projects")
      .select("title")
      .eq("id", collab.project_id)
      .maybeSingle();
    projectTitle = project?.title ?? "";
  }

  const types = (collab.collab_types as string[] | null) ?? [];
  const collabTypes = types
    .map((t) =>
      t === "other" && collab.other_type_note ? collab.other_type_note : (COLLAB_LABELS[t] ?? t),
    )
    .join(" · ");

  const siteUrl = anthemSiteUrl();
  const notify = await dispatchAnthemNotification(admin, {
    recipientId: collab.recipient_id,
    emailKind: "collab",
    template: "collab-request",
    templateName: "anthem-collab-request",
    label: "anthem-collab-request",
    emailIdempotencyKey: `collab-${collab.id}`,
    templateData: {
      senderName: senderProfile?.display_name ?? "ครีเอเตอร์",
      projectTitle,
      collabTypes,
      message: collab.message ?? "",
      actionUrl: `${siteUrl}/portfolio/manage?focus=collab`,
    },
    line: {
      kind: "anthem_collab",
      body: `${senderProfile?.display_name ?? "ครีเอเตอร์"} ส่งคำขอคอลแลป${projectTitle ? ` — ${projectTitle}` : ""}`,
      idempotencyKey: `line-collab-${collab.id}`,
      link: "/portfolio/manage?focus=collab",
    },
  });

  if (notify.skipped) {
    return json(req, { skipped: true, reason: notify.reason });
  }

  return json(req, { ok: true, email: notify.email, line: notify.line });
});
