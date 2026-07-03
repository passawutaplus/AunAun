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

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

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
  if (!asset || asset.kind !== "file" || asset.scan_status !== "clean" || !asset.storage_path) {
    return json(req, { error: "asset_not_available" }, 404);
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

  const { bucket, path } = resolveAssetStorage(asset.storage_path);
  const downloadName = asset.file_name ?? "download";
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_TTL_SEC, { download: downloadName });

  if (signErr || !signed?.signedUrl) {
    return json(req, { error: "sign_failed" }, 500);
  }

  const expiresAt = new Date(Date.now() + SIGNED_TTL_SEC * 1000).toISOString();
  return json(req, { url: signed.signedUrl, expires_at: expiresAt });
});
