const STORAGE_KEY = "solo-labs-recent-files";
const MAX_ITEMS = 8;

export type LabsRecentFile = {
  id: string;
  name: string;
  toolId: string;
  at: number;
};

export function loadRecentFiles(): LabsRecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabsRecentFile[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function pushRecentFile(entry: Omit<LabsRecentFile, "id" | "at">) {
  const next: LabsRecentFile = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
  const prev = loadRecentFiles().filter((f) => f.name !== entry.name || f.toolId !== entry.toolId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...prev].slice(0, MAX_ITEMS)));
}
