import { anthemAdmin, so1oAdmin } from "@/lib/links";
import type { HubView } from "@/hooks/useHubMetrics";

export type WorkItemSource =
  | "support_ticket"
  | "feature_suggestion"
  | "app_feedback"
  | "user_report"
  | "ops_issue";

export type BoardColumn = "triage" | "in_progress" | "in_review" | "done";

export type WorkItemPriority = "urgent" | "high" | "medium" | "low";

export type WorkItem = {
  id: string;
  source: WorkItemSource;
  sourceId: string;
  app: "so1o" | "an1hem" | "ecosystem";
  key: string;
  title: string;
  description: string | null;
  rawStatus: string;
  boardColumn: BoardColumn;
  priority: WorkItemPriority;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  deepLink: string;
  category: string | null;
};

export type WorkItemFilters = {
  search: string;
  source: WorkItemSource | "all";
  priority: WorkItemPriority | "all";
  column: BoardColumn | "all";
};

const PRIORITY_ORDER: Record<WorkItemPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const BOARD_COLUMNS: { id: BoardColumn; label: string }[] = [
  { id: "triage", label: "Triage" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

export function columnToRawStatus(
  source: WorkItemSource,
  column: BoardColumn,
): string | null {
  const map: Record<WorkItemSource, Partial<Record<BoardColumn, string>>> = {
    support_ticket: {
      triage: "new",
      in_progress: "in_progress",
      in_review: "qa",
      done: "resolved",
    },
    feature_suggestion: {
      triage: "new",
      in_progress: "reviewing",
      in_review: "planned",
      done: "shipped",
    },
    app_feedback: {
      triage: "new",
      in_progress: "reviewing",
      in_review: "reviewing",
      done: "resolved",
    },
    user_report: {
      triage: "open",
      in_progress: "reviewing",
      in_review: "reviewing",
      done: "resolved",
    },
    ops_issue: {
      triage: "backlog",
      in_progress: "in_progress",
      in_review: "in_review",
      done: "done",
    },
  };
  return map[source][column] ?? null;
}

function toBoardColumn(source: WorkItemSource, status: string): BoardColumn {
  const maps: Record<WorkItemSource, Record<string, BoardColumn>> = {
    support_ticket: {
      new: "triage",
      in_progress: "in_progress",
      qa: "in_review",
      resolved: "done",
      closed: "done",
      wont_fix: "done",
    },
    feature_suggestion: {
      new: "triage",
      reviewing: "in_progress",
      planned: "in_review",
      shipped: "done",
      rejected: "done",
    },
    app_feedback: {
      new: "triage",
      reviewing: "in_progress",
      resolved: "done",
    },
    user_report: {
      open: "triage",
      reviewing: "in_progress",
      resolved: "done",
      dismissed: "done",
    },
    ops_issue: {
      backlog: "triage",
      todo: "triage",
      in_progress: "in_progress",
      in_review: "in_review",
      done: "done",
      cancelled: "done",
    },
  };
  return maps[source][status] ?? "triage";
}

function ticketPriority(p: string): WorkItemPriority {
  if (p === "critical") return "urgent";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

function suggestionPriority(category: string): WorkItemPriority {
  if (category === "bug") return "high";
  return "medium";
}

function shortId(prefix: string, id: string) {
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
}

export function mapSupportTicket(row: Record<string, unknown>): WorkItem {
  const id = String(row.id);
  const status = String(row.status);
  return {
    id: `support_ticket:${id}`,
    source: "support_ticket",
    sourceId: id,
    app: "so1o",
    key: String(row.ticket_number ?? shortId("TKT", id)),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    rawStatus: status,
    boardColumn: toBoardColumn("support_ticket", status),
    priority: ticketPriority(String(row.priority ?? "medium")),
    adminNote: row.admin_note ? String(row.admin_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deepLink: so1oAdmin("tickets"),
    category: row.category ? String(row.category) : null,
  };
}

export function mapFeatureSuggestion(row: Record<string, unknown>): WorkItem {
  const id = String(row.id);
  const status = String(row.status);
  return {
    id: `feature_suggestion:${id}`,
    source: "feature_suggestion",
    sourceId: id,
    app: "so1o",
    key: shortId("FS", id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    rawStatus: status,
    boardColumn: toBoardColumn("feature_suggestion", status),
    priority: suggestionPriority(String(row.category ?? "feature")),
    adminNote: row.admin_note ? String(row.admin_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deepLink: so1oAdmin("tickets"),
    category: row.category ? String(row.category) : null,
  };
}

export function mapAppFeedback(row: Record<string, unknown>): WorkItem {
  const id = String(row.id);
  const status = String(row.status ?? "new");
  return {
    id: `app_feedback:${id}`,
    source: "app_feedback",
    sourceId: id,
    app: "an1hem",
    key: shortId("FB", id),
    title: row.feature ? `Feedback: ${row.feature}` : "App feedback",
    description: row.message ? String(row.message) : row.comment ? String(row.comment) : null,
    rawStatus: status,
    boardColumn: toBoardColumn("app_feedback", status),
    priority: Number(row.rating) <= 2 ? "high" : "medium",
    adminNote: row.admin_note ? String(row.admin_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deepLink: anthemAdmin("/feedback"),
    category: row.feature ? String(row.feature) : null,
  };
}

export function mapUserReport(row: Record<string, unknown>): WorkItem {
  const id = String(row.id);
  const status = String(row.status);
  const reason = String(row.reason ?? "report");
  return {
    id: `user_report:${id}`,
    source: "user_report",
    sourceId: id,
    app: "an1hem",
    key: shortId("RPT", id),
    title: `รายงาน ${reason} (${row.target_type ?? "content"})`,
    description: row.details ? String(row.details) : null,
    rawStatus: status,
    boardColumn: toBoardColumn("user_report", status),
    priority: reason === "scam" || reason === "harassment" ? "urgent" : "high",
    adminNote: row.admin_note ? String(row.admin_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deepLink: anthemAdmin("/reports"),
    category: row.reason ? String(row.reason) : null,
  };
}

export function mapOpsIssue(row: Record<string, unknown>): WorkItem {
  const id = String(row.id);
  const status = String(row.status);
  const appScope = String(row.project_app_scope ?? "ecosystem");
  const app: WorkItem["app"] =
    appScope === "so1o" ? "so1o" : appScope === "an1hem" ? "an1hem" : "ecosystem";
  return {
    id: `ops_issue:${id}`,
    source: "ops_issue",
    sourceId: id,
    app,
    key: String(row.issue_number),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    rawStatus: status,
    boardColumn: toBoardColumn("ops_issue", status),
    priority: ticketPriority(String(row.priority ?? "medium")),
    adminNote: null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deepLink: `/work/${id}`,
    category: row.labels ? (row.labels as string[]).join(", ") : null,
  };
}

export function filterByHubView(items: WorkItem[], view: HubView): WorkItem[] {
  if (view === "all") return items;
  return items.filter((i) => i.app === view || i.app === "ecosystem");
}

export function filterWorkItems(items: WorkItem[], filters: WorkItemFilters): WorkItem[] {
  const q = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.source !== "all" && item.source !== filters.source) return false;
    if (filters.priority !== "all" && item.priority !== filters.priority) return false;
    if (filters.column !== "all" && item.boardColumn !== filters.column) return false;
    if (q && !`${item.key} ${item.title} ${item.description ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

export function sortInboxItems(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority];
    const pb = PRIORITY_ORDER[b.priority];
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function inboxItems(items: WorkItem[]): WorkItem[] {
  return sortInboxItems(items.filter((i) => i.boardColumn === "triage"));
}

export function parseWorkItemId(compositeId: string): { source: WorkItemSource; sourceId: string } | null {
  const idx = compositeId.indexOf(":");
  if (idx < 0) return null;
  const source = compositeId.slice(0, idx) as WorkItemSource;
  const sourceId = compositeId.slice(idx + 1);
  if (!sourceId) return null;
  return { source, sourceId };
}

export const SOURCE_LABELS: Record<WorkItemSource, string> = {
  support_ticket: "Support Ticket",
  feature_suggestion: "Feature Suggestion",
  app_feedback: "App Feedback",
  user_report: "Content Report",
  ops_issue: "Hub Issue",
};
