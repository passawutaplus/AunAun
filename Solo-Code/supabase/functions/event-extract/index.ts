import { corsHeadersForRequest } from "../_shared/cors.ts";
import { requireAdminUser } from "../_shared/admin-auth.ts";
import {
  defaultFastModel,
  geminiGenerateWithFunction,
  getGeminiApiKey,
} from "../_shared/gemini.ts";
import {
  assertPublicUrl,
  eventJsonLd,
  metaContent,
  pageLinks,
  pageText,
  pickPageLink,
  type PageLink,
} from "../_shared/event-page.ts";

/**
 * Admin tool for curated Exhibition events: read one public event page and return a draft for the
 * team to check. Structured data (schema.org Event in JSON-LD) is preferred over page text.
 * Rules: nothing is guessed (missing = null, shown as "not specified"), the description is a short
 * summary in our own words (no copying), and no images are taken from the source.
 */
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;
const CATEGORIES = [
  "exhibition",
  "workshop",
  "art_fair",
  "talk_forum",
  "open_call",
  "other",
] as const;

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function fetchPage(start: URL): Promise<{ html: string; finalUrl: string }> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "SamecorEventCheck/1.0 (+https://samecor.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) throw new Error("เปิดหน้านี้ไม่ได้");
        url = assertPublicUrl(new URL(next, url).toString()); // every hop must stay public
        continue;
      }
      if (!res.ok) throw new Error(`เปิดหน้านี้ไม่ได้ (${res.status})`);
      if (!(res.headers.get("content-type") ?? "").includes("html"))
        throw new Error("ลิงก์นี้ไม่ใช่หน้าเว็บ");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("เปิดหน้านี้ไม่ได้");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
      const buf = new Uint8Array(Math.min(size, MAX_BYTES));
      let off = 0;
      for (const c of chunks) {
        buf.set(c.subarray(0, Math.max(0, buf.length - off)), off);
        off += c.length;
      }
      return { html: new TextDecoder().decode(buf), finalUrl: url.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("เปลี่ยนทางหลายครั้งเกินไป");
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", nullable: true },
    category: { type: "string", enum: [...CATEGORIES], nullable: true },
    starts_on: { type: "string", nullable: true, description: "YYYY-MM-DD" },
    ends_on: { type: "string", nullable: true, description: "YYYY-MM-DD" },
    time_note: {
      type: "string",
      nullable: true,
      description: "opening hours as written, e.g. 10:00–20:00 (closed Mon)",
    },
    location_name: { type: "string", nullable: true },
    location_note: { type: "string", nullable: true, description: "address or how to get there" },
    organizer_name: { type: "string", nullable: true },
    description: {
      type: "string",
      nullable: true,
      description: "Thai summary in your own words, 2–4 sentences",
    },
    fee_type: { type: "string", enum: ["free", "paid", "unspecified"] },
    fee_note: { type: "string", nullable: true },
    registration_url: {
      type: "string",
      nullable: true,
      description: "register / RSVP / apply link, copied exactly from LINKS",
    },
    ticket_url: {
      type: "string",
      nullable: true,
      description: "buy-ticket link, copied exactly from LINKS",
    },
    website_url: {
      type: "string",
      nullable: true,
      description: "official event page, copied exactly from LINKS",
    },
    sponsors: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, note: { type: "string", nullable: true } },
        required: ["name"],
      },
    },
    source_name: {
      type: "string",
      nullable: true,
      description: "who published this page, e.g. the gallery",
    },
    confidence: {
      type: "integer",
      description:
        "0–100: how sure the page describes one real upcoming event and the fields are right",
    },
    notes: {
      type: "array",
      items: { type: "string" },
      description: "Thai: anything unclear, inferred or missing",
    },
  },
  required: ["fee_type", "sponsors", "confidence", "notes"],
};

const PROMPT = `You extract ONE event (exhibition, workshop, art fair, talk, open call) from a web page for SAMECOR's team.
Rules:
- Use only what the page states. If a field is not stated, return null. Never guess, never fill defaults.
- fee_type: "free" only if the page says free/no charge; "paid" if a price is given (put it in fee_note); otherwise "unspecified".
- Sponsors: only organisations the page names as sponsors or supporters; otherwise an empty list.
- Dates as YYYY-MM-DD. If the year is missing, use the next occurrence after today and say so in notes.
- description: a short neutral summary in Thai in your own words. Do not copy sentences from the page.
- Links: choose ONLY from the LINKS list, copied exactly. Never write, shorten or complete a URL yourself.
  registration_url = the Register / RSVP / Apply / Sign up / ลงทะเบียน / สมัคร button (for an open call: the application form).
  ticket_url = the Get Tickets / Buy / Book / ซื้อบัตร button, when it differs from registration.
  If no such button is in LINKS, return null and say so in notes. Ignore social-media share links.
- If the page lists several events, pick the main one and say so in notes. If it is not an event page, confidence below 30.`;

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const auth = await requireAdminUser(req, "event-extract");
  if (!auth.ok) return json(req, { error: auth.error }, auth.status);

  let target: URL;
  try {
    const body = (await req.json()) as { url?: string };
    target = assertPublicUrl(String(body.url ?? "").trim());
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "ลิงก์ไม่ถูกต้อง" }, 400);
  }

  let page: { html: string; finalUrl: string };
  try {
    page = await fetchPage(target);
  } catch (e) {
    const msg = e instanceof Error && e.name !== "AbortError" ? e.message : "เปิดหน้านี้ไม่ทันเวลา";
    return json(req, { error: msg }, 422);
  }

  const ld = eventJsonLd(page.html);
  // Ticket links named in structured data (offers.url) count as page links too.
  const links: PageLink[] = pageLinks(page.html, page.finalUrl);
  for (const e of ld) {
    for (const o of [e.offers].flat()) {
      const u = (o as Record<string, unknown> | undefined)?.url;
      if (typeof u === "string") {
        try {
          const abs = new URL(u, page.finalUrl).toString();
          if (/^https?:/.test(abs) && !links.some((l) => l.url === abs))
            links.unshift({ url: abs, text: "schema.org offer" });
        } catch {
          /* not a URL */
        }
      }
    }
  }
  const context = [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `URL: ${page.finalUrl}`,
    `og:site_name: ${metaContent(page.html, "og:site_name") ?? "-"}`,
    `og:title: ${metaContent(page.html, "og:title") ?? "-"}`,
    `og:description: ${metaContent(page.html, "og:description") ?? "-"}`,
    ld.length
      ? `schema.org Event JSON-LD (most reliable):\n${JSON.stringify(ld).slice(0, 6000)}`
      : "No schema.org Event data.",
    `LINKS (the only URLs you may return):\n${links.map((l) => `- ${l.url} — ${l.text || "(no text)"}`).join("\n") || "(none)"}`,
    `Page text:\n${pageText(page.html)}`,
  ].join("\n\n");

  let raw: Record<string, unknown>;
  try {
    raw = await geminiGenerateWithFunction(getGeminiApiKey(), defaultFastModel(), {
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: context },
      ],
      functionName: "event_draft",
      description: "The event found on the page, with nulls for anything not stated.",
      functionSchema: SCHEMA,
      temperature: 0,
    });
  } catch (e) {
    console.error("[event-extract] gemini", e instanceof Error ? e.message : e);
    return json(req, { error: "AI อ่านหน้านี้ไม่สำเร็จ ลองใหม่อีกครั้ง" }, 502);
  }

  const starts = isoDate(raw.starts_on);
  let ends = isoDate(raw.ends_on);
  if (starts && ends && ends < starts) ends = null;
  const category = CATEGORIES.includes(raw.category as (typeof CATEGORIES)[number])
    ? raw.category
    : "other";
  const fee = ["free", "paid", "unspecified"].includes(String(raw.fee_type))
    ? String(raw.fee_type)
    : "unspecified";
  const sponsors = (Array.isArray(raw.sponsors) ? raw.sponsors : [])
    .map((s) => ({
      name: clip((s as Record<string, unknown>)?.name, 80),
      note: clip((s as Record<string, unknown>)?.note, 120),
    }))
    .filter((s) => s.name)
    .slice(0, 5);

  // A link the model returns that is not on the page is dropped and flagged for the team.
  const notes = (Array.isArray(raw.notes) ? raw.notes : [])
    .map((n) => String(n).slice(0, 200))
    .slice(0, 8);
  const linkField = (key: "registration_url" | "ticket_url" | "website_url") => {
    const picked = pickPageLink(raw[key], links);
    if (!picked && typeof raw[key] === "string" && raw[key])
      notes.push(`ตัดลิงก์ ${key} ที่ไม่พบบนหน้าต้นทางออก`);
    return picked;
  };
  const registration = linkField("registration_url");
  let ticket = linkField("ticket_url");
  if (ticket === registration) ticket = null;
  if (!registration && !ticket)
    notes.push("ไม่พบลิงก์ลงทะเบียนหรือซื้อบัตรบนหน้าต้นทาง — ทีมควรตรวจสอบก่อนเผยแพร่");

  return json(req, {
    draft: {
      title: clip(raw.title, 100) ?? "",
      category,
      starts_on: starts,
      ends_on: ends ?? starts,
      time_note: clip(raw.time_note, 60),
      location_name: clip(raw.location_name, 120),
      location_note: clip(raw.location_note, 120),
      organizer_name: clip(raw.organizer_name, 100),
      description: clip(raw.description, 2000) ?? "",
      fee_type: fee,
      fee_note: fee === "paid" ? clip(raw.fee_note, 60) : null,
      registration_url: registration,
      ticket_url: ticket,
      website_url: linkField("website_url") ?? page.finalUrl.slice(0, 500),
      sponsors,
      source_name:
        clip(raw.source_name, 120) ??
        clip(metaContent(page.html, "og:site_name"), 120) ??
        target.hostname,
      source_url: page.finalUrl.slice(0, 500),
    },
    confidence: Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0))),
    notes: notes.slice(0, 10),
    structured: ld.length > 0,
  });
});
