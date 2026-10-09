/**
 * Admin pages that call tables / functions the production database does not have yet
 * (see docs/db-drift-2026-10-07.md). The menu tags these pages "รอ DB" and the page shows a notice,
 * so a solo operator is not left guessing why a list is empty or a button fails.
 * Delete an entry as soon as the migration that adds the object has been applied.
 */
export type AdminDbGap = {
  /** What is missing — shown in the notice. */
  missing: string[];
  /** What the operator will notice. */
  effect: string;
};

export const ADMIN_DB_GAPS: Record<string, AdminDbGap> = {
  "/admin/applications": {
    missing: ["admin_list_applications"],
    effect: "รายการใบสมัครจะโหลดไม่ขึ้น",
  },
  "/admin/contracts": {
    missing: ["contracts"],
    effect: "ไม่มีตารางสัญญา — รายการว่างและสร้างสัญญาไม่ได้",
  },
  "/admin/notifications": {
    missing: ["admin_list_notifications"],
    effect: "รายการแจ้งเตือนฝั่งแอดมินจะโหลดไม่ขึ้น",
  },
  "/admin/wallet": {
    missing: ["admin_wallet_ledger"],
    effect: "สมุดบัญชีกระเป๋า (ledger) โหลดไม่ขึ้น",
  },
  "/admin/finance": {
    missing: [
      "admin_finance_overview",
      "admin_get_payment_config",
      "admin_update_fee_config",
      "admin_update_payment_flags",
      "admin_upsert_fx_rate",
      "admin_manual_ledger_adjustment",
      "admin_retry_failed_payout",
      "admin_resolve_dispute",
      "admin_verify_recipient",
      "admin_reject_recipient",
      "admin_mark_provider_event_reprocess",
    ],
    effect: "ภาพรวม ตั้งค่าค่าธรรมเนียม/FX จ่ายซ้ำ และปิดข้อพิพาทใช้ไม่ได้",
  },
  "/admin/aml": {
    missing: ["aml_flags", "admin_aml_overview", "admin_resolve_aml_flag", "admin_freeze_account", "admin_unfreeze_account"],
    effect: "ไม่มีธงความเสี่ยง AML และอายัดบัญชีไม่ได้",
  },
  "/admin/ads": {
    missing: ["ad_applications", "ad_campaigns", "get_active_ads", "admin_approve_ad_application", "admin_reject_ad_application"],
    effect: "ไม่มีตารางแคมเปญ/คำขอโฆษณา",
  },
  "/admin/compliance/copyright": {
    missing: ["copyright_reports"],
    effect: "รับแจ้งลบผลงานละเมิดลิขสิทธิ์ไม่ได้",
  },
  "/admin/compliance/privacy": {
    missing: ["privacy_requests"],
    effect: "รับคำขอ PDPA (ดู/ลบข้อมูลส่วนตัว) ไม่ได้",
  },
  "/admin/compliance": {
    missing: ["copyright_reports", "privacy_requests"],
    effect: "คิวลิขสิทธิ์และคำขอ PDPA ว่าง/ใช้ไม่ได้",
  },
  "/admin/jobs": {
    missing: ["admin_set_job_status"],
    effect: "เปลี่ยนสถานะประกาศงานจากหลังบ้านไม่ได้",
  },
};

/** Longest-prefix match so `/admin/compliance/privacy` wins over `/admin/compliance`. */
export function adminDbGapForPath(pathname: string): AdminDbGap | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const keys = Object.keys(ADMIN_DB_GAPS).sort((a, b) => b.length - a.length);
  const hit = keys.find((k) => path === k || path.startsWith(`${k}/`));
  return hit ? ADMIN_DB_GAPS[hit] : null;
}
