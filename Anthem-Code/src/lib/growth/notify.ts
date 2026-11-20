/**
 * Growth Engine → LINE admin group ("Noti SAMECOR"). Owner rule (D4, 2026-11-20):
 * EVERY Growth Engine notification goes to that group, nowhere else (no email, no other channel).
 *
 * - short Thai, one line per item, always with a link into /admin/growth
 * - bursts inside the batch window become ONE message; urgent items flush the batch at once
 * - Phase 1 = MockLineSender only (nothing leaves the app). Phase 1b reuses the existing
 *   public.admin_line_outbox → line-admin-notify edge function, after the owner's OK.
 * SQL twin: growth.ge_notifications / ge_notification_batches / ge_flush_notifications().
 */
import type { Platform } from "./types";

export type NotifyKind =
  | "approval_waiting"
  | "needs_decision"
  | "revision_ready"
  | "job_scheduled"
  | "job_exported"
  | "job_published"
  | "publish_failed"
  | "token_issue"
  | "budget_threshold"
  | "blocked_budget"
  | "pause_all"
  | "weekly_insights";

export type NotifySeverity = "info" | "urgent";

export interface GrowthNotification {
  id: string;
  kind: NotifyKind;
  severity: NotifySeverity;
  /** One short Thai line, no link (the link is added when formatting). */
  text: string;
  /** App path, always under /admin/growth. */
  path: string;
  /** Same key twice = one notification (e.g. budget 70% once per cycle). */
  dedupeKey: string;
  createdAt: string;
}

export interface NotificationBatch {
  id: string;
  createdAt: string;
  notificationIds: string[];
  urgent: boolean;
  /** The exact LINE text. */
  text: string;
}

export type NotifyMode = "mock" | "line";

export interface NotifySettings {
  /** "mock" until the owner OKs real sends. */
  mode: NotifyMode;
  /** Bursts inside this window become one message. */
  batchWindowMs: number;
  /** Over this many messages in a day, the window stretches to an hour (protects the LINE quota). */
  maxBatchesPerDay: number;
}

export const DEFAULT_NOTIFY_SETTINGS: NotifySettings = { mode: "mock", batchWindowMs: 3 * 60_000, maxBatchesPerDay: 24 };
export const OVER_CAP_WINDOW_MS = 60 * 60_000;
export const MAX_ITEMS_PER_MESSAGE = 8;
export const APP_BASE_URL = "https://samecor.com";
export const GROWTH_PATH = "/admin/growth";

const URGENT: ReadonlySet<NotifyKind> = new Set(["publish_failed", "token_issue", "blocked_budget", "pause_all"]);

export const NOTIFY_KIND_LABEL: Record<NotifyKind, string> = {
  approval_waiting: "รอ approve",
  needs_decision: "ต้องตัดสินใจ",
  revision_ready: "แก้เสร็จ",
  job_scheduled: "ลงคิว",
  job_exported: "พร้อมโพสต์",
  job_published: "โพสต์แล้ว",
  publish_failed: "โพสต์ไม่ผ่าน",
  token_issue: "บัญชีมีปัญหา",
  budget_threshold: "งบ AI",
  blocked_budget: "credit หมด",
  pause_all: "Pause All",
  weekly_insights: "สรุปสัปดาห์",
};

export const campaignPath = (campaignId: string) => `${GROWTH_PATH}/campaigns/${encodeURIComponent(campaignId)}`;

const PLATFORM_SHORT: Record<Platform, string> = { instagram: "IG", facebook: "FB", threads: "Threads", pinterest: "Pinterest", blog: "Blog" };
const platforms = (ps: Platform[]) => ps.map((p) => PLATFORM_SHORT[p]).join(", ");

const BKK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export type NotifyInput =
  | { kind: "approval_waiting"; campaignId: string; name: string; version: number; platforms: Platform[] }
  | { kind: "needs_decision"; key: string; title: string; campaignId?: string }
  | { kind: "revision_ready"; campaignId: string; name: string; version: number }
  | { kind: "job_scheduled"; campaignId: string; name: string; platforms: Platform[]; firstSlot: string }
  | { kind: "job_exported"; campaignId: string; name: string; platform: Platform; jobKey: string }
  | { kind: "job_published"; campaignId: string; name: string; platform: Platform; jobKey: string }
  | { kind: "publish_failed"; campaignId: string; name: string; platform: Platform; reason: string; jobKey: string }
  | { kind: "token_issue"; provider: string }
  | { kind: "budget_threshold"; level: 70 | 90 | 100; cycle: string }
  | { kind: "blocked_budget"; cycle: string }
  | { kind: "pause_all"; on: boolean; at: string }
  | { kind: "weekly_insights"; week: string; decisions: number };

/** Build one notification: short Thai text + link path + dedupe key. */
export function makeNotification(input: NotifyInput, id: string, createdAt: string): GrowthNotification {
  let text: string;
  let path = GROWTH_PATH;
  let dedupeKey: string;
  switch (input.kind) {
    case "approval_waiting":
      text = `รอ approve: ${input.name} v${input.version} (${platforms(input.platforms)})`;
      path = campaignPath(input.campaignId);
      dedupeKey = `approval:${input.campaignId}:v${input.version}`;
      break;
    case "needs_decision":
      text = `ต้องตัดสินใจ: ${input.title}`;
      path = input.campaignId ? campaignPath(input.campaignId) : `${GROWTH_PATH}?decision=${encodeURIComponent(input.key)}`;
      dedupeKey = `decision:${input.key}`;
      break;
    case "revision_ready":
      text = `แก้เสร็จแล้ว: ${input.name} v${input.version} รอดูอีกรอบ`;
      path = campaignPath(input.campaignId);
      dedupeKey = `revision:${input.campaignId}:v${input.version}`;
      break;
    case "job_scheduled":
      text = `ลงคิวแล้ว: ${input.name} · ${platforms(input.platforms)} · เริ่ม ${BKK.format(new Date(input.firstSlot))}`;
      path = campaignPath(input.campaignId);
      dedupeKey = `scheduled:${input.campaignId}:${[...input.platforms].sort().join("+")}:${input.firstSlot}`;
      break;
    case "job_exported":
      text = `พร้อมโพสต์เอง: ${input.name} · ${PLATFORM_SHORT[input.platform]}`;
      path = campaignPath(input.campaignId);
      dedupeKey = `exported:${input.jobKey}`;
      break;
    case "job_published":
      text = `โพสต์แล้ว: ${input.name} · ${PLATFORM_SHORT[input.platform]}`;
      path = campaignPath(input.campaignId);
      dedupeKey = `published:${input.jobKey}`;
      break;
    case "publish_failed":
      text = `โพสต์ไม่ผ่าน: ${input.name} · ${PLATFORM_SHORT[input.platform]} · ${input.reason}`;
      path = campaignPath(input.campaignId);
      dedupeKey = `failed:${input.jobKey}`;
      break;
    case "token_issue":
      text = `บัญชี ${input.provider} ต้องเชื่อมใหม่`;
      path = `${GROWTH_PATH}?panel=connections`;
      dedupeKey = `token:${input.provider}:${createdAt.slice(0, 10)}`;
      break;
    case "budget_threshold":
      text = input.level === 100 ? "AI credit ถึงเพดานแล้ว" : `AI credit ใช้ไป ${input.level}% ของเพดาน`;
      path = `${GROWTH_PATH}?panel=cost`;
      dedupeKey = `budget:${input.cycle}:${input.level}`;
      break;
    case "blocked_budget":
      text = "AI credit หมดรอบนี้ งาน AI หยุดรอรอบใหม่ (ไม่ซื้อเพิ่ม)";
      path = `${GROWTH_PATH}?panel=cost`;
      dedupeKey = `blocked:${input.cycle}`;
      break;
    case "pause_all":
      text = input.on ? "Pause All เปิดแล้ว: หยุดโพสต์ + หยุด AI" : "Pause All ปิดแล้ว: กลับมาทำงานตามคิว";
      dedupeKey = `pause:${input.on ? "on" : "off"}:${input.at}`;
      break;
    case "weekly_insights":
      text = `สรุปสัปดาห์มาแล้ว · ${input.decisions} เรื่องให้ตัดสินใจ`;
      path = `${GROWTH_PATH}?insights=${encodeURIComponent(input.week)}`;
      dedupeKey = `weekly:${input.week}`;
      break;
  }
  const severity: NotifySeverity = URGENT.has(input.kind) || (input.kind === "budget_threshold" && input.level === 100) ? "urgent" : "info";
  return { id, kind: input.kind, severity, text, path, dedupeKey, createdAt };
}

export interface NotifyQueue {
  pending: GrowthNotification[];
  sent: NotificationBatch[];
  /** Every dedupe key ever accepted (pending or sent). */
  seenKeys: string[];
}

export const emptyQueue = (): NotifyQueue => ({ pending: [], sent: [], seenKeys: [] });

/** Add a notification unless the same dedupe key was already accepted. */
export function enqueueNotification(q: NotifyQueue, n: GrowthNotification): { queue: NotifyQueue; added: boolean } {
  if (q.seenKeys.includes(n.dedupeKey)) return { queue: q, added: false };
  return { queue: { ...q, pending: [...q.pending, n], seenKeys: [...q.seenKeys, n.dedupeKey] }, added: true };
}

function sentOnBangkokDay(q: NotifyQueue, nowMs: number): number {
  const day = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
  const today = day(nowMs);
  return q.sent.filter((b) => day(Date.parse(b.createdAt)) === today).length;
}

/** Window for the next message: normal, or an hour once today's message count hits the cap. */
export function effectiveWindowMs(q: NotifyQueue, s: NotifySettings, nowMs: number): number {
  return sentOnBangkokDay(q, nowMs) >= s.maxBatchesPerDay ? Math.max(s.batchWindowMs, OVER_CAP_WINDOW_MS) : s.batchWindowMs;
}

/** Flush when anything urgent is waiting, or the oldest pending item has waited a full window. */
export function shouldFlush(q: NotifyQueue, s: NotifySettings, nowMs: number): boolean {
  if (q.pending.length === 0) return false;
  if (q.pending.some((n) => n.severity === "urgent")) return true;
  const oldest = Math.min(...q.pending.map((n) => Date.parse(n.createdAt)));
  return nowMs - oldest >= effectiveWindowMs(q, s, nowMs);
}

/** Short Thai LINE text: header, up to MAX_ITEMS_PER_MESSAGE items (urgent first), each with its link. */
export function formatBatchTh(items: GrowthNotification[], baseUrl = APP_BASE_URL): string {
  const sorted = [...items].sort((a, b) => (a.severity === b.severity ? a.createdAt.localeCompare(b.createdAt) : a.severity === "urgent" ? -1 : 1));
  const shown = sorted.slice(0, MAX_ITEMS_PER_MESSAGE);
  const urgent = items.some((n) => n.severity === "urgent");
  const lines = [`${urgent ? "ด่วน · " : ""}SAMECOR Growth · ${items.length} เรื่อง`];
  for (const n of shown) lines.push(`• ${n.text}`, `  ${baseUrl}${n.path}`);
  const rest = items.length - shown.length;
  if (rest > 0) lines.push(`+ อีก ${rest} เรื่อง`, `  ${baseUrl}${GROWTH_PATH}`);
  return lines.join("\n");
}

/** Turn every pending item into one batch (when due). Pure: the caller hands the batch to a sender. */
export function flushNotifications(
  q: NotifyQueue,
  s: NotifySettings,
  nowMs: number,
  opts: { force?: boolean; baseUrl?: string } = {},
): { queue: NotifyQueue; batch: NotificationBatch | null } {
  if (q.pending.length === 0 || (!opts.force && !shouldFlush(q, s, nowMs))) return { queue: q, batch: null };
  const batch: NotificationBatch = {
    id: `nb-${q.sent.length + 1}`,
    createdAt: new Date(nowMs).toISOString(),
    notificationIds: q.pending.map((n) => n.id),
    urgent: q.pending.some((n) => n.severity === "urgent"),
    text: formatBatchTh(q.pending, opts.baseUrl),
  };
  return { queue: { ...q, pending: [], sent: [...q.sent, batch] }, batch };
}

/* ---------- senders ---------- */

export interface SendResult {
  delivered: boolean;
  simulated: boolean;
}

export interface NotificationSender {
  readonly channel: "line-mock" | "line-admin";
  send(batch: NotificationBatch): Promise<SendResult>;
}

/** Phase 1: keeps the messages in memory so the dashboard can show them. Never touches the network. */
export class MockLineSender implements NotificationSender {
  readonly channel = "line-mock" as const;
  readonly outbox: NotificationBatch[] = [];
  async send(batch: NotificationBatch): Promise<SendResult> {
    this.outbox.push(batch);
    return { delivered: false, simulated: true };
  }
}

/**
 * Phase 1b (needs the owner's OK): a server-side sender that inserts one row into
 * public.admin_line_outbox (kind 'growth', ref_id = batch id); the existing line-admin-notify
 * edge function pushes it to the admin group. Never called from the browser.
 */
export function senderFor(mode: NotifyMode): NotificationSender {
  if (mode === "line") throw new Error("LINE sending is server-side only and needs the owner's OK (Phase 1b)");
  return new MockLineSender();
}
