/**
 * Deterministic content hashing for the mock engine.
 *
 * Canonical JSON (sorted keys) → cyrb53 (53-bit, sync). Good enough to detect "anything changed"
 * in the browser demo. Production hashes are computed by Postgres as sha256 over the jsonb text
 * (see growth.ge_set_content_hash in the draft migration); the engine treats hashes as opaque.
 */

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** "m53:" + 14 hex chars. The prefix marks it as a mock hash, never a sha256. */
export function contentHash(value: unknown): string {
  return `m53:${cyrb53(canonicalJson(value)).toString(16).padStart(14, "0")}`;
}

export function shortHash(hash: string): string {
  return hash.replace(/^m53:/, "").slice(0, 7);
}
