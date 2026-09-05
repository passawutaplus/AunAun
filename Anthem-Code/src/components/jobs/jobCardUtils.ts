import { formatDistanceToNowStrict, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import type { JobPost } from "@/hooks/useJobs";

export const fmtBudget = (
  j: Pick<JobPost, "budget_min" | "budget_max" | "budget_type"> & {
    application_methods?: string[] | null;
  },
) => {
  const perPiece = (j.application_methods ?? []).includes("per_piece");
  const unit = perPiece
    ? "/ชิ้น"
    : j.budget_type === "hourly"
      ? "/ชม."
      : j.budget_type === "monthly"
        ? "/เดือน"
        : "";
  if (j.budget_min && j.budget_max) return `฿${j.budget_min.toLocaleString()} - ${j.budget_max.toLocaleString()}${unit}`;
  if (j.budget_min) return `฿${j.budget_min.toLocaleString()}+${unit}`;
  if (j.budget_max) return `ถึง ฿${j.budget_max.toLocaleString()}${unit}`;
  return "ตามตกลง";
};

export const locTypeLabel: Record<JobPost["location_type"], string> = {
  remote: "WFH 100%",
  onsite: "Onsite",
  hybrid: "Hybrid",
};

/** Card-only: keep the role name, drop the "— project blurb" suffix. */
export const jobRoleTitle = (title: string) => {
  const cut = title.split(/\s+[—–-]\s+/)[0]?.trim();
  return cut || title.trim();
};

export const empLabel: Record<JobPost["employment_type"], string> = {
  project: "Project",
  fulltime: "Full-time",
  parttime: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export type PosterEntityType = "personal" | "studio" | "brand" | "project";

export const posterEntityLabel: Record<PosterEntityType, string> = {
  personal: "Personal",
  studio: "Studio / Team",
  brand: "Brand / Company",
  project: "Project",
};

/** Map legacy poster_role + new poster_entity_type to display entity. */
export const resolvePosterEntity = (job: Pick<JobPost, "poster_role" | "poster_entity_type">): PosterEntityType => {
  if (job.poster_entity_type) return job.poster_entity_type;
  if (job.poster_role === "company") return "brand";
  if (job.poster_role === "studio") return "studio";
  return "personal";
};

/** Avoid "Remote · Remote" when location duplicates loc type. */
export const fmtLocationChip = (locationType: JobPost["location_type"], location: string | null | undefined) => {
  const typeLabel = locTypeLabel[locationType];
  const loc = (location ?? "").trim();
  if (!loc) return typeLabel;
  const normLoc = loc.toLowerCase();
  if (normLoc === "remote" && locationType === "remote") return typeLabel;
  if (normLoc === typeLabel.toLowerCase()) return typeLabel;
  return `${typeLabel} · ${loc}`;
};

export const fmtDeadlineChip = (deadline: string | null | undefined) => {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const days = differenceInDays(d, new Date());
  if (days < 0) return "ปิดรับแล้ว";
  if (days === 0) return "ปิดรับวันนี้";
  if (days <= 7) return `ปิดรับใน ${days} วัน`;
  return `ปิดรับ ${formatDistanceToNowStrict(d, { locale: th, addSuffix: true })}`;
};

export const jobStatusLabel: Record<JobPost["status"], string> = {
  open: "เปิดรับ",
  closed: "ปิดรับ",
  filled: "รับแล้ว",
};

export const applicationStatusLabel: Record<string, string> = {
  pending: "รอพิจารณา",
  shortlisted: "สนใจ",
  rejected: "ไม่ผ่าน",
  accepted: "ตอบรับแล้ว",
  hired: "รับแล้ว",
  contacted: "คุยแล้ว",
};

export const applicationBadgeClass = (status: string) => {
  switch (status) {
    case "shortlisted":
      return "bg-amber-500 text-white";
    case "contacted":
      return "bg-sky-600 text-white";
    case "accepted":
    case "hired":
      return "bg-emerald-600 text-white";
    case "rejected":
      return "bg-zinc-700 text-white";
    default:
      return "bg-primary text-primary-foreground";
  }
};

export const availabilityLabel: Record<string, string> = {
  immediate: "พร้อมเริ่มทันที",
  "1_week": "ภายใน 1 สัปดาห์",
  "1_month": "ภายใน 1 เดือน",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "UI/UX":
    "from-emerald-200/80 via-teal-100/60 to-white dark:from-emerald-950 dark:via-emerald-900/90 dark:to-card",
  Graphic:
    "from-orange-200/80 via-amber-100/60 to-white dark:from-orange-950 dark:via-amber-900/90 dark:to-card",
  Branding:
    "from-rose-200/80 via-pink-100/60 to-white dark:from-rose-950 dark:via-rose-900/90 dark:to-card",
  Illustration:
    "from-violet-200/80 via-purple-100/60 to-white dark:from-violet-950 dark:via-purple-900/90 dark:to-card",
  Motion:
    "from-blue-200/80 via-sky-100/60 to-white dark:from-blue-950 dark:via-blue-900/90 dark:to-card",
  Photography:
    "from-yellow-200/80 via-amber-50/60 to-white dark:from-yellow-950 dark:via-amber-900/90 dark:to-card",
  Video:
    "from-indigo-200/80 via-blue-100/60 to-white dark:from-indigo-950 dark:via-indigo-900/90 dark:to-card",
  "Web/UI":
    "from-cyan-200/80 via-teal-50/60 to-white dark:from-cyan-950 dark:via-cyan-900/90 dark:to-card",
  Design:
    "from-slate-200/80 via-zinc-100/60 to-white dark:from-slate-900 dark:via-slate-800/90 dark:to-card",
};

export const roleCategoryGradient = (roleCategory: string) =>
  CATEGORY_GRADIENTS[roleCategory] ??
  "from-lime-200/70 via-green-100/50 to-white dark:from-lime-950 dark:via-emerald-900/90 dark:to-card";

export const getPosterInfo = (job: Pick<JobPost, "studio" | "poster" | "hiring_org">) => {
  const name = job.hiring_org?.display_name ?? job.studio?.name ?? job.poster?.display_name ?? "ผู้จ้างงาน";
  const avatar = job.hiring_org?.logo_url ?? job.studio?.avatar_url ?? job.poster?.avatar_url ?? undefined;
  const verified = job.hiring_org?.status === "approved" || job.studio?.verified || false;
  return { name, avatar, verified };
};
