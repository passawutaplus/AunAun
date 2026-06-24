/** AUTO-GENERATED — sync from Solo-Code/src/lib/designDrillPick.ts */
import {
  CONSTRAINT_POOL,
  DAILY_CATEGORY_ROTATION,
  DRILL_CATEGORY_META,
  DRILL_DIFFICULTY_META,
  DRILL_PROMPTS,
  type DrillCategory,
  type DrillDifficulty,
  type DrillMode,
  type DrillPromptTemplate,
} from "@/data/designDrillPrompts.vendored";
import { hashSeed, todayISO } from "@/lib/dailySeedPick.vendored";

export interface PickedDrill {
  template: DrillPromptTemplate;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  mode: DrillMode;
  brief: string;
  constraints: string[];
  meta: (typeof DRILL_CATEGORY_META)[DrillCategory];
}

function pickFrom<T>(arr: T[], seed: number): T {
  if (arr.length === 0) throw new Error("empty pool");
  return arr[seed % arr.length]!;
}

function pickManyFrom<T>(arr: T[], count: number, seed: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  let s = seed;
  while (out.length < count && copy.length > 0) {
    const idx = s % copy.length;
    out.push(copy[idx]!);
    copy.splice(idx, 1);
    s = Math.imul(s, 1103515245) + 12345;
  }
  return out;
}

function resolveConstraints(
  template: DrillPromptTemplate,
  mode: DrillMode,
  seed: number,
): string[] {
  if (mode === "free") return [];
  const base = template.constraints ?? [];
  if (base.length >= 2) return base;
  const extra = pickManyFrom(CONSTRAINT_POOL, 2 - base.length, seed);
  return [...base, ...extra.filter((c) => !base.includes(c))];
}

export function pickDrill(opts: {
  category: DrillCategory;
  difficulty: DrillDifficulty;
  mode: DrillMode;
  salt?: string;
}): PickedDrill {
  const { category, difficulty, mode, salt = "" } = opts;
  const pool = DRILL_PROMPTS.filter((p) => p.category === category && p.difficulty === difficulty);
  const seed = hashSeed(`${todayISO()}${category}${difficulty}${mode}${salt}`);
  const template = pickFrom(pool.length > 0 ? pool : DRILL_PROMPTS, seed);
  const constraints = resolveConstraints(template, mode, seed);

  return {
    template,
    category,
    difficulty,
    mode,
    brief: template.brief,
    constraints,
    meta: DRILL_CATEGORY_META[category],
  };
}

export function dailyDrillTag(): string {
  return `DrillDaily${todayISO()}`;
}

export function pickDailyDrill(): PickedDrill {
  const dayIndex = new Date().getDay();
  const category = DAILY_CATEGORY_ROTATION[dayIndex % DAILY_CATEGORY_ROTATION.length]!;
  return pickDrill({
    category,
    difficulty: "medium",
    mode: "constraints",
    salt: "daily",
  });
}

export function buildDrillDescription(drill: PickedDrill): string {
  const diff = DRILL_DIFFICULTY_META[drill.difficulty];
  const lines = [`[So1o Design Drill] ${drill.meta.label} · ${diff.label}`, "", drill.brief];

  if (drill.mode === "constraints" && drill.constraints.length > 0) {
    lines.push("", "ข้อจำกัด:");
    drill.constraints.forEach((c) => lines.push(`- ${c}`));
  } else if (drill.template.freeHint) {
    lines.push("", drill.template.freeHint);
  }

  if (drill.template.timeHint) {
    lines.push("", `เวลาแนะนำ: ${drill.template.timeHint}`);
  }

  lines.push("", "ทำเสร็จแล้วโพสผลงานที่ Pixel100 Showcase พร้อม tag #So1oDrill");
  return lines.join("\n");
}

export function buildDrillTags(drill: PickedDrill, opts?: { daily?: boolean }): string[] {
  const tags = ["So1oDrill", drill.meta.label.replace(/\s+/g, ""), drill.difficulty];
  if (drill.mode === "constraints") tags.push("Constraints");
  if (opts?.daily) tags.push(dailyDrillTag());
  return tags;
}
