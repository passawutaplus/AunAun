// Weekly summary e-mail (Mondays 09:00 Bangkok; cron in supabase/manual/setup-weekly-digest-cron.sql).
// Members who turned on Settings → Notifications → "อีเมลสรุปรายสัปดาห์" get last week's views, new followers,
// picture likes and top work, up to 3 open calls that fit their kind of work and the events starting this week.
// Nothing is sent to people with nothing to report (see planDigest).
//
// POST + header x-internal-secret (WEEKLY_DIGEST_SECRET or PUSH_DISPATCH_SECRET):
//   {}                                   send to everyone due (cron); answers at once, works in the background
//   { dry_run: true, user_ids?, week_start?, preview? }
//                                        send nothing; returns the rendered e-mails (default 2) and the counts.
//                                        user_ids previews those members even if their switch is off.
//   { after, week_start }                next batch (the function calls itself when its time runs out)
// POST ?u=&t= (List-Unsubscribe-Post) or { action: "off" | "on", u, t } from samecor.com/email/off:
//   turns the weekly e-mail off / back on for that member (signed link, no sign-in).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { anthemEmailFrom, anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { sendResendEmail } from "../_shared/resend-send.ts";
import {
  type Board,
  type DigestMember,
  lastWeek,
  planDigest,
  renderDigest,
  type Week,
  weekStarting,
} from "./digest.ts";
import { signWeeklyOff, verifyWeeklyOff, weeklyOffPageUrl, weeklyOffPostUrl } from "./links.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/weekly-digest`;
const SECRETS = [Deno.env.get("WEEKLY_DIGEST_SECRET"), Deno.env.get("PUSH_DISPATCH_SECRET")]
  .map((s) => s?.trim() ?? "")
  .filter(Boolean);

const PAGE = 50;
/** Stop starting new sends after this, then hand the rest to a fresh call (wall clock limit 150 s). */
const TIME_BUDGET_MS = 100_000;
/** Resend allows 2 requests a second per account; other functions send too. */
const SEND_GAP_MS = 600;

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isInternal(req: Request): boolean {
  const header = req.headers.get("x-internal-secret")?.trim();
  return !!header && SECRETS.some((s) => sameText(header, s));
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

const RunSchema = z.object({
  dry_run: z.boolean().optional(),
  user_ids: z.array(z.string().uuid()).max(20).optional(),
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  preview: z.number().int().min(0).max(5).optional(),
  after: z.string().uuid().optional(),
});

const SwitchSchema = z.object({
  action: z.enum(["off", "on"]),
  u: z.string().uuid(),
  t: z.string().min(1).max(64),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const maskEmail = (e: string) => e.replace(/^(.).*?(@.*)$/, "$1***$2");

type RunResult = {
  week: Week;
  considered: number;
  sent: number;
  skipped_nothing: number;
  skipped_duplicate: number;
  failed: number;
  continued_after?: string;
  emails?: Array<{
    to: string;
    subject: string;
    preview: string;
    text: string;
    html: string;
  }>;
  decisions?: Array<{ user_id: string; send: boolean; reason?: string }>;
};

async function run(
  admin: SupabaseClient,
  opts: {
    week: Week;
    dryRun: boolean;
    only?: string[];
    preview: number;
    after?: string;
  },
): Promise<RunResult> {
  const started = Date.now();
  const site = anthemSiteUrl();
  const { from } = anthemEmailFrom();
  const result: RunResult = {
    week: opts.week,
    considered: 0,
    sent: 0,
    skipped_nothing: 0,
    skipped_duplicate: 0,
    failed: 0,
  };
  if (opts.dryRun) {
    result.emails = [];
    result.decisions = [];
  }

  const { data: boardData, error: boardErr } = await admin.rpc("weekly_digest_board", {
    _week_start: opts.week.start,
  });
  if (boardErr) throw new Error(`board: ${boardErr.message}`);
  const board = (boardData ?? { open_calls: [], events: [] }) as Board;

  let after: string | null = opts.after ?? null;
  for (;;) {
    const { data, error } = await admin.rpc("weekly_digest_members", {
      _week_start: opts.week.start,
      _after: after,
      _limit: PAGE,
      _only: opts.only ?? null,
    });
    if (error) throw new Error(`members: ${error.message}`);
    const rows = (data ?? []) as DigestMember[];

    for (const m of rows) {
      if (!opts.dryRun && Date.now() - started > TIME_BUDGET_MS) {
        result.continued_after = after ?? undefined;
        return result;
      }
      after = m.user_id;
      result.considered += 1;
      const plan = planDigest(m, board);
      result.decisions?.push({
        user_id: m.user_id,
        send: plan.send,
        ...(plan.send ? {} : { reason: plan.reason }),
      });
      if (!plan.send) {
        result.skipped_nothing += 1;
        continue;
      }

      const token = SECRETS[0] ? await signWeeklyOff(m.user_id, SECRETS[0]) : "";
      const mail = renderDigest(m, plan, opts.week, {
        site,
        unsubscribeUrl: weeklyOffPageUrl(site, m.user_id, token),
      });

      if (opts.dryRun) {
        if ((result.emails?.length ?? 0) < opts.preview) {
          result.emails?.push({ to: maskEmail(m.email), ...mail });
        }
        continue;
      }

      const messageId = `weekly-digest:${m.user_id}:${opts.week.start}`;
      const { data: done } = await admin
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .eq("status", "sent")
        .maybeSingle();
      if (done) {
        result.skipped_duplicate += 1;
        continue;
      }

      const recipient = m.email.toLowerCase().trim();
      const r = await sendResendEmail({
        to: recipient,
        from,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        idempotencyKey: messageId,
        headers: {
          "List-Unsubscribe": `<${weeklyOffPostUrl(FUNCTION_URL, m.user_id, token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "anthem-weekly-digest",
        recipient_email: recipient,
        status: r.ok ? "sent" : "failed",
        error_message: r.ok ? null : r.message.slice(0, 500),
        metadata: {
          week_start: opts.week.start,
          views: m.views,
          followers: m.followers,
          likes: m.likes,
          open_calls: plan.calls.length,
          events: plan.events.length,
        },
      });
      if (r.ok) result.sent += 1;
      else {
        result.failed += 1;
        console.error("[weekly-digest] send failed", r.status, r.message);
        if (!r.retryable && r.message.includes("RESEND_API_KEY")) return result;
      }
      await sleep(SEND_GAP_MS);
    }

    if (rows.length < PAGE) break;
  }
  return result;
}

/** Hand the rest of the list to a new call of this function (its own time limit). */
function continueLater(week: Week, after: string): Promise<unknown> {
  return fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": SECRETS[0] },
    body: JSON.stringify({ week_start: week.start, after }),
  }).catch((e) => console.error("[weekly-digest] continue failed", String(e)));
}

function inBackground(p: Promise<unknown>): void {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
}

async function setSwitch(
  req: Request,
  admin: SupabaseClient,
  u: string,
  t: string,
  on: boolean,
): Promise<Response> {
  if (!(await verifyWeeklyOff(u, t, SECRETS)))
    return json(req, { ok: false, error: "bad_link" }, 403);
  const { data, error } = await admin.rpc("weekly_email_set", { _user: u, _on: on });
  if (error) {
    console.error("[weekly-digest] switch", error.message);
    return json(req, { ok: false, error: "failed" }, 500);
  }
  return json(req, { ok: data !== null, weekly: data === true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  const url = new URL(req.url);
  const qu = url.searchParams.get("u");
  const qt = url.searchParams.get("t");

  // Old mail apps open the List-Unsubscribe address: send them to the page, which asks the function itself.
  if (req.method === "GET" && qu && qt) {
    return Response.redirect(weeklyOffPageUrl(anthemSiteUrl(), qu, qt), 303);
  }
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  if (!SECRETS.length) {
    console.error("[weekly-digest] WEEKLY_DIGEST_SECRET / PUSH_DISPATCH_SECRET not configured");
    return json(req, { error: "not_configured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const raw = await req.text().catch(() => "");

  if (!isInternal(req)) {
    // RFC 8058 one-click (body "List-Unsubscribe=One-Click") carries the link in the URL.
    if (qu && qt) return setSwitch(req, admin, qu, qt, false);
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    const parsed = SwitchSchema.safeParse(body);
    if (!parsed.success) return json(req, { error: "unauthorized" }, 401);
    return setSwitch(req, admin, parsed.data.u, parsed.data.t, parsed.data.action === "on");
  }

  let input: z.infer<typeof RunSchema>;
  try {
    input = RunSchema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }
  const week = input.week_start ? weekStarting(input.week_start) : lastWeek(new Date());
  if (!week) return json(req, { error: "week_start must be a Monday" }, 400);

  if (input.dry_run) {
    try {
      const result = await run(admin, {
        week,
        dryRun: true,
        only: input.user_ids,
        preview: input.preview ?? 2,
      });
      return json(req, { dry_run: true, ...result });
    } catch (e) {
      return json(req, { error: String(e) }, 500);
    }
  }

  if (!Deno.env.get("RESEND_API_KEY")) {
    console.error("[weekly-digest] RESEND_API_KEY not configured — nothing sent");
    return json(req, { error: "RESEND_API_KEY not configured" }, 500);
  }

  const work = run(admin, { week, dryRun: false, preview: 0, after: input.after })
    .then(async (r) => {
      console.log("[weekly-digest]", JSON.stringify(r));
      if (r.continued_after) await continueLater(week, r.continued_after);
    })
    .catch((e) => console.error("[weekly-digest] run failed", String(e)));
  inBackground(work);
  return json(req, { started: true, week }, 202);
});
