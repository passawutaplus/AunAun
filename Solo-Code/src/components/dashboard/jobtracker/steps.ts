import {
  Wallet,
  Hammer,
  Image as ImageIcon,
  Receipt,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";

export const JOB_STEPS = [
  {
    key: "deposit",
    label: "รอชำระมัดจำ",
    icon: Wallet,
    eventKind: "deposit_paid",
    eventTitle: "รับมัดจำเรียบร้อย",
  },
  {
    key: "working",
    label: "กำลังทำงาน",
    icon: Hammer,
    eventKind: "work_started",
    eventTitle: "เริ่มลงมือทำงาน",
  },
  {
    key: "preview",
    label: "ส่งตัวอย่าง",
    icon: ImageIcon,
    eventKind: "preview_sent",
    eventTitle: "ส่งตัวอย่างให้ลูกค้า",
  },
  {
    key: "final-pay",
    label: "รอชำระยอดสุดท้าย",
    icon: Receipt,
    eventKind: "final_paid",
    eventTitle: "รับชำระยอดสุดท้าย",
  },
  {
    key: "delivered",
    label: "ส่งไฟล์จริง",
    icon: PackageCheck,
    eventKind: "delivered",
    eventTitle: "ส่งไฟล์จริงให้ลูกค้า",
  },
  {
    key: "done",
    label: "ปิดงานเรียบร้อย",
    icon: CheckCircle2,
    eventKind: "completed",
    eventTitle: "ปิดงานเรียบร้อย 🎉",
  },
] as const;

export type JobStepKey = (typeof JOB_STEPS)[number]["key"];

export function progressPercentForStep(step: number) {
  return Math.round((step / (JOB_STEPS.length - 1)) * 100);
}
