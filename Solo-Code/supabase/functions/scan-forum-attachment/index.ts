import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { virusTotalScanFile } from "../_shared/virustotal.ts";

const BodySchema = z.object({ attachment_id: z.string().uuid() });

const STAGING_BUCKET = "forum-attachments";
const PUBLIC_BUCKET = "project-media";

const ALLOWED_EXT = new Set([
  "png", "jpg", "jpeg", "webp", "gif",
  "mp4", "webm", "mov",
  "pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "ttf", "otf", "woff", "woff2",
]);

const DANGEROUS_EXT = new Set([
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

function kindFromExt(ext: string): "image" | "video" | "file" {
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return "file";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersForRequest(req) });
  }
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(req, { error: "unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json(req, { error: "invalid_body" }, 400);

    const admin = createClient(supabaseUrl, service);
    const { data: row, error: rowErr } = await admin
      .schema("anthem")
      .from("forum_attachments")
      .select("*")
      .eq("id", parsed.data.attachment_id)
      .maybeSingle();

    if (rowErr || !row) return json(req, { error: "not_found" }, 404);
    if (row.author_id !== userData.user.id) return json(req, { error: "forbidden" }, 403);

    if (row.scan_status === "clean" && row.public_url) {
      return json(req, {
        id: row.id,
        scan_status: "clean",
        public_url: row.public_url,
        kind: row.kind,
      });
    }

    const path = row.storage_path as string | null;
    if (!path?.trim()) {
      await admin.schema("anthem").from("forum_attachments").update({
        scan_status: "blocked",
        scan_reason: "ไม่พบไฟล์",
        scanned_at: new Date().toISOString(),
      }).eq("id", row.id);
      return json(req, { error: "blocked", reason: "ไม่พบไฟล์" }, 400);
    }

    const ext = fileExt(row.file_name || path);
    if (!ext || DANGEROUS_EXT.has(ext) || !ALLOWED_EXT.has(ext)) {
      await admin.storage.from(STAGING_BUCKET).remove([path]);
      await admin.schema("anthem").from("forum_attachments").update({
        scan_status: "blocked",
        scan_reason: "ประเภทไฟล์นี้ไม่รองรับ",
        scanned_at: new Date().toISOString(),
        storage_path: null,
      }).eq("id", row.id);
      return json(req, { error: "blocked", reason: "ประเภทไฟล์นี้ไม่รองรับ" }, 400);
    }

    if (typeof row.size_bytes === "number" && row.size_bytes > 25 * 1024 * 1024) {
      await admin.storage.from(STAGING_BUCKET).remove([path]);
      await admin.schema("anthem").from("forum_attachments").update({
        scan_status: "blocked",
        scan_reason: "ไฟล์ใหญ่เกินกำหนด",
        scanned_at: new Date().toISOString(),
        storage_path: null,
      }).eq("id", row.id);
      return json(req, { error: "blocked", reason: "ไฟล์ใหญ่เกินกำหนด" }, 400);
    }

    const { data: blob, error: dlErr } = await admin.storage.from(STAGING_BUCKET).download(path);
    if (dlErr || !blob) {
      await admin.schema("anthem").from("forum_attachments").update({
        scan_status: "blocked",
        scan_reason: "ไม่พบไฟล์ในระบบ",
        scanned_at: new Date().toISOString(),
      }).eq("id", row.id);
      return json(req, { error: "blocked", reason: "ไม่พบไฟล์ในระบบ" }, 400);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const vt = await virusTotalScanFile(bytes);
    if (!vt.clean) {
      await admin.storage.from(STAGING_BUCKET).remove([path]);
      await admin.schema("anthem").from("forum_attachments").update({
        scan_status: "blocked",
        scan_reason: vt.reason ?? "ไฟล์ไม่ผ่านการสแกน",
        scanned_at: new Date().toISOString(),
        storage_path: null,
      }).eq("id", row.id);
      return json(req, { error: "blocked", reason: vt.reason ?? "ไฟล์ไม่ผ่านการสแกน" }, 400);
    }

    const safeName = String(row.file_name || `file.${ext}`).replace(/[^\w.\-()]/g, "_").slice(0, 120);
    const publicPath = `anthem/forum/${row.id}/${safeName}`;
    const { error: upErr } = await admin.storage.from(PUBLIC_BUCKET).upload(publicPath, bytes, {
      contentType: row.mime_type || "application/octet-stream",
      upsert: true,
    });
    if (upErr) {
      return json(req, { error: "publish_failed", reason: upErr.message }, 500);
    }

    const { data: pub } = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath);
    await admin.storage.from(STAGING_BUCKET).remove([path]);

    const kind = kindFromExt(ext);
    const { data: updated, error: updErr } = await admin
      .schema("anthem")
      .from("forum_attachments")
      .update({
        kind,
        scan_status: "clean",
        scan_reason: null,
        scanned_at: new Date().toISOString(),
        public_url: pub.publicUrl,
        storage_path: publicPath,
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updErr) return json(req, { error: "update_failed", reason: updErr.message }, 500);

    return json(req, {
      id: updated.id,
      scan_status: "clean",
      public_url: updated.public_url,
      kind: updated.kind,
      file_name: updated.file_name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "scan_failed";
    return json(req, { error: "scan_failed", reason: msg }, 500);
  }
});
