import type { LucideIcon } from "lucide-react";
import { Briefcase, Copyright, Eye, Link2, PenLine, User } from "lucide-react";
import { BRAND_NAME } from "@/lib/brandConfig";

export const LICENSE_TYPES = [
  "all_rights",
  "portfolio_only",
  "personal_ok",
  "attribution_ok",
  "commercial_license",
  "custom",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

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
    icon: Copyright,
    shortLabel: "สงวนสิทธิ์ทั้งหมด",
    description: `ดูได้บน ${BRAND_NAME} เท่านั้น ห้ามคัดลอกหรือนำไปใช้`,
    detailParagraph:
      `ผลงานนี้แสดงบน ${BRAND_NAME} เพื่อชมเท่านั้น ห้ามดาวน์โหลด คัดลอก หรือนำไปใช้ซ้ำโดยไม่ได้รับอนุญาตจากเจ้าของผลงาน`,
    allowsReuse: false,
    allowsCommercial: false,
    requiresAttribution: false,
    tooltipLines: [
      "ใช้ซ้ำ: ไม่ได้",
      "เชิงพาณิชย์: ต้องติดต่อเจ้าของ",
      "อ้างอิง: ไม่จำเป็น",
    ],
  },
  portfolio_only: {
    id: "portfolio_only",
    icon: Eye,
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
    description: "ใช้ได้ถ้าระบุเครดิตชื่อครีเอเตอร์",
    detailParagraph:
      "อนุญาตให้นำไปใช้ได้ถ้าระบุชื่อครีเอเตอร์และลิงก์กลับมาที่ผลงานนี้ การใช้เชิงพาณิชย์ควรติดต่อเจ้าของก่อน",
    allowsReuse: true,
    allowsCommercial: false,
    requiresAttribution: true,
    tooltipLines: [
      "ใช้ซ้ำ: ได้ (ต้องอ้างอิง)",
      "เชิงพาณิชย์: ติดต่อเจ้าของ",
      "อ้างอิง: จำเป็น",
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

export const LICENSE_LIST = LICENSE_TYPES.map((id) => LICENSE_PRESETS[id]);

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
