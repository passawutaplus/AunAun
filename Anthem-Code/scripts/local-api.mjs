/**
 * Minimal local API server for Omise hire-charge + webhook (port 8787).
 * Use with: npm run dev (8080) + npm run dev:api
 */
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const routes = {
  "/api/hire-charge": path.join(root, "api", "hire-charge.js"),
  "/api/omise-webhook": path.join(root, "api", "omise-webhook.js"),
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const port = Number(process.env.LOCAL_API_PORT || 8787);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  const route = routes[url.pathname];
  if (!route) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const raw = await readRawBody(req);
    const rawText = raw.toString("utf8");
    let parsed = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = rawText;
    }

    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]),
    );

    const fakeReq = {
      method: req.method || "GET",
      url: req.url,
      headers,
      body: parsed,
    };

    const mod = await import(`${pathToFileURL(route).href}?t=${Date.now()}`);
    const handler = mod.default;
    await handler(fakeReq, res);
  } catch (e) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : "local_api_failed" }));
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[local-api] http://127.0.0.1:${port}  (hire-charge, omise-webhook)`);
});
