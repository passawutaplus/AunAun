import type { User } from "@supabase/supabase-js";
import { downloadBlob } from "@/lib/downloadBlob";
import { submitPrivacyRequest } from "@/lib/legalCompliance";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import { getMySettings } from "@/server/queries/account";
import { getMyProfileForExport } from "@/server/queries/myDataExport";

/**
 * Settings → "ดาวน์โหลดข้อมูลของฉัน" (PDPA): the old AccountPrivacySection quick export — the account's
 * profile as a JSON file, then an "export" privacy request for the team's records. The KYC and payout tables
 * of that export were dropped with So1o (2026-11-13), so they are not read any more.
 */
export async function exportMyData(user: User): Promise<void> {
  const [profile, settings] = await Promise.all([getMyProfileForExport(user.id), getMySettings().catch(() => null)]);
  const day = new Date().toISOString().slice(0, 10);
  const payload = {
    exported_at: new Date().toISOString(),
    app: "samecor",
    user_id: user.id,
    email: user.email ?? null,
    phone: user.phone || null,
    profile,
    settings,
    note: `ข้อมูลพื้นฐานของบัญชี · อยากได้สำเนาทั้งหมด ทักมาที่ ${LEGAL_DPO_EMAIL}`,
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `samecor-export-${day}.json`);
  // Fails when an export request is still open or the SQL is missing: the file is already saved, so it is fine.
  void submitPrivacyRequest("export", "ดาวน์โหลดจากตั้งค่า (self-serve)").catch(() => undefined);
}
