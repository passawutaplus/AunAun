// Triggered by database (pg_net) when a job_post is created/updated.
// Validates payload, then computes matches with the service role.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import {
  enqueueAnthemNotificationEmail,
  shouldSendAnthemEmail,
} from "../_shared/enqueue-anthem-email.ts";
import { enqueueLineNotification } from "../_shared/line-enqueue.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISPATCH_SECRET =
  Deno.env.get("JOB_MATCH_DISPATCH_SECRET") ?? Deno.env.get("ECOSYSTEM_SYNC_SECRET") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function authorizeInternal(req: Request): boolean {
  if (!DISPATCH_SECRET) {
    console.error("[job-match-dispatch] JOB_MATCH_DISPATCH_SECRET not configured");
    return false;
  }
  const header = req.headers.get("x-internal-secret")?.trim();
  if (!header) return false;
  return timingSafeEqual(header, DISPATCH_SECRET);
}

const BodySchema = z.object({ job_id: z.string().uuid() });

const norm = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]/gi, "");
const overlap = (a: string[], b: string[]) => {
  const A = new Set(a.map(norm).filter(Boolean));
  return b.map(norm).filter((x) => x && A.has(x));
};

interface Job {
  id: string;
  post_type: "hiring" | "seeking";
  role_category: string;
  skills: string[];
  location: string;
  location_type: string;
  employment_type: string;
  studio_id: string | null;
  posted_by: string;
  title: string;
}

interface Candidate {
  id: string;
  skills: string[];
  role: string | null;
  location: string | null;
  preferred_categories: string[];
  preferred_employment_types: string[];
  project_categories: string[];
  project_tools: string[];
}

function scoreHiring(job: Job, c: Candidate) {
  const reasons: string[] = [];
  let score = 0;
  const cats = [...c.preferred_categories, ...c.project_categories, c.role ?? ""].filter(Boolean);
  if (job.role_category && cats.map(norm).includes(norm(job.role_category))) {
    score += 40;
    reasons.push(`หมวด ${job.role_category}`);
  }
  const userSkills = [...c.skills, ...c.project_tools];
  const skillHits = overlap(job.skills, userSkills);
  if (skillHits.length) {
    score += Math.min(skillHits.length * 10, 40);
    reasons.push(`สกิลตรง ${skillHits.length} อย่าง`);
  }
  if (job.location_type === "remote") {
    score += 10;
    reasons.push("Remote");
  } else if (c.location && job.location && norm(c.location).includes(norm(job.location))) {
    score += 10;
    reasons.push(`พื้นที่ ${job.location}`);
  }
  if (c.preferred_employment_types.includes(job.employment_type)) {
    score += 10;
    reasons.push(`ตรงประเภทงาน`);
  }
  return { score, reasons };
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type MatchRow = { user_id: string; job_id: string; match_score: number; match_reasons: string[] };

async function notifyJobMatches(sb: ReturnType<typeof createClient>, job: Job, rows: MatchRow[]) {
  const siteUrl = anthemSiteUrl();
  let emails = 0;
  for (const row of rows) {
    const notify = await shouldSendAnthemEmail(sb, row.user_id, { kind: "job_match" });
    if (!notify.send || !notify.email) continue;

    const result = await enqueueAnthemNotificationEmail(sb, {
      template: "job-match",
      templateName: "anthem-job-match",
      recipientEmail: notify.email,
      idempotencyKey: `job-match-${row.user_id}-${row.job_id}`,
      label: "anthem-job-match",
      templateData: {
        recipientName: notify.displayName ?? "คุณ",
        jobTitle: job.title,
        roleCategory: job.role_category,
        matchScore: row.match_score,
        matchReasons: row.match_reasons,
        actionUrl: `${siteUrl}/jobs/${job.id}`,
      },
    });
    if (result.ok && !result.duplicate) emails += 1;

    await enqueueLineNotification({
      userId: row.user_id,
      kind: "anthem_job_match",
      body: `พบงาน ${job.title} ตรงสกิล (${row.match_score}%)`,
      idempotencyKey: `line-job-match-${row.user_id}-${row.job_id}`,
      link: `/jobs/${job.id}`,
    });
  }
  return emails;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!authorizeInternal(req)) return json({ error: "unauthorized" }, 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { job_id } = parsed.data;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: job } = await sb.from("job_posts").select("*").eq("id", job_id).maybeSingle();
    if (!job || job.status !== "open") return json({ skipped: true });

    const j = job as Job;

    if (j.post_type === "hiring") {
      const { data: profs } = await sb
        .from("profiles")
        .select(
          "id, skills, role, location, preferred_categories, preferred_employment_types, notify_job_match",
        )
        .eq("notify_job_match", true)
        .neq("id", j.posted_by)
        .limit(2000);

      const candidates = profs ?? [];
      if (candidates.length === 0) return json({ inserted: 0 });

      const ids = candidates.map((p: any) => p.id);
      const { data: projs } = await sb
        .from("projects")
        .select("owner_id, category, tools")
        .in("owner_id", ids)
        .eq("status", "Published");
      const projMap = new Map<string, { cats: string[]; tools: string[] }>();
      (projs ?? []).forEach((p: any) => {
        const cur = projMap.get(p.owner_id) ?? { cats: [], tools: [] };
        if (p.category) cur.cats.push(p.category);
        if (p.tools) cur.tools.push(...p.tools);
        projMap.set(p.owner_id, cur);
      });

      const rows: any[] = [];
      for (const p of candidates as any[]) {
        const pm = projMap.get(p.id) ?? { cats: [], tools: [] };
        const cand: Candidate = {
          id: p.id,
          skills: p.skills ?? [],
          role: p.role,
          location: p.location,
          preferred_categories: p.preferred_categories ?? [],
          preferred_employment_types: p.preferred_employment_types ?? [],
          project_categories: pm.cats,
          project_tools: pm.tools,
        };
        const { score, reasons } = scoreHiring(j, cand);
        if (score >= 40)
          rows.push({ user_id: p.id, job_id: j.id, match_score: score, match_reasons: reasons });
      }

      if (rows.length) {
        await sb
          .from("job_match_notifications")
          .upsert(rows, { onConflict: "user_id,job_id", ignoreDuplicates: true });
        const emails = await notifyJobMatches(sb, j, rows);
        return json({ inserted: rows.length, emails });
      }
      return json({ inserted: 0 });
    }

    const { data: studios } = await sb.from("studios").select("id, expertise, available_for_work");
    const matchedStudioIds = (studios ?? [])
      .filter((s: any) => {
        const exp = (s.expertise ?? []) as string[];
        return (
          (j.role_category && exp.map(norm).includes(norm(j.role_category))) ||
          overlap(j.skills, exp).length > 0
        );
      })
      .map((s: any) => s.id);
    if (matchedStudioIds.length === 0) return json({ inserted: 0 });

    const { data: members } = await sb
      .from("studio_members")
      .select("user_id, studio_id, role")
      .in("studio_id", matchedStudioIds)
      .in("role", ["owner", "admin"]);

    const studioMap = new Map((studios ?? []).map((s: any) => [s.id, s]));
    const rows: any[] = [];
    const seen = new Set<string>();
    for (const m of members ?? []) {
      if (m.user_id === j.posted_by) continue;
      if (seen.has(m.user_id)) continue;
      seen.add(m.user_id);
      const s: any = studioMap.get(m.studio_id);
      const exp = (s?.expertise ?? []) as string[];
      const skillHits = overlap(j.skills, exp);
      let score = 0;
      const reasons: string[] = [];
      if (j.role_category && exp.map(norm).includes(norm(j.role_category))) {
        score += 50;
        reasons.push(`Studio ตรงหมวด ${j.role_category}`);
      }
      if (skillHits.length) {
        score += Math.min(skillHits.length * 10, 40);
        reasons.push(`สกิลตรง ${skillHits.length} อย่าง`);
      }
      if (score >= 40)
        rows.push({ user_id: m.user_id, job_id: j.id, match_score: score, match_reasons: reasons });
    }

    if (rows.length) {
      await sb
        .from("job_match_notifications")
        .upsert(rows, { onConflict: "user_id,job_id", ignoreDuplicates: true });
      const emails = await notifyJobMatches(sb, j, rows);
      return json({ inserted: rows.length, emails });
    }
    return json({ inserted: 0 });
  } catch {
    return json({ error: "internal error" }, 500);
  }
});
