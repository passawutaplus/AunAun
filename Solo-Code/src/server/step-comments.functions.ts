import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyFreelancer, getFreelancerDisplayName } from "@/server/emailNotify.server";
import { canonicalUrl } from "@/lib/siteUrl";
import { throwClientError } from "@/lib/security";

const ListSchema = z.object({ token: z.string().uuid() });

export const listStepComments = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: job } = await supabaseAdmin
      .from("job_trackers")
      .select("id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!job) return { comments: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("job_tracker_step_comments")
      .select("id, step_index, author_role, body, created_at")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    if (error) throwClientError("stepComments.list", error);
    return { comments: rows ?? [] };
  });

// Note: author_role is intentionally NOT accepted from the client.
// The server derives it from whether the request comes from the job owner.
const AddSchema = z.object({
  token: z.string().uuid(),
  step_index: z.number().int().min(0).max(20),
  body: z.string().min(1).max(1000),
});

async function getRequestUserId(): Promise<string | null> {
  try {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token === "undefined" || token === "null") return null;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export const addStepComment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AddSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: job } = await supabaseAdmin
      .from("job_trackers")
      .select("id, user_id, title, client_name")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!job) throw new Error("Invalid token");

    // Server-derived author role — anyone without a session, or anyone whose
    // session does not match the job owner, posts as 'client'.
    const requesterUserId = await getRequestUserId();
    const authorRole: "owner" | "client" =
      requesterUserId && requesterUserId === job.user_id ? "owner" : "client";

    const body = data.body.trim();
    const { error } = await supabaseAdmin.from("job_tracker_step_comments").insert({
      job_id: job.id,
      step_index: data.step_index,
      author_role: authorRole,
      body,
    });
    if (error) throwClientError("stepComments.add", error, "ไม่สามารถบันทึกความคิดเห็นได้");

    if (authorRole === "client" && job.user_id) {
      const recipientName = await getFreelancerDisplayName(job.user_id);
      const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body;
      void notifyFreelancer({
        userId: job.user_id,
        templateName: "project-alert",
        templateData: {
          recipientName,
          projectName: job.title ?? "โปรเจกต์",
          alertType: "comment",
          message: `${job.client_name ?? "ลูกค้า"} แสดงความคิดเห็น: "${preview}"`,
          actionUrl: canonicalUrl("/dashboard?tab=projects"),
        },
        idempotencyKey: `comment-${job.id}-${Date.now().toString(36)}`,
      });
    }

    return { ok: true, author_role: authorRole };
  });
