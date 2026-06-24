import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const inputSchema = z.object({
  full_name: z.string().min(1).max(200),
  alias_name: z.string().max(200).nullable().optional(),
  main_field: z.string().min(1).max(200),
  main_field_other: z.string().max(500).nullable().optional(),
  years_experience: z.string().min(1).max(100),
  contact_email: z.string().max(320).nullable().optional(),
  contact_line: z.string().max(200).nullable().optional(),
  quotation_method: z.array(z.string().max(200)).max(20),
  quotation_method_other: z.string().max(500).nullable().optional(),
  pain_points: z.array(z.string().max(200)).max(20),
  pain_points_other: z.string().max(500).nullable().optional(),
  feature_request: z.string().max(2000).nullable().optional(),
});

export const appendTesterApplicationToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_ID = process.env.TESTER_SHEET_ID;

    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY || !SHEET_ID) {
      console.error("Sheets config missing", {
        LOVABLE_API_KEY: !!LOVABLE_API_KEY,
        GOOGLE_SHEETS_API_KEY: !!GOOGLE_SHEETS_API_KEY,
        SHEET_ID: !!SHEET_ID,
      });
      return { ok: false, error: "Sheets integration not configured" };
    }

    // Identity comes from the verified JWT, not the client payload
    const verifiedUserId = context.userId;
    const verifiedEmail = (context.claims?.email as string | undefined) ?? "";

    const row = [
      new Date().toISOString(),
      verifiedUserId,
      verifiedEmail,
      data.full_name,
      data.alias_name ?? "",
      data.main_field === "อื่นๆ" ? `อื่นๆ: ${data.main_field_other ?? ""}` : data.main_field,
      data.years_experience,
      data.contact_email ?? "",
      data.contact_line ?? "",
      data.quotation_method.join(", ") +
        (data.quotation_method.includes("อื่นๆ") && data.quotation_method_other
          ? ` | อื่นๆ: ${data.quotation_method_other}`
          : ""),
      data.pain_points.join(", ") +
        (data.pain_points.includes("อื่นๆ") && data.pain_points_other
          ? ` | อื่นๆ: ${data.pain_points_other}`
          : ""),
      data.feature_request ?? "",
    ];

    const range = "'So1o Early Access'!A:L";
    const url = `${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Sheets append failed [${res.status}]:`, text);
      return { ok: false, error: `Sheets ${res.status}` };
    }
    return { ok: true };
  });

export const sendTestApplicationToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin-only
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      return { ok: false, error: "ต้องเป็นแอดมินเท่านั้น" };
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_ID = process.env.TESTER_SHEET_ID;
    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY || !SHEET_ID) {
      return { ok: false, error: "Sheets integration not configured" };
    }

    const stamp = new Date().toISOString();
    const row = [
      stamp,
      context.userId,
      (context.claims?.email as string | undefined) ?? "",
      `[TEST] ทดสอบระบบ ${stamp}`,
      "TestAlias",
      "Graphic",
      "1-3 ปี",
      "test@example.com",
      "test_line",
      "ใช้โปรแกรมบัญชีสำเร็จรูป",
      "คำนวณราคาไม่ถูก, จดบันทึก supplier",
      "ทดสอบ feature request — โปรดละเว้นแถวนี้",
    ];

    const range = "'So1o Early Access'!A:L";
    const url = `${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[testSheet] append failed [${res.status}]:`, text);
      return { ok: false, error: `Sheets ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true, sheet: "So1o Early Access", at: stamp };
  });
