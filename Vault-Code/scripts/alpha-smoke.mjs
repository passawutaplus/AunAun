import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.VAULT_SMOKE_PORT || 5191);
const TOKEN = "alpha-smoke-token";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "aplus-vault-alpha-"));
const server = spawn(process.execPath, ["outputs/a-plus-vault/local-server.cjs"], {
  env: {
    ...process.env,
    VAULT_PORT: String(PORT),
    VAULT_DATA_DIR: tempDir,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

try {
  await waitForServer();

  await expectStatus("GET /health", requestJson("GET", "/api/vault/health"), 200);
  await expectStatus("POST without token", requestJson("POST", "/api/vault/capture", {
    body: { type: "link", title: "No token", sourceUrl: "https://example.com/no-token" },
  }), 401);

  const image = await saveCapture("image capture", {
    type: "image",
    title: "Alpha image reference",
    sourceUrl: "https://example.com/image-source",
    assetUrl: "https://cdn.example.com/reference.jpg",
    previewUrl: "https://cdn.example.com/reference.jpg",
    quickKeywords: "quiet, material",
    visualCategory: "interior",
    captureContext: {
      method: "extension_image",
      pageTitle: "Alpha image source",
      pageUrl: "https://example.com/image-source",
      imageUrl: "https://cdn.example.com/reference.jpg",
    },
  });
  assert(image.item.type === "image", "Image capture must stay image.");
  assert(image.item.collectionIds.includes("all"), "Image capture must default to Vault Library.");
  assert(image.item.previewUrl, "Image capture must keep a preview URL.");
  assert(image.item.analysis.tags.includes("quiet"), "Image capture must include quick keywords.");
  assert(image.item.analysis.category === "interior", "Image capture must include visual category.");

  const link = await saveCapture("link capture", {
    type: "link",
    title: "Alpha link reference",
    sourceUrl: "https://example.com/article",
    previewUrl: "https://example.com/og.jpg",
    captureContext: {
      method: "extension_link",
      pageTitle: "Alpha page",
      pageUrl: "https://example.com/page",
      linkUrl: "https://example.com/article",
      ogImage: "https://example.com/og.jpg",
    },
  });
  assert(link.item.type === "link", "Link capture must stay link.");
  assert(link.item.sourceUrl === "https://example.com/article", "Link capture must preserve source.");

  const text = await saveCapture("selected text capture", {
    type: "text",
    title: "Saved text",
    note: "Use this line as a creative direction note.",
    sourceUrl: "https://example.com/brief",
    captureContext: {
      method: "extension_selection",
      pageTitle: "Brief source",
      pageUrl: "https://example.com/brief",
      selectionText: "Use this line as a creative direction note.",
    },
  });
  assert(text.item.type === "note", "Selected text must become a note object.");
  assert(text.item.note.includes("creative direction"), "Selected text note must be preserved.");

  const video = await saveCapture("video capture", {
    type: "video",
    title: "Motion reference",
    sourceUrl: "https://example.com/video",
    assetUrl: "https://cdn.example.com/motion.mp4",
    previewUrl: "https://cdn.example.com/poster.jpg",
    captureContext: {
      method: "extension_video",
      pageTitle: "Motion source",
      pageUrl: "https://example.com/video",
      videoUrl: "https://cdn.example.com/motion.mp4",
    },
  });
  assert(video.item.type === "video", "Video capture must stay video.");
  assert(video.item.previewUrl.includes("poster"), "Video capture must preserve poster preview.");

  const snapshot = await saveSnapshotFile();
  assert(snapshot.item.type === "image", "Snapshot must become an image object.");
  assert(snapshot.item.captureContext.method === "extension_snapshot", "Snapshot method must be preserved.");
  assert(snapshot.item.previewUrl?.startsWith("data:image/png"), "Small snapshot should keep an inline preview.");

  const queue = await expectStatus("GET /captures", requestJson("GET", "/api/vault/captures"), 200);
  const items = queue.body.items.map(row => row.item);
  assert(items.length === 5, `Expected 5 saved smoke objects, found ${items.length}.`);
  assert(items[0].title === snapshot.item.title, "Newest saved object must be first in the import queue.");
  assert(items.every(item => item.collectionIds.includes("all")), "Every quick capture must include Vault Library.");
  assert(items.every(item => item.captureContext?.method), "Every capture must preserve capture method.");

  console.log("A+ Vault alpha smoke passed.");
  console.log(`Checked local API: http://127.0.0.1:${PORT}`);
  console.log("Flows: image, link, selected text, video, snapshot file.");
} finally {
  server.kill();
  await rm(tempDir, { recursive: true, force: true });
}

async function saveCapture(label, body) {
  const response = await expectStatus(label, requestJson("POST", "/api/vault/capture", {
    headers: { Authorization: `Bearer ${TOKEN}` },
    body,
  }), 200);
  assert(response.body.success, `${label} must return success.`);
  assert(response.body.item?.id, `${label} must return a saved item.`);
  return response.body;
}

async function saveSnapshotFile() {
  const payload = {
    type: "image",
    title: "Snapshot smoke reference",
    sourceUrl: "https://example.com/snapshot",
    captureContext: {
      method: "extension_snapshot",
      pageTitle: "Snapshot source",
      pageUrl: "https://example.com/snapshot",
    },
  };
  const boundary = `----aplus-vault-${Date.now()}`;
  const pngBytes = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n${JSON.stringify(payload)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="snapshot.png"\r\nContent-Type: image/png\r\n\r\n`),
    pngBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await expectStatus("snapshot file capture", requestRaw("POST", "/api/vault/capture-file", {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length,
    },
    body,
  }), 200);
  assert(response.body.success, "Snapshot file capture must return success.");
  return response.body;
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const response = await requestJson("GET", "/api/vault/health");
      if (response.status === 200) return;
    } catch (_) {}
    await delay(100);
  }
  throw new Error(`Local server did not start.\n${serverOutput}`);
}

async function expectStatus(label, promise, status) {
  const response = await promise;
  assert(response.status === status, `${label} expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
  return response;
}

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
    const req = http.request({
      host: "127.0.0.1",
      port: PORT,
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
