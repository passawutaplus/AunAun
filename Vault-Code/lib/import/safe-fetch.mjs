import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { importError } from "./errors.mjs";
import { isBlockedIp, validateUrl } from "./ssrf.mjs";

export const USER_AGENT = "AplusVaultImporter/1.0 (+https://aplus-vault.vercel.app; user-requested link import)";
const MAX_REDIRECTS = 5;
const TOTAL_TIMEOUT_MS = 8000;
const PASS_THROUGH = new Set(["UNSAFE_URL", "INVALID_URL"]);

/** Connect-time DNS hook: the address actually dialled is checked, which closes the DNS-rebinding gap. */
function guardedLookup(lookup) {
  return (hostname, options, cb) => {
    const done = typeof options === "function" ? options : cb;
    const opts = typeof options === "function" ? {} : options || {};
    lookup(hostname, { all: true }).then(
      list => {
        if (!list.length || list.some(a => isBlockedIp(a.address))) return done(importError("UNSAFE_URL", "ลิงก์นี้ไม่อนุญาต"));
        if (opts.all) return done(null, list.map(a => ({ address: a.address, family: a.family || (a.address.includes(":") ? 6 : 4) })));
        done(null, list[0].address, list[0].family || (list[0].address.includes(":") ? 6 : 4));
      },
      err => done(err)
    );
  };
}

/** One request, no redirect following. Resolves { status, headers, stream, destroy }. */
function nodeRequest(url, { signal, headers, lookup }) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(url, { method: "GET", headers, lookup: guardedLookup(lookup), signal }, res => {
      resolve({ status: res.statusCode || 0, headers: res.headers, stream: res, destroy: () => res.destroy() });
    });
    req.on("error", reject);
    req.end();
  });
}

async function readCapped(stream, maxBytes) {
  const chunks = [];
  let size = 0;
  let truncated = false;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maxBytes) {
      chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
      truncated = true;
      break;
    }
    chunks.push(chunk);
  }
  return { body: Buffer.concat(chunks), truncated };
}

/**
 * SSRF-safe GET. http(s) only, ports 80/443, every redirect hop (max 5) re-validated, 8 s total,
 * body capped at maxBytes. `accept(contentType)` decides whether the body is read at all.
 * Returns { finalUrl, status, contentType, body|null, truncated, rejected? }.
 * Throws importError INVALID_URL | UNSAFE_URL | FETCH_FAILED.
 */
export async function safeFetch(rawUrl, { maxBytes = 2 * 1024 * 1024, accept = () => true, acceptHeader = "*/*", lookup = dns.lookup, requestImpl = nodeRequest, timeoutMs = TOTAL_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const fail = error => {
    if (error?.code && PASS_THROUGH.has(error.code)) return error;
    return importError("FETCH_FAILED", "เว็บไม่ตอบกลับ");
  };
  try {
    let url = await validateUrl(rawUrl, lookup);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let res;
      try {
        res = await requestImpl(url, { signal: ctrl.signal, lookup, headers: { "user-agent": USER_AGENT, accept: acceptHeader } });
      } catch (error) {
        throw fail(error);
      }
      const location = res.headers.location;
      if (res.status >= 300 && res.status < 400 && location) {
        res.destroy?.();
        url = await validateUrl(new URL(location, url).href, lookup);
        continue;
      }
      const contentType = String(res.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (res.status < 200 || res.status >= 300) {
        res.destroy?.();
        return { finalUrl: url.href, status: res.status, contentType, body: null, truncated: false };
      }
      if (!accept(contentType)) {
        res.destroy?.();
        return { finalUrl: url.href, status: res.status, contentType, body: null, truncated: false, rejected: true };
      }
      try {
        const { body, truncated } = await readCapped(res.stream, maxBytes);
        res.destroy?.();
        return { finalUrl: url.href, status: res.status, contentType, body, truncated: truncated || Number(res.headers["content-length"]) > maxBytes };
      } catch (error) {
        throw fail(error);
      }
    }
    throw importError("FETCH_FAILED", "ลิงก์เด้งต่อหลายครั้งเกินไป");
  } finally {
    clearTimeout(timer);
  }
}
