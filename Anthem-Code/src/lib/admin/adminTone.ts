/**
 * Colour per admin menu group. Full class names on purpose: Tailwind only keeps classes it can read literally.
 * `chip` = icon tile (tinted background + readable icon in light and dark), `dot` = small status dot.
 */
export type AdminTone = "slate" | "sky" | "violet" | "emerald" | "amber" | "rose" | "cyan" | "indigo";

export const ADMIN_TONE: Record<AdminTone, { chip: string; dot: string; ring: string }> = {
  slate: { chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300", dot: "bg-slate-500", ring: "ring-slate-500/30" },
  sky: { chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", dot: "bg-sky-500", ring: "ring-sky-500/30" },
  violet: { chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300", dot: "bg-violet-500", ring: "ring-violet-500/30" },
  emerald: { chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", ring: "ring-emerald-500/30" },
  amber: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", dot: "bg-amber-500", ring: "ring-amber-500/30" },
  rose: { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", dot: "bg-rose-500", ring: "ring-rose-500/30" },
  cyan: { chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", ring: "ring-cyan-500/30" },
  indigo: { chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", ring: "ring-indigo-500/30" },
};
