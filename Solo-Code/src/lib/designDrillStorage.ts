const STORAGE_KEY = "so1o.designDrill.progress";
const CREATIVE_PATH_KEY = "so1o.home.creativePath";

export interface DrillInProgress {
  brief: string;
  date: string;
  startedAt?: number;
  totalMinutes?: number;
}

interface DrillProgress {
  streak: number;
  lastCompletedDate?: string;
  inProgress?: DrillInProgress;
  completedDates: string[];
}

interface CreativePathDay {
  readDaily?: boolean;
  postedPixel100?: boolean;
  labsVisited?: boolean;
}

function readProgress(): DrillProgress {
  if (typeof window === "undefined") {
    return { streak: 0, completedDates: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streak: 0, completedDates: [] };
    return normalizeProgress(JSON.parse(raw) as DrillProgress);
  } catch {
    return { streak: 0, completedDates: [] };
  }
}

function normalizeProgress(parsed: DrillProgress): DrillProgress {
  return {
    streak: parsed.streak ?? 0,
    lastCompletedDate: parsed.lastCompletedDate,
    inProgress: parsed.inProgress,
    completedDates: parsed.completedDates ?? [],
  };
}

function writeProgress(data: DrillProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readCreativePath(): Record<string, CreativePathDay> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREATIVE_PATH_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CreativePathDay>;
  } catch {
    return {};
  }
}

function writeCreativePath(data: Record<string, CreativePathDay>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREATIVE_PATH_KEY, JSON.stringify(data));
}

function todayCreativePath(): CreativePathDay {
  return readCreativePath()[todayLocal()] ?? {};
}

function patchCreativePath(patch: Partial<CreativePathDay>): void {
  const all = readCreativePath();
  const today = todayLocal();
  all[today] = { ...all[today], ...patch };
  writeCreativePath(all);
}

export function getDrillStreak(): number {
  return readProgress().streak;
}

export function isDrillCompletedToday(): boolean {
  const today = todayLocal();
  const p = readProgress();
  return p.lastCompletedDate === today || p.completedDates.includes(today);
}

export function getDrillInProgress(): DrillInProgress | null {
  const p = readProgress();
  if (!p.inProgress) return null;
  if (p.inProgress.date !== todayLocal()) return null;
  return p.inProgress;
}

export function markDrillStarted(brief: string, totalMinutes: number): void {
  const p = readProgress();
  writeProgress({
    ...p,
    inProgress: {
      brief,
      date: todayLocal(),
      startedAt: Date.now(),
      totalMinutes,
    },
  });
}

export function markDrillCompleted(): void {
  const today = todayLocal();
  const p = readProgress();
  const wasYesterday = p.lastCompletedDate === yesterdayLocal();
  const alreadyToday = p.lastCompletedDate === today;

  const streak = alreadyToday ? p.streak : wasYesterday ? p.streak + 1 : 1;
  const completedDates = p.completedDates.includes(today)
    ? p.completedDates
    : [...p.completedDates, today].slice(-60);

  writeProgress({
    streak,
    lastCompletedDate: today,
    completedDates,
    inProgress: undefined,
  });
}

export function clearDrillInProgress(): void {
  const p = readProgress();
  writeProgress({ ...p, inProgress: undefined });
}

export function markDailyRead(): void {
  patchCreativePath({ readDaily: true });
}

export function isDailyReadToday(): boolean {
  return todayCreativePath().readDaily === true;
}

export function markDrillPostedToPixel100(): void {
  patchCreativePath({ postedPixel100: true });
}

export function markLabsVisited(): void {
  patchCreativePath({ labsVisited: true });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("so1o:creative-path-update"));
  }
}

export function isLabsVisitedToday(): boolean {
  return todayCreativePath().labsVisited === true;
}

export function isDrillPostedToday(): boolean {
  return todayCreativePath().postedPixel100 === true;
}

export function getCreativePathStatus(): {
  readDaily: boolean;
  drillDone: boolean;
  postedPixel100: boolean;
  labsVisited: boolean;
} {
  const path = todayCreativePath();
  return {
    readDaily: path.readDaily === true,
    drillDone: isDrillCompletedToday(),
    postedPixel100: path.postedPixel100 === true,
    labsVisited: path.labsVisited === true,
  };
}
