/**
 * One image for a push notification that recommends several works — Android shows a single
 * big picture, so 2–3 project covers are composed side by side here (2:1, same as the
 * notification's big-picture area).
 *
 * GET /api/push-collage?ids=<uuid>,<uuid>[,<uuid>]
 *
 * Only Published projects are read, with the publishable key (RLS applies as for any visitor).
 * The result is CDN-cached for a week: the same ids always produce the same image.
 */
import sharp from "sharp";

const WIDTH = 1024;
const HEIGHT = 512;
const GAP = 6;
const BACKGROUND = { r: 29, g: 30, b: 33, alpha: 1 };
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchCovers(baseUrl, key, ids) {
  const params = new URLSearchParams({
    select: "id,cover_url",
    status: "eq.Published",
    id: `in.(${ids.join(",")})`,
  });
  const res = await fetch(`${baseUrl}/rest/v1/projects?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "anthem" },
  });
  if (!res.ok) return [];
  const rows = await res.json();
  const byId = new Map(rows.map((r) => [r.id, r.cover_url]));
  // Keep the caller's order (the first id is the top pick).
  return ids.map((id) => byId.get(id)).filter((url) => typeof url === "string" && url.startsWith("https://"));
}

async function loadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`cover ${res.status}`);
  const length = Number(res.headers.get("content-length") || 0);
  if (length > MAX_SOURCE_BYTES) throw new Error("cover too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_SOURCE_BYTES) throw new Error("cover too large");
  return buf;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ids = String(req.query?.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID.test(s))
    .slice(0, 3);
  if (ids.length < 1) return res.status(400).json({ error: "ids_required" });

  const baseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!baseUrl || !key) return res.status(503).json({ error: "not_configured" });

  try {
    const urls = await fetchCovers(baseUrl, key, ids);
    if (!urls.length) return res.status(404).json({ error: "not_found" });

    const sources = await Promise.all(urls.map((u) => loadImage(u).catch(() => null)));
    const images = sources.filter(Boolean);
    if (!images.length) return res.status(404).json({ error: "not_found" });

    const count = images.length;
    const tileW = Math.floor((WIDTH - GAP * (count - 1)) / count);
    const tiles = await Promise.all(
      images.map((buf) =>
        sharp(buf, { failOn: "none" })
          .rotate()
          .resize(tileW, HEIGHT, { fit: "cover", position: "attention" })
          .toBuffer(),
      ),
    );

    const out = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: BACKGROUND } })
      .composite(tiles.map((input, i) => ({ input, left: i * (tileW + GAP), top: 0 })))
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    return res.status(200).send(out);
  } catch {
    return res.status(502).json({ error: "collage_failed" });
  }
}
