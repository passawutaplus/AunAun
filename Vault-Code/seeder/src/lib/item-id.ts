const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Accepts a bare id or any link/text that contains one (people paste Discover links into their emails). */
export function itemIdFrom(raw: string): string | null {
  const m = String(raw || "").match(UUID_IN_TEXT);
  return m ? m[0].toLowerCase() : null;
}
