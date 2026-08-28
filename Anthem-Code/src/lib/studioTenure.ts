const BANGKOK = "Asia/Bangkok";

function bangkokYmd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: BANGKOK });
}

/** Inclusive calendar days on the platform in Asia/Bangkok (day 1 = joined today). */
export function studioDaysOnPlatform(joinedIso: string, now = new Date()): number {
  const start = bangkokYmd(new Date(joinedIso));
  const end = bangkokYmd(now);
  const startMs = Date.parse(`${start}T00:00:00+07:00`);
  const endMs = Date.parse(`${end}T00:00:00+07:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 1;
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}

export function formatStudioJoinedDate(joinedIso: string): string {
  return new Date(joinedIso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: BANGKOK,
  });
}
