import { z } from "zod";
import { DISCLAIMER_LEGAL_FULL } from "@/lib/copyConstants";

export const WORK_TYPES = ["logo", "photo", "video", "social", "web", "source", "other"] as const;
export const LICENSE_TYPES = ["exclusive", "non_exclusive"] as const;
export const CHANNELS = ["social", "print", "web", "ads", "broadcast"] as const;
export const TERRITORIES = ["thailand", "worldwide", "custom"] as const;
export const TERMS = ["1y", "perpetual", "project"] as const;
export const TRANSFER_ON = ["full_payment", "deposit", "never"] as const;
export const DELIVERABLES = ["png", "pdf", "source_ai", "source_psd"] as const;

export type WorkType = (typeof WORK_TYPES)[number];
export type LicenseType = (typeof LICENSE_TYPES)[number];
export type UsageChannel = (typeof CHANNELS)[number];
export type Territory = (typeof TERRITORIES)[number];
export type UsageTerm = (typeof TERMS)[number];
export type TransferOn = (typeof TRANSFER_ON)[number];
export type Deliverable = (typeof DELIVERABLES)[number];

export const WORK_TYPE_OPTIONS: { value: WorkType; label: string; hint: string; icon: string }[] = [
  { value: "logo", label: "โลโก้ / แบรนด์", hint: "ตราสัญลักษณ์ ไอคอน ชุด CI", icon: "🎨" },
  { value: "photo", label: "ภาพนิ่ง", hint: "ภาพถ่าย รีทัช คอมโพสิต", icon: "📷" },
  { value: "video", label: "วิดีโอ", hint: "ตัดต่อ โมชัน รีลส์", icon: "🎬" },
  { value: "social", label: "โพสต์โซเชียล", hint: "แคปชัน + กราฟิกโพสต์", icon: "📱" },
  { value: "web", label: "เว็บ / UI", hint: "เลย์เอาต์ หน้าเว็บ แอป", icon: "🌐" },
  { value: "source", label: "ไฟล์ต้นฉบับ", hint: "AI/PSD/Figma ฯลฯ", icon: "📁" },
  { value: "other", label: "อื่นๆ", hint: "งานผสมหรือไม่ตรงหมวด", icon: "✨" },
];

export const LICENSE_TYPE_OPTIONS: { value: LicenseType; label: string; hint: string }[] = [
  {
    value: "exclusive",
    label: "ใช้คนเดียว",
    hint: "ลูกค้าคนนี้ใช้คนเดียว — คุณไม่ขายซ้ำให้คู่แข่ง",
  },
  {
    value: "non_exclusive",
    label: "ใช้ได้ แต่ขายซ้ำได้",
    hint: "ลูกค้าใช้ได้ แต่คุณขาย template/สไตล์ซ้ำให้คนอื่นได้",
  },
];

export const CHANNEL_OPTIONS: { value: UsageChannel; label: string }[] = [
  { value: "social", label: "โซเชียล" },
  { value: "print", label: "สิ่งพิมพ์" },
  { value: "web", label: "เว็บไซต์" },
  { value: "ads", label: "โฆษณา" },
  { value: "broadcast", label: "ออกอากาศ/TV" },
];

export const TERRITORY_LABELS: Record<Territory, string> = {
  thailand: "ประเทศไทย",
  worldwide: "ทั่วโลก",
  custom: "ระบุเอง",
};

export const TERM_LABELS: Record<UsageTerm, string> = {
  "1y": "1 ปี",
  perpetual: "ถาวร",
  project: "ตามโปรเจกต์นี้",
};

export const TRANSFER_LABELS: Record<TransferOn, string> = {
  full_payment: "เมื่อชำระครบ",
  deposit: "เมื่อรับมัดจำ",
  never: "ไม่โอน (ให้สิทธิใช้งานเท่านั้น)",
};

export const DELIVERABLE_LABELS: Record<Deliverable, string> = {
  png: "PNG/JPG",
  pdf: "PDF",
  source_ai: "ไฟล์ต้นฉบับ AI",
  source_psd: "ไฟล์ต้นฉบับ PSD",
};

export const usageRightsSchema = z.object({
  label: z.string().trim().max(120).optional(),
  workType: z.enum(WORK_TYPES),
  licenseType: z.enum(LICENSE_TYPES),
  channels: z.array(z.enum(CHANNELS)).min(1, "เลือกช่องทางอย่างน้อย 1 ช่อง"),
  territory: z.enum(TERRITORIES),
  territoryCustom: z.string().trim().max(200).optional(),
  term: z.enum(TERMS),
  transferOn: z.enum(TRANSFER_ON),
  deliverables: z.array(z.enum(DELIVERABLES)).min(1, "เลือกไฟล์ที่ส่งมอบอย่างน้อย 1 แบบ"),
  revisionRounds: z.number().int().min(0).max(20).default(2),
  extraRevisionFee: z.number().min(0).optional(),
});

export type UsageRightsInput = z.infer<typeof usageRightsSchema>;

export interface UsageRights extends UsageRightsInput {
  id: string;
  userId: string;
  quotationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LEGAL_DISCLAIMER = DISCLAIMER_LEGAL_FULL;

export function buildUsageRightsLabel(input: UsageRightsInput): string {
  const work = WORK_TYPE_OPTIONS.find((w) => w.value === input.workType)?.label ?? input.workType;
  const lic = input.licenseType === "exclusive" ? "เฉพาะ" : "ไม่เฉพาะ";
  const term = TERM_LABELS[input.term];
  return `${work} · ${lic} · ${term}`;
}

export const DEFAULT_USAGE_RIGHTS: UsageRightsInput = {
  workType: "logo",
  licenseType: "non_exclusive",
  channels: ["social", "web"],
  territory: "thailand",
  term: "project",
  transferOn: "full_payment",
  deliverables: ["png", "pdf"],
  revisionRounds: 2,
};
