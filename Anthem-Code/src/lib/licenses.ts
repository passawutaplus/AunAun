import type { LucideIcon } from "lucide-react";
import { Briefcase, Copyright, CreativeCommons, Link2, PenLine, Unlock, User } from "lucide-react";
import { BRAND_NAME } from "@/lib/brandConfig";

/** All values that may exist in DB (including legacy). */
export const LICENSE_TYPES = [
  "all_rights",
  "portfolio_only",
  "personal_ok",
  "attribution_ok",
  "commercial_license",
  "free_use",
  "custom",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

/** Choices shown in the project editor picker. */
export const LICENSE_PICKER_TYPES = ["all_rights", "attribution_ok", "free_use", "custom"] as const;

export type LicensePickerType = (typeof LICENSE_PICKER_TYPES)[number];

export interface LicenseMeta {
  id: LicenseType;
  icon: LucideIcon;
  shortLabel: string;
  description: string;
  detailParagraph: string;
  allowsReuse: boolean;
  allowsCommercial: boolean;
  requiresAttribution: boolean;
  tooltipLines: [string, string, string];
}

export const LICENSE_PRESETS: Record<LicenseType, LicenseMeta> = {
  all_rights: {
    id: "all_rights",
    icon: CreativeCommons,
    shortLabel: "สงวนสิทธิ์ทั้งหมด",
    description: "ผู้อื่นสามารถรับชมผลงานได้เท่านั้น ต้องขออนุญาตก่อนนำไปใช้ คัดลอก หรือดัดแปลง",
    detailParagraph:
      `ผู้อื่นสามารถรับชมผลงานได้เท่านั้นบน ${BRAND_NAME} — ต้องขออนุญาตจากเจ้าของก่อนนำไปใช้ คัดลอก หรือดัดแปลง`,
    allowsReuse: false,
    allowsCommercial: false,
    requiresAttribution: false,
    tooltipLines: [
      "รับชม: ได้",
      "คัดลอก/ดัดแปลง: ต้องขออนุญาต",
      "เชิงพาณิชย์: ต้องขออนุญาต",
    ],
  },
  portfolio_only: {
    id: "portfolio_only",
    icon: Copyright,
    shortLabel: "โชว์พอร์ตเท่านั้น",
    description: "แสดงเป็นตัวอย่างผลงาน ไม่ให้ดาวน์โหลดหรือใช้ซ้ำ",
    detailParagraph:
      "ผลงานนี้โชว์เป็นพอร์ตเท่านั้น ไม่ได้อนุญาตให้ดาวน์โหลด แก้ไข หรือนำไปใช้ในที่อื่น",
    allowsReuse: false,
    allowsCommercial: false,
    requiresAttribution: false,
    tooltipLines: [
      "ใช้ซ้ำ: ไม่ได้",
      "เชิงพาณิชย์: ไม่ได้",
      "อ้างอิง: ไม่จำเป็น",
    ],
  },
  personal_ok: {
    id: "personal_ok",
    icon: User,
    shortLabel: "ใช้ส่วนตัวได้",
    description: "ใช้ส่วนตัวไม่หาผลกำไรได้ ห้ามเชิงพาณิชย์",
    detailParagraph:
      "อนุญาตให้ใช้ส่วนตัวที่ไม่หาผลกำไรได้ เช่น เก็บไว้ดูหรือแชร์ให้เพื่อน แต่ห้ามใช้เชิงพาณิชย์",
    allowsReuse: true,
    allowsCommercial: false,
    requiresAttribution: true,
    tooltipLines: [
      "ใช้ซ้ำ: ได้ (ส่วนตัว)",
      "เชิงพาณิชย์: ไม่ได้",
      "อ้างอิง: แนะนำระบุเครดิต",
    ],
  },
  attribution_ok: {
    id: "attribution_ok",
    icon: Link2,
    shortLabel: "อ้างอิงได้",
    description:
      "อนุญาตให้แชร์ผลงานหรือลิงก์ได้เลย แต่ต้องระบุชื่อเจ้าของผลงานเสมอ โดยห้ามดัดแปลงและห้ามใช้เชิงพาณิชย์",
    detailParagraph:
      "อนุญาตให้แชร์ผลงานหรือลิงก์ได้เลย แต่ต้องระบุชื่อเจ้าของผลงานเสมอ ห้ามดัดแปลง และห้ามใช้เชิงพาณิชย์",
    allowsReuse: true,
    allowsCommercial: false,
    requiresAttribution: true,
    tooltipLines: [
      "แชร์/ลิงก์: ได้ (ต้องระบุเครดิต)",
      "ดัดแปลง: ไม่ได้",
      "เชิงพาณิชย์: ไม่ได้",
    ],
  },
  commercial_license: {
    id: "commercial_license",
    icon: Briefcase,
    shortLabel: "จ้างงาน/ซื้อสิทธิ์",
    description: "ใช้เชิงพาณิชย์ต้องติดต่อจ้างหรือซื้อลิขสิทธิ์",
    detailParagraph:
      "ผลงานนี้เปิดรับการจ้างงานหรือซื้อลิขสิทธิ์ การใช้เชิงพาณิชย์ต้องตกลงเงื่อนไขและค่าตอบแทนกับเจ้าของผลงานก่อน",
    allowsReuse: false,
    allowsCommercial: true,
    requiresAttribution: false,
    tooltipLines: [
      "ใช้ซ้ำ: ต้องติดต่อจ้าง",
      "เชิงพาณิชย์: ติดต่อเจ้าของ",
      "อ้างอิง: ตามสัญญา",
    ],
  },
  free_use: {
    id: "free_use",
    icon: Unlock,
    shortLabel: "เปิดให้ใช้ได้อย่างอิสระ",
    description: "อนุญาตให้ คัดลอก ดัดแปลง หรือนำไปใช้ทั้งส่วนตัว และเชิงพาณิชย์ได้เลย",
    detailParagraph:
      "อนุญาตให้คัดลอก ดัดแปลง หรือนำไปใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์ โดยไม่ต้องขออนุญาตเพิ่ม",
    allowsReuse: true,
    allowsCommercial: true,
    requiresAttribution: false,
    tooltipLines: [
      "คัดลอก/ดัดแปลง: ได้",
      "ส่วนตัว: ได้",
      "เชิงพาณิชย์: ได้",
    ],
  },
  custom: {
    id: "custom",
    icon: PenLine,
    shortLabel: "กำหนดเอง",
    description: "พิมพ์เงื่อนไขการใช้งานเอง",
    detailParagraph: "เจ้าของผลงานกำหนดเงื่อนไขการใช้งานเอง โปรดอ่านรายละเอียดด้านล่าง",
    allowsReuse: false,
    allowsCommercial: false,
    requiresAttribution: false,
    tooltipLines: [
      "ใช้ซ้ำ: ดูเงื่อนไขด้านล่าง",
      "เชิงพาณิชย์: ดูเงื่อนไขด้านล่าง",
      "อ้างอิง: ดูเงื่อนไขด้านล่าง",
    ],
  },
};

/** Options shown when picking a license (editor + legal docs). */
export const LICENSE_LIST = LICENSE_PICKER_TYPES.map((id) => LICENSE_PRESETS[id]);

export function isLicensePickerType(v: string): v is LicensePickerType {
  return (LICENSE_PICKER_TYPES as readonly string[]).includes(v);
}

/** Picker options; if current value is a legacy type, keep it visible so Select stays valid. */
export function getLicensePickerOptions(current?: string | null): LicenseMeta[] {
  if (current && isLicenseType(current) && !isLicensePickerType(current)) {
    return [LICENSE_PRESETS[current], ...LICENSE_LIST];
  }
  return LICENSE_LIST;
}

export function getLicenseMeta(type: string | null | undefined): LicenseMeta {
  if (type && type in LICENSE_PRESETS) {
    return LICENSE_PRESETS[type as LicenseType];
  }
  return LICENSE_PRESETS.all_rights;
}

export function isLicenseType(v: string): v is LicenseType {
  return (LICENSE_TYPES as readonly string[]).includes(v);
}

/** Suggest contract ip_owner from project license */
export function suggestIpOwner(licenseType: LicenseType): "hirer" | "contractor" | "shared" {
  if (licenseType === "commercial_license") return "hirer";
  if (licenseType === "attribution_ok" || licenseType === "personal_ok") return "shared";
  if (licenseType === "free_use") return "shared";
  return "contractor";
}

export function licenseToContractNote(
  licenseType: LicenseType,
  licenseNote?: string,
  copyrightHolder?: string,
): string {
  const meta = getLicenseMeta(licenseType);
  const holder = copyrightHolder?.trim();
  const parts = [
    `สิทธิ์ผลงานบนแพลตฟอร์ม: ${meta.shortLabel}`,
    holder ? `เจ้าของลิขสิทธิ์: ${holder}` : null,
    licenseType === "custom" && licenseNote?.trim() ? `เงื่อนไข: ${licenseNote.trim()}` : meta.detailParagraph,
    licenseType === "all_rights" || licenseType === "portfolio_only"
      ? "หมายเหตุ: การโอนสิทธิ์เชิงพาณิชย์ต้องระบุในสัญญาแยกต่างหาก"
      : null,
  ].filter(Boolean);
  return parts.join("\n");
}
