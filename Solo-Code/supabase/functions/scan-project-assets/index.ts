import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import {
  deleteBlockedAssetFile,
  notifyProjectAssetScan,
  resolveAssetStorage,
  type ScanAsset,
} from "../_shared/project-asset-notify.ts";
import { anthemDb } from "../_shared/ecosystem-db.ts";
import { virusTotalScanFile, virusTotalScanUrl } from "../_shared/virustotal.ts";

const BodySchema = z.object({ project_id: z.string().uuid() });

const ALLOWED_EXT = new Set([
  "pdf", "zip", "png", "jpg", "jpeg", "webp", "ttf", "otf", "woff", "woff2",
]);

const BLOCKED_HOST = [/^localhost$/i, /^127\.\d+\.\d+\.\d+$/];

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

function safeHttpUrl(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch { /* invalid */ }
  return undefined;
}

function ext(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  return i < 0 ? "" : base.slice(i + 1).toLowerCase();
}

function isValidPath(p?: string): boolean {
  if (!p?.trim()) return false;
  return p.includes("/assets/");
}

async function basicFileCheck(asset: ScanAsset): Promise<{ ok: boolean; reason: string | null }> {
  const name = asset.file_name ?? asset.storage_path ?? "";
  const e = ext(name);
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

async function deepScanFile(
  admin: ReturnType<typeof createClient>,
  asset: ScanAsset,
): Promise<ScanAsset> {
  const basic = await basicFileCheck(asset);
  if (!basic.ok) {
    await deleteBlockedAssetFile(admin, asset);
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: basic.reason,
      scanned_at: new Date().toISOString(),
    };
  }

  const { bucket, path } = resolveAssetStorage(asset.storage_path!);
  const { data: blob, error } = await admin.storage.from(bucket).download(path);
  if (error || !blob) {
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: "ไม่พบไฟล์ในระบบ",
      scanned_at: new Date().toISOString(),
    };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const vt = await virusTotalScanFile(bytes);
  if (!vt.clean) {
    await deleteBlockedAssetFile(admin, asset);
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: vt.reason ?? "ไฟล์ไม่ผ่านการสแกน",
      scanned_at: new Date().toISOString(),
    };
  }

  return {
    ...asset,
    scan_status: "clean",
    scan_reason: null,
    scanned_at: new Date().toISOString(),
  };
}

async function deepScanLink(asset: ScanAsset): Promise<ScanAsset> {
  const safe = safeHttpUrl(asset.url);
  if (!safe) {
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: "รองรับเฉพาะลิงก์ http/https ที่ปลอดภัย",
      scanned_at: new Date().toISOString(),
    };
  }

  let host = "";
  try {
    host = new URL(safe).hostname;
  } catch {
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: "URL ไม่ถูกต้อง",
      scanned_at: new Date().toISOString(),
    };
  }

  if (BLOCKED_HOST.some((p) => p.test(host))) {
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: "ไม่รองรับลิงก์ localhost หรือ IP ภายใน",
      scanned_at: new Date().toISOString(),
    };
  }

  const vt = await virusTotalScanUrl(safe);
  if (!vt.clean) {
    return {
      ...asset,
      scan_status: "blocked",
      scan_reason: vt.reason ?? "ลิงก์ไม่ผ่านการสแกน",
      scanned_at: new Date().toISOString(),
    };
  }

  return {
    ...asset,
    scan_status: "clean",
    scan_reason: null,
    scanned_at: new Date().toISOString(),
  };
}

async function deepScan(
  admin: ReturnType<typeof createClient>,
  asset: ScanAsset,
): Promise<ScanAsset> {
  if (asset.scan_status !== "pending") return asset;
  if (asset.kind === "link" && asset.url) return deepScanLink(asset);
  if (asset.kind === "file") return deepScanFile(admin, asset);
  return {
    ...asset,
    scan_status: "blocked",
    scan_reason: "ข้อมูลไม่ครบ",
    scanned_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const uid = claims.claims.sub as string;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const projects = anthemDb(admin);
  const { data: project, error: loadErr } = await projects
    .from("projects")
    .select("id, owner_id, project_assets")
    .eq("id", body.project_id)
    .maybeSingle();

  if (loadErr || !project) return json(req, { error: "not_found" }, 404);
  if (project.owner_id !== uid) {
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json(req, { error: "forbidden" }, 403);
  }

  const raw = Array.isArray(project.project_assets) ? project.project_assets : [];
  const previous = new Map(
    (raw as ScanAsset[]).map((a) => [a.id ?? "", a.scan_status]),
  );

  const scanned: ScanAsset[] = [];
  for (const item of raw as ScanAsset[]) {
    const next = await deepScan(admin, item);
    scanned.push(next);
    const prev = previous.get(item.id ?? "") ?? "pending";
    await notifyProjectAssetScan(admin, {
      ownerId: project.owner_id,
      projectId: body.project_id,
      asset: next,
      previousStatus: prev,
    });
  }

  const cleanLinks = scanned
    .filter((a) => a.kind === "link" && a.scan_status === "clean" && a.url)
    .map((a) => ({ label: a.label, url: a.url! }));

  const { error: updErr } = await projects
    .from("projects")
    .update({ project_assets: scanned, external_links: cleanLinks })
    .eq("id", body.project_id);

  if (updErr) return json(req, { error: "update_failed" }, 500);

  return json(req, {
    project_assets: scanned,
    blocked_count: scanned.filter((a) => a.scan_status === "blocked").length,
  });
});
