/** Trash with 30-day retention (phase 09). Pure list helpers; app.js owns storage and UI. Entries: { item, deletedAt }. */
export const TRASH_DAYS = 30;
export const TRASH_MAX = 200;
const DAY = 86400000;

export function trashAdd(list, item, now = Date.now()) {
  const rest = (list || []).filter(e => e.item.id !== item.id);
  return [{ item, deletedAt: now }, ...rest].slice(0, TRASH_MAX);
}

/** Entries older than the retention window are gone for good. */
export function trashPurge(list, now = Date.now(), days = TRASH_DAYS) {
  return (list || []).filter(e => now - Number(e.deletedAt) < days * DAY);
}

export function trashRemove(list, id) {
  return (list || []).filter(e => e.item.id !== id);
}

export function daysLeft(entry, now = Date.now(), days = TRASH_DAYS) {
  return Math.max(0, Math.ceil((Number(entry.deletedAt) + days * DAY - now) / DAY));
}
