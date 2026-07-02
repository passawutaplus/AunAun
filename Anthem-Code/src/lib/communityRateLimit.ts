type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

/** Extract a readable message from Supabase/PostgREST or thrown values. */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as ErrorLike;
    if (typeof o.message === "string" && o.message.trim()) {
      const parts = [o.message];
      if (typeof o.details === "string" && o.details.trim()) parts.push(o.details);
      if (typeof o.hint === "string" && o.hint.trim()) parts.push(o.hint);
      return parts.join(" — ");
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Map Supabase / RPC errors to user-facing Thai messages. */
export function formatCommunityActionError(err: unknown): string {
  const raw = extractErrorMessage(err);
  if (raw.includes("RATE_LIMIT:")) {
    return raw.split("RATE_LIMIT:")[1]?.trim() || "ทำรายการบ่อยเกินไป ลองใหม่ภายหลัง";
  }
  if (raw.includes("AUTH:")) {
    return raw.split("AUTH:")[1]?.trim() || "กรุณาเข้าสู่ระบบก่อน";
  }
  if (raw.includes("INVALID:")) {
    return raw.split("INVALID:")[1]?.trim() || "ข้อมูลไม่ถูกต้อง";
  }
  if (/column .* does not exist|PGRST204|link_urls|quoted_post_id/i.test(raw)) {
    return "ระบบฐานข้อมูลยังไม่อัปเดต — รัน migration community-area-post-enhancements ก่อน";
  }
  return raw || "เกิดข้อผิดพลาด";
}

export function toCommunityActionError(err: unknown): Error {
  return new Error(formatCommunityActionError(err));
}

/** Columns added in community-area-post-enhancements — omit when DB not migrated yet. */
export const OPTIONAL_COMMUNITY_POST_COLUMNS = ["link_urls", "text_cover_theme"] as const;

export function isMissingOptionalCommunityColumnError(err: unknown): boolean {
  const raw = extractErrorMessage(err);
  return /column .* does not exist|PGRST204|Could not find the .* column/i.test(raw);
}

export function stripOptionalCommunityPostFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const key of OPTIONAL_COMMUNITY_POST_COLUMNS) {
    delete next[key];
  }
  return next;
}
