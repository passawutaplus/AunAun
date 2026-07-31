export type OverallMoodValue = 1 | 2 | 3 | 4 | 5;

/** Face scale for overall hire/collab impression — default Good (4). */
export const OVERALL_MOOD_OPTIONS: {
  value: OverallMoodValue;
  labelEn: string;
  labelTh: string;
}[] = [
  { value: 1, labelEn: "Terrible", labelTh: "แย่มาก" },
  { value: 2, labelEn: "Bad", labelTh: "ไม่ดี" },
  { value: 3, labelEn: "Okay", labelTh: "พอใช้" },
  { value: 4, labelEn: "Good", labelTh: "ดี" },
  { value: 5, labelEn: "Great", labelTh: "เยี่ยม" },
];

export const DEFAULT_OVERALL_MOOD: OverallMoodValue = 4;

export type WorkReviewKind = "hire" | "collab";

export type WorkReviewCategoryKey =
  | "punctuality"
  | "quality"
  | "coop"
  | "brief"
  | "value";

export const WORK_REVIEW_CATEGORIES: {
  key: WorkReviewCategoryKey;
  label: string;
  hint: string;
  column:
    | "rating_punctuality"
    | "rating_quality"
    | "rating_coop"
    | "rating_brief"
    | "rating_value";
}[] = [
  {
    key: "punctuality",
    label: "ตรงเวลา",
    hint: "ส่งตามนัด ไม่ทิ้งงานค้าง",
    column: "rating_punctuality",
  },
  {
    key: "quality",
    label: "คุณภาพผลงาน",
    hint: "ละเอียด ใช้ได้จริงตามที่ตกลง",
    column: "rating_quality",
  },
  {
    key: "coop",
    label: "ให้ความร่วมมือ",
    hint: "สื่อสารและประสานงานได้ดี",
    column: "rating_coop",
  },
  {
    key: "brief",
    label: "เข้าใจโจทย์และปัญหา",
    hint: "จับโจทย์และแก้ตรงจุด",
    column: "rating_brief",
  },
  {
    key: "value",
    label: "ความคุ้มค่า",
    hint: "คุณภาพคุ้มกับงบและเวลาที่ใช้",
    column: "rating_value",
  },
];

/** Wizard screens — public rate + private platform feedback. */
export type WorkReviewWizardStep = "intro" | "rate" | "private" | "system" | "done";

export const WORK_REVIEW_WIZARD_STEPS: {
  id: "rate" | "system";
  label: string;
  privateLabel?: boolean;
}[] = [
  { id: "rate", label: "รีวิวครีเอเตอร์" },
  { id: "system", label: "แพลตฟอร์ม", privateLabel: true },
];

export type PlatformReviewCategoryKey =
  | "ease"
  | "discover"
  | "portfolio"
  | "hireFlow"
  | "trust";

export const PLATFORM_REVIEW_CATEGORIES: {
  key: PlatformReviewCategoryKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "ease",
    label: "เว็บใช้งานง่าย",
    hint: "เมนูและฟีเจอร์ต่าง ๆ เข้าใจและใช้งานได้สะดวก",
  },
  {
    key: "discover",
    label: "เจอผลงาน และครีเอเตอร์ที่ต้องการได้ง่าย",
    hint: "ค้นหาผลงาน แรงบันดาลใจ และโปรไฟล์ที่สนใจได้รวดเร็ว",
  },
  {
    key: "portfolio",
    label: "รูปแบบการนำเสนอผลงานน่าสนใจ",
    hint: "การแสดงผล Portfolio และ Project ช่วยให้ดูผลงานได้ง่าย",
  },
  {
    key: "hireFlow",
    label: "สร้างโอกาสในการจ้างงานได้ดี",
    hint: "การติดตาม ติดต่อ หรือหางานร่วมกันทำได้สะดวก",
  },
  {
    key: "trust",
    label: "ประสบการณ์โดยรวม",
    hint: "รู้สึกประทับใจและอยากกลับมาใช้งานอีก",
  },
];

export type PlatformScores = Record<PlatformReviewCategoryKey, number>;

export function emptyPlatformScores(): PlatformScores {
  return { ease: 0, discover: 0, portfolio: 0, hireFlow: 0, trust: 0 };
}

export function averagePlatformScores(scores: PlatformScores): number | null {
  const vals = PLATFORM_REVIEW_CATEGORIES.map((c) => scores[c.key]);
  if (vals.some((v) => v < 1 || v > 5)) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

export type WorkReview = {
  id: string;
  kind: WorkReviewKind;
  subject_user_id: string;
  author_user_id: string;
  hire_request_id: string | null;
  collab_request_id: string | null;
  /** Overall — average of category scores when present. */
  rating: number;
  rating_punctuality: number | null;
  rating_quality: number | null;
  rating_coop: number | null;
  rating_brief: number | null;
  rating_value: number | null;
  tags: string[];
  body: string | null;
  reply_body: string | null;
  reply_at: string | null;
  project_id: string | null;
  /** Creator package when hire started from a package */
  service_id: string | null;
  visibility: "public" | "hidden";
  created_at: string;
  updated_at: string;
};

export type WorkReviewOrigin = {
  projectId: string | null;
  projectTitle: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
};

export type WorkReviewWithAuthor = WorkReview & {
  author?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  origin?: WorkReviewOrigin;
};

/** Filter chips on profile / dashboard review lists */
export type WorkReviewFilter =
  | "all"
  | "hire"
  | "collab"
  | "package";

export function reviewHasPackageOrigin(r: Pick<WorkReview, "service_id"> & { origin?: WorkReviewOrigin }) {
  return !!(r.service_id || r.origin?.serviceId);
}

export function reviewHasProjectOrigin(r: Pick<WorkReview, "project_id"> & { origin?: WorkReviewOrigin }) {
  return !!(r.project_id || r.origin?.projectId);
}

/** Extra tags after category scores (optional). */
export const HIRE_REVIEW_TAGS = ["สื่อสารดี", "น่าทำงานด้วยอีก"] as const;

export const COLLAB_REVIEW_TAGS = [
  "แบ่งงานชัด",
  "เคารพไอเดีย",
  "น่าคอลแลปอีก",
  "สื่อสารดี",
] as const;

export type CategoryScores = Record<WorkReviewCategoryKey, number>;

export function emptyCategoryScores(): CategoryScores {
  return { punctuality: 0, quality: 0, coop: 0, brief: 0, value: 0 };
}

export function averageCategoryScores(scores: CategoryScores): number | null {
  const vals = WORK_REVIEW_CATEGORIES.map((c) => scores[c.key]);
  if (vals.some((v) => v < 1 || v > 5)) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

export function hasCategoryScores(r: {
  rating_punctuality?: number | null;
  rating_quality?: number | null;
  rating_coop?: number | null;
  rating_brief?: number | null;
  rating_value?: number | null;
}): boolean {
  const core =
    !!r.rating_punctuality &&
    !!r.rating_quality &&
    !!r.rating_coop &&
    !!r.rating_brief;
  // Older rows may lack value — still show the four dims
  return core;
}

export function averageRating(reviews: { rating: number }[]): number | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + Number(r.rating), 0);
  return sum / reviews.length;
}
