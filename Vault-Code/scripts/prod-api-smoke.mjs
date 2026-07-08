/**
 * Post-deploy API smoke — writes one capture to production (Bearer-scoped).
 * Not run in PR CI; use after deploy or manually.
 *
 * Usage:
 *   node scripts/prod-api-smoke.mjs
 *   VAULT_BASE_URL=https://aplus-vault.vercel.app node scripts/prod-api-smoke.mjs
 */
import https from "node:https";
import { URL } from "node:url";

const BASE_URL = process.env.VAULT_BASE_URL || process.env.BASE_URL || "https://aplus-vault.vercel.app";
const TOKEN = process.env.VAULT_SMOKE_TOKEN || `vault-ci-smoke-${Date.now()}`;

const base = new URL(BASE_URL);

function requestJson(method, route, options = {}) {
  const body = options.body ? Buffer.from(JSON.stringify(options.body)) : null;
  return requestRaw(method, route, {
    headers: {
      "Content-Type": "application/json",
      ...(body ? { "Content-Length": body.length } : {}),
      ...(options.headers || {}),
    },
    body,
  });
}

function requestRaw(method, route, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: base.hostname,
      port: base.port || 443,
      path: route,
      method,
      headers: options.headers || {},
    }, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = { raw: text };
        }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(label, promise, status) {
  const response = await promise;
  assert(response.status === status, `${label} expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
  return response;
}

await expectStatus("POST without token", requestJson("POST", "/api/vault/capture", {
  body: {
    type: "link",
    title: "Prod API smoke no-token",
    sourceUrl: "https://example.com/no-token",
  },
}), 401);

const saved = await expectStatus("POST capture", requestJson("POST", "/api/vault/capture", {
  headers: { Authorization: `Bearer ${TOKEN}` },
  body: {
    type: "link",
    title: "Prod API smoke capture",
    sourceUrl: "https://example.com/prod-smoke",
    previewUrl: "https://example.com/og.jpg",
    captureContext: {
      method: "extension_link",
      pageTitle: "Prod smoke",
      pageUrl: "https://example.com/page",
      linkUrl: "https://example.com/prod-smoke",
    },
  },
}), 200);

assert(saved.body.success, "Capture must return success.");
assert(saved.body.item?.id, "Capture must return item id.");

const list = await expectStatus("GET captures", requestJson("GET", "/api/vault/captures", {
  headers: { Authorization: `Bearer ${TOKEN}` },
}), 200);

const items = list.body.items || [];
assert(items.length >= 1, `Expected at least 1 capture, found ${items.length}.`);
assert(items.some(row => row.item?.title === "Prod API smoke capture"), "Capture list must include smoke object.");

console.log("A+ Vault prod API smoke passed.");
console.log(`Base: ${BASE_URL}`);
console.log(`Token: ${TOKEN}`);
