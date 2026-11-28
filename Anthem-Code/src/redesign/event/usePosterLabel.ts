import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";

/**
 * The small label beside an event's kind (owner 2026-11-28: "curated" means the one who runs it):
 *   curated   — the team found it and posted it      → "POST BY SAMECOR"
 *   original  — SAMECOR runs it                      → "CURATED BY SAMECOR"
 *   community — a member made it                     → "CURATED BY <their name>"
 */
export function usePosterLabel(origin: string | null | undefined, ownerId: string | null | undefined): string | null {
  const member = origin === "community" && !!ownerId;
  const { data } = useProfilesByIds(member ? [ownerId!] : []);
  if (origin === "curated") return "POST BY SAMECOR";
  if (origin === "original") return "CURATED BY SAMECOR";
  if (!member) return null;
  const who = data?.map[ownerId!];
  const name = who?.username?.trim() || who?.display_name?.trim() || "";
  return name ? `CURATED BY ${name}` : null;
}
