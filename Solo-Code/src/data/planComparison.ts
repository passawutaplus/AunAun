import type { PlanId } from "@/data/plans";
import { PLANS } from "@/data/plans";
import { AI_TIER_MONTHLY, DAILY_AI_CREDITS, FREE_DAILY_TRIAL_DAYS } from "@/lib/aiCredits";
import { FREE_MONTHLY_JOB_LIMIT } from "@/lib/planLimits";
import { SO1O_STORAGE_QUOTA_LABEL } from "@/lib/storageQuotas";

/** Keep in sync with Aplus1-Code/src/lib/storageQuotas.ts + projectLimits.ts */
const ANTHEM_STORAGE_LABEL: Record<PlanId, string> = {
  free: "300 MB",
  pro: "1.5 GB",
  pro_plus: "2.5 GB",
  inhouse: "8 GB",
};

const ANTHEM_PROJECT_LIMITS: Record<
  PlanId,
  { published: string; draft: number; galleryImages: number; videosPerProject: number }
> = {
  free: { published: "15", draft: 5, galleryImages: 6, videosPerProject: 1 },
  pro: { published: "ไม่จำกัด", draft: 50, galleryImages: 20, videosPerProject: 3 },
  pro_plus: { published: "ไม่จำกัด", draft: 50, galleryImages: 20, videosPerProject: 3 },
  inhouse: { published: "ไม่จำกัด", draft: 100, galleryImages: 20, videosPerProject: 3 },
};

export type ComparisonCell = string | boolean | "coming_soon";

export interface PlanComparisonRow {
  label: string;
  values: Record<PlanId, ComparisonCell>;
}

export interface PlanComparisonCategory {
  id: string;
  title: string;
  description?: string;
  /** Short summary shown in the info popup next to the category title. */
  info?: string;
  rows: PlanComparisonRow[];
}

export interface TierBenefitGroup {
  id: string;
  title: string;
  description?: string;
  items: string[];
}

function formatJobs(tier: PlanId): string {
  if (tier === "free") return `${FREE_MONTHLY_JOB_LIMIT}/เดือน`;
  return "ไม่จำกัด";
}

function formatAiCredits(tier: PlanId): string {
  if (tier === "free") return `Credit AI ${DAILY_AI_CREDITS}/วัน × ${FREE_DAILY_TRIAL_DAYS} วัน`;
  return `Credit AI ${DAILY_AI_CREDITS}/วัน + ${AI_TIER_MONTHLY[tier].toLocaleString("th-TH")}/รอบบิล`;
}

function formatPrice(tier: PlanId): string {
  const plan = PLANS.find((p) => p.id === tier)!;
  if (tier === "free") return "0";
  if (plan.perSeat) return `${plan.monthly.toLocaleString("th-TH")}/ที่นั่ง`;
  return plan.monthly.toLocaleString("th-TH");
}

function ecosystemUnlock(tier: PlanId): ComparisonCell {
  return tier !== "free";
}

function lineNotifications(tier: PlanId): ComparisonCell {
  return tier !== "free";
}

/** Grouped rows for the tier comparison table — values derived from limit constants. */
export const PLAN_COMPARISON_CATEGORIES: PlanComparisonCategory[] = [
  {
    id: "pricing",
    title: "ราคา & แพ็กเกจ",
    description: "ค่าบริการรายเดือน (THB)",
    info: "ค่าบริการรายเดือน — รายปีประหยัด ~20% · In-House คิดต่อที่นั่ง (ขั้นต่ำ 2)",
    rows: [
      {
        label: "ราคา/เดือน",
        values: {
          free: formatPrice("free"),
          pro: formatPrice("pro"),
          pro_plus: formatPrice("pro_plus"),
          inhouse: formatPrice("inhouse"),
        },
      },
    ],
  },
  {
    id: "solo-desk",
    title: "So1o My Desk",
    description: "หลังบ้านฟรีแลนซ์ — งาน ลูกค้า เอกสาร",
    info: "หลังบ้านฟรีแลนซ์ — ติดตามงาน ใช้ AI เก็บไฟล์ และส่งลิงก์ติดตามให้ลูกค้า",
    rows: [
      {
        label: "Job Tracker",
        values: {
          free: formatJobs("free"),
          pro: formatJobs("pro"),
          pro_plus: formatJobs("pro_plus"),
          inhouse: formatJobs("inhouse"),
        },
      },
      {
        label: "AI เครดิต",
        values: {
          free: formatAiCredits("free"),
          pro: formatAiCredits("pro"),
          pro_plus: formatAiCredits("pro_plus"),
          inhouse: formatAiCredits("inhouse"),
        },
      },
      {
        label: "So1o Storage",
        values: {
          free: SO1O_STORAGE_QUOTA_LABEL.free,
          pro: SO1O_STORAGE_QUOTA_LABEL.pro,
          pro_plus: SO1O_STORAGE_QUOTA_LABEL.pro_plus,
          inhouse: SO1O_STORAGE_QUOTA_LABEL.inhouse,
        },
      },
      {
        label: "Public Tracking Links",
        values: {
          free: "จำกัด",
          pro: "ไม่จำกัด",
          pro_plus: "ไม่จำกัด",
          inhouse: "ไม่จำกัด",
        },
      },
    ],
  },
  {
    id: "documents",
    title: "เอกสาร & Portal ลูกค้า",
    description: "ใบเสนอราคา ใบแจ้งหนี้ และหน้าติดตามงาน",
    info: "QT/INV/RC/Brief PDF และ portal Track/Brief — Pro ขึ้นไปเอา badge So1o ออกและปรับสีแบรนด์ได้",
    rows: [
      {
        label: "เอกสาร QT/INV/RC + Brief PDF",
        values: {
          free: true,
          pro: true,
          pro_plus: true,
          inhouse: true,
        },
      },
      {
        label: "เอา So1o badge (PDF + Portal)",
        values: {
          free: false,
          pro: true,
          pro_plus: true,
          inhouse: true,
        },
      },
      {
        label: "ปรับสีเอกสาร (QT/INV/RC/Brief)",
        values: {
          free: false,
          pro: true,
          pro_plus: true,
          inhouse: true,
        },
      },
      {
        label: "Portal ลูกค้า (โลโก้ + สีแบรนด์)",
        values: {
          free: false,
          pro: true,
          pro_plus: true,
          inhouse: true,
        },
      },
      {
        label: "แบรนด์องค์กรบนเอกสาร",
        values: {
          free: false,
          pro: false,
          pro_plus: false,
          inhouse: true,
        },
      },
    ],
  },
  {
    id: "an1hem",
    title: "Aplus1 Showcase",
    description: "หน้าร้องโชว์ผลงานและรับงานจากชุมชน",
    info: "โชว์เคสผลงานรับงานจากชุมชน — บัญชีเดียวกับ So1o สมัคร Pro ครั้งเดียวใช้ทั้งสองแอป",
    rows: [
      {
        label: "So1o + Aplus1 บัญชีเดียว",
        values: {
          free: ecosystemUnlock("free"),
          pro: ecosystemUnlock("pro"),
          pro_plus: ecosystemUnlock("pro_plus"),
          inhouse: ecosystemUnlock("inhouse"),
        },
      },
      {
        label: "Aplus1 Storage",
        values: {
          free: ANTHEM_STORAGE_LABEL.free,
          pro: ANTHEM_STORAGE_LABEL.pro,
          pro_plus: ANTHEM_STORAGE_LABEL.pro_plus,
          inhouse: ANTHEM_STORAGE_LABEL.inhouse,
        },
      },
      {
        label: "โพสต์ผลงาน",
        values: {
          free: ANTHEM_PROJECT_LIMITS.free.published,
          pro: ANTHEM_PROJECT_LIMITS.pro.published,
          pro_plus: ANTHEM_PROJECT_LIMITS.pro_plus.published,
          inhouse: ANTHEM_PROJECT_LIMITS.inhouse.published,
        },
      },
      {
        label: "แบบร่าง",
        values: {
          free: String(ANTHEM_PROJECT_LIMITS.free.draft),
          pro: String(ANTHEM_PROJECT_LIMITS.pro.draft),
          pro_plus: String(ANTHEM_PROJECT_LIMITS.pro_plus.draft),
          inhouse: String(ANTHEM_PROJECT_LIMITS.inhouse.draft),
        },
      },
      {
        label: "รูป/ผลงาน",
        values: {
          free: String(ANTHEM_PROJECT_LIMITS.free.galleryImages),
          pro: String(ANTHEM_PROJECT_LIMITS.pro.galleryImages),
          pro_plus: String(ANTHEM_PROJECT_LIMITS.pro_plus.galleryImages),
          inhouse: String(ANTHEM_PROJECT_LIMITS.inhouse.galleryImages),
        },
      },
      {
        label: "วิดีโอ/ผลงาน",
        values: {
          free: String(ANTHEM_PROJECT_LIMITS.free.videosPerProject),
          pro: String(ANTHEM_PROJECT_LIMITS.pro.videosPerProject),
          pro_plus: String(ANTHEM_PROJECT_LIMITS.pro_plus.videosPerProject),
          inhouse: String(ANTHEM_PROJECT_LIMITS.inhouse.videosPerProject),
        },
      },
    ],
  },
  {
    id: "integrations",
    title: "การเชื่อมต่อ & แจ้งเตือน",
    info: "LINE แจ้งเตือนเมื่องาน/การชำระมีอัปเดต — Pro+ จะมี Auto CRM จากแชท Aplus1 (เร็วๆ นี้)",
    rows: [
      {
        label: "LINE แจ้งเตือน",
        values: {
          free: lineNotifications("free"),
          pro: lineNotifications("pro"),
          pro_plus: lineNotifications("pro_plus"),
          inhouse: lineNotifications("inhouse"),
        },
      },
      {
        label: "Auto CRM จากแชท Aplus1",
        values: {
          free: false,
          pro: false,
          pro_plus: "coming_soon",
          inhouse: false,
        },
      },
    ],
  },
  {
    id: "team",
    title: "ทีม & องค์กร",
    description: "สำหรับ In-House — คิดรายที่นั่ง",
    info: "In-House สำหรับทีม/บริษัท — workspace ร่วม ใบเสนอราคาทีม และ Studio quote คิดรายที่นั่ง",
    rows: [
      {
        label: "ใบเสนอราคาทีม (In-House)",
        values: {
          free: false,
          pro: false,
          pro_plus: false,
          inhouse: true,
        },
      },
      {
        label: "ใบเสนอราคารวม Studio (Aplus1 nest)",
        values: {
          free: false,
          pro: false,
          pro_plus: false,
          inhouse: true,
        },
      },
      {
        label: "Workspace ทีม (Kanban · Chat · Monitor)",
        values: {
          free: false,
          pro: false,
          pro_plus: false,
          inhouse: true,
        },
      },
    ],
  },
];

/** Flat list — convenience for consumers that need all rows. */
export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = PLAN_COMPARISON_CATEGORIES.flatMap(
  (c) => c.rows,
);

function rowToBenefit(row: PlanComparisonRow, tier: PlanId): string | null {
  const cell = row.values[tier];
  if (cell === false) return null;
  if (cell === true) return row.label;
  if (cell === "coming_soon") return `${row.label} (เร็วๆ นี้)`;
  if (row.label === "ราคา/เดือน") {
    if (tier === "free") return "ใช้งานฟรี ไม่ต้องผูกบัตร";
    if (tier === "inhouse") return `${cell} บาท/เดือน/ที่นั่ง (ขั้นต่ำ 2 ที่นั่ง)`;
    return `${cell} บาท/เดือน`;
  }
  return `${row.label}: ${cell}`;
}

/** Benefits for the current tier, grouped by comparison category. */
export function getTierBenefitGroups(tier: PlanId): TierBenefitGroup[] {
  return PLAN_COMPARISON_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    items: category.rows
      .map((row) => rowToBenefit(row, tier))
      .filter((item): item is string => item != null),
  })).filter((group) => group.items.length > 0);
}

export const PLAN_COMPARISON_TIER_LABELS: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
};

export const PLAN_COMPARISON_TIER_ORDER: PlanId[] = ["free", "pro", "pro_plus", "inhouse"];
