import {
  buildProjectViewSeries,
  viewSeriesTrendPercent,
  type ViewSeriesGranularity,
} from "@/lib/projectViewSeries";
import { hireHasPackageOrigin } from "@/lib/hireOrigin";
import { HIRE_STATUS_ACCEPTED, isHireCompletedStatus } from "@/lib/hiringStatus";
import {
  isCollabAcceptedStatus,
  isCollabCompletedStatus,
} from "@/lib/collabInbox";

export type HireInboxMetric = "requests" | "fromProject" | "fromPackage" | "accepted" | "completed";
export type CollabInboxMetric = "requests" | "accepted" | "completed";

export type HireInboxPoint = {
  key: string;
  label: string;
  sortAt: number;
  requests: number;
  fromProject: number;
  fromPackage: number;
  accepted: number;
  completed: number;
};

export type CollabInboxPoint = {
  key: string;
  label: string;
  sortAt: number;
  requests: number;
  accepted: number;
  completed: number;
};

export type HireInboxTimestamps = Record<HireInboxMetric, string[]>;
export type CollabInboxTimestamps = Record<CollabInboxMetric, string[]>;

export const HIRE_INBOX_METRICS: {
  id: HireInboxMetric;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "requests",
    label: "คำขอใหม่",
    hint: "คำขอจ้างที่เข้ามาในช่วงนี้",
    color: "hsl(var(--chat-hire))",
  },
  {
    id: "fromProject",
    label: "จากผลงาน",
    hint: "คำขอที่เริ่มจากผลงาน / brief",
    color: "hsl(199 89% 48%)",
  },
  {
    id: "fromPackage",
    label: "จาก Packages",
    hint: "คำขอที่เริ่มจากแพ็กเกจ",
    color: "hsl(var(--primary))",
  },
  {
    id: "accepted",
    label: "ตอบรับ",
    hint: "คำขอที่ตอบรับแล้ว (นับวันที่อัปเดต)",
    color: "hsl(142 71% 45%)",
  },
  {
    id: "completed",
    label: "จบงาน",
    hint: "งานที่ปิดแล้ว (นับวันที่อัปเดต)",
    color: "hsl(262 83% 68%)",
  },
];

export const COLLAB_INBOX_METRICS: {
  id: CollabInboxMetric;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: "requests",
    label: "คำขอใหม่",
    hint: "คำขอคอลแลปที่เข้ามาในช่วงนี้",
    color: "hsl(262 83% 68%)",
  },
  {
    id: "accepted",
    label: "ตอบรับ",
    hint: "คำขอที่ตอบรับแล้ว (นับวันที่อัปเดต)",
    color: "hsl(142 71% 45%)",
  },
  {
    id: "completed",
    label: "จบงาน",
    hint: "คอลแลปที่จบแล้ว (นับวันที่อัปเดต)",
    color: "hsl(var(--primary))",
  },
];

type InboxRow = {
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  service_id?: string | null;
};

function createdAt(row: InboxRow): string {
  return row.created_at;
}

function changedAt(row: InboxRow): string {
  return row.updated_at?.trim() || row.created_at;
}

export function previousRangeBounds(from: Date, to: Date): { from: Date; to: Date } {
  const spanMs = Math.max(0, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { from: prevFrom, to: prevTo };
}

export function timestampsInRange(list: string[] | undefined, from: Date, to: Date): string[] {
  if (!list?.length) return [];
  const start = from.getTime();
  const end = to.getTime();
  return list.filter((iso) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= start && t <= end;
  });
}

function asCounts(series: ReturnType<typeof buildProjectViewSeries>) {
  return series.map((point) => point.views);
}

export function extractHireInboxTimestamps(rows: InboxRow[]): HireInboxTimestamps {
  const requests: string[] = [];
  const fromProject: string[] = [];
  const fromPackage: string[] = [];
  const accepted: string[] = [];
  const completed: string[] = [];

  for (const row of rows) {
    requests.push(createdAt(row));
    if (hireHasPackageOrigin(row)) fromPackage.push(createdAt(row));
    else fromProject.push(createdAt(row));
    if (isHireCompletedStatus(row.status)) completed.push(changedAt(row));
    else if (row.status === HIRE_STATUS_ACCEPTED) accepted.push(changedAt(row));
  }

  return { requests, fromProject, fromPackage, accepted, completed };
}

export function extractCollabInboxTimestamps(rows: InboxRow[]): CollabInboxTimestamps {
  const requests: string[] = [];
  const accepted: string[] = [];
  const completed: string[] = [];

  for (const row of rows) {
    requests.push(createdAt(row));
    if (isCollabCompletedStatus(row.status)) completed.push(changedAt(row));
    else if (isCollabAcceptedStatus(row.status)) accepted.push(changedAt(row));
  }

  return { requests, accepted, completed };
}

export function buildHireInboxSeries(
  timestamps: HireInboxTimestamps,
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity,
): HireInboxPoint[] {
  const requests = buildProjectViewSeries(timestamps.requests, from, to, granularity);
  const fromProject = asCounts(buildProjectViewSeries(timestamps.fromProject, from, to, granularity));
  const fromPackage = asCounts(buildProjectViewSeries(timestamps.fromPackage, from, to, granularity));
  const accepted = asCounts(buildProjectViewSeries(timestamps.accepted, from, to, granularity));
  const completed = asCounts(buildProjectViewSeries(timestamps.completed, from, to, granularity));

  return requests.map((slot, index) => ({
    key: slot.key,
    label: slot.label,
    sortAt: slot.sortAt,
    requests: slot.views,
    fromProject: fromProject[index] ?? 0,
    fromPackage: fromPackage[index] ?? 0,
    accepted: accepted[index] ?? 0,
    completed: completed[index] ?? 0,
  }));
}

export function buildCollabInboxSeries(
  timestamps: CollabInboxTimestamps,
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity,
): CollabInboxPoint[] {
  const requests = buildProjectViewSeries(timestamps.requests, from, to, granularity);
  const accepted = asCounts(buildProjectViewSeries(timestamps.accepted, from, to, granularity));
  const completed = asCounts(buildProjectViewSeries(timestamps.completed, from, to, granularity));

  return requests.map((slot, index) => ({
    key: slot.key,
    label: slot.label,
    sortAt: slot.sortAt,
    requests: slot.views,
    accepted: accepted[index] ?? 0,
    completed: completed[index] ?? 0,
  }));
}

export function hireInboxMetricConfig(metric: HireInboxMetric) {
  return HIRE_INBOX_METRICS.find((item) => item.id === metric) ?? HIRE_INBOX_METRICS[0];
}

export function collabInboxMetricConfig(metric: CollabInboxMetric) {
  return COLLAB_INBOX_METRICS.find((item) => item.id === metric) ?? COLLAB_INBOX_METRICS[0];
}

export function sumInboxMetric<T extends Record<string, number>>(
  points: T[],
  metric: keyof T,
): number {
  return points.reduce((sum, point) => sum + (Number(point[metric]) || 0), 0);
}

export function averageInboxMetric<T extends Record<string, number>>(
  points: T[],
  metric: keyof T,
): number {
  if (!points.length) return 0;
  return sumInboxMetric(points, metric) / points.length;
}

export { viewSeriesTrendPercent };
