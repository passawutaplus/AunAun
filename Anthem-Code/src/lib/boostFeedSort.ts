import type { ActiveBoost } from "@/hooks/useBoost";

/** Move boosted items to the front while preserving relative order within each group. */
export function sortByBoostedIds<T extends { id: string }>(
  items: T[],
  boostedIds: Set<string>,
): T[] {
  if (!boostedIds.size) return items;
  const boosted: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (boostedIds.has(item.id)) boosted.push(item);
    else rest.push(item);
  }
  return [...boosted, ...rest];
}

export function findBoostIdForTarget(
  boosts: ActiveBoost[] | undefined,
  targetType: "project" | "community_post",
  targetId: string,
): string | undefined {
  return boosts?.find((b) => b.target_type === targetType && b.target_id === targetId)?.boost_id;
}
