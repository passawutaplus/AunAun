import { API_TIMEOUT_MS, userAgent } from "./config";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

/** Upstream asked us to slow down. The Inngest layer turns this into RetryAfterError. */
export class RateLimitedError extends Error {
  constructor(
    readonly retryAfterMs: number,
    readonly url: string,
  ) {
    super(`Rate limited by ${url}; retry after ${retryAfterMs}ms`);
    this.name = "RateLimitedError";
  }
}

export class TooLargeError extends Error {
  constructor(readonly url: string) {
    super(`Response too large: ${url}`);
    this.name = "TooLargeError";
  }
}

/** Spaces requests to one host so a single process never bursts past the source's limit. */
export class RateLimiter {
  private next = 0;
  constructor(private readonly minIntervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.next);
    this.next = slot + this.minIntervalMs;
    if (slot > now) await sleep(slot - now);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoffMs(attempt: number, baseMs = 500, capMs = 15_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

function parseRetryAfter(value: string | null): number {
  if (!value) return 30_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(1000, at - Date.now()) : 30_000;
}

type RequestOptions = {
  limiter?: RateLimiter;
  retries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

async function request(url: string, opts: RequestOptions): Promise<Response> {
  const retries = opts.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await opts.limiter?.wait();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent(), Accept: "*/*", ...opts.headers },
        signal: AbortSignal.timeout(opts.timeoutMs ?? API_TIMEOUT_MS),
        redirect: "follow",
      });
      if (res.status === 429) {
        throw new RateLimitedError(parseRetryAfter(res.headers.get("retry-after")), url);
      }
      if (res.status >= 500) {
        lastError = new HttpError(res.status, url);
      } else if (!res.ok) {
        throw new HttpError(res.status, url);
      } else {
        return res;
      }
    } catch (err) {
      if (err instanceof RateLimitedError) throw err;
      if (err instanceof HttpError && err.status < 500) throw err;
      lastError = err;
    }
    if (attempt < retries) await sleep(backoffMs(attempt));
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url}`);
}

export async function fetchJson<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const res = await request(url, { ...opts, headers: { Accept: "application/json", ...opts.headers } });
  return (await res.json()) as T;
}

export async function fetchBuffer(url: string, maxBytes: number, opts: RequestOptions = {}): Promise<Buffer> {
  const res = await request(url, opts);
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new TooLargeError(url);
  if (!res.body) throw new HttpError(res.status, url);

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new TooLargeError(url);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
