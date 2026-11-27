import { createClient } from "npm:@supabase/supabase-js@2";
import { assertPublicAddress, assertPublicUrl } from "../_shared/event-page.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";

/**
 * Event scout: store one official event poster in our own storage.
 *
 * Called only by the "Apply event scout batches" workflow (.github/scripts/event-scout-covers.mjs)
 * with { ticket, url }. There is no JWT (verify_jwt = false): the ticket comes from
 * public.scout_cover_ticket(), which only the event_scout database role may call, lives 20 minutes
 * and is spent one use per picture (public.scout_cover_spend). Nothing else is accepted.
 *
 * The picture must be a public https JPEG / PNG / WebP of at most 8 MB. It is saved as
 * project-media/anthem/<team account>/events/scout-<hash>.<ext> — the only folder
 * anthem.event_image_ok accepts for that account — and the answer carries its URL and size.
 */
const BUCKET = "project-media";
/** Team account that owns scout events (same id as in public.scout_event_publish). */
const OWNER = "82039b6d-cdf4-4c46-958a-d770d849382c";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/** Type from the first bytes: a server's Content-Type is not trusted. */
function sniff(b: Uint8Array): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 24 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG") return "image/png";
  if (b.length > 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** [width, height] in pixels, or null when the header cannot be read. */
function size(b: Uint8Array, type: string): [number, number] | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (type === "image/png") return [v.getUint32(16), v.getUint32(20)];
  if (type === "image/webp") {
    const kind = ascii(b, 12, 16);
    const u24 = (at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
    if (kind === "VP8X") return [1 + u24(24), 1 + u24(27)];
    if (kind === "VP8 ") return [v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff];
    if (kind === "VP8L") {
      const n = v.getUint32(21, true);
      return [1 + (n & 0x3fff), 1 + ((n >>> 14) & 0x3fff)];
    }
    return null;
  }
  // JPEG: walk the segments to the first start-of-frame marker
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [v.getUint16(i + 7), v.getUint16(i + 5)];
    }
    i += 2 + v.getUint16(i + 2);
  }
  return null;
}

/** Downloads the picture; every hop must be a public https address (same guard as event-extract). */
async function download(start: string): Promise<Uint8Array> {
  let raw = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = assertPublicUrl(raw);
    if (url.protocol !== "https:") throw new Error("https only");
    await assertPublicAddress(url);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      await res.body?.cancel();
      if (!next) throw new Error("redirect without a target");
      raw = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`source answered ${res.status}`);
    }
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
      await res.body?.cancel();
      throw new Error("picture is larger than 8 MB");
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) throw new Error("picture is empty or larger than 8 MB");
    return bytes;
  }
  throw new Error("too many redirects");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { ticket?: unknown; url?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const ticket = typeof body.ticket === "string" ? body.ticket : "";
  const source = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^[0-9a-f]{64}$/.test(ticket) || !source || source.length > 2000) return json({ error: "bad_request" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, supabaseSecretKey());
  const { data: allowed, error: ticketError } = await admin.rpc("scout_cover_spend", { _token: ticket });
  if (ticketError || allowed !== true) return json({ error: "unauthorized" }, 401);

  let bytes: Uint8Array;
  try {
    bytes = await download(source);
  } catch (err) {
    return json({ error: "download_failed", detail: err instanceof Error ? err.message : "" }, 422);
  }
  const type = sniff(bytes);
  if (!type) return json({ error: "not_an_image", detail: "JPEG, PNG or WebP only" }, 422);
  const dims = size(bytes, type);
  if (!dims || !(dims[0] >= 1 && dims[0] <= 32767 && dims[1] >= 1 && dims[1] <= 32767)) {
    return json({ error: "unreadable_size" }, 422);
  }

  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = [...digest.subarray(0, 8)].map((x) => x.toString(16).padStart(2, "0")).join("");
  const path = `anthem/${OWNER}/events/scout-${hash}.${EXT[type]}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: true, // the name is a hash of the picture: writing it again changes nothing
  });
  if (uploadError) return json({ error: "upload_failed" }, 500);

  return json({
    cover_url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
    cover_width: dims[0],
    cover_height: dims[1],
  });
});
