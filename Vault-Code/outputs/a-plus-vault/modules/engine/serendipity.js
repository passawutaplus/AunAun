/**
 * "From your past" (phase 08): 3 items saved long ago and not opened lately, weighted random, local only, no AI.
 * Deterministic per day so the row does not reshuffle on every render.
 */
const DAY = 86400000;

function dayRng(day) {
  let seed = [...String(day)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * items: vault items; opened: { [id]: timestamp }.
 * Eligible: has an image, saved > minAgeDays ago, not opened within openedDays. Older and never-opened weigh more.
 */
export function pickFromPast(items, { now = Date.now(), day = new Date(now).toISOString().slice(0, 10), opened = {}, count = 3, minAgeDays = 30, openedDays = 14 } = {}) {
  const pool = items.filter(i => {
    const hasImage = i.type === "image" || i.thumbnailUrl || i.previewUrl;
    const age = now - (Number(i.createdAt) || 0);
    const lastOpen = Number(opened[i.id]) || 0;
    return hasImage && age > minAgeDays * DAY && now - lastOpen > openedDays * DAY;
  });
  if (pool.length < count) return [];
  const rng = dayRng(day);
  const picks = [];
  const weights = pool.map(i => {
    const ageDays = (now - (Number(i.createdAt) || 0)) / DAY;
    return 1 + Math.min(ageDays / 30, 6) + (opened[i.id] ? 0 : 2);
  });
  const entries = pool.map((item, k) => ({ item, w: weights[k] }));
  while (picks.length < count && entries.length) {
    const total = entries.reduce((n, e) => n + e.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < entries.length - 1; idx++) {
      r -= entries[idx].w;
      if (r <= 0) break;
    }
    picks.push(entries.splice(idx, 1)[0].item);
  }
  return picks;
}
