/** Offline/retry queue (phase 11.E): pure list logic over a chrome.storage.local array. */
export const QUEUE_CAP = 50;
export const MAX_ATTEMPTS = 8;
const MAX_INLINE_BYTES = 300 * 1024; // snapshots/uploads bigger than this are NOT queued (storage quota, privacy)

/** Network failures, timeouts, rate limits and 5xx are retried; every other 4xx never is. */
export function isRetryable(status) {
  if (status == null || status === 0) return true; // fetch threw (offline)
  return status === 408 || status === 429 || status >= 500;
}

/** 5 s, 10 s, 20 s ... capped at 15 min. Deterministic so it can be tested. */
export function backoffMs(attempt) {
  return Math.min(15 * 60_000, 5000 * 2 ** Math.max(0, attempt - 1));
}

const dataUrlBytes = s => Math.floor((String(s).length * 3) / 4);

/** Can this capture payload be stored for later? Returns { ok, payload?, reason? } (big inline images are dropped with a message). */
export function prepareForQueue(payload) {
  const inline = ["assetUrl", "previewUrl", "thumbnailUrl"].filter(k => typeof payload?.[k] === "string" && payload[k].startsWith("data:"));
  const tooBig = inline.some(k => dataUrlBytes(payload[k]) > MAX_INLINE_BYTES);
  if (tooBig) {
    const slim = { ...payload };
    // A snapshot can still be kept as its thumbnail: drop the big original, keep a small preview when there is one.
    for (const k of inline) if (dataUrlBytes(payload[k]) > MAX_INLINE_BYTES) delete slim[k];
    if (!slim.sourceUrl && !slim.assetUrl && !slim.previewUrl && !slim.thumbnailUrl) return { ok: false, reason: "too-large" };
    return { ok: true, payload: slim, trimmed: true };
  }
  return { ok: true, payload };
}

export function queueAdd(queue, payload, now = Date.now()) {
  const list = Array.isArray(queue) ? queue : [];
  const id = payload?.objectId || `q-${now.toString(36)}-${list.length}`;
  if (list.some(q => q.id === id)) return { queue: list, added: false, id };
  if (list.length >= QUEUE_CAP) return { queue: list, added: false, id, reason: "full" };
  return { queue: [...list, { id, payload, attempts: 0, nextAt: now, addedAt: now }], added: true, id };
}

export function queueRemove(queue, id) {
  return (Array.isArray(queue) ? queue : []).filter(q => q.id !== id);
}

/** Entries ready to retry now (oldest first). */
export function queueDue(queue, now = Date.now()) {
  return (Array.isArray(queue) ? queue : []).filter(q => q.nextAt <= now && q.attempts < MAX_ATTEMPTS).sort((a, b) => a.addedAt - b.addedAt);
}

/** After a failed attempt: schedule the next one, or drop it for good on a non-retryable status / too many tries. */
export function queueAfterFailure(queue, id, status, now = Date.now()) {
  const list = Array.isArray(queue) ? queue : [];
  return list.flatMap(q => {
    if (q.id !== id) return [q];
    const attempts = q.attempts + 1;
    if (!isRetryable(status) || attempts >= MAX_ATTEMPTS) return [];
    return [{ ...q, attempts, nextAt: now + backoffMs(attempts) }];
  });
}

export function queueSummary(queue) {
  const n = Array.isArray(queue) ? queue.length : 0;
  return n ? `Waiting to send · ${n}` : "";
}
