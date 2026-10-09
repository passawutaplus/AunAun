/** Client-side withdraw PIN (6 digits). Hash only — never store the PIN. Lockout after failed tries. */

export const WITHDRAW_PIN_LENGTH = 6;
export const WITHDRAW_PIN_MAX_FAILS = 5;
export const WITHDRAW_PIN_LOCK_MS = 15 * 60 * 1000;
export const WITHDRAW_PIN_STORAGE_PREFIX = "aplus1:withdraw-pin-v1:";
/** First versions keyed unset auth as this; keep reading it so a set PIN is not lost. */
export const WITHDRAW_PIN_LEGACY_ANON = "anon";

const WEAK_PINS = new Set([
  "000000",
  "111111",
  "123456",
  "123123",
  "654321",
  "112233",
  "121212",
  "131313",
  "999999",
  "258000",
]);

export type WithdrawPinRecord = {
  hash: string;
  failedAttempts: number;
  lockedUntil: number | null;
};

const memory = new Map<string, WithdrawPinRecord>();

export type VerifyWithdrawPinResult =
  | { ok: true; reason?: undefined; remaining?: undefined; retryAt?: undefined }
  | { ok: false; reason: "mismatch"; remaining: number; retryAt?: undefined }
  | { ok: false; reason: "locked"; retryAt: number; remaining?: undefined }
  | { ok: false; reason: "missing"; remaining?: undefined; retryAt?: undefined };

export function withdrawPinOwnerKey(userId: string | undefined): string {
  return userId?.trim() || "";
}

export function normalizeWithdrawPin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, WITHDRAW_PIN_LENGTH);
}

export function withdrawPinFormatError(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return "ใส่ PIN 6 ตัวเลข";
  if (WEAK_PINS.has(pin) || /^(\d)\1{5}$/.test(pin)) return "PIN นี้เดาง่ายเกินไป เลือกชุดอื่น";
  return null;
}

export function storageKeyForOwner(ownerKey: string): string {
  return `${WITHDRAW_PIN_STORAGE_PREFIX}${ownerKey}`;
}

function parseRecord(raw: string | null): WithdrawPinRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WithdrawPinRecord;
    if (!parsed?.hash || typeof parsed.hash !== "string") return null;
    return {
      hash: parsed.hash,
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockedUntil: parsed.lockedUntil ? Number(parsed.lockedUntil) : null,
    };
  } catch {
    return null;
  }
}

function readStored(ownerKey: string): WithdrawPinRecord | null {
  if (!ownerKey || typeof localStorage === "undefined") return null;
  try {
    return parseRecord(localStorage.getItem(storageKeyForOwner(ownerKey)));
  } catch {
    return null;
  }
}

function writeStored(ownerKey: string, record: WithdrawPinRecord) {
  if (!ownerKey || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKeyForOwner(ownerKey), JSON.stringify(record));
  } catch {
    /* private mode / quota — in-memory still keeps it this session */
  }
}

function removeStored(ownerKey: string) {
  if (!ownerKey || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKeyForOwner(ownerKey));
  } catch {
    /* ignore */
  }
}

function readRecord(ownerKey: string): WithdrawPinRecord | null {
  if (!ownerKey) return null;
  const cached = memory.get(ownerKey);
  if (cached) return cached;
  const stored = readStored(ownerKey);
  if (stored) {
    memory.set(ownerKey, stored);
    return stored;
  }
  return null;
}

function writeRecord(ownerKey: string, record: WithdrawPinRecord) {
  if (!ownerKey) return;
  memory.set(ownerKey, record);
  writeStored(ownerKey, record);
}

function lookupRecord(ownerKey: string): { ownerKey: string; record: WithdrawPinRecord } | null {
  const owned = readRecord(ownerKey);
  if (owned) return { ownerKey, record: owned };
  if (ownerKey && ownerKey !== WITHDRAW_PIN_LEGACY_ANON) {
    const legacy = readRecord(WITHDRAW_PIN_LEGACY_ANON);
    if (legacy) return { ownerKey: WITHDRAW_PIN_LEGACY_ANON, record: legacy };
  }
  return null;
}

export function hasWithdrawPin(ownerKey: string): boolean {
  return Boolean(lookupRecord(ownerKey)?.record.hash);
}

export function clearWithdrawPin(ownerKey: string) {
  if (ownerKey) {
    memory.delete(ownerKey);
    removeStored(ownerKey);
  }
  memory.delete(WITHDRAW_PIN_LEGACY_ANON);
  removeStored(WITHDRAW_PIN_LEGACY_ANON);
}

export async function hashWithdrawPin(ownerKey: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`aplus1-withdraw-pin|${ownerKey}|${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export async function saveWithdrawPin(ownerKey: string, pin: string): Promise<void> {
  if (!ownerKey) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const formatError = withdrawPinFormatError(pin);
  if (formatError) throw new Error(formatError);
  const hash = await hashWithdrawPin(ownerKey, pin);
  writeRecord(ownerKey, { hash, failedAttempts: 0, lockedUntil: null });
  if (ownerKey !== WITHDRAW_PIN_LEGACY_ANON) {
    memory.delete(WITHDRAW_PIN_LEGACY_ANON);
    removeStored(WITHDRAW_PIN_LEGACY_ANON);
  }
}

export async function verifyWithdrawPin(
  ownerKey: string,
  pin: string,
  now = Date.now(),
): Promise<VerifyWithdrawPinResult> {
  const found = lookupRecord(ownerKey);
  if (!found) return { ok: false, reason: "missing" };
  const { record, ownerKey: storedKey } = found;
  if (record.lockedUntil && record.lockedUntil > now) {
    return { ok: false, reason: "locked", retryAt: record.lockedUntil };
  }
  const storedHash = await hashWithdrawPin(storedKey, pin);
  if (hashesEqual(storedHash, record.hash)) {
    const nextHash =
      storedKey === ownerKey ? record.hash : await hashWithdrawPin(ownerKey, pin);
    writeRecord(ownerKey, { hash: nextHash, failedAttempts: 0, lockedUntil: null });
    if (storedKey !== ownerKey) {
      memory.delete(storedKey);
      removeStored(storedKey);
    }
    return { ok: true };
  }
  const failedAttempts = record.failedAttempts + 1;
  if (failedAttempts >= WITHDRAW_PIN_MAX_FAILS) {
    const retryAt = now + WITHDRAW_PIN_LOCK_MS;
    writeRecord(storedKey, { hash: record.hash, failedAttempts, lockedUntil: retryAt });
    return { ok: false, reason: "locked", retryAt };
  }
  writeRecord(storedKey, { hash: record.hash, failedAttempts, lockedUntil: null });
  return { ok: false, reason: "mismatch", remaining: WITHDRAW_PIN_MAX_FAILS - failedAttempts };
}

export function lockRetryLabel(retryAt: number, now = Date.now()): string {
  const mins = Math.max(1, Math.ceil((retryAt - now) / 60_000));
  return `ลองใหม่ในอีก ${mins} นาที`;
}

export function withdrawStartPath(opts: { preview?: boolean }): string {
  const qs = new URLSearchParams();
  if (opts.preview) qs.set("preview", "wallet");
  const q = qs.toString();
  return q ? `/earnings/withdraw?${q}` : "/earnings/withdraw";
}
