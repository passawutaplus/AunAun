/**
 * Enrichment seam (phase 05.E fills this in). Called after every successful save through the one
 * server path. It must never block or fail the save: callers use fireEnrich() which swallows errors.
 */
export async function enrichItem(objectId, auth) {
  return { objectId, userId: auth?.userId || null, status: "skipped", reason: "enrichment not implemented yet" };
}

/** Fire-and-forget wrapper: the save response never waits for, or fails because of, enrichment. */
export function fireEnrich(objectId, auth) {
  try {
    Promise.resolve(enrichItem(objectId, auth)).catch(() => {});
  } catch {
    /* ignore */
  }
}
