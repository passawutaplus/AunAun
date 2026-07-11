import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemDb } from "../_shared/ecosystem-db.ts";
import { resolveAssetStorage, type ScanAsset } from "../_shared/project-asset-notify.ts";

const BodySchema = z.object({
  project_id: z.string().uuid(),
  asset_id: z.string().uuid(),
});

const SIGNED_TTL_SEC = 600;

const ALLOWED_EXT = new Set([
  "pdf", "zip", "png", "jpg", "jpeg", "webp", "ttf", "otf", "woff", "woff2",
]);

const URL_SHORTENER_HOSTS = new Set([
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy",
  "lnkd.in", "s.id", "v.gd", "clck.ru", "adf.ly", "bc.vc",
]);

const DANGEROUS_PATH_EXT = new Set([
  "exe", "msi", "bat", "cmd", "scr", "com", "apk", "dmg", "vbs", "ps1", "jar", "hta",
]);

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

function fileExt(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  return i < 0 ? "" : base.slice(i + 1).toLowerCase();
}

function isValidPath(p?: string): boolean {
  if (!p?.trim()) return false;
  return p.includes("/assets/");
}

function basicFileStillOk(asset: ScanAsset): { ok: boolean; reason: string | null } {
  const name = asset.file_name ?? asset.storage_path ?? "";
  const e = fileExt(name);
  if (!e || !ALLOWED_EXT.has(e)) {
    return { ok: false, reason: "ประเภทไฟล์นี้ไม่รองรับ" };
  }
  if (typeof asset.size_bytes === "number" && asset.size_bytes > 25 * 1024 * 1024) {
    return { ok: false, reason: "ไฟล์ใหญ่เกินกำหนด" };
  }
  if (!isValidPath(asset.storage_path)) {
    return { ok: false, reason: "ที่เก็บไฟล์ไม่ถูกต้อง" };
  }
  return { ok: true, reason: null };
}

function hostMatchesShortener(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (URL_SHORTENER_HOSTS.has(host)) return true;
  for (const short of URL_SHORTENER_HOSTS) {
    if (host.endsWith(`.${short}`)) return true;
  }
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;
  if (host.includes(":") || (host.startsWith("[") && host.endsWith("]"))) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return true;
  return false;
}

/** Click-time link re-check — must stay aligned with Anthem client evaluateExternalLinkUrl. */
function evaluateLinkUrl(raw?: string | null): { ok: true; url: string } | { ok: false; reason: string } {
  if (!raw?.trim()) return { ok: false, reason: "ไม่พบลิงก์" };
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "URL ไม่ถูกต้อง" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "รองรับเฉพาะลิงก์ http/https ที่ปลอดภัย" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "ไม่รองรับลิงก์ที่มีชื่อผู้ใช้หรือรหัสผ่านใน URL" };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, reason: "ไม่รองรับลิงก์ localhost, IP ภายใน หรือที่อยู่ IP โดยตรง" };
  }
  if (hostMatchesShortener(parsed.hostname)) {
    return { ok: false, reason: "ไม่รองรับลิงก์ย่อ เพราะซ่อนปลายทางจริงได้" };
  }
  const base = parsed.pathname.split("/").pop() ?? "";
  const clean = base.split("?")[0]?.split("#")[0] ?? "";
  const e = fileExt(clean);
  if (e && DANGEROUS_PATH_EXT.has(e)) {
    return { ok: false, reason: "ลิงก์ชี้ไปไฟล์ที่อาจเป็นอันตราย" };
  }
  return { ok: true, url: parsed.toString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: project, error: loadErr } = await anthemDb(admin)
    .from("projects")
    .select("id, owner_id, status, project_assets")
    .eq("id", body.project_id)
    .maybeSingle();

  if (loadErr || !project) return json(req, { error: "not_found" }, 404);

  const assets = Array.isArray(project.project_assets) ? (project.project_assets as ScanAsset[]) : [];
  const asset = assets.find((a) => a.id === body.asset_id);
  if (!asset) return json(req, { error: "asset_not_available" }, 404);

  if (asset.scan_status === "pending") {
    return json(req, { error: "pending_scan", reason: "กำลังตรวจสอบความปลอดภัย" }, 403);
  }
  if (asset.scan_status !== "clean") {
    return json(req, {
      error: "blocked",
      reason: asset.scan_reason ?? "ไม่ผ่านการตรวจสอบความปลอดภัย",
    }, 403);
  }

  const isPublished = project.status === "Published";
  if (!isPublished) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
    const uid = claims.claims.sub as string;

    if (project.owner_id !== uid) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json(req, { error: "forbidden" }, 403);
    }
  }

  // Link: re-validate URL rules at click time, then return the safe URL.
  if (asset.kind === "link") {
    const link = evaluateLinkUrl(asset.url);
    if (!link.ok) {
      return json(req, { error: "blocked", reason: link.reason }, 403);
    }
    return json(req, { url: link.url, expires_at: null, kind: "link" });
  }

  if (asset.kind !== "file" || !asset.storage_path) {
    return json(req, { error: "asset_not_available" }, 404);
  }

  // File: re-run basic rules even if previously marked clean.
  const basic = basicFileStillOk(asset);
  if (!basic.ok) {
    return json(req, { error: "blocked", reason: basic.reason }, 403);
  }

  const { bucket, path } = resolveAssetStorage(asset.storage_path);
  const downloadName = asset.file_name ?? "download";
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL_SEC, { download: downloadName });

  if (signErr || !signed?.signedUrl) {
    return json(req, { error: "sign_failed" }, 500);
  }

  const expiresAt = new Date(Date.now() + SIGNED_TTL_SEC * 1000).toISOString();
  return json(req, { url: signed.signedUrl, expires_at: expiresAt, kind: "file" });
});
