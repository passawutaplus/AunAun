import type { LineNotifyKind } from "@/lib/lineNotificationKinds";
import { formatLineNotification, type LinePersonalization } from "@/lib/lineMessageFormat";

export const LINE_TEST_SAMPLES: Array<{ kind: LineNotifyKind; body: string }> = [
  { kind: "portal_slip", body: "คุณสมชาย อัปโหลดสลิปมัดจำ — Rebrand ร้านกาแฟ" },
  { kind: "portal_tracker_comment", body: "ลูกค้าแสดงความคิดเห็นในขั้นตอน Final Design" },
  { kind: "portal_brief", body: "บรีฟงานโปรเจกต์ Logo Sundae ครบถ้วน" },
  { kind: "portal_planner", body: "ลูกค้ากดอนุมัติโพสต์ IG รอบ 2" },
  { kind: "portal_quotation", body: "QT-2026-0042 — Rebrand ร้านกาแฟ" },
  { kind: "anthem_hire", body: "มีลูกค้าส่งคำขอจ้างงาน Logo Design" },
  { kind: "anthem_chat", body: "ลูกค้าส่งข้อความในแชทจ้างงาน" },
  { kind: "anthem_job_match", body: "พบงาน UI Design ที่ตรงกับทักษะของคุณ" },
  { kind: "inhouse_invite", body: "ทีม Passa Studio เชิญคุณเข้าร่วม In-House workspace" },
  { kind: "inhouse_member_join", body: "คุณสมชาย เข้าร่วมทีม Passa Studio แล้ว" },
  { kind: "inhouse_chat", body: "มีข้อความใหม่ในช่อง #general" },
  { kind: "inhouse_task", body: "มอบหมายงาน: ออกแบบ Hero section — due วันนี้" },
  { kind: "billing", body: "ต่ออายุโปรสำเร็จ — ฿249" },
];

export function formatLineTestMessage(
  kind: LineNotifyKind,
  body: string,
  personal?: LinePersonalization,
): string {
  return formatLineNotification(kind, body, personal);
}
