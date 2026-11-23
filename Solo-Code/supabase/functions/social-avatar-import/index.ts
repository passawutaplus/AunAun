import { supabaseSecretKey, supabasePublishableKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors.ts";

/**
 * Facebook profile pictures (platform-lookaside.fbsbx.com / *.fbcdn.net) are signed URLs that stop working after
 * some weeks. The site calls this once per visit for Facebook accounts whose picture is still such a URL
 * (src/lib/socialAvatar.ts): it copies the picture into our own storage, at the same path a normal avatar upload
 * uses, so account deletion removes it too. A picture Facebook no longer serves is cleared (the initials show).
 *
 * Only Facebook hosts are fetched: user_metadata and avatar_url are editable by the user, so any other URL is ignored.
 */
const BUCKET = "project-media";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

/** Same host rule as isExpiringSocialAvatar in Anthem-Code/src/lib/socialAvatar.ts. */
function isFacebookImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === "fbsbx.com" ||
        host.endsWith(".fbsbx.com") ||
        host === "fbcdn.net" ||
        host.endsWith(".fbcdn.net"))
    );
  } catch {
    return false;
  }
}

type Fetched = { ok: true; bytes: Uint8Array; type: string } | { ok: false; gone: boolean };

/** Follows redirects by hand so every hop stays on a Facebook host. */
async function fetchFacebookImage(start: string): Promise<Fetched> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isFacebookImageUrl(url)) return { ok: false, gone: false };
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8_000) });
    } catch {
      return { ok: false, gone: false };
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      await res.body?.cancel();
      if (!next) return { ok: false, gone: false };
      url = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      // Expired signatures answer 403; deleted pictures 404/410. Anything else may be temporary.
      return { ok: false, gone: [400, 403, 404, 410].includes(res.status) };
    }
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_TYPES[type] || Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
      await res.body?.cancel();
      return { ok: false, gone: false };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return { ok: false, gone: false };
    return { ok: true, bytes, type };
  }
  return { ok: false, gone: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);
  const userClient = createClient(supabaseUrl, supabasePublishableKey(), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(
    authHeader.slice("Bearer ".length),
  );
  const userId = claims?.claims?.sub as string | undefined;
  if (authErr || !userId) return json(req, { error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, supabaseSecretKey());
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    console.error("[social-avatar-import] profile", profileErr.message);
    return json(req, { error: "load_failed" }, 500);
  }
  const current = profile?.avatar_url as string | null | undefined;
  if (!isFacebookImageUrl(current)) return json(req, { status: "skipped" });

  // The newest Facebook sign-in carries a freshly signed URL, so try those before the stored one.
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const user = userData?.user;
  const candidates = [
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
    ...(user?.identities ?? [])
      .filter((i) => i.provider === "facebook")
      .flatMap((i) => [i.identity_data?.avatar_url, i.identity_data?.picture]),
    current,
  ].filter(isFacebookImageUrl);

  let allGone = true;
  for (const candidate of [...new Set(candidates)]) {
    const fetched = await fetchFacebookImage(candidate);
    if (!fetched.ok) {
      allGone &&= fetched.gone;
      continue;
    }
    const path = `anthem/${userId}/avatar/${crypto.randomUUID()}.${IMAGE_TYPES[fetched.type]}`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, fetched.bytes, {
      contentType: fetched.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (upErr) {
      console.error("[social-avatar-import] upload", upErr.message);
      return json(req, { error: "upload_failed" }, 500);
    }
    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    // Only replace the Facebook URL; if the person changed their picture meanwhile, keep theirs.
    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("avatar_url", current)
      .select("id");
    if (updErr || !updated?.length) {
      await admin.storage.from(BUCKET).remove([path]);
      if (updErr) console.error("[social-avatar-import] update", updErr.message);
      return json(
        req,
        { status: updErr ? "update_failed" : "changed_meanwhile" },
        updErr ? 500 : 200,
      );
    }
    return json(req, { status: "imported", avatar_url: publicUrl });
  }

  if (allGone) {
    await admin
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("avatar_url", current);
    return json(req, { status: "cleared" });
  }
  return json(req, { status: "retry_later" });
});
