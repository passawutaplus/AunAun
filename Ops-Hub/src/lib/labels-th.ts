import type { BoardColumn, WorkItemPriority, WorkItemSource } from "@/lib/work-items";

export const NAV_LABELS = {
  overview: "ภาพรวม",
  inbox: "กล่องขาเข้า",
  board: "บอร์ดงาน",
  issues: "รายการทั้งหมด",
  work: "งานภายใน",
  cycles: "รอบงาน",
  roadmap: "แผนงาน",
  activity: "กิจกรรม",
  tracking: "ติดตามระบบ",
} as const;

export const BOARD_COLUMN_LABELS: Record<BoardColumn, string> = {
  triage: "รอตรวจ",
  in_progress: "กำลังทำ",
  in_review: "รอตรวจทาน",
  done: "เสร็จแล้ว",
};

export const SOURCE_LABELS_TH: Record<WorkItemSource, string> = {
  support_ticket: "ตั๋วซัพพอร์ต",
  feature_suggestion: "ข้อเสนอฟีเจอร์",
  app_feedback: "ฟีดแบ็กแอป",
  user_report: "รายงานเนื้อหา",
  ops_issue: "งานภายใน Hub",
};

export const PRIORITY_LABELS: Record<WorkItemPriority, string> = {
  urgent: "ด่วนมาก",
  high: "สำคัญ",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

export const APP_LABELS = {
  so1o: "So1o",
  an1hem: "an1hem",
  ecosystem: "ทั้งระบบ",
} as const;
