// Chat pictures are deleted 30 days after they were sent (new design: "รูปในแชทจะถูกลบอัตโนมัติหลัง 30 วัน"; the
// app already shows them as "รูปนี้หมดอายุแล้ว" then — Anthem-Code/src/redesign/chat/chatFormat.ts IMAGE_DAYS).
// Daily cron 03:30 Bangkok (supabase/manual/setup-chat-media-expire-cron.sql → anthem.run_chat_media_expire()).
//
// Image messages older than 30 days that still point at a file under anthem/chat/ get their file removed from
// bucket project-media (Storage API — SQL cannot delete storage objects), then attachment_url = NULL.
// File attachments (message_type 'file') and auto-reply pictures (anthem/chat-auto-reply/, shared by many
// messages) are never touched. A path that is not the message's own folder (anthem/chat/<its conversation>/<file>)
// is only cleared, its file is left alone ("skipped").
//
// POST + header x-internal-secret (= PUSH_DISPATCH_SECRET; Vault push_dispatch_secret):
//   {}                 remove + clear, at most 1000 pictures a run (the rest the next day)
//   { dry_run: true }  removes nothing; returns the counts
// Answer: { found, removed, cleared, skipped, dry_run } (+ failed when a batch failed; those rows retry tomorrow)
//
// Deploy (owner, like weekly-digest): Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor ·
//   name chat-media-expire · turn OFF "Verify JWT" (the cron sends no user token; the secret guards it) ·
//   paste this whole file as index.ts (it imports nothing from _shared) · Deploy.
//   CLI instead: supabase functions deploy chat-media-expire (config.toml sets verify_jwt = false).
//   No new secret: PUSH_DISPATCH_SECRET is already set for send-push / weekly-digest.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "project-media";
const PREFIX = "anthem/chat/";
const IMAGE_DAYS = 30;
const DAY_MS = 86_400_000;
/** Storage remove: at most this many paths per call. */
const REMOVE_CHUNK = 100;
/** Pictures handled per run; older ones wait for the next day. */
const RUN_CAP = 1000;

const SECRET = Deno.env.get("PUSH_DISPATCH_SECRET")?.trim() ?? "";

type Row = { id: string; conversation_id: string; attachment_url: string | null };

/** Same as _shared/supabase-keys.ts supabaseSecretKey(), inlined so the Dashboard editor takes this one file. */
function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "") as Record<string, unknown> | null;
    if (typeof keys?.default === "string" && keys.default) return keys.default;
  } catch {
    /* not set or not JSON — fall back */
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The picture's own file (anthem/chat/<its conversation>/<one file name>), else null. */
function ownPath(r: Row): string | null {
  const p = r.attachment_url ?? "";
  const dir = `${PREFIX}${r.conversation_id}/`;
  if (!p.startsWith(dir)) return null;
  const name = p.slice(dir.length);
  return name && !name.includes("/") && !name.includes("..") ? p : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SECRET) {
    console.error("[chat-media-expire] PUSH_DISPATCH_SECRET not configured");
    return json({ error: "not_configured" }, 500);
  }
  const header = req.headers.get("x-internal-secret")?.trim() ?? "";
  if (!header || !sameText(header, SECRET)) return json({ error: "unauthorized" }, 401);

  let dryRun = false;
  try {
    const raw = await req.text();
    const body = raw.trim() ? (JSON.parse(raw) as { dry_run?: unknown } | null) : null;
    dryRun = body?.dry_run === true;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), { auth: { persistSession: false } });
  // A fresh builder per call: supabase-js builders keep their URL and must not be reused.
  const messages = () => admin.schema("shared").from("messages");
  const cutoff = new Date(Date.now() - IMAGE_DAYS * DAY_MS).toISOString();

  const { data, error } = await messages()
    .select("id, conversation_id, attachment_url, content")
    .eq("message_type", "image")
    .like("attachment_url", `${PREFIX}%`)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(RUN_CAP);
  if (error) {
    console.error("[chat-media-expire] load", error.message);
    return json({ error: "load_failed" }, 500);
  }
  // Only pictures of 1:1 chats (the new design's rule). Studio rooms keep theirs: payment slips of studio
  // documents are sent there as pictures ("สลิปโอนเงิน …") and are business records.
  const loaded = (data ?? []) as Array<Row & { content: string | null }>;
  const convIds = [...new Set(loaded.map((r) => r.conversation_id))];
  const kinds = new Map<string, boolean>();
  if (convIds.length) {
    const { data: convs, error: convErr } = await admin
      .schema("shared")
      .from("conversations")
      .select("id, kind, conversation_type")
      .in("id", convIds);
    if (convErr) {
      console.error("[chat-media-expire] rooms", convErr.message);
      return json({ error: "load_failed" }, 500);
    }
    for (const c of (convs ?? []) as Array<{ id: string; kind: string | null; conversation_type: string | null }>) {
      kinds.set(c.id, (c.conversation_type ?? "direct") === "direct" && !["studio", "group"].includes(c.kind ?? ""));
    }
  }
  const rows: Row[] = loaded.filter((r) => kinds.get(r.conversation_id) && !(r.content ?? "").startsWith("สลิปโอนเงิน"));
  const skipped = rows.filter((r) => !ownPath(r)).length;
  if (dryRun) return json({ found: rows.length, removed: 0, cleared: 0, skipped, kept: loaded.length - rows.length, dry_run: true });

  let removed = 0;
  let cleared = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += REMOVE_CHUNK) {
    const chunk = rows.slice(i, i + REMOVE_CHUNK);
    const paths = [...new Set(chunk.map(ownPath).filter((p): p is string => !!p))];
    if (paths.length) {
      // Files already gone are not an error; they just are not in the answer.
      const { data: gone, error: rmErr } = await admin.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        // Rows keep their path, so tomorrow's run tries them again.
        console.error("[chat-media-expire] remove", rmErr.message);
        failed += chunk.length;
        continue;
      }
      removed += gone?.length ?? 0;
    }
    const { data: done, error: upErr } = await messages()
      .update({ attachment_url: null })
      .in("id", chunk.map((r) => r.id))
      .eq("message_type", "image")
      .select("id");
    if (upErr) {
      console.error("[chat-media-expire] clear", upErr.message);
      failed += chunk.length;
      continue;
    }
    cleared += done?.length ?? 0;
  }

  const result = { found: rows.length, removed, cleared, skipped, dry_run: false, ...(failed ? { failed } : {}) };
  console.log("[chat-media-expire]", JSON.stringify(result));
  return json(result);
});
