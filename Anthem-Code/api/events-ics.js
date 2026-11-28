/**
 * GET /events.ics (rewrite in vercel.json) → published SAMECOR events as an iCalendar feed that Google
 * Calendar can subscribe to. Top-level events only (not the venues of a multi-venue event), from 90 days ago on.
 * Uses the publishable key, so RLS applies exactly as for an anonymous browser.
 */
import { buildEventsIcs } from "./_events-ics.js";

const SELECT = "id, slug, title, category, starts_on, ends_on, time_note, location_name, location_note, organizer_name, updated_at";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("method not allowed");
  }
  const baseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!baseUrl || !key) return res.status(503).send("not configured");

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    select: SELECT,
    status: "eq.published",
    parent_id: "is.null",
    or: `(ends_on.gte.${since},and(ends_on.is.null,starts_on.gte.${since}))`,
    order: "starts_on.asc",
    limit: "1000",
  });
  try {
    const upstream = await fetch(`${baseUrl}/rest/v1/events?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "anthem" },
    });
    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).send("upstream error");
    }
    const rows = await upstream.json();
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="samecor-events.ics"');
    // Calendar apps poll every few hours; 1 h at the CDN, stale for a day while refreshing.
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(buildEventsIcs(rows));
  } catch (err) {
    console.error("[events-ics]", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).send("upstream error");
  }
}
