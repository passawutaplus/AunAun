import type { DesignerCardData } from "@/data/designerTypes";

/** Score how well a designer matches the viewer's feed interests (project categories). */
export function scoreDesignerInterest(
  designer: DesignerCardData,
  interests: string[],
): number {
  if (!interests.length) return 0;
  const set = new Set(interests.map((c) => c.toLowerCase()));
  let score = 0;
  for (const p of designer.projects) {
    if (p.category && set.has(p.category.toLowerCase())) score += 3;
  }
  for (const skill of designer.profile.skills ?? []) {
    if (skill && set.has(skill.toLowerCase())) score += 1;
  }
  return score;
}

function designerId(d: DesignerCardData): string {
  return (d.profile as { user_id?: string }).user_id ?? d.profile.id;
}

function profileCreatedAtMs(d: DesignerCardData): number {
  const t = (d.profile as { created_at?: string }).created_at ?? "";
  return t ? new Date(t).getTime() : 0;
}

/** Deterministic shuffle seed from id — keeps order stable across re-renders. */
function idJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h >>> 0) % 1000;
}

/**
 * Rank designers for "ทั้งหมด": interest match first, then light jitter so
 * the feed feels personalized without a frozen list.
 */
export function rankDesignersForYou(
  rows: DesignerCardData[],
  interests: string[],
): DesignerCardData[] {
  return [...rows].sort((a, b) => {
    const scoreDiff = scoreDesignerInterest(b, interests) - scoreDesignerInterest(a, interests);
    if (scoreDiff !== 0) return scoreDiff;
    const jitter = idJitter(designerId(b)) - idJitter(designerId(a));
    if (jitter !== 0) return jitter;
    return profileCreatedAtMs(b) - profileCreatedAtMs(a);
  });
}

/** Newest accounts first (profile created_at). */
export function rankDesignersNewest(rows: DesignerCardData[]): DesignerCardData[] {
  return [...rows].sort((a, b) => profileCreatedAtMs(b) - profileCreatedAtMs(a));
}
