import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  defaultFastModel,
  geminiGenerateText,
  getGeminiApiKey,
  GeminiError,
} from "../_shared/gemini.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const BodySchema = z.object({
  task: z.string().min(1).max(80),
  context: z.record(z.string()).default({}),
  insight_type: z.string().max(40).optional(),
  business_id: z.string().uuid().optional(),
});

const OutputSchema = z.object({
  summary: z.string(),
  keyFindings: z.array(z.string()),
  recommendedAction: z.string(),
  confidenceScore: z.number().min(0).max(1),
  riskComplianceNote: z.string(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

const COMPLIANCE_NOTE =
  "ข้อมูลช่วยตัดสินใจ ไม่ใช่ข้อเท็จจริง 100% — ตรวจสอบ source URL และสิทธิ์ข้อมูลก่อนใช้งาน";

const SYSTEM = `You are an admin marketing analyst for Aplus1 (Thai creative platform).
Return ONLY valid JSON matching this shape:
{"summary":"...","keyFindings":["..."],"recommendedAction":"...","confidenceScore":0.0-1.0,"riskComplianceNote":"..."}
Rules:
- Thai language unless context requests English
- No PII fabrication; decision support only
- Mention compliance: public data only, no spam outreach
- confidenceScore between 0 and 1`;

async function assertAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) {
    console.error("[marketing-ai] has_role", error.message);
    return false;
  }
  return !!data;
}

function parseJsonOutput(text: string): z.infer<typeof OutputSchema> {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  const slice = jsonStart >= 0 && jsonEnd > jsonStart ? trimmed.slice(jsonStart, jsonEnd + 1) : trimmed;
  const parsed = JSON.parse(slice) as unknown;
  return OutputSchema.parse(parsed);
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
  const userId = claims.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);
  if (!(await assertAdmin(admin, userId))) return json(req, { error: "forbidden" }, 403);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const { count: recentCount } = await admin
    .from("kuy_insights")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((recentCount ?? 0) >= 30) return json(req, { error: "rate_limited" }, 429);

  const ctx = Object.entries(body.context)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const userContent = `Task: ${body.task}
Insight type: ${body.insight_type ?? "general"}
Context:
${ctx}`;

  try {
    const raw = await geminiGenerateText(getGeminiApiKey(), defaultFastModel(), {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      temperature: 0.5,
    });
    const output = parseJsonOutput(raw);
    return json(req, { output, audit: { actor: userId } });
  } catch (e) {
    if (e instanceof GeminiError && e.status === 429) return json(req, { error: "rate_limited" }, 429);
    console.error("[marketing-ai]", e);
    return json(req, { error: "internal" }, 500);
  }
});
