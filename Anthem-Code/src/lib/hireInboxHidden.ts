/** Freelancer inbox: hide terminal hire cards from the list (local, per user). */

import { isHireTerminalStatus } from "@/lib/hiringStatus";

const keyFor = (userId: string) => `aplus1_hire_inbox_hidden_v1:${userId}`;

function readIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(userId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids.slice(0, 500)));
  } catch {
    /* ignore quota */
  }
}

export function getHiddenHireRequestIds(userId: string): Set<string> {
  return new Set(readIds(userId));
}

export function hideHireRequestFromInbox(userId: string, requestId: string): void {
  const next = [requestId, ...readIds(userId).filter((id) => id !== requestId)];
  writeIds(userId, next);
}

export function unhideHireRequestFromInbox(userId: string, requestId: string): void {
  writeIds(
    userId,
    readIds(userId).filter((id) => id !== requestId),
  );
}

/** Only terminal statuses can be removed from the freelancer inbox UI. */
export function canHideHireFromInbox(status: string | null | undefined): boolean {
  return isHireTerminalStatus(status);
}
