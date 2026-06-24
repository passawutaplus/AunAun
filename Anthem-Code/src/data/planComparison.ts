import type { PlanId } from "@/data/plans";
import { PLANS } from "@/data/plans";
import { PROJECT_LIMITS } from "@/lib/projectLimits";
import { ANTHEM_STORAGE_LABEL } from "@/lib/storageQuotas";

/** Keep in sync with Solo-Code/src/lib/storageQuotas.ts + aiCredits.ts + planLimits.ts */
const SO1O_STORAGE_LABEL: Record<PlanId, string> = {
  free: "50 MB",
  pro: "2 GB",
  pro_plus: "4 GB",
  inhouse: "10 GB",
};

const FREE_MONTHLY_JOB_LIMIT = 3;
const FREE_STARTER_CREDITS = 25;
const AI_TIER_MONTHLY: Record<Exclude<PlanId, "free">, number> = {
  pro: 800,
  pro_plus: 1400,
  inhouse: 2000,
};

export type ComparisonCell = string | boolean | "coming_soon";

export interface PlanComparisonRow {
  label: string;
  values: Record<PlanId, ComparisonCell>;
}

function formatPublished(limit: number): string {
  return limit === Infinity ? "ไม่จำกัด" : String(limit);
}

function formatJobs(tier: PlanId): string {
  if (tier === "free") return `${FREE_MONTHLY_JOB_LIMIT}/เดือน`;
  return "ไม่จำกัด";
}

function formatAiCredits(tier: PlanId): string {
  if (tier === "free") return `${FREE_STARTER_CREDITS} เริ่มต้น`;
  return AI_TIER_MONTHLY[tier].toLocaleString("th-TH");
}

function formatPrice(tier: PlanId): string {
  const plan = PLANS.find((p) => p.id === tier)!;
  if (tier === "free") return "0";
  if (plan.perSeat) return `${plan.monthly.toLocaleString("th-TH")}/ที่นั่ง`;
  return plan.monthly.toLocaleString("th-TH");
}

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    label: "ราคา/เดือน (THB)",
    values: {
      free: formatPrice("free"),
      pro: formatPrice("pro"),
      pro_plus: formatPrice("pro_plus"),
      inhouse: formatPrice("inhouse"),
    },
  },
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
    label: "AI เครดิต/รอบ",
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
      free: SO1O_STORAGE_LABEL.free,
      pro: SO1O_STORAGE_LABEL.pro,
      pro_plus: SO1O_STORAGE_LABEL.pro_plus,
      inhouse: SO1O_STORAGE_LABEL.inhouse,
    },
  },
  {
    label: "Pixel100 Storage",
    values: {
      free: ANTHEM_STORAGE_LABEL.free,
      pro: ANTHEM_STORAGE_LABEL.pro,
      pro_plus: ANTHEM_STORAGE_LABEL.pro_plus,
      inhouse: ANTHEM_STORAGE_LABEL.inhouse,
    },
  },
  {
    label: "โพสต์ผลงาน Pixel100",
    values: {
      free: formatPublished(PROJECT_LIMITS.free.published),
      pro: formatPublished(PROJECT_LIMITS.pro.published),
      pro_plus: formatPublished(PROJECT_LIMITS.pro_plus.published),
      inhouse: formatPublished(PROJECT_LIMITS.inhouse.published),
    },
  },
  {
    label: "แบบร่าง Pixel100",
    values: {
      free: String(PROJECT_LIMITS.free.draft),
      pro: String(PROJECT_LIMITS.pro.draft),
      pro_plus: String(PROJECT_LIMITS.pro_plus.draft),
      inhouse: String(PROJECT_LIMITS.inhouse.draft),
    },
  },
  {
    label: "รูป/ผลงาน",
    values: {
      free: String(PROJECT_LIMITS.free.galleryImages),
      pro: String(PROJECT_LIMITS.pro.galleryImages),
      pro_plus: String(PROJECT_LIMITS.pro_plus.galleryImages),
      inhouse: String(PROJECT_LIMITS.inhouse.galleryImages),
    },
  },
  {
    label: "วิดีโอ/ผลงาน",
    values: {
      free: String(PROJECT_LIMITS.free.videosPerProject),
      pro: String(PROJECT_LIMITS.pro.videosPerProject),
      pro_plus: String(PROJECT_LIMITS.pro_plus.videosPerProject),
      inhouse: String(PROJECT_LIMITS.inhouse.videosPerProject),
    },
  },
  {
    label: "So1o + Pixel100 บัญชีเดียว",
    values: {
      free: false,
      pro: true,
      pro_plus: true,
      inhouse: true,
    },
  },
  {
    label: "LINE แจ้งเตือน",
    values: {
      free: false,
      pro: true,
      pro_plus: true,
      inhouse: true,
    },
  },
  {
    label: "Workspace ทีม",
    values: {
      free: false,
      pro: false,
      pro_plus: false,
      inhouse: "coming_soon",
    },
  },
  {
    label: "Auto CRM จากแชท",
    values: {
      free: false,
      pro: false,
      pro_plus: "coming_soon",
      inhouse: false,
    },
  },
];

export const PLAN_COMPARISON_TIER_LABELS: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
};

export const PLAN_COMPARISON_TIER_ORDER: PlanId[] = ["free", "pro", "pro_plus", "inhouse"];
