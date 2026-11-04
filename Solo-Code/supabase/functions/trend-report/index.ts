// Weekly trend report bridge for the "SAMECOR trend scout" cloud routine.
//   GET  → this week's platform stats (aggregates only) for the report's "on SAMECOR" section.
//   POST → { week_of, title, summary[3-7], doc_url } saves the report and queues the LINE summary
//          (button to the Google Doc) for the admin group.
// Called server-to-server only. Auth: header `x-trend-secret` must equal the TREND_REPORT_SECRET
// function secret (set by the owner; the routine holds the same value). No CORS on purpose.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sameSecret(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

const DOC_URL =
  /^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_?=&#/-]*)?$/;

function parseReport(
  body: unknown,
): { week_of: string; title: string; summary: string[]; doc_url: string } | string {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  const week = typeof b.week_of === "string" ? b.week_of : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return "week_of must be YYYY-MM-DD";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 120) return "title must be 1-120 characters";
  const summary = Array.isArray(b.summary)
    ? b.summary
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (summary.length < 3 || summary.length > 7 || summary.some((s) => s.length > 160))
    return "summary must be 3-7 lines of at most 160 characters";
  const doc = typeof b.doc_url === "string" ? b.doc_url.trim() : "";
  if (!DOC_URL.test(doc)) return "doc_url must be a Google Docs document link";
  return { week_of: week, title, summary, doc_url: doc };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST")
    return json({ error: "method not allowed" }, 405);

  const expected = Deno.env.get("TREND_REPORT_SECRET") ?? "";
  const given = req.headers.get("x-trend-secret") ?? "";
  if (expected.length < 32 || !sameSecret(given, expected))
    return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server misconfiguration" }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  if (req.method === "GET") {
    const days = Math.min(
      31,
      Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 7) || 7),
    );
    const { data, error } = await admin.rpc("trend_platform_stats", { _days: days });
    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const report = parseReport(body);
  if (typeof report === "string") return json({ error: report }, 400);

  const { data, error } = await admin.rpc("trend_report_publish", {
    _week_of: report.week_of,
    _title: report.title,
    _summary: report.summary,
    _doc_url: report.doc_url,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ id: data, queued: true });
});
