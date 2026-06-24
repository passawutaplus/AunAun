import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isErrorReportRateLimited } from "@/lib/rateLimit.server";

const ReportSchema = z.object({
  errorCode: z.number().int().min(0).max(599),
  pageUrl: z.string().trim().max(500),
  errorMessage: z.string().trim().max(500).optional(),
  userNote: z.string().trim().max(1000).optional(),
  contactEmail: z.string().trim().email().optional(),
});

async function getOptionalUserId(): Promise<{ userId: string | null; email: string | null }> {
  try {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return { userId: null, email: null };
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token === "undefined" || token === "null") return { userId: null, email: null };

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { userId: null, email: null };

    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return { userId: null, email: null };
    return { userId: data.user.id, email: data.user.email ?? null };
  } catch {
    return { userId: null, email: null };
  }
}

function priorityForCode(code: number): "critical" | "high" | "medium" | "low" {
  if (code >= 500) return "high";
  if (code === 404) return "medium";
  return "medium";
}

function buildTitle(code: number): string {
  if (code === 404) return "รายงานหน้าไม่พบ (404)";
  if (code === 503) return "รายงานระบบไม่พร้อม (503)";
  if (code >= 500) return `รายงานข้อผิดพลาดระบบ (${code})`;
  return `รายงานปัญหาหน้าเว็บ (${code || "unknown"})`;
}

function buildDescription(input: {
  pageUrl: string;
  errorMessage?: string;
  userNote?: string;
  contactEmail?: string;
  userEmail?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}): string {
  const lines = [
    `URL: ${input.pageUrl}`,
    input.errorMessage ? `Error: ${input.errorMessage}` : null,
    input.userNote ? `\nหมายเหตุจากผู้ใช้:\n${input.userNote}` : null,
    input.userEmail ? `บัญชี: ${input.userEmail}` : null,
    input.contactEmail ? `อีเมลติดต่อ: ${input.contactEmail}` : null,
    input.referer ? `Referer: ${input.referer}` : null,
    input.userAgent ? `UA: ${input.userAgent.slice(0, 300)}` : null,
    `เวลา: ${new Date().toISOString()}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export const reportPageError = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ReportSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const { userId, email: authEmail } = await getOptionalUserId();

    if (!userId && !data.contactEmail) {
      return { ok: false as const, error: "กรุณาระบุอีเมลเพื่อให้ทีมงานติดต่อกลับ" };
    }

    if (await isErrorReportRateLimited({ userId, contactEmail: data.contactEmail })) {
      return {
        ok: false as const,
        error: "ส่งรายงานบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
      };
    }

    const title = buildTitle(data.errorCode);
    const description = buildDescription({
      pageUrl: data.pageUrl,
      errorMessage: data.errorMessage,
      userNote: data.userNote,
      contactEmail: data.contactEmail,
      userEmail: authEmail,
      userAgent: request?.headers?.get("user-agent") ?? null,
      referer: request?.headers?.get("referer") ?? null,
    });

    const insertPayload: Record<string, unknown> = {
      title,
      description,
      category: "bug",
      source: "error_page",
      source_feature: `http_${data.errorCode || "unknown"}`,
      priority: priorityForCode(data.errorCode),
      status: "new",
    };

    if (userId) {
      insertPayload.user_id = userId;
    }

    const { data: ticket, error } = await (supabaseAdmin as any)
      .from("support_tickets")
      .insert(insertPayload)
      .select("id, ticket_number")
      .single();

    if (error) {
      console.error("[reportPageError] ticket insert:", error.message);

      const { data: fb, error: fbErr } = await (supabaseAdmin as any)
        .from("beta_feedback")
        .insert({
          user_id: userId,
          user_email: data.contactEmail ?? authEmail,
          feature: "error_page",
          message: description,
          rating: null,
        })
        .select("id")
        .single();

      if (fbErr) {
        console.error("[reportPageError] beta_feedback fallback:", fbErr.message);
        return { ok: false as const, error: "ส่งรายงานไม่สำเร็จ — ลองใหม่อีกครั้ง" };
      }

      const ref = `RPT-${String(fb.id).slice(0, 8).toUpperCase()}`;
      return { ok: true as const, ticketNumber: ref, ticketId: fb.id as string };
    }

    await (supabaseAdmin as any).from("ticket_events").insert({
      ticket_id: ticket.id,
      actor_id: userId,
      event_type: "created",
      body: "รายงานอัตโนมัติจากหน้า error",
    });

    return {
      ok: true as const,
      ticketNumber: ticket.ticket_number as string,
      ticketId: ticket.id as string,
    };
  });
