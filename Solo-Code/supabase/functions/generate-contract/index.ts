// Generate contract draft (Thai) via Google Gemini.
import { z } from "npm:zod@3";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  GeminiError,
  defaultModel,
  geminiGenerateText,
  getGeminiApiKey,
  normalizeGeminiModel,
} from "../_shared/gemini.ts";
import { debitAiQuota } from "../_shared/ai-quota.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const CONTRACT_FEATURE = "generate_contract";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PayloadSchema = z.object({
  type: z.enum(["project", "fulltime"]),
  hirer_name: z.string().max(200).optional(),
  hirer_id: z.string().max(50).optional(),
  hirer_address: z.string().max(500).optional(),
  contractor_name: z.string().max(200).optional(),
  contractor_id: z.string().max(50).optional(),
  contractor_address: z.string().max(500).optional(),
  job_title: z.string().max(300).optional(),
  scope: z.string().max(4000).optional(),
  deliverables: z.string().max(4000).optional(),
  start_date: z.string().max(40).optional(),
  end_date: z.string().max(40).optional(),
  payment_amount: z.string().max(100).optional(),
  payment_terms: z.string().max(2000).optional(),
  currency: z.string().max(10).optional(),
  ip_owner: z.enum(["hirer", "contractor", "shared"]).optional(),
  nda: z.boolean().optional(),
  termination_notice_days: z.number().int().min(0).max(365).optional(),
  governing_law: z.string().max(200).optional(),
  extra_notes: z.string().max(2000).optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

function buildPrompt(p: Payload): string {
  const isProject = p.type === "project";
  return [
    `คุณเป็นที่ปรึกษากฎหมายไทย ช่วยร่างสัญญา${isProject ? "จ้างทำของ (รายโปรเจกต์/Freelance)" : "จ้างแรงงาน (พนักงานประจำ)"}เป็นภาษาไทย`,
    `ใช้ภาษากฎหมายที่ถูกต้องตามประมวลกฎหมายแพ่งและพาณิชย์ของไทย แต่อ่านง่าย`,
    `ส่งออกเป็น Markdown เท่านั้น มีหัวข้อ ## และข้อย่อย 1. 2. 3.`,
    `ขึ้นต้นด้วยชื่อสัญญา วันที่ ผู้ว่าจ้าง ผู้รับจ้าง แล้วตามด้วยข้อสัญญา`,
    isProject
      ? `ต้องมีหัวข้ออย่างน้อย: ขอบเขตงาน, ส่งมอบงาน, ค่าจ้างและการชำระเงิน, ทรัพย์สินทางปัญญา, การรักษาความลับ, การแก้ไข/ยกเลิก, การระงับข้อพิพาท, ลายมือชื่อ`
      : `ต้องมีหัวข้ออย่างน้อย: ตำแหน่งงานและหน้าที่, ระยะเวลาทดลองงาน, เงินเดือนและสวัสดิการ, เวลาทำงาน, วันหยุดและวันลา, ทรัพย์สินทางปัญญา, การรักษาความลับ, การเลิกจ้าง (แจ้งล่วงหน้า ${p.termination_notice_days ?? 30} วัน), ลายมือชื่อ`,
    `ข้อมูลที่ผู้ใช้กรอกมา (ใช้เติมในสัญญา ห้ามสมมติเกินจริง ถ้าช่องไหนว่างให้ใส่ "[โปรดระบุ]"):`,
    "```json",
    JSON.stringify(p, null, 2),
    "```",
    `หมายเหตุท้ายร่าง: ระบุชัดเจนว่า "เอกสารนี้เป็นเพียงร่างเบื้องต้น ควรให้ทนายความตรวจสอบก่อนใช้งานจริง"`,
  ].join("\n");
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);

  // --- Validate input ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(req, { error: "invalid json body" }, 400);
  }
  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) return json(req, { error: parsed.error.flatten().fieldErrors }, 400);

  const userId = claims.claims.sub as string;
  const idempotencyKey = crypto.randomUUID();
  const quota = await debitAiQuota(userId, CONTRACT_FEATURE, idempotencyKey);
  if (!quota.allowed) {
    return json(req, { error: "limit_reached", ...quota }, 429);
  }

  try {
    const model = normalizeGeminiModel("google/gemini-2.5-flash", defaultModel());
    const draft = await geminiGenerateText(getGeminiApiKey(), model, {
      messages: [
        { role: "system", content: "คุณเป็นผู้ช่วยร่างสัญญาภาษาไทย ตอบเป็น Markdown เท่านั้น" },
        { role: "user", content: buildPrompt(parsed.data) },
      ],
      temperature: 0.3,
    });

    return json(req, { draft });
  } catch (e) {
    if (e instanceof GeminiError && e.status === 429) {
      return json(req, { error: "ใช้งานเยอะเกินไป ลองใหม่อีกครั้ง" }, 429);
    }
    return json(req, { error: "internal error" }, 500);
  }
});
