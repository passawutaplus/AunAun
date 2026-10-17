// Daily win-back email for people quiet 14–90 days (pg_cron → pg_net, see 20261019092000 migration).
// POST { dry_run?: boolean, limit?: number } with header x-internal-secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import { enqueueAnthemNotificationEmail } from "../_shared/enqueue-anthem-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHURN_SECRET =
  Deno.env.get("CHURN_EMAIL_SECRET") ?? Deno.env.get("ECOSYSTEM_SYNC_SECRET") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function authorizeInternal(req: Request): boolean {
  if (!CHURN_SECRET) {
    console.error("[anthem-churn-email] CHURN_EMAIL_SECRET not configured");
    return false;
  }
  const header = req.headers.get("x-internal-secret")?.trim();
  if (!header) return false;
  return timingSafeEqual(header, CHURN_SECRET);
}

const BodySchema = z.object({
  dry_run: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

type Candidate = {
  user_id: string;
  email: string;
  display_name: string | null;
  last_seen: string;
  days_inactive: number;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!authorizeInternal(req)) return json({ error: "unauthorized" }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "invalid body" }, 400);
  const { dry_run = false, limit = 50 } = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const anthem = admin.schema("anthem");

  const { data: candidates, error } = await anthem.rpc("churn_candidates", { _limit: limit });
  if (error) {
    console.error("[anthem-churn-email] candidates", error.message);
    return json({ error: error.message }, 500);
  }
  const rows = (candidates ?? []) as Candidate[];
  if (dry_run) {
    return json({ dry_run: true, count: rows.length, days: rows.map((r) => r.days_inactive) });
  }

  const { data: releases } = await anthem
    .from("release_notes")
    .select("title, tag")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);

  const site = anthemSiteUrl();
  const month = new Date().toISOString().slice(0, 7);
  let sent = 0;
  let failed = 0;

  for (const c of rows) {
    const { count: unreadCount } = await admin
      .schema("shared")
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", c.user_id)
      .eq("app", "anthem")
      .eq("is_read", false);

    const result = await enqueueAnthemNotificationEmail(admin, {
      template: "winback",
      templateName: "anthem-winback",
      recipientEmail: c.email,
      templateData: {
        recipientName: c.display_name || "ครีเอเตอร์",
        daysInactive: c.days_inactive,
        unreadCount: unreadCount ?? 0,
        releases: releases ?? [],
        actionUrl: `${site}/dashboard?utm_source=email&utm_campaign=winback`,
        changelogUrl: `${site}/changelog?utm_source=email&utm_campaign=winback`,
      },
      idempotencyKey: `winback:${c.user_id}:${month}`,
      label: "anthem-churn-email",
    });

    if (result.ok) {
      sent += 1;
      await anthem.from("churn_email_log").insert({ user_id: c.user_id, days_inactive: c.days_inactive });
    } else {
      failed += 1;
    }
  }

  return json({ candidates: rows.length, sent, failed });
});
