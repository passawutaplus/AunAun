import { STUDIO_HIRE_PATH } from "@/lib/studioNav";
import { isHireTerminalStatus } from "@/lib/hiringStatus";
import { isCollabTerminalStatus } from "@/lib/collabInbox";

export type StudioCalendarEvent = {
  id: string;
  date: string;
  kind: "hire" | "collab";
  label: string;
  to: string;
};

export function parseDeadlineDay(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function localDayIso(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthCells(year: number, monthIndex: number): (number | null)[] {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type HireLike = {
  id: string;
  status?: string | null;
  deadline?: string | null;
  project_title?: string | null;
};

type CollabLike = {
  id: string;
  status?: string | null;
  timeline?: string | null;
  project_title?: string | null;
  message?: string | null;
};

export function buildStudioCalendarEvents(input: {
  hires: HireLike[];
  collabs: CollabLike[];
}): StudioCalendarEvent[] {
  const events: StudioCalendarEvent[] = [];

  for (const hire of input.hires) {
    if (isHireTerminalStatus(hire.status)) continue;
    const date = parseDeadlineDay(hire.deadline);
    if (!date) continue;
    events.push({
      id: `hire-${hire.id}`,
      date,
      kind: "hire",
      label: hire.project_title?.trim() || "งานจ้าง",
      to: STUDIO_HIRE_PATH,
    });
  }

  for (const collab of input.collabs) {
    if (isCollabTerminalStatus(collab.status)) continue;
    const date = parseDeadlineDay(collab.timeline);
    if (!date) continue;
    events.push({
      id: `collab-${collab.id}`,
      date,
      kind: "collab",
      label: collab.project_title?.trim() || collab.message?.trim()?.slice(0, 40) || "คอลแลป",
      to: "/dashboard/collab",
    });
  }

  return events;
}

export function upcomingStudioCalendarEvents(
  events: StudioCalendarEvent[],
  todayIso: string,
  limit = 4,
): StudioCalendarEvent[] {
  return events
    .filter((event) => event.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, "th"))
    .slice(0, limit);
}
