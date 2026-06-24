import type { JobPost } from "@/hooks/useJobs";

export const fmtBudget = (j: Pick<JobPost, "budget_min" | "budget_max" | "budget_type">) => {
  const unit = j.budget_type === "hourly" ? "/ชม." : j.budget_type === "monthly" ? "/เดือน" : "";
  if (j.budget_min && j.budget_max) return `฿${j.budget_min.toLocaleString()} - ${j.budget_max.toLocaleString()}${unit}`;
  if (j.budget_min) return `฿${j.budget_min.toLocaleString()}+${unit}`;
  if (j.budget_max) return `ถึง ฿${j.budget_max.toLocaleString()}${unit}`;
  return "ตามตกลง";
};

export const locTypeLabel: Record<JobPost["location_type"], string> = {
  remote: "Remote",
  onsite: "Onsite",
  hybrid: "Hybrid",
};

export const empLabel: Record<JobPost["employment_type"], string> = {
  project: "Project",
  fulltime: "Full-time",
  parttime: "Part-time",
  internship: "Internship",
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

export const getPosterInfo = (job: Pick<JobPost, "studio" | "poster">) => {
  const name = job.studio?.name ?? job.poster?.display_name ?? "ผู้ใช้";
  const avatar = job.studio?.avatar_url ?? job.poster?.avatar_url ?? undefined;
  const verified = job.studio?.verified ?? false;
  return { name, avatar, verified };
};
