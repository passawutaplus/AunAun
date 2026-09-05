import { isValidThaiTaxId } from "@/lib/chatOffer";
import { safeHttpUrl } from "@/lib/safeUrl";

export type HiringOrgStatus = "draft" | "pending" | "needs_info" | "approved" | "suspended";
export type HiringOrgType = "company" | "partnership" | "studio_juristic";

export type JobSocialKind = "website" | "instagram" | "facebook" | "line" | "linkedin" | "other";

export type JobSocialLink = {
  kind: JobSocialKind;
  url: string;
  label?: string;
};

export const HIRING_ORG_TYPE_LABEL: Record<HiringOrgType, string> = {
  company: "บริษัท",
  partnership: "ห้างหุ้นส่วน",
  studio_juristic: "สตูดิโอนิติบุคคล",
};

export const HIRING_ORG_STATUS_LABEL: Record<HiringOrgStatus, string> = {
  draft: "ร่าง",
  pending: "รอตรวจ",
  needs_info: "ขอข้อมูลเพิ่ม",
  approved: "ยืนยันแล้ว",
  suspended: "ถูกระงับ",
};

export const SOCIAL_KIND_LABEL: Record<JobSocialKind, string> = {
  website: "เว็บไซต์",
  instagram: "Instagram",
  facebook: "Facebook",
  line: "Line OA",
  linkedin: "LinkedIn",
  other: "อื่น ๆ",
};

export function parseSocialLinks(raw: unknown): JobSocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const kind = typeof row.kind === "string" ? row.kind : "other";
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!url) return null;
      const allowed: JobSocialKind[] = ["website", "instagram", "facebook", "line", "linkedin", "other"];
      return {
        kind: (allowed.includes(kind as JobSocialKind) ? kind : "other") as JobSocialKind,
        url,
        label: typeof row.label === "string" ? row.label : undefined,
      };
    })
    .filter((x): x is JobSocialLink => !!x);
}

export function normalizeSocialUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (v.startsWith("@")) {
    const handle = v.slice(1);
    if (!handle) return undefined;
    return `https://www.instagram.com/${handle}`;
  }
  if (/^line\.me\//i.test(v) || /^instagram\.com\//i.test(v) || /^facebook\.com\//i.test(v)) {
    return safeHttpUrl(`https://${v}`);
  }
  return safeHttpUrl(v.startsWith("http") ? v : `https://${v}`);
}

export function isValidHiringEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function isValidHiringPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

export const DEFAULT_HIRING_PHONE = "+66 ";

export function postingGate<T extends { status: HiringOrgStatus }>(orgs: T[] | undefined) {
  const approved = orgs?.filter((o) => o.status === "approved") ?? [];
  const pending = orgs?.filter((o) => o.status === "pending" || o.status === "needs_info") ?? [];
  if (approved.length > 0) return { kind: "ready" as const, orgs: approved };
  if (pending.length > 0) return { kind: "pending" as const, orgs: pending };
  if ((orgs?.length ?? 0) > 0) return { kind: "pending" as const, orgs: orgs ?? [] };
  return { kind: "register" as const, orgs: [] as T[] };
}

export type HiringPostCta = {
  label: string;
  to: string | null;
};

/** ปุ่มลงประกาศในโปรไฟล์ — เปลี่ยนข้อความตามสถานะองค์กร ไม่พาไปฟอร์มตอนยังลงไม่ได้ */
export function hiringPostCta<T extends { status: HiringOrgStatus }>(
  orgs: T[] | undefined,
): HiringPostCta {
  const list = orgs ?? [];
  if (list.some((o) => o.status === "approved")) return { label: "ลงประกาศ", to: "/hiring/new" };
  if (list.some((o) => o.status === "needs_info")) return { label: "ต้องส่งข้อมูลเพิ่ม", to: "/org/status" };
  if (list.some((o) => o.status === "pending" || o.status === "draft")) {
    return { label: "กำลังตรวจสอบ", to: "/org/status" };
  }
  if (list.some((o) => o.status === "suspended")) return { label: "ถูกระงับ", to: null };
  return { label: "ลงประกาศ", to: "/org/register" };
}

export { isValidThaiTaxId };
