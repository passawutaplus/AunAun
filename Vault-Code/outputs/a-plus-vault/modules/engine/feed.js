/**
 * Daily feed rotation (phase 08). PURE and deterministic per day: no cron, no stored state, no maintenance.
 * Variety across category/source buckets, a mild quality bias, and items a returning visitor already saw go last.
 */

/** Small seeded PRNG (mulberry32) so the same day always gives the same order. */
export function seededRng(seedText) {
  let h = 1779033703 ^ String(seedText).length;
  for (const ch of String(seedText)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** YYYY-MM-DD in Asia/Bangkok (the rotation changes at local midnight). */
export function bangkokDateKey(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

const bucketOf = item => `${item.category || "other"}|${item.source || "?"}`;
const prefix = id => String(id || "").slice(0, 8);

/**
 * items: [{ id, category, source, quality_score? }]; seenPrefixes: first 8 chars of ids the visitor saw recently.
 * Returns the same items in rotated order.
 */
export function rotateFeed(items, dateKey, { seenPrefixes = [] } = {}) {
  const rng = seededRng(dateKey);
  const buckets = new Map();
  for (const item of items) {
    const key = bucketOf(item);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  const lists = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0])) // stable base order before shuffling
    .map(([, list]) =>
      list
        .map(item => ({ item, k: 0.4 * ((Number(item.quality_score) || 70) / 100) + 0.6 * rng() }))
        .sort((a, b) => b.k - a.k || String(a.item.id).localeCompare(String(b.item.id)))
        .map(x => x.item),
    );
  for (let i = lists.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [lists[i], lists[j]] = [lists[j], lists[i]];
  }
  const out = [];
  for (let round = 0; lists.some(l => l.length > round); round++) for (const l of lists) if (l.length > round) out.push(l[round]);
  if (!seenPrefixes.length) return out;
  const seen = new Set(seenPrefixes);
  return [...out.filter(i => !seen.has(prefix(i.id))), ...out.filter(i => seen.has(prefix(i.id)))];
}

export const feedPrefix = prefix;
