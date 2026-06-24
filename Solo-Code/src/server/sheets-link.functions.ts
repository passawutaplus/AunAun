import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTesterSheetUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (rErr) throw new Error(rErr.message);
    if (!roles || roles.length === 0) throw new Error("ต้องเป็นแอดมินเท่านั้น");

    const sheetId = process.env.TESTER_SHEET_ID;
    if (!sheetId) throw new Error("ยังไม่ได้ตั้งค่า TESTER_SHEET_ID");
    return { url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` };
  });
